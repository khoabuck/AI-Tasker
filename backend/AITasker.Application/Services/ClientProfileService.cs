using System.Net.Mail;
using AITasker.Application.DTOs.Requests;
using AITasker.Application.DTOs.Responses;
using AITasker.Application.Interfaces;
using AITasker.Domain.Entities;

namespace AITasker.Application.Services;

public class ClientProfileService : IClientProfileService
{
    private const decimal IndividualClientPlatformFeeRate = 5.00m;
    private const decimal BusinessClientPlatformFeeRate = 10.00m;

    private readonly IUserRepository _userRepository;
    private readonly IClientProfileRepository _clientProfileRepository;
    private readonly IBusinessVerificationProvider _businessVerificationProvider;

    public ClientProfileService(
        IUserRepository userRepository,
        IClientProfileRepository clientProfileRepository,
        IBusinessVerificationProvider businessVerificationProvider)
    {
        _userRepository = userRepository;
        _clientProfileRepository = clientProfileRepository;
        _businessVerificationProvider = businessVerificationProvider;
    }

    public async Task<ClientProfileResponse> CreateIndividualAsync(
        int userId,
        CreateIndividualClientProfileRequest request)
    {
        var user = await ValidateClientCanCreateProfileAsync(userId);

        var phoneNumber = request.PhoneNumber?.Trim() ?? string.Empty;

        if (string.IsNullOrWhiteSpace(phoneNumber))
        {
            throw new InvalidOperationException("Phone number is required.");
        }

        ValidateBudget(request.ExpectedBudgetMin, request.ExpectedBudgetMax);

        var clientProfile = new ClientProfile
        {
            UserId = user.UserId,
            ClientType = "INDIVIDUAL",
            PhoneNumber = phoneNumber,
            Address = NormalizeNullableText(request.Address),
            AiNeeds = NormalizeNullableText(request.AiNeeds),
            MainProblems = NormalizeNullableText(request.MainProblems),
            ExpectedBudgetMin = request.ExpectedBudgetMin,
            ExpectedBudgetMax = request.ExpectedBudgetMax,
            PlatformFeeRate = IndividualClientPlatformFeeRate,
            CreatedAt = DateTime.UtcNow
        };

        user.Status = "ACTIVE";
        user.UpdatedAt = DateTime.UtcNow;

        await _clientProfileRepository.AddAsync(clientProfile);
        await _clientProfileRepository.SaveChangesAsync();

        clientProfile.User = user;

        return MapToClientProfileResponse(clientProfile);
    }

