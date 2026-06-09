using AITasker.Application.DTOs.Requests;
using AITasker.Application.DTOs.Responses;
using AITasker.Application.Interfaces;
using AITasker.Domain.Entities;

namespace AITasker.Application.Services;

public class JobService : IJobService
{
    private static readonly string[] ValidComplexity = { "SIMPLE", "MEDIUM", "COMPLEX" };
    private static readonly string[] ValidSkillLevels = { "BEGINNER", "INTERMEDIATE", "ADVANCED" };

    private readonly IJobRepository _jobRepository;
    private readonly ISkillRepository _skillRepository;
    private readonly IAiJobAssistantProvider _aiJobAssistantProvider;

    public JobService(
        IJobRepository jobRepository,
        ISkillRepository skillRepository,
        IAiJobAssistantProvider aiJobAssistantProvider)
    {
        _jobRepository = jobRepository;
        _skillRepository = skillRepository;
        _aiJobAssistantProvider = aiJobAssistantProvider;
    }

    public async Task<AiJobSuggestionResult> AiSuggestAsync(int userId, AiJobSuggestionRequest request)
    {
        await GetActiveClientAsync(userId);

        if (string.IsNullOrWhiteSpace(request.ShortRequirement))
        {
            throw new InvalidOperationException("Short requirement is required.");
        }

        return await _aiJobAssistantProvider.SuggestAsync(request);
    }

    public async Task<JobResponse> CreateAsync(int userId, CreateJobRequest request)
    {
        var client = await GetActiveClientAsync(userId);
        ValidateCommonFields(request.Title, request.Description, request.BudgetMin, request.BudgetMax,
            request.Complexity);
        var foundSkills = await ValidateSkillsAsync(request.Skills);

        var job = new JobPosting
        {
            ClientProfileId = client.ClientProfileId,
            Title = request.Title.Trim(),
            Description = request.Description.Trim(),
            AIgeneratedDescription = Nullable(request.AIgeneratedDescription),
            BudgetMin = request.BudgetMin,
            BudgetMax = request.BudgetMax,
            Status = "OPENING",
            CreatedAt = DateTime.UtcNow,
            JobSkills = MapSkills(request.Skills, foundSkills)
        };

        await _jobRepository.AddAsync(job);
        await _jobRepository.SaveChangesAsync();
        return ToResponse(job);
    }

    public async Task<JobResponse> UpdateDraftAsync(int userId, int jobId, UpdateJobRequest request)
    {
        var client = await GetActiveClientAsync(userId);
        var job = await GetOwnedJobAsync(jobId, client.ClientProfileId);

        if (job.Status != "DRAFT")
        {
            throw new InvalidOperationException("Only DRAFT jobs can be updated.");
        }

        ValidateCommonFields(request.Title, request.Description, request.BudgetMin, request.BudgetMax,
            request.Complexity);
        var foundSkills = await ValidateSkillsAsync(request.Skills);

        job.Title = request.Title.Trim();
        job.Description = request.Description.Trim();
        job.AIgeneratedDescription = Nullable(request.AIgeneratedDescription);
        job.BudgetMin = request.BudgetMin;
        job.BudgetMax = request.BudgetMax;
        job.Deadline = request.Deadline;
        job.ProjectType = request.ProjectType.Trim();
        job.Complexity = request.Complexity.Trim().ToUpperInvariant();
        job.ExpectedDeliverables = request.ExpectedDeliverables.Trim();
        job.IsAIAssisted = request.IsAIAssisted;
        job.UpdatedAt = DateTime.UtcNow;

        _jobRepository.RemoveJobSkills(job.JobSkills);
        job.JobSkills = MapSkills(request.Skills, foundSkills, job.JobId);

        await _jobRepository.SaveChangesAsync();
        return ToResponse(job);
    }

    public async Task<JobResponse> SubmitAsync(int userId, int jobId)
    {
        var client = await GetActiveClientAsync(userId);
        var job = await GetOwnedJobAsync(jobId, client.ClientProfileId);

        if (job.Status != "DRAFT")
        {
            throw new InvalidOperationException("Only DRAFT jobs can be submitted.");
        }

        if (string.IsNullOrWhiteSpace(job.Title) || string.IsNullOrWhiteSpace(job.Description)
            || string.IsNullOrWhiteSpace(job.ExpectedDeliverables))
        {
            throw new InvalidOperationException("Title, description and deliverables are required to submit.");
        }
        if (job.Deadline <= DateTime.UtcNow)
        {
            throw new InvalidOperationException("Deadline must be in the future.");
        }
        if (job.BudgetMin < 0 || job.BudgetMax < job.BudgetMin)
        {
            throw new InvalidOperationException("Budget is invalid.");
        }
        if (!job.JobSkills.Any(s => s.IsRequired))
        {
            throw new InvalidOperationException("At least one required skill is needed to submit.");
        }

        job.Status = "OPEN";
        job.UpdatedAt = DateTime.UtcNow;
        await _jobRepository.SaveChangesAsync();
        return ToResponse(job);
    }

    public async Task<JobResponse> CancelAsync(int userId, int jobId)
    {
        var client = await GetActiveClientAsync(userId);
        var job = await GetOwnedJobAsync(jobId, client.ClientProfileId);

        if (job.Status is not ("DRAFT" or "OPEN"))
        {
            throw new InvalidOperationException("Only DRAFT or OPEN jobs can be cancelled.");
        }
        // TODO (Slice 2 integration): also reject cancel when an ACCEPTED proposal exists for this job.

        job.Status = "CANCELLED";
        job.UpdatedAt = DateTime.UtcNow;
        await _jobRepository.SaveChangesAsync();
        return ToResponse(job);
    }

