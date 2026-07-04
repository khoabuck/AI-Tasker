using AITasker.Application.DTOs.Requests;
using AITasker.Application.DTOs.Responses;
using AITasker.Application.Interfaces;
using AITasker.Domain.Constants;
using AITasker.Domain.Entities;
using AITasker.Infrastructure.Data;
using AITasker.Infrastructure.Common;
using Microsoft.EntityFrameworkCore;

namespace AITasker.Infrastructure.Conversations
{
    public class ConversationService : IConversationService
    {
        private const string RoleAdmin = "ADMIN";
        private const string RoleClient = "CLIENT";
        private const string RoleExpert = "EXPERT";

        private const string StatusActive = "ACTIVE";

        private const string TypeDirectContact = "DIRECT_CONTACT";
        private const string TypeJobInquiry = "JOB_INQUIRY";
        private const string TypeProposalNegotiation = "PROPOSAL_NEGOTIATION";
        private const string TypeContractNegotiation = "CONTRACT_NEGOTIATION";
        private const string TypeProjectDiscussion = "PROJECT_DISCUSSION";
        private const string TypeMilestoneDiscussion = "MILESTONE_DISCUSSION";
        private const string TypeDisputeDiscussion = "DISPUTE_DISCUSSION";
        private const string TypeSupport = "SUPPORT";

        private const string MessageTypeText = "TEXT";
        private const string MessageTypeSystem = "SYSTEM";
        private const string MessageTypeFile = "FILE";
        private const string MessageTypeProposalVersion = "PROPOSAL_VERSION";
        private const string MessageTypeContractDraft = "CONTRACT_DRAFT";
        private const string MessageTypeMilestoneDraft = "MILESTONE_DRAFT";
        private const string MessageTypeDeliverable = "DELIVERABLE";
        private const string MessageTypeDisputeEvidence = "DISPUTE_EVIDENCE";

        private const string VietnamTimeZoneId = "SE Asia Standard Time";
        private const string VietnamTimeZoneName = "Asia/Ho_Chi_Minh";
        
        private readonly AITaskerDbContext _context;
        private readonly INotificationService _notificationService;

        public ConversationService(
            AITaskerDbContext context,
            INotificationService notificationService)
        {
            _context = context;
            _notificationService = notificationService;
        }

        public async Task<ConversationResponse> CreateOrGetConversationAsync(
            int currentUserId,
            CreateConversationRequest request)
        {
            if (request == null)
            {
                throw new InvalidOperationException("Conversation request is required.");
            }

            var currentUser = await GetUserOrThrowAsync(currentUserId);

            var resolution = await ResolveConversationAsync(
                currentUser,
                request);

            EnsureCanCreateConversation(
                currentUser,
                resolution.ClientUserId,
                resolution.ExpertUserId);

            var existingConversation = await _context.Conversations
                .FirstOrDefaultAsync(c =>
                    c.Status == StatusActive &&
                    c.ConversationType == resolution.ConversationType &&
                    c.ClientUserId == resolution.ClientUserId &&
                    c.ExpertUserId == resolution.ExpertUserId &&
                    c.RelatedJobId == resolution.RelatedJobId &&
                    c.RelatedProposalId == resolution.RelatedProposalId &&
                    c.RelatedContractId == resolution.RelatedContractId &&
                    c.RelatedProjectId == resolution.RelatedProjectId &&
                    c.RelatedMilestoneId == resolution.RelatedMilestoneId &&
                    c.RelatedDisputeId == resolution.RelatedDisputeId);

            if (existingConversation != null)
            {
                if (!string.IsNullOrWhiteSpace(request.InitialMessage))
                {
                    await AddMessageInternalAsync(
                        existingConversation,
                        currentUser,
                        request.InitialMessage.Trim(),
                        MessageTypeText,
                        null,
                        shouldNotify: true);
                }

                return await MapConversationAsync(existingConversation);
            }

            var conversation = new Conversation
            {
                ConversationType = resolution.ConversationType,
                CreatedByUserId = currentUser.UserId,
                ClientUserId = resolution.ClientUserId,
                ExpertUserId = resolution.ExpertUserId,
                RelatedJobId = resolution.RelatedJobId,
                RelatedProposalId = resolution.RelatedProposalId,
                RelatedContractId = resolution.RelatedContractId,
                RelatedProjectId = resolution.RelatedProjectId,
                RelatedMilestoneId = resolution.RelatedMilestoneId,
                RelatedDisputeId = resolution.RelatedDisputeId,
                Status = StatusActive,
                CreatedAt = VietnamDateTime.Now,
                LastMessageAt = null
            };

            _context.Conversations.Add(conversation);
            await _context.SaveChangesAsync();

            if (!string.IsNullOrWhiteSpace(request.InitialMessage))
            {
                await AddMessageInternalAsync(
                    conversation,
                    currentUser,
                    request.InitialMessage.Trim(),
                    MessageTypeText,
                    null,
                    shouldNotify: true);
            }
            else
            {
                await NotifyOtherPartyAsync(
                    conversation,
                    currentUser.UserId,
                    "New conversation",
                    $"A new {conversation.ConversationType.ToLowerInvariant()} conversation was started.",
                    NotificationTypes.ChatMessageReceived);
            }

            return await MapConversationAsync(conversation);
        }