    public async Task<ClientProfileResponse> CreateBusinessAsync(
        int userId,
        CreateBusinessClientProfileRequest request)
    {
        var user = await ValidateClientCanCreateProfileAsync(userId);

        var phoneNumber = request.PhoneNumber?.Trim() ?? string.Empty;
        var companyName = request.CompanyName?.Trim() ?? string.Empty;
        var taxCode = request.TaxCode?.Trim() ?? string.Empty;
        var industry = request.Industry?.Trim() ?? string.Empty;
        var companyAddress = request.CompanyAddress?.Trim() ?? string.Empty;
        var businessEmail = NormalizeNullableText(request.BusinessEmail);
        var businessPhone = NormalizeNullableText(request.BusinessPhone);

        if (string.IsNullOrWhiteSpace(phoneNumber))
        {
            throw new InvalidOperationException("Phone number is required.");
        }

        ValidateBusinessVerificationInput(
            companyName,
            taxCode,
            industry,
            companyAddress,
            businessEmail
        );

        var taxCodeExists = await _clientProfileRepository.TaxCodeExistsAsync(
            taxCode
        );

        if (taxCodeExists)
        {
            throw new InvalidOperationException("Tax code already exists.");
        }

        ValidateBudget(request.ExpectedBudgetMin, request.ExpectedBudgetMax);

        var verificationResult = await VerifyBusinessAsync(
            companyName,
            taxCode,
            industry,
            companyAddress,
            businessEmail,
            businessPhone
        );

        var businessVerificationStatus = NormalizeVerificationStatus(
            verificationResult.Status
        );

        var businessProfile = new BusinessProfile
        {
            CompanyName = companyName,
            TaxCode = taxCode,
            Industry = industry,
            CompanyAddress = companyAddress,
            BusinessEmail = businessEmail,
            BusinessPhone = businessPhone,
            VerificationStatus = businessVerificationStatus,
            VerificationNote = verificationResult.Note,
            VerifiedAt = businessVerificationStatus == "VERIFIED"
                ? DateTime.UtcNow
                : null,
            CreatedAt = DateTime.UtcNow
        };

        var clientProfile = new ClientProfile
        {
            UserId = user.UserId,
            ClientType = "BUSINESS",
            PhoneNumber = phoneNumber,
            Address = NormalizeNullableText(request.Address),
            AiNeeds = NormalizeNullableText(request.AiNeeds),
            MainProblems = NormalizeNullableText(request.MainProblems),
            ExpectedBudgetMin = request.ExpectedBudgetMin,
            ExpectedBudgetMax = request.ExpectedBudgetMax,
            PlatformFeeRate = BusinessClientPlatformFeeRate,
            CreatedAt = DateTime.UtcNow,
            BusinessProfile = businessProfile
        };

        user.Status = businessVerificationStatus == "VERIFIED"
            ? "ACTIVE"
            : "PENDING_BUSINESS_VERIFICATION";

        user.UpdatedAt = DateTime.UtcNow;

        await _clientProfileRepository.AddAsync(clientProfile);
        await _clientProfileRepository.SaveChangesAsync();

        clientProfile.User = user;

        return MapToClientProfileResponse(clientProfile);
    }

    public async Task<ClientProfileResponse> ResubmitBusinessAsync(
        int userId,
        CreateBusinessClientProfileRequest request)
    {
        var clientProfile = await _clientProfileRepository.GetByUserIdAsync(
            userId
        );

        if (clientProfile == null)
        {
            throw new InvalidOperationException("Client profile not found.");
        }

        if (clientProfile.BusinessProfile == null)
        {
            throw new InvalidOperationException("Business profile not found.");
        }

        var user = clientProfile.User;
        var businessProfile = clientProfile.BusinessProfile;

        if (user.Status == "SUSPENDED" || user.Status == "BANNED")
        {
            throw new InvalidOperationException(
                "Your account is not allowed to resubmit business profile."
            );
        }

        if (user.Role != "CLIENT")
        {
            throw new InvalidOperationException(
                "Only CLIENT role can resubmit business profile."
            );
        }

        if (user.Status != "BUSINESS_REJECTED"
            || businessProfile.VerificationStatus != "REJECTED")
        {
            throw new InvalidOperationException(
                "Only rejected business profiles can be resubmitted."
            );
        }

        var phoneNumber = request.PhoneNumber?.Trim() ?? string.Empty;
        var companyName = request.CompanyName?.Trim() ?? string.Empty;
        var taxCode = request.TaxCode?.Trim() ?? string.Empty;
        var industry = request.Industry?.Trim() ?? string.Empty;
        var companyAddress = request.CompanyAddress?.Trim() ?? string.Empty;
        var businessEmail = NormalizeNullableText(request.BusinessEmail);
        var businessPhone = NormalizeNullableText(request.BusinessPhone);

        if (string.IsNullOrWhiteSpace(phoneNumber))
        {
            throw new InvalidOperationException("Phone number is required.");
        }

        ValidateBusinessVerificationInput(
            companyName,
            taxCode,
            industry,
            companyAddress,
            businessEmail
        );

        var taxCodeExists = await _clientProfileRepository
            .TaxCodeExistsExceptBusinessProfileAsync(
                taxCode,
                businessProfile.BusinessProfileId
            );

        if (taxCodeExists)
        {
            throw new InvalidOperationException("Tax code already exists.");
        }

        ValidateBudget(request.ExpectedBudgetMin, request.ExpectedBudgetMax);

        var verificationResult = await VerifyBusinessAsync(
            companyName,
            taxCode,
            industry,
            companyAddress,
            businessEmail,
            businessPhone
        );

        var businessVerificationStatus = NormalizeVerificationStatus(
            verificationResult.Status
        );

        clientProfile.ClientType = "BUSINESS";
        clientProfile.PhoneNumber = phoneNumber;
        clientProfile.Address = NormalizeNullableText(request.Address);
        clientProfile.AiNeeds = NormalizeNullableText(request.AiNeeds);
        clientProfile.MainProblems = NormalizeNullableText(request.MainProblems);
        clientProfile.ExpectedBudgetMin = request.ExpectedBudgetMin;
        clientProfile.ExpectedBudgetMax = request.ExpectedBudgetMax;
        clientProfile.PlatformFeeRate = BusinessClientPlatformFeeRate;
        clientProfile.UpdatedAt = DateTime.UtcNow;

        businessProfile.CompanyName = companyName;
        businessProfile.TaxCode = taxCode;
        businessProfile.Industry = industry;
        businessProfile.CompanyAddress = companyAddress;
        businessProfile.BusinessEmail = businessEmail;
        businessProfile.BusinessPhone = businessPhone;
        businessProfile.VerificationStatus = businessVerificationStatus;
        businessProfile.VerificationNote = verificationResult.Note;
        businessProfile.VerifiedAt = businessVerificationStatus == "VERIFIED"
            ? DateTime.UtcNow
            : null;
        businessProfile.UpdatedAt = DateTime.UtcNow;

        user.Status = businessVerificationStatus == "VERIFIED"
            ? "ACTIVE"
            : "PENDING_BUSINESS_VERIFICATION";

        user.UpdatedAt = DateTime.UtcNow;

        await _clientProfileRepository.SaveChangesAsync();

        return MapToClientProfileResponse(clientProfile);
    }

