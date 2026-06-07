using AITasker.Application.DTOs.Requests;
using AITasker.Application.DTOs.Responses;

namespace AITasker.Application.Interfaces;

public interface IUrlInspectionService
{
    Task<List<UrlInspectionResult>> InspectAsync(
        List<UrlInspectionTarget> targets,
        CancellationToken cancellationToken = default
    );
}