        public async Task<IReadOnlyList<ConversationResponse>> GetMyConversationsAsync(
            int currentUserId)
        {
            var currentUser = await GetUserOrThrowAsync(currentUserId);

            IQueryable<Conversation> query = _context.Conversations
                .AsNoTracking()
                .Where(c => c.Status == StatusActive);

            if (!IsAdmin(currentUser))
            {
                query = query.Where(c =>
                    c.ClientUserId == currentUser.UserId ||
                    c.ExpertUserId == currentUser.UserId ||
                    c.CreatedByUserId == currentUser.UserId);
            }

            var conversations = await query
                .OrderByDescending(c => c.LastMessageAt ?? c.CreatedAt)
                .ToListAsync();

            var result = new List<ConversationResponse>();

            foreach (var conversation in conversations)
            {
                result.Add(await MapConversationAsync(conversation));
            }

            return result;
        }

        public async Task<ConversationResponse> GetConversationByIdAsync(
            int currentUserId,
            int conversationId)
        {
            var conversation = await EnsureCanAccessConversationAsync(
                currentUserId,
                conversationId);

            return await MapConversationAsync(conversation);
        }

        public async Task<IReadOnlyList<ConversationMessageResponse>> GetMessagesAsync(
            int currentUserId,
            int conversationId)
        {
            await EnsureCanAccessConversationAsync(
                currentUserId,
                conversationId);

            var messages = await _context.ConversationMessages
                .AsNoTracking()
                .Where(m => m.ConversationId == conversationId)
                .OrderBy(m => m.CreatedAt)
                .ThenBy(m => m.ConversationMessageId)
                .ToListAsync();

            var result = new List<ConversationMessageResponse>();

            foreach (var message in messages)
            {
                result.Add(await MapMessageAsync(message));
            }

            return result;
        }

        public async Task<ConversationMessageResponse> SendMessageAsync(
            int currentUserId,
            int conversationId,
            SendConversationMessageRequest request)
        {
            if (request == null)
            {
                throw new InvalidOperationException("Message request is required.");
            }

            if (string.IsNullOrWhiteSpace(request.Content))
            {
                throw new InvalidOperationException("Message content is required.");
            }

            if (request.Content.Trim().Length > 4000)
            {
                throw new InvalidOperationException("Message content cannot exceed 4000 characters.");
            }

            var messageType = NormalizeMessageType(request.MessageType);

            if (messageType == MessageTypeFile &&
                string.IsNullOrWhiteSpace(request.AttachmentUrl))
            {
                throw new InvalidOperationException("AttachmentUrl is required when message type is FILE.");
            }

            var currentUser = await GetUserOrThrowAsync(currentUserId);

            var conversation = await EnsureCanAccessConversationAsync(
                currentUserId,
                conversationId);

            return await AddMessageInternalAsync(
                conversation,
                currentUser,
                request.Content.Trim(),
                messageType,
                request.AttachmentUrl?.Trim(),
                shouldNotify: true);
        }

        private async Task<ConversationMessageResponse> AddMessageInternalAsync(
            Conversation conversation,
            User sender,
            string content,
            string messageType,
            string? attachmentUrl,
            bool shouldNotify)
        {
            var message = new ConversationMessage
            {
                ConversationId = conversation.ConversationId,
                SenderUserId = sender.UserId,
                Content = content,
                MessageType = messageType,
                AttachmentUrl = attachmentUrl,
                CreatedAt = VietnamDateTime.Now
            };

            _context.ConversationMessages.Add(message);

            conversation.LastMessageAt = message.CreatedAt;

            await _context.SaveChangesAsync();

            if (shouldNotify)
            {
                await NotifyOtherPartyAsync(
                    conversation,
                    sender.UserId,
                    "New message",
                    $"{sender.FullName} sent you a new message.",
                    NotificationTypes.ChatMessageReceived);
            }

            return await MapMessageAsync(message);
        }