    public async Task<ClientProfileResponse?> GetMyProfileAsync(int userId)
    {
        var clientProfile = await _clientProfileRepository.GetByUserIdAsync(
            userId
        );

        return clientProfile == null
            ? null
            : MapToClientProfileResponse(clientProfile);
    }

    private async Task<User> ValidateClientCanCreateProfileAsync(int userId)
    {
        var user = await _userRepository.GetByIdAsync(userId);

        if (user == null)
        {
            throw new InvalidOperationException("User not found.");
        }

        if (user.Status == "SUSPENDED" || user.Status == "BANNED")
        {
            throw new InvalidOperationException(
                "Your account is not allowed to create profile."
            );
        }

        if (user.Role != "CLIENT")
        {
            throw new InvalidOperationException(
                "Only CLIENT role can create client profile."
            );
        }

        if (user.Status != "PENDING_PROFILE")
        {
            throw new InvalidOperationException(
                "User is not in pending profile status."
            );
        }

        var existingProfile = await _clientProfileRepository.GetByUserIdAsync(
            userId
        );

        if (existingProfile != null)
        {
            throw new InvalidOperationException("Client profile already exists.");
        }

        return user;
    }

    private async Task<BusinessVerificationProviderResult> VerifyBusinessAsync(
        string companyName,
        string taxCode,
        string industry,
        string companyAddress,
        string? businessEmail,
        string? businessPhone)
    {
        return await _businessVerificationProvider.VerifyAsync(
            new BusinessVerificationProviderRequest
            {
                CompanyName = companyName,
                TaxCode = taxCode,
                Industry = industry,
                CompanyAddress = companyAddress,
                BusinessEmail = businessEmail,
                BusinessPhone = businessPhone
            }
        );
    }

