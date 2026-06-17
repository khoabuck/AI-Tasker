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

        var phoneNumber = ValidateAndNormalizePhoneNumber(request.PhoneNumber);
        var address = request.Address?.Trim() ?? string.Empty;

        if (string.IsNullOrWhiteSpace(address))
        {
            throw new InvalidOperationException("Address is required.");
        }

        ValidateMaxLength(address, 500, "Address");

        var clientProfile = new ClientProfile
        {
            UserId = user.UserId,
            ClientType = "INDIVIDUAL",
            PhoneNumber = phoneNumber,
            Address = address,

            // Individual không dùng các field này.
            // Hiện tại để null vì entity/database vẫn còn cột.
            AiNeeds = null,
            MainProblems = null,
            ExpectedBudgetMin = null,
            ExpectedBudgetMax = null,

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

        var phoneNumber = ValidateAndNormalizePhoneNumber(request.PhoneNumber);
        var companyName = request.CompanyName?.Trim() ?? string.Empty;
        var taxCode = request.TaxCode?.Trim() ?? string.Empty;
        var industry = request.Industry?.Trim() ?? string.Empty;
        var companyAddress = request.CompanyAddress?.Trim() ?? string.Empty;
        var businessEmail = NormalizeNullableText(request.BusinessEmail);
        var businessPhone = ValidateAndNormalizeOptionalPhoneNumber(
            request.BusinessPhone,
            "Business phone"
        );

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
            VerificationNote = TruncateNote(verificationResult.Note),
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

        user.Status = MapUserStatusFromBusinessVerification(
            businessVerificationStatus
        );

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

        var canResubmitAfterCorrection =
            user.Status == "BUSINESS_NEEDS_CORRECTION"
            && businessProfile.VerificationStatus == "NEEDS_CORRECTION";

        var canResubmitAfterAdminReject =
            user.Status == "BUSINESS_REJECTED"
            && businessProfile.VerificationStatus == "REJECTED";

        if (!canResubmitAfterCorrection && !canResubmitAfterAdminReject)
        {
            throw new InvalidOperationException(
                "Only business profiles needing correction or rejected can be resubmitted."
            );
        }

        var phoneNumber = ValidateAndNormalizePhoneNumber(request.PhoneNumber);
        var companyName = request.CompanyName?.Trim() ?? string.Empty;
        var taxCode = request.TaxCode?.Trim() ?? string.Empty;
        var industry = request.Industry?.Trim() ?? string.Empty;
        var companyAddress = request.CompanyAddress?.Trim() ?? string.Empty;
        var businessEmail = NormalizeNullableText(request.BusinessEmail);
        var businessPhone = ValidateAndNormalizeOptionalPhoneNumber(
            request.BusinessPhone,
            "Business phone"
        );

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
        businessProfile.VerificationNote = TruncateNote(verificationResult.Note);
        businessProfile.VerifiedAt = businessVerificationStatus == "VERIFIED"
            ? DateTime.UtcNow
            : null;
        businessProfile.UpdatedAt = DateTime.UtcNow;

        user.Status = MapUserStatusFromBusinessVerification(
            businessVerificationStatus
        );

        user.UpdatedAt = DateTime.UtcNow;

        await _clientProfileRepository.SaveChangesAsync();

        return MapToClientProfileResponse(clientProfile);
    }

    public async Task<ClientProfileResponse> UpdateIndividualAsync(
        int userId,
        UpdateIndividualClientProfileRequest request)
    {
        var clientProfile = await _clientProfileRepository.GetByUserIdAsync(
            userId
        );

        if (clientProfile == null)
        {
            throw new InvalidOperationException("Client profile not found.");
        }

        var user = clientProfile.User;

        if (user == null)
        {
            throw new InvalidOperationException("User not found.");
        }

        if (user.Status == "SUSPENDED" || user.Status == "BANNED")
        {
            throw new InvalidOperationException(
                "Your account is not allowed to update client profile."
            );
        }

        if (user.Role != "CLIENT")
        {
            throw new InvalidOperationException(
                "Only CLIENT role can update client profile."
            );
        }

        if (clientProfile.ClientType != "INDIVIDUAL")
        {
            throw new InvalidOperationException(
                "This API only supports individual client profile update."
            );
        }

        ValidateIndividualProfileUpdateRequest(request);

        var phoneNumber = ValidateAndNormalizePhoneNumber(request.PhoneNumber);
        var address = request.Address!.Trim();

        clientProfile.PhoneNumber = phoneNumber;
        clientProfile.Address = address;

        // Individual không dùng các field này.
        // Hiện tại để null vì entity/database vẫn còn cột.
        clientProfile.AiNeeds = null;
        clientProfile.MainProblems = null;
        clientProfile.ExpectedBudgetMin = null;
        clientProfile.ExpectedBudgetMax = null;

        clientProfile.PlatformFeeRate = IndividualClientPlatformFeeRate;
        clientProfile.UpdatedAt = DateTime.UtcNow;

        user.UpdatedAt = DateTime.UtcNow;

        await _clientProfileRepository.SaveChangesAsync();

        return MapToClientProfileResponse(clientProfile);
    }

    public async Task<ClientProfileResponse> UpdateBusinessAsync(
        int userId,
        UpdateBusinessClientProfileRequest request)
    {
        var clientProfile = await _clientProfileRepository.GetByUserIdAsync(
            userId
        );

        if (clientProfile == null)
        {
            throw new InvalidOperationException("Client profile not found.");
        }

        var user = clientProfile.User;

        if (user == null)
        {
            throw new InvalidOperationException("User not found.");
        }

        if (user.Status == "SUSPENDED" || user.Status == "BANNED")
        {
            throw new InvalidOperationException(
                "Your account is not allowed to update client profile."
            );
        }

        if (user.Role != "CLIENT")
        {
            throw new InvalidOperationException(
                "Only CLIENT role can update client profile."
            );
        }

        if (clientProfile.ClientType != "BUSINESS")
        {
            throw new InvalidOperationException(
                "This API only supports business client profile update."
            );
        }

        if (clientProfile.BusinessProfile == null)
        {
            throw new InvalidOperationException("Business profile not found.");
        }

        ValidateBusinessProfileUpdateRequest(request);
        ValidateBudget(request.ExpectedBudgetMin, request.ExpectedBudgetMax);

        var phoneNumber = ValidateAndNormalizePhoneNumber(request.PhoneNumber);
        var businessPhone = ValidateAndNormalizeOptionalPhoneNumber(
            request.BusinessPhone,
            "Business phone"
        );

        user.FullName = request.FullName!.Trim();

        if (request.AvatarUrl != null)
        {
            user.AvatarUrl = NormalizeNullableText(request.AvatarUrl);
        }

        user.UpdatedAt = DateTime.UtcNow;

        clientProfile.PhoneNumber = phoneNumber;
        clientProfile.Address = NormalizeNullableText(request.Address);
        clientProfile.AiNeeds = NormalizeNullableText(request.AiNeeds);
        clientProfile.MainProblems = NormalizeNullableText(request.MainProblems);
        clientProfile.ExpectedBudgetMin = request.ExpectedBudgetMin;
        clientProfile.ExpectedBudgetMax = request.ExpectedBudgetMax;
        clientProfile.PlatformFeeRate = BusinessClientPlatformFeeRate;
        clientProfile.UpdatedAt = DateTime.UtcNow;

        clientProfile.BusinessProfile.BusinessEmail =
            NormalizeNullableText(request.BusinessEmail);

        clientProfile.BusinessProfile.BusinessPhone = businessPhone;

        clientProfile.BusinessProfile.UpdatedAt = DateTime.UtcNow;

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

    private static void ValidateIndividualProfileUpdateRequest(
        UpdateIndividualClientProfileRequest request)
    {
        ValidateAndNormalizePhoneNumber(request.PhoneNumber);

        if (string.IsNullOrWhiteSpace(request.Address))
        {
            throw new InvalidOperationException("Address is required.");
        }

        ValidateMaxLength(request.Address, 500, "Address");
    }

    private static void ValidateBusinessProfileUpdateRequest(
        UpdateBusinessClientProfileRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.FullName))
        {
            throw new InvalidOperationException("Full name is required.");
        }

        var fullName = request.FullName.Trim();

        if (fullName.Length < 2 || fullName.Length > 255)
        {
            throw new InvalidOperationException("Full name length is invalid.");
        }

        ValidateAndNormalizePhoneNumber(request.PhoneNumber);

        if (!string.IsNullOrWhiteSpace(request.BusinessEmail)
            && !IsValidEmail(request.BusinessEmail.Trim()))
        {
            throw new InvalidOperationException(
                "Business email format is invalid."
            );
        }

        ValidateAndNormalizeOptionalPhoneNumber(
            request.BusinessPhone,
            "Business phone"
        );

        ValidateMaxLength(request.Address, 500, "Address");
        ValidateMaxLength(request.AiNeeds, 1000, "AI needs");
        ValidateMaxLength(request.MainProblems, 1000, "Main problems");
        ValidateMaxLength(request.AvatarUrl, 500, "Avatar URL");
        ValidateMaxLength(request.BusinessEmail, 255, "Business email");
    }

    private static string ValidateAndNormalizePhoneNumber(
        string? value,
        string fieldName = "Phone number")
    {
        var phoneNumber = value?.Trim() ?? string.Empty;

        if (string.IsNullOrWhiteSpace(phoneNumber))
        {
            throw new InvalidOperationException($"{fieldName} is required.");
        }

        if (phoneNumber.Length != 10 || phoneNumber[0] != '0')
        {
            throw new InvalidOperationException(
                $"{fieldName} must start with 0 and contain exactly 10 digits."
            );
        }

        foreach (var character in phoneNumber)
        {
            if (!char.IsDigit(character))
            {
                throw new InvalidOperationException(
                    $"{fieldName} must start with 0 and contain exactly 10 digits."
                );
            }
        }

        return phoneNumber;
    }

    private static string? ValidateAndNormalizeOptionalPhoneNumber(
        string? value,
        string fieldName)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        return ValidateAndNormalizePhoneNumber(value, fieldName);
    }

    private static void ValidateMaxLength(
        string? value,
        int maxLength,
        string fieldName)
    {
        if (!string.IsNullOrWhiteSpace(value)
            && value.Trim().Length > maxLength)
        {
            throw new InvalidOperationException(
                $"{fieldName} must be at most {maxLength} characters."
            );
        }
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

        return value switch
        {
            "VERIFIED" => "VERIFIED",
            "NEEDS_CORRECTION" => "NEEDS_CORRECTION",
            _ => "PENDING_REVIEW"
        };
    }

    private static string MapUserStatusFromBusinessVerification(
        string verificationStatus)
    {
        return verificationStatus switch
        {
            "VERIFIED" => "ACTIVE",
            "NEEDS_CORRECTION" => "BUSINESS_NEEDS_CORRECTION",
            _ => "PENDING_BUSINESS_VERIFICATION"
        };
    }

    private static string? NormalizeNullableText(string? value)
    {
        var text = value?.Trim();

        return string.IsNullOrWhiteSpace(text)
            ? null
            : text;
    }

    private static string? TruncateNote(string? note)
    {
        if (string.IsNullOrWhiteSpace(note))
        {
            return null;
        }

        return note.Length <= 1000
            ? note
            : note[..1000];
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
            FullName = clientProfile.User.FullName,
            Email = clientProfile.User.Email,
            AvatarUrl = clientProfile.User.AvatarUrl,
            ClientType = clientProfile.ClientType,
            PhoneNumber = clientProfile.PhoneNumber,
            Address = clientProfile.Address,

            AiNeeds = clientProfile.ClientType == "BUSINESS"
                ? clientProfile.AiNeeds
                : null,

            MainProblems = clientProfile.ClientType == "BUSINESS"
                ? clientProfile.MainProblems
                : null,

            ExpectedBudgetMin = clientProfile.ClientType == "BUSINESS"
                ? clientProfile.ExpectedBudgetMin
                : null,

            ExpectedBudgetMax = clientProfile.ClientType == "BUSINESS"
                ? clientProfile.ExpectedBudgetMax
                : null,

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