        private async Task<Conversation> EnsureCanAccessConversationAsync(
            int currentUserId,
            int conversationId)
        {
            if (conversationId <= 0)
            {
                throw new InvalidOperationException("Conversation id is invalid.");
            }

            var currentUser = await GetUserOrThrowAsync(currentUserId);

            var conversation = await _context.Conversations
                .FirstOrDefaultAsync(c => c.ConversationId == conversationId);

            if (conversation == null)
            {
                throw new InvalidOperationException("Conversation not found.");
            }

            if (conversation.Status != StatusActive)
            {
                throw new InvalidOperationException("Conversation is not active.");
            }

            if (IsAdmin(currentUser))
            {
                return conversation;
            }

            var isParticipant =
                conversation.ClientUserId == currentUser.UserId ||
                conversation.ExpertUserId == currentUser.UserId ||
                conversation.CreatedByUserId == currentUser.UserId;

            if (!isParticipant)
            {
                throw new UnauthorizedAccessException("You do not have permission to access this conversation.");
            }

            return conversation;
        }

        private async Task<ConversationResolution> ResolveConversationAsync(
            User currentUser,
            CreateConversationRequest request)
        {
            var conversationType = NormalizeConversationType(
                request.ConversationType,
                request);

            int? clientUserId = request.ClientUserId;
            int? expertUserId = request.ExpertUserId;

            int? relatedJobId = request.RelatedJobId;
            int? relatedProposalId = request.RelatedProposalId;
            int? relatedContractId = request.RelatedContractId;
            int? relatedProjectId = request.RelatedProjectId;
            int? relatedMilestoneId = request.RelatedMilestoneId;
            int? relatedDisputeId = request.RelatedDisputeId;

            if (request.ClientProfileId.HasValue)
            {
                clientUserId = await ResolveClientUserIdAsync(request.ClientProfileId.Value);
            }

            if (request.ExpertProfileId.HasValue)
            {
                expertUserId = await ResolveExpertUserIdAsync(request.ExpertProfileId.Value);
            }

            if (relatedJobId.HasValue)
            {
                var job = await _context.JobPostings
                    .AsNoTracking()
                    .FirstOrDefaultAsync(j => j.JobPostingId == relatedJobId.Value);

                if (job == null)
                {
                    throw new InvalidOperationException("Related job not found.");
                }

                clientUserId = await ResolveClientUserIdAsync(job.ClientProfileId);
            }

            if (relatedProposalId.HasValue)
            {
                var proposalContext = await ResolveProposalContextAsync(relatedProposalId.Value);

                relatedJobId ??= proposalContext.JobId;
                clientUserId = proposalContext.ClientUserId;
                expertUserId = proposalContext.ExpertUserId;
            }

            if (relatedContractId.HasValue)
            {
                var contractContext = await ResolveContractContextAsync(relatedContractId.Value);

                relatedProposalId ??= contractContext.ProposalId;
                clientUserId = contractContext.ClientUserId;
                expertUserId = contractContext.ExpertUserId;
            }

            if (relatedProjectId.HasValue)
            {
                var projectContext = await ResolveProjectContextAsync(relatedProjectId.Value);

                relatedContractId ??= projectContext.ContractId;
                relatedProposalId ??= projectContext.ProposalId;
                clientUserId = projectContext.ClientUserId;
                expertUserId = projectContext.ExpertUserId;
            }

            if (relatedMilestoneId.HasValue)
            {
                var milestoneContext = await ResolveMilestoneContextAsync(relatedMilestoneId.Value);

                relatedProjectId ??= milestoneContext.ProjectId;
                relatedContractId ??= milestoneContext.ContractId;
                relatedProposalId ??= milestoneContext.ProposalId;
                clientUserId = milestoneContext.ClientUserId;
                expertUserId = milestoneContext.ExpertUserId;
            }

            if (relatedDisputeId.HasValue)
            {
                var disputeContext = await ResolveDisputeContextAsync(relatedDisputeId.Value);

                relatedProjectId ??= disputeContext.ProjectId;
                relatedMilestoneId ??= disputeContext.MilestoneId;
                relatedContractId ??= disputeContext.ContractId;
                relatedProposalId ??= disputeContext.ProposalId;
                clientUserId = disputeContext.ClientUserId;
                expertUserId = disputeContext.ExpertUserId;
            }

            if (IsClient(currentUser))
            {
                clientUserId ??= currentUser.UserId;
            }

            if (IsExpert(currentUser))
            {
                expertUserId ??= currentUser.UserId;
            }

            if (conversationType != TypeSupport)
            {
                if (!clientUserId.HasValue)
                {
                    throw new InvalidOperationException("Client user is required for this conversation.");
                }

                if (!expertUserId.HasValue)
                {
                    throw new InvalidOperationException("Expert user is required for this conversation.");
                }

                await EnsureUserHasRoleAsync(clientUserId.Value, RoleClient);
                await EnsureUserHasRoleAsync(expertUserId.Value, RoleExpert);
            }

            return new ConversationResolution
            {
                ConversationType = conversationType,
                ClientUserId = clientUserId,
                ExpertUserId = expertUserId,
                RelatedJobId = relatedJobId,
                RelatedProposalId = relatedProposalId,
                RelatedContractId = relatedContractId,
                RelatedProjectId = relatedProjectId,
                RelatedMilestoneId = relatedMilestoneId,
                RelatedDisputeId = relatedDisputeId
            };
        }

