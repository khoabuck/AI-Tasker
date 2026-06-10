using AITasker.Application.DTOs.Requests;
using AITasker.Application.DTOs.Responses;
using AITasker.Application.Interfaces;
using AITasker.Domain.Entities;
using AITasker.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace AITasker.Infrastructure.Services;

public class JobService : IJobService
{
    private readonly AITaskerDbContext _context;

    public JobService(AITaskerDbContext context)
    {
        _context = context;
    }

    public async Task<JobResponse> CreateDraftAsync(int userId, CreateJobRequest request)
    {
        var clientProfile = await _context.ClientProfiles
            .FirstOrDefaultAsync(x => x.UserId == userId);

        if (clientProfile == null)
        {
            throw new InvalidOperationException("Client profile not found.");
        }

        ValidateJobRequest(request, requireSkill: false);

        var job = new JobPosting
        {
            ClientProfileId = clientProfile.ClientProfileId,
            Title = request.Title.Trim(),
            Description = request.Description.Trim(),
            AiGeneratedDescription = string.IsNullOrWhiteSpace(request.AiGeneratedDescription)
                ? null
                : request.AiGeneratedDescription.Trim(),
            BudgetMin = request.BudgetMin,
            BudgetMax = request.BudgetMax,
            Deadline = request.Deadline,
            ProjectType = request.ProjectType.Trim(),
            Complexity = request.Complexity.Trim().ToUpper(),
            ExpectedDeliverables = request.ExpectedDeliverables.Trim(),
            Status = "DRAFT",
            IsAiAssisted = request.IsAiAssisted,
            CreatedAt = DateTime.UtcNow
        };

        _context.JobPostings.Add(job);
        await _context.SaveChangesAsync();

        await ReplaceJobSkillsAsync(job.JobPostingId, request.SkillIds);

        return await GetJobResponseByIdAsync(job.JobPostingId)
            ?? throw new InvalidOperationException("Failed to create job draft.");
    }

    public async Task<JobResponse> SubmitJobAsync(int userId, CreateJobRequest request)
    {
        var clientProfile = await _context.ClientProfiles
            .FirstOrDefaultAsync(x => x.UserId == userId);

        if (clientProfile == null)
        {
            throw new InvalidOperationException("Client profile not found.");
        }

        ValidateJobRequest(request, requireSkill: true);

        var job = new JobPosting
        {
            ClientProfileId = clientProfile.ClientProfileId,
            Title = request.Title.Trim(),
            Description = request.Description.Trim(),
            AiGeneratedDescription = string.IsNullOrWhiteSpace(request.AiGeneratedDescription)
                ? null
                : request.AiGeneratedDescription.Trim(),
            BudgetMin = request.BudgetMin,
            BudgetMax = request.BudgetMax,
            Deadline = request.Deadline,
            ProjectType = request.ProjectType.Trim(),
            Complexity = request.Complexity.Trim().ToUpper(),
            ExpectedDeliverables = request.ExpectedDeliverables.Trim(),
            Status = "OPEN",
            IsAiAssisted = request.IsAiAssisted,
            CreatedAt = DateTime.UtcNow
        };

        _context.JobPostings.Add(job);
        await _context.SaveChangesAsync();

        await ReplaceJobSkillsAsync(job.JobPostingId, request.SkillIds);

        return await GetJobResponseByIdAsync(job.JobPostingId)
            ?? throw new InvalidOperationException("Failed to submit job.");
    }

    public async Task<List<JobResponse>> GetOpenJobsAsync(string? keyword, int? skillId)
    {
        var query = _context.JobPostings
            .AsNoTracking()
            .Include(x => x.JobSkills)
                .ThenInclude(x => x.Skill)
            .Where(x => x.Status == "OPEN")
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(keyword))
        {
            var trimmedKeyword = keyword.Trim();

            query = query.Where(x =>
                x.Title.Contains(trimmedKeyword) ||
                x.Description.Contains(trimmedKeyword));
        }

        if (skillId.HasValue)
        {
            query = query.Where(x =>
                x.JobSkills.Any(js => js.SkillId == skillId.Value));
        }

