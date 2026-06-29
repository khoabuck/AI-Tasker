using System;
using System.Threading.Tasks;

namespace AITasker.Application.Interfaces
{
    public interface INotificationRealtimeService
    {
        Task SendNotificationAsync(
            int userId,
            int notificationId,
            string title,
            string content,
            string type,
            DateTime createdAt,
            string? relatedEntityType = null,
            int? relatedEntityId = null,
            int? relatedJobId = null,
            int? relatedProposalId = null,
            int? relatedContractId = null,
            int? relatedProjectId = null,
            int? relatedMilestoneId = null,
            int? relatedDeliverableId = null,
            int? relatedDisputeId = null,
            int? relatedConversationId = null);
    }
}