        private static void EnsureCanCreateConversation(
            User currentUser,
            int? clientUserId,
            int? expertUserId)
        {
            if (IsAdmin(currentUser))
            {
                return;
            }

            var isParticipant =
                clientUserId == currentUser.UserId ||
                expertUserId == currentUser.UserId;

            if (!isParticipant)
            {
                throw new UnauthorizedAccessException("You can only create conversations that include yourself.");
            }
        }

        private static string NormalizeConversationType(
            string? requestedType,
            CreateConversationRequest request)
        {
            if (!string.IsNullOrWhiteSpace(requestedType))
            {
                var normalized = requestedType.Trim().ToUpperInvariant();

                return normalized switch
                {
                    TypeDirectContact => normalized,
                    TypeJobInquiry => normalized,
                    TypeProposalNegotiation => normalized,
                    TypeContractNegotiation => normalized,
                    TypeProjectDiscussion => normalized,
                    TypeMilestoneDiscussion => normalized,
                    TypeDisputeDiscussion => normalized,
                    TypeSupport => normalized,
                    _ => throw new InvalidOperationException("Conversation type is invalid.")
                };
            }

            if (request.RelatedDisputeId.HasValue)
            {
                return TypeDisputeDiscussion;
            }

            if (request.RelatedMilestoneId.HasValue)
            {
                return TypeMilestoneDiscussion;
            }

            if (request.RelatedProjectId.HasValue)
            {
                return TypeProjectDiscussion;
            }

            if (request.RelatedContractId.HasValue)
            {
                return TypeContractNegotiation;
            }

            if (request.RelatedProposalId.HasValue)
            {
                return TypeProposalNegotiation;
            }

            if (request.RelatedJobId.HasValue)
            {
                return TypeJobInquiry;
            }

            return TypeDirectContact;
        }

        private static string NormalizeMessageType(string? messageType)
        {
            if (string.IsNullOrWhiteSpace(messageType))
            {
                return MessageTypeText;
            }

            var normalized = messageType.Trim().ToUpperInvariant();

            return normalized switch
            {
                MessageTypeText => normalized,
                MessageTypeSystem => normalized,
                MessageTypeFile => normalized,
                MessageTypeProposalVersion => normalized,
                MessageTypeContractDraft => normalized,
                MessageTypeMilestoneDraft => normalized,
                MessageTypeDeliverable => normalized,
                MessageTypeDisputeEvidence => normalized,
                _ => throw new InvalidOperationException("Message type is invalid.")
            };
        }

        private async Task<int> ResolveClientUserIdAsync(int clientProfileId)
        {
            var clientProfile = await _context.ClientProfiles
                .AsNoTracking()
                .FirstOrDefaultAsync(c => c.ClientProfileId == clientProfileId);

            if (clientProfile == null)
            {
                throw new InvalidOperationException("Client profile not found.");
            }

            return clientProfile.UserId;
        }

