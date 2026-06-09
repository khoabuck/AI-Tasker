using AITasker.Application.DTOs.Requests;
using AITasker.Application.Interfaces;
using AITasker.Application.Services;
using AITasker.Domain.Entities;
using Moq;

namespace AITasker.Tests;

public class ExpertSkillServiceTests
{
    private static (Mock<IExpertSkillRepository>, Mock<ISkillRepository>) Mocks(int expertProfileId = 5)
    {
        var expertSkillRepo = new Mock<IExpertSkillRepository>();
        expertSkillRepo.Setup(x => x.GetExpertProfileByUserIdAsync(It.IsAny<int>()))
            .ReturnsAsync(new ExpertProfile { ExpertProfileId = expertProfileId, UserId = 1 });
        expertSkillRepo.Setup(x => x.GetByExpertProfileIdAsync(expertProfileId))
            .ReturnsAsync(new List<ExpertSkill>());

        var skillRepo = new Mock<ISkillRepository>();
        skillRepo.Setup(x => x.GetByIdsAsync(It.IsAny<IEnumerable<int>>()))
            .ReturnsAsync(new List<Skill>
            {
                new() { SkillId = 1, SkillName = "Chatbot", IsActive = true },
                new() { SkillId = 2, SkillName = "NLP", IsActive = true }
            });
        return (expertSkillRepo, skillRepo);
    }

    [Fact]
    public async Task SetMySkills_RejectsInvalidLevel()
    {
        var (expertSkillRepo, skillRepo) = Mocks();
        var service = new ExpertSkillService(expertSkillRepo.Object, skillRepo.Object);

        var request = new SetExpertSkillsRequest
        {
            Skills = new() { new() { SkillId = 1, SkillLevel = "EXPERT" } }
        };

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.SetMySkillsAsync(1, request));
    }

    [Fact]
    public async Task SetMySkills_RejectsDuplicateSkillId()
    {
        var (expertSkillRepo, skillRepo) = Mocks();
        var service = new ExpertSkillService(expertSkillRepo.Object, skillRepo.Object);

        var request = new SetExpertSkillsRequest
        {
            Skills = new()
            {
                new() { SkillId = 1, SkillLevel = "BEGINNER" },
                new() { SkillId = 1, SkillLevel = "ADVANCED" }
            }
        };

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.SetMySkillsAsync(1, request));
    }

    [Fact]
    public async Task SetMySkills_RejectsUnknownSkill()
    {
        var (expertSkillRepo, skillRepo) = Mocks();
        skillRepo.Setup(x => x.GetByIdsAsync(It.IsAny<IEnumerable<int>>()))
            .ReturnsAsync(new List<Skill>()); // none found
        var service = new ExpertSkillService(expertSkillRepo.Object, skillRepo.Object);

        var request = new SetExpertSkillsRequest
        {
            Skills = new() { new() { SkillId = 99, SkillLevel = "BEGINNER" } }
        };

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.SetMySkillsAsync(1, request));
    }

    [Fact]
    public async Task SetMySkills_ValidRequest_ReturnsMappedSkills()
    {
        var (expertSkillRepo, skillRepo) = Mocks();
        var service = new ExpertSkillService(expertSkillRepo.Object, skillRepo.Object);

        var request = new SetExpertSkillsRequest
        {
            Skills = new()
            {
                new() { SkillId = 1, SkillLevel = "ADVANCED", YearsOfExperience = 2 },
                new() { SkillId = 2, SkillLevel = "BEGINNER" }
            }
        };

        var result = await service.SetMySkillsAsync(1, request);

        Assert.Equal(2, result.Count);
        Assert.Contains(result, r => r.SkillId == 1 && r.SkillLevel == "ADVANCED");
        expertSkillRepo.Verify(x => x.SaveChangesAsync(), Times.Once);
    }
}
