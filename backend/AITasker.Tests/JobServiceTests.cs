using AITasker.Application.DTOs.Requests;
using AITasker.Application.Interfaces;
using AITasker.Application.Services;
using AITasker.Domain.Entities;
using Moq;

namespace AITasker.Tests;

public class JobServiceTests
{
    private static Mock<IJobRepository> JobRepoWithClient(int clientProfileId = 7, string userStatus = "ACTIVE")
    {
        var repo = new Mock<IJobRepository>();
        repo.Setup(x => x.GetClientProfileByUserIdAsync(It.IsAny<int>()))
            .ReturnsAsync(new ClientProfile
            {
                ClientProfileId = clientProfileId,
                UserId = 1,
                User = new User { UserId = 1, Role = "CLIENT", Status = userStatus, Email = "c@x.com", FullName = "C" }
            });
        return repo;
    }

    private static Mock<ISkillRepository> SkillRepoWith(params int[] ids)
    {
        var repo = new Mock<ISkillRepository>();
        repo.Setup(x => x.GetByIdsAsync(It.IsAny<IEnumerable<int>>()))
            .ReturnsAsync(ids.Select(i => new Skill { SkillId = i, SkillName = $"S{i}", IsActive = true }).ToList());
        return repo;
    }

    [Fact]
    public async Task CreateDraft_RejectsInactiveClient()
    {
        var jobRepo = JobRepoWithClient(userStatus: "PENDING_PROFILE");
        var service = new JobService(jobRepo.Object, SkillRepoWith(1).Object, Mock.Of<IAiJobAssistantProvider>());

        var request = new CreateJobRequest { Title = "t", Description = "d", Skills = new() { new() { SkillId = 1 } } };

        await Assert.ThrowsAsync<InvalidOperationException>(() => service.CreateDraftAsync(1, request));
    }

    [Fact]
    public async Task CreateDraft_RejectsUnknownSkill()
    {
        var jobRepo = JobRepoWithClient();
        var skillRepo = new Mock<ISkillRepository>();
        skillRepo.Setup(x => x.GetByIdsAsync(It.IsAny<IEnumerable<int>>())).ReturnsAsync(new List<Skill>());
        var service = new JobService(jobRepo.Object, skillRepo.Object, Mock.Of<IAiJobAssistantProvider>());

        var request = new CreateJobRequest { Title = "t", Description = "d", Skills = new() { new() { SkillId = 99 } } };

        await Assert.ThrowsAsync<InvalidOperationException>(() => service.CreateDraftAsync(1, request));
    }

    [Fact]
    public async Task CreateDraft_Valid_CreatesDraftStatus()
    {
        var jobRepo = JobRepoWithClient();
        JobPosting? added = null;
        jobRepo.Setup(x => x.AddAsync(It.IsAny<JobPosting>()))
            .Callback<JobPosting>(j => added = j)
            .Returns(Task.CompletedTask);

        var service = new JobService(jobRepo.Object, SkillRepoWith(1, 2).Object, Mock.Of<IAiJobAssistantProvider>());

        var request = new CreateJobRequest
        {
            Title = "Chatbot", Description = "Build chatbot", BudgetMin = 100, BudgetMax = 500,
            Deadline = DateTime.UtcNow.AddDays(30), ProjectType = "CHATBOT", Complexity = "MEDIUM",
            ExpectedDeliverables = "demo", Skills = new() { new() { SkillId = 1, IsRequired = true } }
        };

        var result = await service.CreateDraftAsync(1, request);

        Assert.Equal("DRAFT", result.Status);
        Assert.NotNull(added);
        jobRepo.Verify(x => x.SaveChangesAsync(), Times.Once);
    }

    [Fact]
    public async Task Submit_RejectsWhenNoRequiredSkill()
    {
        var jobRepo = JobRepoWithClient();
        var job = new JobPosting
        {
            JobId = 10, ClientProfileId = 7, Status = "DRAFT", Title = "t", Description = "d",
            BudgetMin = 100, BudgetMax = 200, Deadline = DateTime.UtcNow.AddDays(10),
            ExpectedDeliverables = "x",
            JobSkills = new List<JobSkill> { new() { SkillId = 1, IsRequired = false } }
        };
        jobRepo.Setup(x => x.GetByIdWithSkillsAsync(10)).ReturnsAsync(job);
        var service = new JobService(jobRepo.Object, SkillRepoWith(1).Object, Mock.Of<IAiJobAssistantProvider>());

        await Assert.ThrowsAsync<InvalidOperationException>(() => service.SubmitAsync(1, 10));
    }

    [Fact]
    public async Task Submit_Valid_SetsOpen()
    {
        var jobRepo = JobRepoWithClient();
        var job = new JobPosting
        {
            JobId = 10, ClientProfileId = 7, Status = "DRAFT", Title = "t", Description = "d",
            BudgetMin = 100, BudgetMax = 200, Deadline = DateTime.UtcNow.AddDays(10),
            ExpectedDeliverables = "x",
            JobSkills = new List<JobSkill> { new() { SkillId = 1, IsRequired = true } }
        };
        jobRepo.Setup(x => x.GetByIdWithSkillsAsync(10)).ReturnsAsync(job);
        var service = new JobService(jobRepo.Object, SkillRepoWith(1).Object, Mock.Of<IAiJobAssistantProvider>());

        var result = await service.SubmitAsync(1, 10);

        Assert.Equal("OPEN", result.Status);
        jobRepo.Verify(x => x.SaveChangesAsync(), Times.Once);
    }

    [Fact]
    public async Task Update_RejectsNonOwner()
    {
        var jobRepo = JobRepoWithClient(clientProfileId: 7);
        var job = new JobPosting { JobId = 10, ClientProfileId = 999, Status = "DRAFT" };
        jobRepo.Setup(x => x.GetByIdWithSkillsAsync(10)).ReturnsAsync(job);
        var service = new JobService(jobRepo.Object, SkillRepoWith(1).Object, Mock.Of<IAiJobAssistantProvider>());

        var request = new UpdateJobRequest { Title = "t", Description = "d", Skills = new() { new() { SkillId = 1 } } };

        await Assert.ThrowsAsync<InvalidOperationException>(() => service.UpdateDraftAsync(1, 10, request));
    }

    [Fact]
    public async Task Browse_ReturnsPagedResult_WithCorrectCounts()
    {
        var jobRepo = JobRepoWithClient();
        var jobs = new List<JobPosting>
        {
            new()
            {
                JobId = 1, ClientProfileId = 7, Title = "Job1", Description = "d", Status = "OPEN",
                BudgetMin = 100, BudgetMax = 200, Deadline = DateTime.UtcNow.AddDays(10),
                ProjectType = "CHATBOT", Complexity = "SIMPLE", ExpectedDeliverables = "x",
                CreatedAt = DateTime.UtcNow, JobSkills = new List<JobSkill>()
            }
        };
        jobRepo.Setup(x => x.BrowseAsync(It.IsAny<JobFilterRequest>())).ReturnsAsync(jobs);
        jobRepo.Setup(x => x.CountAsync(It.IsAny<JobFilterRequest>())).ReturnsAsync(5);

        var service = new JobService(jobRepo.Object, SkillRepoWith(1).Object, Mock.Of<IAiJobAssistantProvider>());

        var result = await service.BrowseAsync(new JobFilterRequest { Page = 1, PageSize = 20 });

        Assert.Equal(1, result.Items.Count);
        Assert.Equal(5, result.TotalCount);
        Assert.Equal(1, result.Page);
        Assert.Equal(20, result.PageSize);
    }
}