        private async Task<int> ResolveExpertUserIdAsync(int expertProfileId)
        {
            var expertProfile = await _context.ExpertProfiles
                .AsNoTracking()
                .FirstOrDefaultAsync(e => e.ExpertProfileId == expertProfileId);

            if (expertProfile == null)
            {
                throw new InvalidOperationException("Expert profile not found.");
            }

            return expertProfile.UserId;
        }

        private async Task<ProposalContext> ResolveProposalContextAsync(int proposalId)
        {
            var proposal = await _context.Proposals
                .AsNoTracking()
                .FirstOrDefaultAsync(p => p.ProposalId == proposalId);

            if (proposal == null)
            {
                throw new InvalidOperationException("Related proposal not found.");
            }

            var job = await _context.JobPostings
                .AsNoTracking()
                .FirstOrDefaultAsync(j => j.JobPostingId == proposal.JobId);

            if (job == null)
            {
                throw new InvalidOperationException("Related proposal job not found.");
            }

            var clientUserId = await ResolveClientUserIdAsync(job.ClientProfileId);
            var expertUserId = await ResolveExpertUserIdAsync(proposal.ExpertId);

            return new ProposalContext
            {
                ProposalId = proposal.ProposalId,
                JobId = proposal.JobId,
                ClientUserId = clientUserId,
                ExpertUserId = expertUserId
            };
        }

        private async Task<ContractContext> ResolveContractContextAsync(int contractId)
        {
            var contract = await _context.ProjectContracts
                .AsNoTracking()
                .FirstOrDefaultAsync(c => c.ContractId == contractId);

            if (contract == null)
            {
                throw new InvalidOperationException("Related contract not found.");
            }

            var clientUserId = await ResolveClientUserIdAsync(contract.ClientId);
            var expertUserId = await ResolveExpertUserIdAsync(contract.ExpertId);

            return new ContractContext
            {
                ContractId = contract.ContractId,
                ProposalId = contract.ProposalId,
                ClientUserId = clientUserId,
                ExpertUserId = expertUserId
            };
        }

        private async Task<ProjectContext> ResolveProjectContextAsync(int projectId)
        {
            var project = await _context.Projects
                .AsNoTracking()
                .FirstOrDefaultAsync(p => p.ProjectId == projectId);

            if (project == null)
            {
                throw new InvalidOperationException("Related project not found.");
            }

            var contractContext = await ResolveContractContextAsync(project.ContractId);

            return new ProjectContext
            {
                ProjectId = project.ProjectId,
                ContractId = project.ContractId,
                ProposalId = contractContext.ProposalId,
                ClientUserId = contractContext.ClientUserId,
                ExpertUserId = contractContext.ExpertUserId
            };
        }

        private async Task<MilestoneContext> ResolveMilestoneContextAsync(int milestoneId)
        {
            var milestone = await _context.Milestones
                .AsNoTracking()
                .FirstOrDefaultAsync(m => m.MilestoneId == milestoneId);

            if (milestone == null)
            {
                throw new InvalidOperationException("Related milestone not found.");
            }

            var projectContext = await ResolveProjectContextAsync(milestone.ProjectId);

            return new MilestoneContext
            {
                MilestoneId = milestone.MilestoneId,
                ProjectId = milestone.ProjectId,
                ContractId = projectContext.ContractId,
                ProposalId = projectContext.ProposalId,
                ClientUserId = projectContext.ClientUserId,
                ExpertUserId = projectContext.ExpertUserId
            };
        }

        private async Task<DisputeContext> ResolveDisputeContextAsync(int disputeId)
        {
            var dispute = await _context.Disputes
                .AsNoTracking()
                .FirstOrDefaultAsync(d => d.DisputeId == disputeId);

            if (dispute == null)
            {
                throw new InvalidOperationException("Related dispute not found.");
            }

            var projectContext = await ResolveProjectContextAsync(dispute.ProjectId);

            return new DisputeContext
            {
                DisputeId = dispute.DisputeId,
                ProjectId = dispute.ProjectId,
                MilestoneId = dispute.MilestoneId,
                ContractId = projectContext.ContractId,
                ProposalId = projectContext.ProposalId,
                ClientUserId = projectContext.ClientUserId,
                ExpertUserId = projectContext.ExpertUserId
            };
        }

