using AITasker.Domain.Entities;

namespace AITasker.Application.Interfaces;

public interface IReviewRepository
{
    Task<ClientProfile?> GetClientProfileByUserIdAsync(int userId);

    Task<Project?> GetProjectByIdAsync(int projectId);

    Task<bool> ExistsByProjectIdAsync(int projectId);

    Task AddAsync(Review review);

    Task<Review?> GetByIdAsync(int reviewId);

    Task<ExpertProfile?> GetExpertProfileByUserIdAsync(int userId);

    Task<ExpertProfile?> GetExpertProfileByIdAsync(int expertProfileId);

    Task<List<Review>> GetVisibleReviewsByRevieweeUserIdAsync(int revieweeUserId);

    Task<List<Review>> GetVisibleReviewsPagedByRevieweeUserIdAsync(int revieweeUserId, int skip, int take);

    Task<int> CountVisibleReviewsByRevieweeUserIdAsync(int revieweeUserId);

    Task SaveChangesAsync();
}