        return await query
            .OrderByDescending(x => x.CreatedAt)
            .Select(x => ToResponse(x))
            .ToListAsync();
    }

    public async Task<List<JobResponse>> GetMyJobsAsync(int userId)
    {
        var clientProfile = await _context.ClientProfiles
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.UserId == userId);

        if (clientProfile == null)
        {
            return new List<JobResponse>();
        }

        return await _context.JobPostings
            .AsNoTracking()
            .Include(x => x.JobSkills)
                .ThenInclude(x => x.Skill)
            .Where(x => x.ClientProfileId == clientProfile.ClientProfileId)
            .OrderByDescending(x => x.CreatedAt)
            .Select(x => ToResponse(x))
            .ToListAsync();
    }

    public async Task<JobResponse?> GetJobByIdAsync(int jobPostingId)
    {
        return await GetJobResponseByIdAsync(jobPostingId);
    }

    public async Task<JobResponse?> UpdateJobAsync(
        int userId,
        int jobPostingId,
        UpdateJobRequest request)
    {
        var clientProfile = await _context.ClientProfiles
            .FirstOrDefaultAsync(x => x.UserId == userId);

        if (clientProfile == null)
        {
            throw new InvalidOperationException("Client profile not found.");
        }

        var job = await _context.JobPostings
            .FirstOrDefaultAsync(x =>
                x.JobPostingId == jobPostingId &&
                x.ClientProfileId == clientProfile.ClientProfileId);

        if (job == null)
        {
            return null;
        }

        if (job.Status == "CLOSED" || job.Status == "CANCELLED")
        {
            throw new InvalidOperationException("Cannot update a closed or cancelled job.");
        }

        ValidateUpdateJobRequest(request, requireSkill: job.Status == "OPEN");

        job.Title = request.Title.Trim();
        job.Description = request.Description.Trim();
        job.AiGeneratedDescription = string.IsNullOrWhiteSpace(request.AiGeneratedDescription)
            ? null
            : request.AiGeneratedDescription.Trim();
        job.BudgetMin = request.BudgetMin;
        job.BudgetMax = request.BudgetMax;
        job.Deadline = request.Deadline;
        job.ProjectType = request.ProjectType.Trim();
        job.Complexity = request.Complexity.Trim().ToUpper();
        job.ExpectedDeliverables = request.ExpectedDeliverables.Trim();
        job.IsAiAssisted = request.IsAiAssisted;
        job.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        await ReplaceJobSkillsAsync(job.JobPostingId, request.SkillIds);

        return await GetJobResponseByIdAsync(job.JobPostingId);
    }

    public async Task<bool> CancelJobAsync(int userId, int jobPostingId)
    {
        var clientProfile = await _context.ClientProfiles
            .FirstOrDefaultAsync(x => x.UserId == userId);

        if (clientProfile == null)
        {
            throw new InvalidOperationException("Client profile not found.");
        }

        var job = await _context.JobPostings
            .FirstOrDefaultAsync(x =>
                x.JobPostingId == jobPostingId &&
                x.ClientProfileId == clientProfile.ClientProfileId);

        if (job == null)
        {
            return false;
        }

        if (job.Status == "CLOSED")
        {
            throw new InvalidOperationException("Cannot cancel a closed job.");
        }

        job.Status = "CANCELLED";
        job.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return true;
    }

    private async Task ReplaceJobSkillsAsync(int jobPostingId, List<int> skillIds)
    {
        var oldSkills = await _context.JobSkills
            .Where(x => x.JobPostingId == jobPostingId)
            .ToListAsync();

        _context.JobSkills.RemoveRange(oldSkills);

        var distinctSkillIds = skillIds
            .Distinct()
            .ToList();

        if (distinctSkillIds.Count > 0)
        {
            var existingSkillIds = await _context.Skills
                .Where(x => distinctSkillIds.Contains(x.SkillId) && x.IsActive)
                .Select(x => x.SkillId)
                .ToListAsync();

            if (existingSkillIds.Count != distinctSkillIds.Count)
            {
                throw new InvalidOperationException("One or more skills are invalid or inactive.");
            }

            var jobSkills = existingSkillIds.Select(skillId => new JobSkill
            {
                JobPostingId = jobPostingId,
                SkillId = skillId,
                IsRequired = true
            });

            _context.JobSkills.AddRange(jobSkills);
        }

        await _context.SaveChangesAsync();
    }

    private async Task<JobResponse?> GetJobResponseByIdAsync(int jobPostingId)
    {
        var job = await _context.JobPostings
            .AsNoTracking()
            .Include(x => x.JobSkills)
                .ThenInclude(x => x.Skill)
            .FirstOrDefaultAsync(x => x.JobPostingId == jobPostingId);

        return job == null ? null : ToResponse(job);
    }

    private static JobResponse ToResponse(JobPosting job)
    {
        return new JobResponse
        {
            JobPostingId = job.JobPostingId,
            ClientProfileId = job.ClientProfileId,
            Title = job.Title,
            Description = job.Description,
            AiGeneratedDescription = job.AiGeneratedDescription,
            BudgetMin = job.BudgetMin,
            BudgetMax = job.BudgetMax,
            Deadline = job.Deadline,
            ProjectType = job.ProjectType,
            Complexity = job.Complexity,
            ExpectedDeliverables = job.ExpectedDeliverables,
            Status = job.Status,
            IsAiAssisted = job.IsAiAssisted,
            CreatedAt = job.CreatedAt,
            UpdatedAt = job.UpdatedAt,
            Skills = job.JobSkills.Select(js => new JobSkillResponse
            {
                SkillId = js.SkillId,
                SkillName = js.Skill != null ? js.Skill.SkillName : string.Empty,
                Category = js.Skill?.Category
            }).ToList()
        };
    }

    private static void ValidateJobRequest(CreateJobRequest request, bool requireSkill)
    {
        if (string.IsNullOrWhiteSpace(request.Title))
        {
            throw new InvalidOperationException("Job title is required.");
        }

        if (string.IsNullOrWhiteSpace(request.Description))
        {
            throw new InvalidOperationException("Job description is required.");
        }

        if (request.BudgetMin < 0 || request.BudgetMax < request.BudgetMin)
        {
            throw new InvalidOperationException("Invalid budget range.");
        }

        if (request.Deadline <= DateTime.UtcNow)
        {
            throw new InvalidOperationException("Deadline must be in the future.");
        }

        if (string.IsNullOrWhiteSpace(request.ProjectType))
        {
            throw new InvalidOperationException("Project type is required.");
        }

        var complexity = request.Complexity.Trim().ToUpper();

        if (complexity is not ("SIMPLE" or "MEDIUM" or "COMPLEX"))
        {
            throw new InvalidOperationException("Complexity must be SIMPLE, MEDIUM, or COMPLEX.");
        }

        if (string.IsNullOrWhiteSpace(request.ExpectedDeliverables))
        {
            throw new InvalidOperationException("Expected deliverables are required.");
        }

        if (requireSkill && request.SkillIds.Count == 0)
        {
            throw new InvalidOperationException("At least one skill is required.");
        }
    }

    private static void ValidateUpdateJobRequest(UpdateJobRequest request, bool requireSkill)
    {
        if (string.IsNullOrWhiteSpace(request.Title))
        {
            throw new InvalidOperationException("Job title is required.");
        }

        if (string.IsNullOrWhiteSpace(request.Description))
        {
            throw new InvalidOperationException("Job description is required.");
        }

        if (request.BudgetMin < 0 || request.BudgetMax < request.BudgetMin)
        {
            throw new InvalidOperationException("Invalid budget range.");
        }

        if (request.Deadline <= DateTime.UtcNow)
        {
            throw new InvalidOperationException("Deadline must be in the future.");
        }

        if (string.IsNullOrWhiteSpace(request.ProjectType))
        {
            throw new InvalidOperationException("Project type is required.");
        }

        var complexity = request.Complexity.Trim().ToUpper();

        if (complexity is not ("SIMPLE" or "MEDIUM" or "COMPLEX"))
        {
            throw new InvalidOperationException("Complexity must be SIMPLE, MEDIUM, or COMPLEX.");
        }

        if (string.IsNullOrWhiteSpace(request.ExpectedDeliverables))
        {
            throw new InvalidOperationException("Expected deliverables are required.");
        }

        if (requireSkill && request.SkillIds.Count == 0)
        {
            throw new InvalidOperationException("At least one skill is required.");
        }
    }
}