        private async Task EnsureUserHasRoleAsync(int userId, string expectedRole)
        {
            var user = await GetUserOrThrowAsync(userId);

            if (!string.Equals(user.Role, expectedRole, StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException($"User {userId} must have role {expectedRole}.");
            }
        }

        private async Task<User> GetUserOrThrowAsync(int userId)
        {
            var user = await _context.Users
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.UserId == userId);

            if (user == null)
            {
                throw new InvalidOperationException("User not found.");
            }

            return user;
        }

        private async Task NotifyOtherPartyAsync(
            Conversation conversation,
            int senderUserId,
            string title,
            string content,
            string type)
        {
            var receiverUserId = ResolveReceiverUserId(conversation, senderUserId);

            if (!receiverUserId.HasValue)
            {
                return;
            }

            await _notificationService.CreateNotificationAsync(
                receiverUserId.Value,
                title,
                content,
                type,
                relatedEntityType: "CONVERSATION",
                relatedEntityId: conversation.ConversationId,
                relatedJobId: conversation.RelatedJobId,
                relatedProposalId: conversation.RelatedProposalId,
                relatedContractId: conversation.RelatedContractId,
                relatedProjectId: conversation.RelatedProjectId,
                relatedMilestoneId: conversation.RelatedMilestoneId,
                relatedDisputeId: conversation.RelatedDisputeId,
                relatedConversationId: conversation.ConversationId);
        }

        private static int? ResolveReceiverUserId(
            Conversation conversation,
            int senderUserId)
        {
            if (conversation.ClientUserId.HasValue &&
                conversation.ClientUserId.Value != senderUserId)
            {
                return conversation.ClientUserId.Value;
            }

            if (conversation.ExpertUserId.HasValue &&
                conversation.ExpertUserId.Value != senderUserId)
            {
                return conversation.ExpertUserId.Value;
            }

            return null;
        }

        private async Task<ConversationResponse> MapConversationAsync(
            Conversation conversation)
        {
            var clientUser = conversation.ClientUserId.HasValue
                ? await _context.Users
                    .AsNoTracking()
                    .FirstOrDefaultAsync(u => u.UserId == conversation.ClientUserId.Value)
                : null;

            var expertUser = conversation.ExpertUserId.HasValue
                ? await _context.Users
                    .AsNoTracking()
                    .FirstOrDefaultAsync(u => u.UserId == conversation.ExpertUserId.Value)
                : null;

            var job = conversation.RelatedJobId.HasValue
                ? await _context.JobPostings
                    .AsNoTracking()
                    .FirstOrDefaultAsync(j => j.JobPostingId == conversation.RelatedJobId.Value)
                : null;

            var project = conversation.RelatedProjectId.HasValue
                ? await _context.Projects
                    .AsNoTracking()
                    .FirstOrDefaultAsync(p => p.ProjectId == conversation.RelatedProjectId.Value)
                : null;

            var milestone = conversation.RelatedMilestoneId.HasValue
                ? await _context.Milestones
                    .AsNoTracking()
                    .FirstOrDefaultAsync(m => m.MilestoneId == conversation.RelatedMilestoneId.Value)
                : null;

            var lastMessage = await _context.ConversationMessages
                .AsNoTracking()
                .Where(m => m.ConversationId == conversation.ConversationId)
                .OrderByDescending(m => m.CreatedAt)
                .ThenByDescending(m => m.ConversationMessageId)
                .FirstOrDefaultAsync();

            return new ConversationResponse
            {
                ConversationId = conversation.ConversationId,
                ConversationType = conversation.ConversationType,
                Status = conversation.Status,
                CreatedByUserId = conversation.CreatedByUserId,

                ClientUserId = conversation.ClientUserId,
                ClientName = clientUser?.FullName,
                ClientAvatarUrl = clientUser?.AvatarUrl,

                ExpertUserId = conversation.ExpertUserId,
                ExpertName = expertUser?.FullName,
                ExpertAvatarUrl = expertUser?.AvatarUrl,

                RelatedJobId = conversation.RelatedJobId,
                RelatedJobTitle = job?.Title,

                RelatedProposalId = conversation.RelatedProposalId,
                RelatedContractId = conversation.RelatedContractId,

                RelatedProjectId = conversation.RelatedProjectId,
                RelatedProjectTitle = project?.Title,

                RelatedMilestoneId = conversation.RelatedMilestoneId,
                RelatedMilestoneTitle = milestone?.Title,

                RelatedDisputeId = conversation.RelatedDisputeId,

                LastMessageContent = lastMessage?.Content,

                CreatedAt = ConvertUtcToVietnamTime(SpecifyUtc(conversation.CreatedAt)),
                CreatedAtUtc = SpecifyUtc(conversation.CreatedAt),

                LastMessageAt = conversation.LastMessageAt.HasValue
                    ? ConvertUtcToVietnamTime(SpecifyUtc(conversation.LastMessageAt.Value))
                    : null,

                LastMessageAtUtc = conversation.LastMessageAt.HasValue
                    ? SpecifyUtc(conversation.LastMessageAt.Value)
                    : null,

                TimeZone = VietnamTimeZoneName
            };
        }

