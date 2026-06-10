using AITasker.Application.DTOs.Responses;

namespace AITasker.Application.Interfaces;

public interface IImageUploadService
{
    Task<UploadImageResponse> UploadImageAsync(
        Stream fileStream,
        string fileName,
        string contentType,
        long fileLength,
        string folder
    );
}