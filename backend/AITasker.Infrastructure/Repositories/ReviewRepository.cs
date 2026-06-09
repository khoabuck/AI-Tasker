using AITasker.Application.Interfaces;
using AITasker.Domain.Entities;
using AITasker.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace AITasker.Infrastructure.Repositories;

public class ReviewRepository : IReviewRepository
{
    private readonly AITaskerDbContext _context;

    public ReviewRepository(AITaskerDbContext context)
    {
        _context = context;
    }

    public async Task<ClientProfile?> GetClientProfileByUserIdAsync(int userId)
    {
        return await _context.ClientProfiles.FirstOrDefaultAsync(x => x.UserId == userId);
    }

    public async Task<Project?> GetProjectByIdAsync(int projectId)
    {
        return await _context.Projects
            .Include(x => x.ExpertProfile)
            .FirstOrDefaultAsync(x => x.ProjectId == projectId);
    }

    public async Task<bool> ExistsByProjectIdAsync(int projectId)
    {
        return await _context.Reviews.AnyAsync(x => x.ProjectId == projectId);
    }

    public async Task AddAsync(Review review)
    {
        await _context.Reviews.AddAsync(review);
    }

    public async Task<Review?> GetByIdAsync(int reviewId)
    {
        return await _context.Reviews.FirstOrDefaultAsync(x => x.ReviewId == reviewId);
    }

    public async Task<ExpertProfile?> GetExpertProfileByUserIdAsync(int userId)
    {
        return await _context.ExpertProfiles.FirstOrDefaultAsync(x => x.UserId == userId);
    }

    public async Task<ExpertProfile?> GetExpertProfileByIdAsync(int expertProfileId)
    {
        return await _context.ExpertProfiles.FirstOrDefaultAsync(x => x.ExpertProfileId == expertProfileId);
    }

    public async Task<List<Review>> GetVisibleReviewsByRevieweeUserIdAsync(int revieweeUserId)
    {
        return await _context.Reviews
            .Where(x => x.RevieweeId == revieweeUserId && x.Status == "VISIBLE")
            .OrderByDescending(x => x.CreatedAt)
            .ToListAsync();
    }

    public async Task<List<Review>> GetVisibleReviewsPagedByRevieweeUserIdAsync(int revieweeUserId, int skip, int take)
    {
        return await _context.Reviews
            .Where(x => x.RevieweeId == revieweeUserId && x.Status == "VISIBLE")
            .OrderByDescending(x => x.CreatedAt)
            .Skip(skip)
            .Take(take)
            .ToListAsync();
    }

    public async Task<int> CountVisibleReviewsByRevieweeUserIdAsync(int revieweeUserId)
    {
        return await _context.Reviews
            .CountAsync(x => x.RevieweeId == revieweeUserId && x.Status == "VISIBLE");
    }

    public async Task SaveChangesAsync()
    {
        await _context.SaveChangesAsync();
    }
}