        private async Task<ConversationMessageResponse> MapMessageAsync(
            ConversationMessage message)
        {
            var sender = await _context.Users
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.UserId == message.SenderUserId);

            return new ConversationMessageResponse
            {
                ConversationMessageId = message.ConversationMessageId,
                ConversationId = message.ConversationId,
                SenderUserId = message.SenderUserId,
                SenderName = sender?.FullName ?? string.Empty,
                SenderRole = sender?.Role ?? string.Empty,
                SenderAvatarUrl = sender?.AvatarUrl,
                Content = message.Content,
                MessageType = message.MessageType,
                AttachmentUrl = message.AttachmentUrl,
                CreatedAt = ConvertUtcToVietnamTime(SpecifyUtc(message.CreatedAt)),
                CreatedAtUtc = SpecifyUtc(message.CreatedAt),
                TimeZone = VietnamTimeZoneName
            };
        }

        private static bool IsAdmin(User user)
        {
            return string.Equals(user.Role, RoleAdmin, StringComparison.OrdinalIgnoreCase);
        }

        private static DateTime SpecifyUtc(DateTime value)
        {
            if (value.Kind == DateTimeKind.Utc)
            {
                return value;
            }

            return DateTime.SpecifyKind(value, DateTimeKind.Utc);
        }

        private static DateTime ConvertUtcToVietnamTime(DateTime utcDateTime)
        {
            try
            {
                var timeZone = TimeZoneInfo.FindSystemTimeZoneById(VietnamTimeZoneId);
                return TimeZoneInfo.ConvertTimeFromUtc(utcDateTime, timeZone);
            }
            catch (TimeZoneNotFoundException)
            {
                return utcDateTime.AddHours(7);
            }
            catch (InvalidTimeZoneException)
            {
                return utcDateTime.AddHours(7);
            }
        }

        private static bool IsClient(User user)
        {
            return string.Equals(user.Role, RoleClient, StringComparison.OrdinalIgnoreCase);
        }

        private static bool IsExpert(User user)
        {
            return string.Equals(user.Role, RoleExpert, StringComparison.OrdinalIgnoreCase);
        }

        private sealed class ConversationResolution
        {
            public string ConversationType { get; set; } = TypeDirectContact;

            public int? ClientUserId { get; set; }

            public int? ExpertUserId { get; set; }

            public int? RelatedJobId { get; set; }

            public int? RelatedProposalId { get; set; }

            public int? RelatedContractId { get; set; }

            public int? RelatedProjectId { get; set; }

            public int? RelatedMilestoneId { get; set; }

            public int? RelatedDisputeId { get; set; }
        }

        private sealed class ProposalContext
        {
            public int ProposalId { get; set; }

            public int JobId { get; set; }

            public int ClientUserId { get; set; }

            public int ExpertUserId { get; set; }
        }

        private sealed class ContractContext
        {
            public int ContractId { get; set; }

            public int ProposalId { get; set; }

            public int ClientUserId { get; set; }

            public int ExpertUserId { get; set; }
        }

        private sealed class ProjectContext
        {
            public int ProjectId { get; set; }

            public int ContractId { get; set; }

            public int ProposalId { get; set; }

            public int ClientUserId { get; set; }

            public int ExpertUserId { get; set; }
        }

        private sealed class MilestoneContext
        {
            public int MilestoneId { get; set; }

            public int ProjectId { get; set; }

            public int ContractId { get; set; }

            public int ProposalId { get; set; }

            public int ClientUserId { get; set; }

            public int ExpertUserId { get; set; }
        }

        private sealed class DisputeContext
        {
            public int DisputeId { get; set; }

            public int ProjectId { get; set; }

            public int? MilestoneId { get; set; }

            public int ContractId { get; set; }

            public int ProposalId { get; set; }

            public int ClientUserId { get; set; }

            public int ExpertUserId { get; set; }
        }
    }
}