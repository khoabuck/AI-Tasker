using AITasker.Application.Interfaces;
using AITasker.Domain.Entities;
using AITasker.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace AITasker.Infrastructure.Repositories;

public class ProposalRepository : IProposalRepository
{
    private readonly AITaskerDbContext _context;

    public ProposalRepository(AITaskerDbContext context)
    {
        _context = context;
    }

    public async Task<ExpertProfile?> GetExpertProfileByUserIdAsync(int userId)
    {
        return await _context.ExpertProfiles.FirstOrDefaultAsync(x => x.UserId == userId);
    }

    public async Task<ClientProfile?> GetClientProfileByUserIdAsync(int userId)
    {
        return await _context.ClientProfiles.FirstOrDefaultAsync(x => x.UserId == userId);
    }

    public async Task<JobPosting?> GetJobByIdAsync(int jobId)
    {
        return await _context.JobPostings.FirstOrDefaultAsync(x => x.JobId == jobId);
    }

    public async Task<bool> ExistsByJobAndExpertAsync(int jobId, int expertProfileId)
    {
        return await _context.Proposals
            .AnyAsync(x => x.JobId == jobId && x.ExpertProfileId == expertProfileId);
    }

    public async Task AddAsync(Proposal proposal)
    {
        await _context.Proposals.AddAsync(proposal);
    }

    public async Task<Proposal?> GetByIdAsync(int proposalId)
    {
        return await _context.Proposals
            .Include(x => x.JobPosting)
            .FirstOrDefaultAsync(x => x.ProposalId == proposalId);
    }

    public async Task<List<Proposal>> GetByJobIdAsync(int jobId)
    {
        return await _context.Proposals
            .Where(x => x.JobId == jobId)
            .OrderByDescending(x => x.CreatedAt)
            .ToListAsync();
    }

    public async Task<List<Proposal>> GetByExpertProfileIdAsync(int expertProfileId)
    {
        return await _context.Proposals
            .Where(x => x.ExpertProfileId == expertProfileId)
            .OrderByDescending(x => x.CreatedAt)
            .ToListAsync();
    }

    public async Task SaveChangesAsync()
    {
        await _context.SaveChangesAsync();
    }
}