    public async Task<PagedResult<JobResponse>> BrowseAsync(JobFilterRequest filter)
    {
        var page = filter.Page < 1 ? 1 : filter.Page;
        var pageSize = filter.PageSize is < 1 or > 100 ? 20 : filter.PageSize;

        var jobs = await _jobRepository.BrowseAsync(filter);
        var total = await _jobRepository.CountAsync(filter);

        return new PagedResult<JobResponse>
        {
            Items = jobs.Select(ToResponse).ToList(),
            Page = page,
            PageSize = pageSize,
            TotalCount = total
        };
    }

    public async Task<JobResponse> GetByIdAsync(int jobId)
    {
        var job = await _jobRepository.GetByIdWithSkillsAsync(jobId)
            ?? throw new InvalidOperationException("Job not found.");
        return ToResponse(job);
    }

    public async Task<List<JobResponse>> GetMyJobsAsync(int userId)
    {
        var client = await _jobRepository.GetClientProfileByUserIdAsync(userId)
            ?? throw new InvalidOperationException("Client profile not found.");
        var jobs = await _jobRepository.GetByClientProfileIdAsync(client.ClientProfileId);
        return jobs.Select(ToResponse).ToList();
    }

    private async Task<ClientProfile> GetActiveClientAsync(int userId)
    {
        var client = await _jobRepository.GetClientProfileByUserIdAsync(userId)
            ?? throw new InvalidOperationException("Client profile not found.");

        if (!string.Equals(client.User.Status, "ACTIVE", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Only an active client can manage jobs.");
        }
        return client;
    }

    private async Task<JobPosting> GetOwnedJobAsync(int jobId, int clientProfileId)
    {
        var job = await _jobRepository.GetByIdWithSkillsAsync(jobId)
            ?? throw new InvalidOperationException("Job not found.");

        if (job.ClientProfileId != clientProfileId)
        {
            throw new InvalidOperationException("You do not own this job.");
        }
        return job;
    }

    private static void ValidateCommonFields(string title, string description,
        decimal budgetMin, decimal budgetMax, string complexity)
    {
        if (string.IsNullOrWhiteSpace(title)) throw new InvalidOperationException("Title is required.");
        if (string.IsNullOrWhiteSpace(description)) throw new InvalidOperationException("Description is required.");
        if (budgetMin < 0) throw new InvalidOperationException("Budget min must be >= 0.");
        if (budgetMax < budgetMin) throw new InvalidOperationException("Budget max must be >= budget min.");
        if (!ValidComplexity.Contains(complexity.Trim().ToUpperInvariant()))
            throw new InvalidOperationException("Complexity must be SIMPLE, MEDIUM or COMPLEX.");
    }

    private async Task<List<Skill>> ValidateSkillsAsync(List<CreateJobSkillItem> skills)
    {
        var ids = skills.Select(x => x.SkillId).ToList();
        if (ids.Count == 0) throw new InvalidOperationException("At least one skill is required.");
        if (ids.Count != ids.Distinct().Count()) throw new InvalidOperationException("Duplicate skillId in request.");

        foreach (var s in skills)
        {
            if (s.SkillLevelRequired is not null
                && !ValidSkillLevels.Contains(s.SkillLevelRequired))
            {
                throw new InvalidOperationException(
                    $"Invalid skill level '{s.SkillLevelRequired}'.");
            }
        }

        var found = await _skillRepository.GetByIdsAsync(ids);
        var activeIds = found.Where(x => x.IsActive).Select(x => x.SkillId).ToHashSet();
        foreach (var id in ids)
        {
            if (!activeIds.Contains(id))
                throw new InvalidOperationException($"Skill {id} does not exist or is not active.");
        }

        return found;
    }

    private static List<JobSkill> MapSkills(List<CreateJobSkillItem> skills, List<Skill> foundSkills, int jobId = 0)
    {
        var byId = foundSkills.ToDictionary(x => x.SkillId);
        return skills.Select(x => new JobSkill
        {
            JobId = jobId,
            SkillId = x.SkillId,
            SkillLevelRequired = string.IsNullOrWhiteSpace(x.SkillLevelRequired) ? null : x.SkillLevelRequired,
            IsRequired = x.IsRequired,
            Skill = byId.TryGetValue(x.SkillId, out var s) ? s : null!
        }).ToList();
    }

    private static string? Nullable(string? value)
        => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static JobResponse ToResponse(JobPosting job)
    {
        return new JobResponse
        {
            JobId = job.JobId,
            ClientProfileId = job.ClientProfileId,
            Title = job.Title,
            Description = job.Description,
            AIgeneratedDescription = job.AIgeneratedDescription,
            BudgetMin = job.BudgetMin,
            BudgetMax = job.BudgetMax,
            Deadline = job.Deadline,
            ProjectType = job.ProjectType,
            Complexity = job.Complexity,
            ExpectedDeliverables = job.ExpectedDeliverables,
            Status = job.Status,
            IsAIAssisted = job.IsAIAssisted,
            CreatedAt = job.CreatedAt,
            UpdatedAt = job.UpdatedAt,
            Skills = job.JobSkills.Select(s => new JobSkillResponse
            {
                SkillId = s.SkillId,
                SkillName = s.Skill?.SkillName ?? string.Empty,
                SkillLevelRequired = s.SkillLevelRequired,
                IsRequired = s.IsRequired
            }).ToList()
        };
    }
}
