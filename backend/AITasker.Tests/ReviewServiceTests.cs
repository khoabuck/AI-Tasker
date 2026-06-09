using AITasker.Application.DTOs.Requests;
using AITasker.Application.Interfaces;
using AITasker.Application.Services;
using AITasker.Domain.Entities;
using Moq;

namespace AITasker.Tests;

public class ReviewServiceTests
{
    private static Mock<IReviewRepository> Repo(
        string projectStatus = "COMPLETED",
        int projectClientProfileId = 7,
        bool duplicate = false)
    {
        var repo = new Mock<IReviewRepository>();
        repo.Setup(x => x.GetClientProfileByUserIdAsync(It.IsAny<int>()))
            .ReturnsAsync(new ClientProfile { ClientProfileId = 7, UserId = 1 });
        repo.Setup(x => x.GetProjectByIdAsync(It.IsAny<int>()))
            .ReturnsAsync(new Project
            {
                ProjectId = 5,
                ClientProfileId = projectClientProfileId,
                ExpertProfileId = 3,
                Status = projectStatus,
                ExpertProfile = new ExpertProfile { ExpertProfileId = 3, UserId = 2 }
            });
        repo.Setup(x => x.ExistsByProjectIdAsync(It.IsAny<int>())).ReturnsAsync(duplicate);
        repo.Setup(x => x.GetExpertProfileByUserIdAsync(2))
            .ReturnsAsync(new ExpertProfile { ExpertProfileId = 3, UserId = 2 });
        return repo;
    }

    private static CreateReviewRequest ValidRequest() => new() { Rating = 5, Comment = "Great work" };

    [Fact]
    public async Task Create_RejectsWhenProjectNotCompleted()
    {
        var repo = Repo(projectStatus: "ACTIVE");
        var service = new ReviewService(repo.Object);

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.CreateAsync(1, 5, ValidRequest()));
    }

    [Fact]
    public async Task Create_RejectsNonOwnerClient()
    {
        var repo = Repo(projectClientProfileId: 999);
        var service = new ReviewService(repo.Object);

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.CreateAsync(1, 5, ValidRequest()));
    }

    [Fact]
    public async Task Create_RejectsDuplicate()
    {
        var repo = Repo(duplicate: true);
        var service = new ReviewService(repo.Object);

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.CreateAsync(1, 5, ValidRequest()));
    }

    [Theory]
    [InlineData(0)]
    [InlineData(6)]
    public async Task Create_RejectsRatingOutOfRange(int rating)
    {
        var repo = Repo();
        var service = new ReviewService(repo.Object);

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.CreateAsync(1, 5, new CreateReviewRequest { Rating = rating, Comment = "x" }));
    }

    [Fact]
    public async Task Create_Valid_RecomputesExpertRating()
    {
        var repo = Repo();
        var expert = new ExpertProfile { ExpertProfileId = 3, UserId = 2, RatingAverage = 0, ReviewCount = 0 };
        repo.Setup(x => x.GetExpertProfileByUserIdAsync(2)).ReturnsAsync(expert);
        repo.Setup(x => x.AddAsync(It.IsAny<Review>())).Returns(Task.CompletedTask);
        repo.Setup(x => x.GetVisibleReviewsByRevieweeUserIdAsync(2))
            .ReturnsAsync(new List<Review>
            {
                new() { Rating = 5, Status = "VISIBLE", RevieweeId = 2 },
                new() { Rating = 3, Status = "VISIBLE", RevieweeId = 2 }
            });
        var service = new ReviewService(repo.Object);

        var result = await service.CreateAsync(1, 5, ValidRequest());

        Assert.Equal("VISIBLE", result.Status);
        Assert.Equal(2, result.RevieweeId);
        Assert.Equal(2, expert.ReviewCount);
        Assert.Equal(4.00m, expert.RatingAverage);
    }

    [Fact]
    public async Task Hide_SetsHiddenAndRecomputes()
    {
        var repo = Repo();
        var review = new Review { ReviewId = 9, ProjectId = 5, RevieweeId = 2, Rating = 5, Status = "VISIBLE" };
        repo.Setup(x => x.GetByIdAsync(9)).ReturnsAsync(review);
        var expert = new ExpertProfile { ExpertProfileId = 3, UserId = 2, RatingAverage = 5, ReviewCount = 1 };
        repo.Setup(x => x.GetExpertProfileByUserIdAsync(2)).ReturnsAsync(expert);
        repo.Setup(x => x.GetVisibleReviewsByRevieweeUserIdAsync(2)).ReturnsAsync(new List<Review>());
        var service = new ReviewService(repo.Object);

        var result = await service.HideAsync(9);

        Assert.Equal("HIDDEN", result.Status);
        Assert.Equal(0, expert.ReviewCount);
        Assert.Equal(0m, expert.RatingAverage);
    }

    [Fact]
    public async Task GetExpertReviews_ReturnsPagedResult_WithCorrectCounts()
    {
        var repo = new Mock<IReviewRepository>();
        var expertProfile = new ExpertProfile { ExpertProfileId = 42, UserId = 10 };
        repo.Setup(x => x.GetExpertProfileByIdAsync(42)).ReturnsAsync(expertProfile);

        var pagedReviews = new List<Review>
        {
            new() { ReviewId = 1, ProjectId = 1, ReviewerId = 5, RevieweeId = 10, Rating = 4, Comment = "Good", Status = "VISIBLE", CreatedAt = DateTime.UtcNow },
            new() { ReviewId = 2, ProjectId = 2, ReviewerId = 6, RevieweeId = 10, Rating = 5, Comment = "Excellent", Status = "VISIBLE", CreatedAt = DateTime.UtcNow }
        };
        repo.Setup(x => x.GetVisibleReviewsPagedByRevieweeUserIdAsync(10, 0, 20)).ReturnsAsync(pagedReviews);
        repo.Setup(x => x.CountVisibleReviewsByRevieweeUserIdAsync(10)).ReturnsAsync(7);

        var service = new ReviewService(repo.Object);

        var result = await service.GetExpertReviewsAsync(42, 1, 20);

        Assert.Equal(2, result.Items.Count);
        Assert.Equal(7, result.TotalCount);
        Assert.Equal(1, result.Page);
        Assert.Equal(20, result.PageSize);
    }
}
