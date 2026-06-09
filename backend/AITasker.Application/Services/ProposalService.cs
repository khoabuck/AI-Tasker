using AITasker.Application.DTOs.Requests;
using AITasker.Application.DTOs.Responses;
using AITasker.Application.Interfaces;
using AITasker.Domain.Entities;

namespace AITasker.Application.Services;

public class ProposalService : IProposalService
{
    private readonly IProposalRepository _proposalRepository;
    private readonly INegotiationGateway _negotiationGateway;

    public ProposalService(
        IProposalRepository proposalRepository,
        INegotiationGateway negotiationGateway)
    {
        _proposalRepository = proposalRepository;
        _negotiationGateway = negotiationGateway;
    }

    public async Task<ProposalResponse> SubmitAsync(int userId, int jobId, CreateProposalRequest request)
    {
        var expert = await _proposalRepository.GetExpertProfileByUserIdAsync(userId)
            ?? throw new InvalidOperationException("Expert profile not found.");

        if (!string.Equals(expert.ProfileReviewStatus, "APPROVED", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Only an approved expert can submit a proposal.");
        }

        var job = await _proposalRepository.GetJobByIdAsync(jobId)
            ?? throw new InvalidOperationException("Job not found.");

        if (job.Status != "OPEN")
        {
            throw new InvalidOperationException("Proposals can only be submitted to OPEN jobs.");
        }

        if (await _proposalRepository.ExistsByJobAndExpertAsync(jobId, expert.ExpertProfileId))
        {
            throw new InvalidOperationException("You already submitted a proposal for this job.");
        }

        ValidateProposalFields(request);

        var proposal = new Proposal
        {
            JobId = jobId,
            ExpertProfileId = expert.ExpertProfileId,
            CoverLetter = request.CoverLetter.Trim(),
            ProposedPrice = request.ProposedPrice,
            ProposedTimelineDays = request.ProposedTimelineDays,
            ExpectedOutputs = request.ExpectedOutputs.Trim(),
            WorkingApproach = request.WorkingApproach.Trim(),
            PreliminaryMilestonePlan = Nullable(request.PreliminaryMilestonePlan),
            Status = "SUBMITTED",
            CreatedAt = DateTime.UtcNow
        };

        await _proposalRepository.AddAsync(proposal);
        await _proposalRepository.SaveChangesAsync();

        var reloaded = await _proposalRepository.GetByIdAsync(proposal.ProposalId) ?? proposal;
        return ToResponse(reloaded);
    }

    public async Task<List<ProposalResponse>> GetForJobAsync(int userId, int jobId)
    {
        var client = await _proposalRepository.GetClientProfileByUserIdAsync(userId)
            ?? throw new InvalidOperationException("Client profile not found.");

        var job = await _proposalRepository.GetJobByIdAsync(jobId)
            ?? throw new InvalidOperationException("Job not found.");

        if (job.ClientProfileId != client.ClientProfileId)
        {
            throw new InvalidOperationException("You do not own this job.");
        }

        var proposals = await _proposalRepository.GetByJobIdAsync(jobId);
        return proposals.Select(ToResponse).ToList();
    }

    public async Task<ProposalResponse> GetByIdAsync(int userId, int proposalId)
    {
        var proposal = await _proposalRepository.GetByIdAsync(proposalId)
            ?? throw new InvalidOperationException("Proposal not found.");

        var client = await _proposalRepository.GetClientProfileByUserIdAsync(userId);
        var expert = await _proposalRepository.GetExpertProfileByUserIdAsync(userId);

        var isJobClient = client != null && proposal.JobPosting.ClientProfileId == client.ClientProfileId;
        var isProposalExpert = expert != null && proposal.ExpertProfileId == expert.ExpertProfileId;

        if (!isJobClient && !isProposalExpert)
        {
            throw new InvalidOperationException("You cannot view this proposal.");
        }

        return ToResponse(proposal);
    }

    public async Task<List<ProposalResponse>> GetMineAsync(int userId)
    {
        var expert = await _proposalRepository.GetExpertProfileByUserIdAsync(userId)
            ?? throw new InvalidOperationException("Expert profile not found.");

        var proposals = await _proposalRepository.GetByExpertProfileIdAsync(expert.ExpertProfileId);
        return proposals.Select(ToResponse).ToList();
    }

    public async Task<ProposalResponse> CounterOfferAsync(int userId, int proposalId, CounterOfferRequest request)
    {
        var (proposal, _) = await GetProposalForOwningClientAsync(userId, proposalId);

        if (proposal.Status is not ("SUBMITTED" or "COUNTER_OFFERED"))
        {
            throw new InvalidOperationException("Counter offer is only allowed on active proposals.");
        }
        if (request.CounterPrice < 0) throw new InvalidOperationException("Counter price must be >= 0.");
        if (request.CounterTimelineDays <= 0) throw new InvalidOperationException("Counter timeline must be > 0.");

        proposal.CounterPrice = request.CounterPrice;
        proposal.CounterTimelineDays = request.CounterTimelineDays;
        proposal.CounterMessage = Nullable(request.CounterMessage);
        proposal.Status = "COUNTER_OFFERED";

        await _proposalRepository.SaveChangesAsync();
        return ToResponse(proposal);
    }

    public async Task<ProposalResponse> AcceptAsync(int userId, int proposalId)
    {
        var (proposal, _) = await GetProposalForOwningClientAsync(userId, proposalId);

        if (proposal.Status is not ("SUBMITTED" or "COUNTER_OFFERED"))
        {
            throw new InvalidOperationException("Only an active proposal can be accepted.");
        }

        proposal.Status = "ACCEPTED";
        await _proposalRepository.SaveChangesAsync();
        // Status is committed BEFORE notifying the gateway, so the ACCEPTED state survives
        // even if the gateway throws. BE3's real implementation must therefore be idempotent
        // / retry-safe: a failure here surfaces to the caller while the proposal is already ACCEPTED.
        await _negotiationGateway.OnProposalAcceptedAsync(proposal.ProposalId);
        return ToResponse(proposal);
    }

    public async Task<ProposalResponse> RejectAsync(int userId, int proposalId)
    {
        var (proposal, _) = await GetProposalForOwningClientAsync(userId, proposalId);

        if (proposal.Status is "ACCEPTED" or "REJECTED" or "WITHDRAWN" or "NOT_SELECTED")
        {
            throw new InvalidOperationException("This proposal can no longer be rejected.");
        }

        proposal.Status = "REJECTED";
        await _proposalRepository.SaveChangesAsync();
        return ToResponse(proposal);
    }

    public async Task<ProposalResponse> WithdrawAsync(int userId, int proposalId)
    {
        var expert = await _proposalRepository.GetExpertProfileByUserIdAsync(userId)
            ?? throw new InvalidOperationException("Expert profile not found.");

        var proposal = await _proposalRepository.GetByIdAsync(proposalId)
            ?? throw new InvalidOperationException("Proposal not found.");

        if (proposal.ExpertProfileId != expert.ExpertProfileId)
        {
            throw new InvalidOperationException("You do not own this proposal.");
        }

        if (proposal.Status is "ACCEPTED" or "REJECTED" or "WITHDRAWN" or "NOT_SELECTED")
        {
            throw new InvalidOperationException("This proposal can no longer be withdrawn.");
        }

        proposal.Status = "WITHDRAWN";
        await _proposalRepository.SaveChangesAsync();
        return ToResponse(proposal);
    }

    private async Task<(Proposal, ClientProfile)> GetProposalForOwningClientAsync(int userId, int proposalId)
    {
        var client = await _proposalRepository.GetClientProfileByUserIdAsync(userId)
            ?? throw new InvalidOperationException("Client profile not found.");

        var proposal = await _proposalRepository.GetByIdAsync(proposalId)
            ?? throw new InvalidOperationException("Proposal not found.");

        if (proposal.JobPosting.ClientProfileId != client.ClientProfileId)
        {
            throw new InvalidOperationException("You do not own the job for this proposal.");
        }

        return (proposal, client);
    }

    private static void ValidateProposalFields(CreateProposalRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.CoverLetter))
            throw new InvalidOperationException("Cover letter is required.");
        if (string.IsNullOrWhiteSpace(request.ExpectedOutputs))
            throw new InvalidOperationException("Expected outputs are required.");
        if (string.IsNullOrWhiteSpace(request.WorkingApproach))
            throw new InvalidOperationException("Working approach is required.");
        if (request.ProposedPrice < 0)
            throw new InvalidOperationException("Proposed price must be >= 0.");
        if (request.ProposedTimelineDays <= 0)
            throw new InvalidOperationException("Proposed timeline must be > 0.");
    }

    private static string? Nullable(string? value)
        => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static ProposalResponse ToResponse(Proposal proposal)
    {
        return new ProposalResponse
        {
            ProposalId = proposal.ProposalId,
            JobId = proposal.JobId,
            ExpertProfileId = proposal.ExpertProfileId,
            CoverLetter = proposal.CoverLetter,
            ProposedPrice = proposal.ProposedPrice,
            ProposedTimelineDays = proposal.ProposedTimelineDays,
            ExpectedOutputs = proposal.ExpectedOutputs,
            WorkingApproach = proposal.WorkingApproach,
            PreliminaryMilestonePlan = proposal.PreliminaryMilestonePlan,
            CounterPrice = proposal.CounterPrice,
            CounterTimelineDays = proposal.CounterTimelineDays,
            CounterMessage = proposal.CounterMessage,
            Status = proposal.Status,
            CreatedAt = proposal.CreatedAt
        };
    }
}