    private static void ValidateBusinessVerificationInput(
        string companyName,
        string taxCode,
        string industry,
        string companyAddress,
        string? businessEmail)
    {
        if (string.IsNullOrWhiteSpace(companyName))
        {
            throw new InvalidOperationException("Company name is required.");
        }

        if (companyName.Length < 2 || companyName.Length > 255)
        {
            throw new InvalidOperationException(
                "Company name length is invalid."
            );
        }

        if (string.IsNullOrWhiteSpace(taxCode))
        {
            throw new InvalidOperationException("Tax code is required.");
        }

        if (!taxCode.All(char.IsDigit))
        {
            throw new InvalidOperationException(
                "Tax code must contain digits only."
            );
        }

        if (taxCode.Length != 10 && taxCode.Length != 13)
        {
            throw new InvalidOperationException(
                "Tax code must be 10 or 13 digits."
            );
        }

        if (string.IsNullOrWhiteSpace(industry))
        {
            throw new InvalidOperationException("Industry is required.");
        }

        if (industry.Length < 2 || industry.Length > 100)
        {
            throw new InvalidOperationException("Industry length is invalid.");
        }

        if (string.IsNullOrWhiteSpace(companyAddress))
        {
            throw new InvalidOperationException(
                "Company address is required."
            );
        }

        if (companyAddress.Length < 5 || companyAddress.Length > 500)
        {
            throw new InvalidOperationException(
                "Company address length is invalid."
            );
        }

        if (!string.IsNullOrWhiteSpace(businessEmail)
            && !IsValidEmail(businessEmail))
        {
            throw new InvalidOperationException(
                "Business email format is invalid."
            );
        }
    }

    private static void ValidateBudget(decimal? min, decimal? max)
    {
        if (min.HasValue && min.Value < 0)
        {
            throw new InvalidOperationException(
                "Expected budget min must be greater than or equal to 0."
            );
        }

        if (max.HasValue && max.Value < 0)
        {
            throw new InvalidOperationException(
                "Expected budget max must be greater than or equal to 0."
            );
        }

        if (min.HasValue && max.HasValue && min.Value > max.Value)
        {
            throw new InvalidOperationException(
                "Expected budget min must be less than or equal to max."
            );
        }
    }

    private static string NormalizeVerificationStatus(string? status)
    {
        var value = status?.Trim().ToUpperInvariant();

        return value == "VERIFIED"
            ? "VERIFIED"
            : "PENDING_REVIEW";
    }

    private static string? NormalizeNullableText(string? value)
    {
        var text = value?.Trim();

        return string.IsNullOrWhiteSpace(text)
            ? null
            : text;
    }

    private static bool IsValidEmail(string email)
    {
        try
        {
            var mailAddress = new MailAddress(email);

            return mailAddress.Address.Equals(
                email,
                StringComparison.OrdinalIgnoreCase
            );
        }
        catch
        {
            return false;
        }
    }

    private static ClientProfileResponse MapToClientProfileResponse(
        ClientProfile clientProfile)
    {
        return new ClientProfileResponse
        {
            ClientProfileId = clientProfile.ClientProfileId,
            UserId = clientProfile.UserId,
            ClientType = clientProfile.ClientType,
            PhoneNumber = clientProfile.PhoneNumber,
            Address = clientProfile.Address,
            AiNeeds = clientProfile.AiNeeds,
            MainProblems = clientProfile.MainProblems,
            ExpectedBudgetMin = clientProfile.ExpectedBudgetMin,
            ExpectedBudgetMax = clientProfile.ExpectedBudgetMax,
            PlatformFeeRate = clientProfile.PlatformFeeRate,
            UserStatus = clientProfile.User.Status,
            BusinessProfile = clientProfile.BusinessProfile == null
                ? null
                : new BusinessProfileResponse
                {
                    BusinessProfileId =
                        clientProfile.BusinessProfile.BusinessProfileId,
                    ClientProfileId =
                        clientProfile.BusinessProfile.ClientProfileId,
                    CompanyName =
                        clientProfile.BusinessProfile.CompanyName,
                    TaxCode =
                        clientProfile.BusinessProfile.TaxCode,
                    Industry =
                        clientProfile.BusinessProfile.Industry,
                    CompanyAddress =
                        clientProfile.BusinessProfile.CompanyAddress,
                    BusinessEmail =
                        clientProfile.BusinessProfile.BusinessEmail,
                    BusinessPhone =
                        clientProfile.BusinessProfile.BusinessPhone,
                    VerificationStatus =
                        clientProfile.BusinessProfile.VerificationStatus,
                    VerificationNote =
                        clientProfile.BusinessProfile.VerificationNote,
                    VerifiedAt =
                        clientProfile.BusinessProfile.VerifiedAt
                }
        };
    }
}