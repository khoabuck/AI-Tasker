using AITasker.Application.DTOs.Responses;
using AITasker.Application.Interfaces;
using CloudinaryDotNet;
using CloudinaryDotNet.Actions;
using Microsoft.Extensions.Configuration;

namespace AITasker.Infrastructure.Services;

public class CloudinaryImageUploadService : IImageUploadService
{
    private const long MaxFileSize = 5 * 1024 * 1024;

    private static readonly string[] AllowedContentTypes =
    {
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp"
    };

    private readonly Cloudinary _cloudinary;
    private readonly string _rootFolder;

    public CloudinaryImageUploadService(IConfiguration configuration)
    {
        var cloudName = configuration["Cloudinary:CloudName"];
        var apiKey = configuration["Cloudinary:ApiKey"];
        var apiSecret = configuration["Cloudinary:ApiSecret"];

        _rootFolder = configuration["Cloudinary:Folder"] ?? "aitasker";

        if (string.IsNullOrWhiteSpace(cloudName) ||
            string.IsNullOrWhiteSpace(apiKey) ||
            string.IsNullOrWhiteSpace(apiSecret))
        {
            throw new InvalidOperationException("Cloudinary configuration is missing.");
        }

        var account = new Account(cloudName, apiKey, apiSecret);
        _cloudinary = new Cloudinary(account);
        _cloudinary.Api.Secure = true;
    }

    public async Task<UploadImageResponse> UploadImageAsync(
        Stream fileStream,
        string fileName,
        string contentType,
        long fileLength,
        string folder)
    {
        ValidateImage(fileName, contentType, fileLength);

        var safeFolder = $"{_rootFolder}/{NormalizeFolder(folder)}";

        var uploadParams = new ImageUploadParams
        {
            File = new FileDescription(fileName, fileStream),
            Folder = safeFolder,
            UseFilename = false,
            UniqueFilename = true,
            Overwrite = false
        };

        var uploadResult = await _cloudinary.UploadAsync(uploadParams);

        if (uploadResult.Error != null)
        {
            throw new InvalidOperationException(uploadResult.Error.Message);
        }

        if (uploadResult.SecureUrl == null)
        {
            throw new InvalidOperationException("Upload failed. Cloudinary did not return image URL.");
        }

        return new UploadImageResponse
        {
            Url = uploadResult.SecureUrl.ToString(),
            PublicId = uploadResult.PublicId,
            Format = uploadResult.Format,
            Width = uploadResult.Width,
            Height = uploadResult.Height,
            Bytes = uploadResult.Bytes
        };
    }

    private static void ValidateImage(string fileName, string contentType, long fileLength)
    {
        if (string.IsNullOrWhiteSpace(fileName))
        {
            throw new InvalidOperationException("File name is required.");
        }

        if (fileLength <= 0)
        {
            throw new InvalidOperationException("File is empty.");
        }

        if (fileLength > MaxFileSize)
        {
            throw new InvalidOperationException("Image size must be less than or equal to 5MB.");
        }

        if (!AllowedContentTypes.Contains(contentType.ToLower()))
        {
            throw new InvalidOperationException("Only JPG, JPEG, PNG, and WEBP images are allowed.");
        }
    }

    private static string NormalizeFolder(string folder)
    {
        if (string.IsNullOrWhiteSpace(folder))
        {
            return "images";
        }

        return folder
            .Trim()
            .ToLower()
            .Replace(" ", "-")
            .Replace("_", "-");
    }
}