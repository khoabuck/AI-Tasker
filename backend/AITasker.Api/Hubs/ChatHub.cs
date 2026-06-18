using System.Security.Claims;
using AITasker.Domain.Entities;
using AITasker.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace AITasker.Api.Hubs
{
    [Authorize]
    public class ChatHub : Hub
    {
        private readonly AITaskerDbContext _context;

        public ChatHub(AITaskerDbContext context)
        {
            _context = context;
        }

        public async Task JoinConversation(int conversationId)
        {
            if (conversationId <= 0)
            {
                throw new HubException("Invalid conversation id.");
            }

            var currentUserId = GetCurrentUserId();

            await EnsureCanAccessProposalConversationAsync(
                conversationId,
                currentUserId);

            await Groups.AddToGroupAsync(
                Context.ConnectionId,
                GetConversationGroupName(conversationId));

            await Clients.Caller.SendAsync("JoinedConversation", new
            {
                conversationId,
                userId = currentUserId
            });
        }

        public async Task LeaveConversation(int conversationId)
        {
            await Groups.RemoveFromGroupAsync(
                Context.ConnectionId,
                GetConversationGroupName(conversationId));

            await Clients.Caller.SendAsync("LeftConversation", new
            {
                conversationId
            });
        }

        public async Task SendMessage(int conversationId, string message)
        {
            if (conversationId <= 0)
            {
                throw new HubException("Invalid conversation id.");
            }

            if (string.IsNullOrWhiteSpace(message))
            {
                throw new HubException("Message cannot be empty.");
            }

            var currentUserId = GetCurrentUserId();

            await EnsureCanAccessProposalConversationAsync(
                conversationId,
                currentUserId);

            var proposalMessage = new ProposalMessage
            {
                ProposalId = conversationId,
                SenderUserId = currentUserId,
                Content = message.Trim(),
                MessageType = "TEXT",
                IsAgreementMarked = false,
                CreatedAt = DateTime.UtcNow
            };

            _context.ProposalMessages.Add(proposalMessage);
            await _context.SaveChangesAsync();

            await Clients
                .Group(GetConversationGroupName(conversationId))
                .SendAsync("ReceiveMessage", new
                {
                    conversationId,
                    messageId = proposalMessage.ProposalMessageId,
                    senderId = currentUserId,
                    content = proposalMessage.Content,
                    messageType = proposalMessage.MessageType,
                    isAgreementMarked = proposalMessage.IsAgreementMarked,
                    createdAt = proposalMessage.CreatedAt
                });
        }

        public async Task MarkAsAgreed(int conversationId)
        {
            if (conversationId <= 0)
            {
                throw new HubException("Invalid conversation id.");
            }

            var currentUserId = GetCurrentUserId();

            var conversation = await EnsureCanAccessProposalConversationAsync(
                conversationId,
                currentUserId);

            var alreadyMarked = await _context.ProposalMessages.AnyAsync(m =>
                m.ProposalId == conversationId &&
                m.SenderUserId == currentUserId &&
                m.IsAgreementMarked);

            if (!alreadyMarked)
            {
                _context.ProposalMessages.Add(new ProposalMessage
                {
                    ProposalId = conversationId,
                    SenderUserId = currentUserId,
                    Content = "Marked as agreed.",
                    MessageType = "AGREEMENT",
                    IsAgreementMarked = true,
                    CreatedAt = DateTime.UtcNow
                });

                await _context.SaveChangesAsync();
            }

            var clientAgreed = await HasMarkedAgreementAsync(
                conversationId,
                conversation.ClientProfile.UserId);

            var expertAgreed = await HasMarkedAgreementAsync(
                conversationId,
                conversation.ExpertProfile.UserId);

            await Clients
                .Group(GetConversationGroupName(conversationId))
                .SendAsync("AgreementUpdated", new
                {
                    conversationId,
                    clientUserId = conversation.ClientProfile.UserId,
                    expertUserId = conversation.ExpertProfile.UserId,
                    clientAgreed,
                    expertAgreed,
                    bothAgreed = clientAgreed && expertAgreed,
                    updatedAt = DateTime.UtcNow
                });
        }

        private async Task<bool> HasMarkedAgreementAsync(
            int proposalId,
            int userId)
        {
            return await _context.ProposalMessages.AnyAsync(m =>
                m.ProposalId == proposalId &&
                m.SenderUserId == userId &&
                m.IsAgreementMarked);
        }

        private async Task<ProposalConversationContext> EnsureCanAccessProposalConversationAsync(
            int proposalId,
            int currentUserId)
        {
            var proposal = await _context.Proposals
                .AsNoTracking()
                .FirstOrDefaultAsync(p => p.ProposalId == proposalId);

            if (proposal == null)
            {
                throw new HubException("Proposal conversation not found.");
            }

            var job = await _context.JobPostings
                .AsNoTracking()
                .FirstOrDefaultAsync(j => j.JobPostingId == proposal.JobId);

            if (job == null)
            {
                throw new HubException("Job posting not found.");
            }

            var clientProfile = await _context.ClientProfiles
                .AsNoTracking()
                .FirstOrDefaultAsync(c => c.ClientProfileId == job.ClientProfileId);

            var expertProfile = await _context.ExpertProfiles
                .AsNoTracking()
                .FirstOrDefaultAsync(e => e.ExpertProfileId == proposal.ExpertId);

            if (clientProfile == null || expertProfile == null)
            {
                throw new HubException("Conversation parties are invalid.");
            }

            var user = await _context.Users
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.UserId == currentUserId);

            if (user == null)
            {
                throw new HubException("Unauthorized.");
            }

            var userBelongsToProposal =
                clientProfile.UserId == currentUserId ||
                expertProfile.UserId == currentUserId;

            var userIsAdmin = string.Equals(
                user.Role,
                "ADMIN",
                StringComparison.OrdinalIgnoreCase);

            if (!userBelongsToProposal && !userIsAdmin)
            {
                throw new HubException("You do not have permission to access this conversation.");
            }

            return new ProposalConversationContext(
                proposal,
                clientProfile,
                expertProfile);
        }

        private int GetCurrentUserId()
        {
            var userIdValue =
                Context.User?.FindFirstValue("userId")
                ?? Context.User?.FindFirstValue(ClaimTypes.NameIdentifier)
                ?? Context.User?.FindFirstValue("sub");

            if (!int.TryParse(userIdValue, out var userId))
            {
                throw new HubException("Unauthorized or invalid user token structure.");
            }

            return userId;
        }

        private static string GetConversationGroupName(int conversationId)
        {
            return $"Conversation_{conversationId}";
        }

        private sealed record ProposalConversationContext(
            Proposal Proposal,
            ClientProfile ClientProfile,
            ExpertProfile ExpertProfile);
    }
}