using AITasker.Application.DTOs.Requests;
using AITasker.Application.DTOs.Responses;
using AITasker.Application.Interfaces;
using AITasker.Domain.Entities;

namespace AITasker.Application.Services;

public class BusinessVerificationService : IBusinessVerificationService
{
    private readonly IBusinessVerificationRepository _businessVerificationRepository;

    public BusinessVerificationService(
        IBusinessVerificationRepository businessVerificationRepository)
    {
        _businessVerificationRepository = businessVerificationRepository;
    }

    public async Task<List<BusinessVerificationResponse>> GetPendingAsync()
    {
        var businessProfiles = await _businessVerificationRepository.GetPendingAsync();

        return businessProfiles
            .Select(MapToResponse)
            .ToList();
    }

    public async Task<BusinessVerificationResponse> ApproveAsync(int businessProfileId)
    {
        var businessProfile = await _businessVerificationRepository.GetByIdAsync(
            businessProfileId
        );

        if (businessProfile == null)
        {
            throw new InvalidOperationException("Business profile not found.");
        }

        if (!IsPendingVerification(businessProfile.VerificationStatus))
        {
            throw new InvalidOperationException("Business verification is not pending.");
        }

        var user = businessProfile.ClientProfile.User;

        businessProfile.VerificationStatus = "VERIFIED";
        businessProfile.VerificationNote = "Approved by Admin.";
        businessProfile.VerifiedAt = DateTime.UtcNow;
        businessProfile.UpdatedAt = DateTime.UtcNow;

        user.Status = "ACTIVE";
        user.UpdatedAt = DateTime.UtcNow;

        await _businessVerificationRepository.SaveChangesAsync();

        return MapToResponse(businessProfile);
    }

    public async Task<BusinessVerificationResponse> RejectAsync(
        int businessProfileId,
        RejectBusinessVerificationRequest request)
    {
        var businessProfile = await _businessVerificationRepository.GetByIdAsync(
            businessProfileId
        );

        if (businessProfile == null)
        {
            throw new InvalidOperationException("Business profile not found.");
        }

        if (!IsPendingVerification(businessProfile.VerificationStatus))
        {
            throw new InvalidOperationException("Business verification is not pending.");
        }

        var note = request.Note?.Trim() ?? string.Empty;

        if (string.IsNullOrWhiteSpace(note))
        {
            throw new InvalidOperationException("Rejection note is required.");
        }

        if (note.Length > 1000)
        {
            throw new InvalidOperationException(
                "Rejection note must not exceed 1000 characters."
            );
        }

        var user = businessProfile.ClientProfile.User;

        businessProfile.VerificationStatus = "REJECTED";
        businessProfile.VerificationNote = note;
        businessProfile.VerifiedAt = null;
        businessProfile.UpdatedAt = DateTime.UtcNow;

        user.Status = "BUSINESS_REJECTED";
        user.UpdatedAt = DateTime.UtcNow;

        await _businessVerificationRepository.SaveChangesAsync();

        return MapToResponse(businessProfile);
    }

    private static bool IsPendingVerification(string verificationStatus)
    {
        return verificationStatus == "PENDING"
            || verificationStatus == "PENDING_REVIEW";
    }

    private static BusinessVerificationResponse MapToResponse(
        BusinessProfile businessProfile)
    {
        var clientProfile = businessProfile.ClientProfile;
        var user = clientProfile.User;

        return new BusinessVerificationResponse
        {
            BusinessProfileId = businessProfile.BusinessProfileId,
            ClientProfileId = businessProfile.ClientProfileId,
            UserId = user.UserId,
            UserEmail = user.Email,
            FullName = user.FullName,
            UserStatus = user.Status,
            CompanyName = businessProfile.CompanyName,
            TaxCode = businessProfile.TaxCode,
            Industry = businessProfile.Industry,
            CompanyAddress = businessProfile.CompanyAddress,
            BusinessEmail = businessProfile.BusinessEmail,
            BusinessPhone = businessProfile.BusinessPhone,
            VerificationStatus = businessProfile.VerificationStatus,
            VerificationNote = businessProfile.VerificationNote,
            VerifiedAt = businessProfile.VerifiedAt,
            CreatedAt = businessProfile.CreatedAt
        };
    }
}