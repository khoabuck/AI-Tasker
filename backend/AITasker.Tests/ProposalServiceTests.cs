using AITasker.Application.DTOs.Requests;
using AITasker.Application.Interfaces;
using AITasker.Application.Services;
using AITasker.Domain.Entities;
using Moq;

namespace AITasker.Tests;

public class ProposalServiceTests
{
    private static CreateProposalRequest ValidRequest() => new()
    {
        CoverLetter = "I can do this", ProposedPrice = 1000, ProposedTimelineDays = 20,
        ExpectedOutputs = "demo", WorkingApproach = "agile"
    };

    private static Mock<IProposalRepository> Repo(
        ExpertProfile? expert = null, JobPosting? job = null, bool duplicate = false)
    {
        var repo = new Mock<IProposalRepository>();
        repo.Setup(x => x.GetExpertProfileByUserIdAsync(It.IsAny<int>()))
            .ReturnsAsync(expert ?? new ExpertProfile { ExpertProfileId = 3, UserId = 2, ProfileReviewStatus = "APPROVED" });
        repo.Setup(x => x.GetJobByIdAsync(It.IsAny<int>()))
            .ReturnsAsync(job ?? new JobPosting { JobId = 10, ClientProfileId = 7, Status = "OPEN" });
        repo.Setup(x => x.ExistsByJobAndExpertAsync(It.IsAny<int>(), It.IsAny<int>()))
            .ReturnsAsync(duplicate);
        return repo;
    }

    [Fact]
    public async Task Submit_RejectsNonApprovedExpert()
    {
        var repo = Repo(expert: new ExpertProfile { ExpertProfileId = 3, UserId = 2, ProfileReviewStatus = "PENDING_REVIEW" });
        var service = new ProposalService(repo.Object, Mock.Of<INegotiationGateway>());

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.SubmitAsync(2, 10, ValidRequest()));
    }

    [Fact]
    public async Task Submit_RejectsClosedJob()
    {
        var repo = Repo(job: new JobPosting { JobId = 10, ClientProfileId = 7, Status = "CLOSED" });
        var service = new ProposalService(repo.Object, Mock.Of<INegotiationGateway>());

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.SubmitAsync(2, 10, ValidRequest()));
    }

    [Fact]
    public async Task Submit_RejectsDuplicate()
    {
        var repo = Repo(duplicate: true);
        var service = new ProposalService(repo.Object, Mock.Of<INegotiationGateway>());

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.SubmitAsync(2, 10, ValidRequest()));
    }

    [Fact]
    public async Task Submit_Valid_CreatesSubmitted()
    {
        var repo = Repo();
        Proposal? added = null;
        repo.Setup(x => x.AddAsync(It.IsAny<Proposal>()))
            .Callback<Proposal>(p => { p.ProposalId = 1; added = p; })
            .Returns(Task.CompletedTask);
        repo.Setup(x => x.GetByIdAsync(1)).ReturnsAsync(() => added);
        var service = new ProposalService(repo.Object, Mock.Of<INegotiationGateway>());

        var result = await service.SubmitAsync(2, 10, ValidRequest());

        Assert.Equal("SUBMITTED", result.Status);
        repo.Verify(x => x.SaveChangesAsync(), Times.Once);
    }

    [Fact]
    public async Task Accept_TransitionsAndCallsGateway()
    {
        var repo = new Mock<IProposalRepository>();
        repo.Setup(x => x.GetClientProfileByUserIdAsync(It.IsAny<int>()))
            .ReturnsAsync(new ClientProfile { ClientProfileId = 7, UserId = 1 });
        var proposal = new Proposal
        {
            ProposalId = 1, JobId = 10, ExpertProfileId = 3, Status = "SUBMITTED",
            JobPosting = new JobPosting { JobId = 10, ClientProfileId = 7, Status = "OPEN" }
        };
        repo.Setup(x => x.GetByIdAsync(1)).ReturnsAsync(proposal);
        var gateway = new Mock<INegotiationGateway>();
        var service = new ProposalService(repo.Object, gateway.Object);

        var result = await service.AcceptAsync(1, 1);

        Assert.Equal("ACCEPTED", result.Status);
        gateway.Verify(x => x.OnProposalAcceptedAsync(1), Times.Once);
        repo.Verify(x => x.SaveChangesAsync(), Times.Once);
    }

    [Fact]
    public async Task Withdraw_RejectsAfterAccepted()
    {
        var repo = new Mock<IProposalRepository>();
        repo.Setup(x => x.GetExpertProfileByUserIdAsync(It.IsAny<int>()))
            .ReturnsAsync(new ExpertProfile { ExpertProfileId = 3, UserId = 2, ProfileReviewStatus = "APPROVED" });
        var proposal = new Proposal { ProposalId = 1, ExpertProfileId = 3, Status = "ACCEPTED" };
        repo.Setup(x => x.GetByIdAsync(1)).ReturnsAsync(proposal);
        var service = new ProposalService(repo.Object, Mock.Of<INegotiationGateway>());

        await Assert.ThrowsAsync<InvalidOperationException>(() => service.WithdrawAsync(2, 1));
    }

    [Fact]
    public async Task Reject_RejectsNonOwnerClient()
    {
        var repo = new Mock<IProposalRepository>();
        repo.Setup(x => x.GetClientProfileByUserIdAsync(It.IsAny<int>()))
            .ReturnsAsync(new ClientProfile { ClientProfileId = 999, UserId = 1 });
        var proposal = new Proposal
        {
            ProposalId = 1, JobId = 10, Status = "SUBMITTED",
            JobPosting = new JobPosting { JobId = 10, ClientProfileId = 7 }
        };
        repo.Setup(x => x.GetByIdAsync(1)).ReturnsAsync(proposal);
        var service = new ProposalService(repo.Object, Mock.Of<INegotiationGateway>());

        await Assert.ThrowsAsync<InvalidOperationException>(() => service.RejectAsync(1, 1));
    }

    [Fact]
    public async Task Reject_RejectsNotSelectedProposal()
    {
        var repo = new Mock<IProposalRepository>();
        repo.Setup(x => x.GetClientProfileByUserIdAsync(It.IsAny<int>()))
            .ReturnsAsync(new ClientProfile { ClientProfileId = 7, UserId = 1 });
        var proposal = new Proposal
        {
            ProposalId = 1, JobId = 10, Status = "NOT_SELECTED",
            JobPosting = new JobPosting { JobId = 10, ClientProfileId = 7 }
        };
        repo.Setup(x => x.GetByIdAsync(1)).ReturnsAsync(proposal);
        var service = new ProposalService(repo.Object, Mock.Of<INegotiationGateway>());

        await Assert.ThrowsAsync<InvalidOperationException>(() => service.RejectAsync(1, 1));
    }

    [Fact]
    public async Task Withdraw_RejectsNotSelectedProposal()
    {
        var repo = new Mock<IProposalRepository>();
        repo.Setup(x => x.GetExpertProfileByUserIdAsync(It.IsAny<int>()))
            .ReturnsAsync(new ExpertProfile { ExpertProfileId = 3, UserId = 2, ProfileReviewStatus = "APPROVED" });
        var proposal = new Proposal { ProposalId = 1, ExpertProfileId = 3, Status = "NOT_SELECTED" };
        repo.Setup(x => x.GetByIdAsync(1)).ReturnsAsync(proposal);
        var service = new ProposalService(repo.Object, Mock.Of<INegotiationGateway>());

        await Assert.ThrowsAsync<InvalidOperationException>(() => service.WithdrawAsync(2, 1));
    }
}
