using System.Threading.Tasks;
using AITasker.Application.DTOs.Requests;

namespace AITasker.Application.Interfaces
{
    public interface IProjectContractService
    {
        Task<bool> CreateDraftContractAsync(CreateContractRequest request);
        
        Task<bool> ConfirmContractAsync(int contractId, int userId, string userRole);
    }
}