using AITasker.Application.DTOs.Requests;
using AITasker.Application.Interfaces;
using AITasker.Application.Services;
using AITasker.Domain.Entities;
using Moq;

namespace AITasker.Tests;

public class SkillServiceTests
{
    [Fact]
    public async Task GetActiveAsync_MapsEntitiesToResponses()
    {
        var repo = new Mock<ISkillRepository>();
        repo.Setup(x => x.GetActiveAsync(null, null))
            .ReturnsAsync(new List<Skill>
            {
                new() { SkillId = 1, SkillName = "Chatbot", Category = "AI Application", IsActive = true }
            });

        var service = new SkillService(repo.Object);

        var result = await service.GetActiveAsync(null, null);

        Assert.Single(result);
        Assert.Equal(1, result[0].SkillId);
        Assert.Equal("Chatbot", result[0].SkillName);
    }

    [Fact]
    public async Task CreateAsync_RejectsDuplicateName()
    {
        var repo = new Mock<ISkillRepository>();
        repo.Setup(x => x.ExistsByNameAsync("Chatbot")).ReturnsAsync(true);
        var service = new SkillService(repo.Object);

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.CreateAsync(new() { SkillName = "Chatbot" }));
    }

    [Fact]
    public async Task UpdateAsync_RejectsDuplicateRename()
    {
        var repo = new Mock<ISkillRepository>();
        repo.Setup(x => x.GetByIdAsync(1))
            .ReturnsAsync(new Skill { SkillId = 1, SkillName = "Python", IsActive = true });
        repo.Setup(x => x.ExistsByNameAsync("Chatbot")).ReturnsAsync(true);
        var service = new SkillService(repo.Object);

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.UpdateAsync(1, new() { SkillName = "Chatbot", IsActive = true }));
    }
}
