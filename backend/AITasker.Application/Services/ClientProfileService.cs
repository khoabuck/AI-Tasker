using System.Net.Mail;
using AITasker.Application.DTOs.Requests;
using AITasker.Application.DTOs.Responses;
using AITasker.Application.Interfaces;
using AITasker.Domain.Entities;
using AITasker.Application.Common;

namespace AITasker.Application.Services;

public class ClientProfileService : IClientProfileService
{
    private const int MaxBusinessVerificationSubmissions = 5;
    private static readonly TimeSpan BusinessVerificationLockDuration =
        TimeSpan.FromHours(24);

    private const string PendingCompanyName = "Pending VietQR verification";
    private const string PendingCompanyAddress = "Pending VietQR verification";

    private readonly IUserRepository _userRepository;
    private readonly IClientProfileRepository _clientProfileRepository;
    private readonly IBusinessVerificationProvider _businessVerificationProvider;
    private readonly IPlatformFeePolicyService _platformFeePolicyService;
    private readonly IJobPostingAiPolicyService _jobPostingAiPolicyService;

    public ClientProfileService(
        IUserRepository userRepository,
        IClientProfileRepository clientProfileRepository,
        IBusinessVerificationProvider businessVerificationProvider,
        IPlatformFeePolicyService platformFeePolicyService,
        IJobPostingAiPolicyService jobPostingAiPolicyService)
    {
        _userRepository = userRepository;
        _clientProfileRepository = clientProfileRepository;
        _businessVerificationProvider = businessVerificationProvider;
        _platformFeePolicyService = platformFeePolicyService;
        _jobPostingAiPolicyService = jobPostingAiPolicyService;
    }

    public async Task<ClientProfileResponse> CreateIndividualAsync(
        int userId,
        CreateIndividualClientProfileRequest request)
    {
        var user = await ValidateClientCanCreateProfileAsync(userId);

        var phoneNumber = ValidateAndNormalizePhoneNumber(request.PhoneNumber);

        if (await _clientProfileRepository.PhoneNumberExistsAsync(phoneNumber))
        {
            throw new InvalidOperationException("Phone number already exists.");
        }

        var address = request.Address?.Trim() ?? string.Empty;

        if (string.IsNullOrWhiteSpace(address))
        {
            throw new InvalidOperationException("Address is required.");
        }

        ValidateMaxLength(address, 500, "Address");

        var jobPostingAiPolicy = await _jobPostingAiPolicyService
            .GetOrCreateActivePolicyEntityAsync();

        var clientProfile = new ClientProfile
        {
            UserId = user.UserId,
            ClientType = "INDIVIDUAL",
            PhoneNumber = phoneNumber,
            Address = address,
            PlatformFeeRate = await _platformFeePolicyService.GetFeeRateForClientTypeAsync("INDIVIDUAL"),
            FreeJobPostCredits = jobPostingAiPolicy.InitialFreeJobPostCredits,
            PaidJobPostCredits = 0,
            FreeAiGenerationCredits = jobPostingAiPolicy.InitialFreeAiGenerationCredits,
            PaidAiGenerationCredits = 0,
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

        if (await _clientProfileRepository.PhoneNumberExistsAsync(phoneNumber))
        {
            throw new InvalidOperationException("Phone number already exists.");
        }

        var representativeAddress = request.Address?.Trim() ?? string.Empty;

        if (string.IsNullOrWhiteSpace(representativeAddress))
        {
            throw new InvalidOperationException(
                "Representative address is required."
            );
        }

        ValidateMaxLength(
            representativeAddress,
            500,
            "Representative address"
        );

        var taxCode = request.TaxCode?.Trim() ?? string.Empty;
        var industry = request.Industry?.Trim() ?? string.Empty;
        var businessEmail = NormalizeOptionalEmail(request.BusinessEmail);
        var businessPhone = ValidateAndNormalizeOptionalPhoneNumber(
            request.BusinessPhone,
            "Business phone"
        );

        ValidateBusinessVerificationInput(
            taxCode,
            industry,
            businessEmail
        );

        if (businessEmail != null
            && await _clientProfileRepository.BusinessEmailExistsAsync(businessEmail))
        {
            throw new InvalidOperationException("Business email already exists.");
        }

        var taxCodeExists = await _clientProfileRepository.TaxCodeExistsAsync(
            taxCode
        );

        if (taxCodeExists)
        {
            throw new InvalidOperationException("Tax code already exists.");
        }

        var verificationResult = await VerifyBusinessAsync(
            taxCode,
            industry,
            businessEmail,
            businessPhone
        );

        var businessVerificationStatus = NormalizeVerificationStatus(
            verificationResult.Status
        );

        var officialCompanyName = businessVerificationStatus == "VERIFIED"
            ? NormalizeNullableText(verificationResult.OfficialCompanyName)
                ?? PendingCompanyName
            : PendingCompanyName;

        var officialCompanyAddress = businessVerificationStatus == "VERIFIED"
            ? NormalizeNullableText(verificationResult.OfficialCompanyAddress)
                ?? PendingCompanyAddress
            : PendingCompanyAddress;

        var officialTaxCode = businessVerificationStatus == "VERIFIED"
            ? NormalizeNullableText(verificationResult.TaxCode) ?? taxCode
            : taxCode;

        var businessProfile = new BusinessProfile
        {
            CompanyName = officialCompanyName,
            TaxCode = officialTaxCode,
            Industry = industry,
            CompanyAddress = officialCompanyAddress,
            BusinessEmail = businessEmail,
            BusinessPhone = businessPhone,
            VerificationStatus = businessVerificationStatus,
            VerificationNote = TruncateNote(verificationResult.Note),
            VerificationSubmissionCount = businessVerificationStatus == "VERIFIED"
                ? 0
                : 1,
            VerificationLockedUntil = null,
            VerifiedAt = businessVerificationStatus == "VERIFIED"
                ? DateTime.UtcNow
                : null,
            CreatedAt = DateTime.UtcNow
        };

        var jobPostingAiPolicy = await _jobPostingAiPolicyService
            .GetOrCreateActivePolicyEntityAsync();

        var clientProfile = new ClientProfile
        {
            UserId = user.UserId,
            ClientType = "BUSINESS",
            PhoneNumber = phoneNumber,
            Address = representativeAddress,
            PlatformFeeRate = await _platformFeePolicyService.GetFeeRateForClientTypeAsync("BUSINESS"),
            FreeJobPostCredits = jobPostingAiPolicy.InitialFreeJobPostCredits,
            PaidJobPostCredits = 0,
            FreeAiGenerationCredits = jobPostingAiPolicy.InitialFreeAiGenerationCredits,
            PaidAiGenerationCredits = 0,
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

        var canResubmit =
            user.Status == "BUSINESS_NEEDS_CORRECTION"
            || user.Status == "BUSINESS_VERIFICATION_LOCKED";

        if (!canResubmit)
        {
            throw new InvalidOperationException(
                "Only business profiles needing correction or locked after too many submissions can be resubmitted."
            );
        }

        var now = DateTime.UtcNow;

        if (businessProfile.VerificationLockedUntil.HasValue)
        {
            if (businessProfile.VerificationLockedUntil.Value > now)
            {
                throw new InvalidOperationException(
                    $"Business verification is locked until {businessProfile.VerificationLockedUntil.Value:yyyy-MM-dd HH:mm:ss} UTC."
                );
            }

            businessProfile.VerificationSubmissionCount = 0;
            businessProfile.VerificationLockedUntil = null;
            businessProfile.VerificationStatus = "NEEDS_CORRECTION";
            businessProfile.VerificationNote =
                "Business verification lock expired. User can resubmit.";
            businessProfile.UpdatedAt = now;

            user.Status = "BUSINESS_NEEDS_CORRECTION";
            user.UpdatedAt = now;
        }

        if (businessProfile.VerificationSubmissionCount
            >= MaxBusinessVerificationSubmissions)
        {
            var lockedUntil = now.Add(BusinessVerificationLockDuration);

            businessProfile.VerificationStatus = "LOCKED";
            businessProfile.VerificationLockedUntil = lockedUntil;
            businessProfile.VerificationNote =
                $"Too many business verification submissions. Locked until {lockedUntil:yyyy-MM-dd HH:mm:ss} UTC.";
            businessProfile.UpdatedAt = now;

            user.Status = "BUSINESS_VERIFICATION_LOCKED";
            user.UpdatedAt = now;

            await _clientProfileRepository.SaveChangesAsync();

            throw new InvalidOperationException(
                $"You have reached the maximum of {MaxBusinessVerificationSubmissions} business verification submissions. Please try again after {lockedUntil:yyyy-MM-dd HH:mm:ss} UTC."
            );
        }

        var phoneNumber = ValidateAndNormalizePhoneNumber(request.PhoneNumber);

        if (await _clientProfileRepository.PhoneNumberExistsExceptClientProfileAsync(
                phoneNumber,
                clientProfile.ClientProfileId))
        {
            throw new InvalidOperationException("Phone number already exists.");
        }

        var representativeAddress = request.Address?.Trim() ?? string.Empty;

        if (string.IsNullOrWhiteSpace(representativeAddress))
        {
            throw new InvalidOperationException(
                "Representative address is required."
            );
        }

        ValidateMaxLength(
            representativeAddress,
            500,
            "Representative address"
        );

        var taxCode = request.TaxCode?.Trim() ?? string.Empty;
        var industry = request.Industry?.Trim() ?? string.Empty;
        var businessEmail = NormalizeOptionalEmail(request.BusinessEmail);
        var businessPhone = ValidateAndNormalizeOptionalPhoneNumber(
            request.BusinessPhone,
            "Business phone"
        );

        ValidateBusinessVerificationInput(
            taxCode,
            industry,
            businessEmail
        );

        if (businessEmail != null
            && await _clientProfileRepository.BusinessEmailExistsExceptBusinessProfileAsync(
                businessEmail,
                businessProfile.BusinessProfileId))
        {
            throw new InvalidOperationException("Business email already exists.");
        }

        var taxCodeExists = await _clientProfileRepository
            .TaxCodeExistsExceptBusinessProfileAsync(
                taxCode,
                businessProfile.BusinessProfileId
            );

        if (taxCodeExists)
        {
            throw new InvalidOperationException("Tax code already exists.");
        }

        var verificationResult = await VerifyBusinessAsync(
            taxCode,
            industry,
            businessEmail,
            businessPhone
        );

        var businessVerificationStatus = NormalizeVerificationStatus(
            verificationResult.Status
        );

        clientProfile.ClientType = "BUSINESS";
        clientProfile.PhoneNumber = phoneNumber;
        clientProfile.Address = representativeAddress;
        clientProfile.PlatformFeeRate = await _platformFeePolicyService.GetFeeRateForClientTypeAsync("BUSINESS");
        clientProfile.UpdatedAt = now;

        var officialCompanyName = businessVerificationStatus == "VERIFIED"
            ? NormalizeNullableText(verificationResult.OfficialCompanyName)
                ?? PendingCompanyName
            : PendingCompanyName;

        var officialCompanyAddress = businessVerificationStatus == "VERIFIED"
            ? NormalizeNullableText(verificationResult.OfficialCompanyAddress)
                ?? PendingCompanyAddress
            : PendingCompanyAddress;

        var officialTaxCode = businessVerificationStatus == "VERIFIED"
            ? NormalizeNullableText(verificationResult.TaxCode) ?? taxCode
            : taxCode;

        businessProfile.CompanyName = officialCompanyName;
        businessProfile.TaxCode = officialTaxCode;
        businessProfile.Industry = industry;
        businessProfile.CompanyAddress = officialCompanyAddress;
        businessProfile.BusinessEmail = businessEmail;
        businessProfile.BusinessPhone = businessPhone;
        businessProfile.VerificationStatus = businessVerificationStatus;
        businessProfile.VerificationNote = TruncateNote(verificationResult.Note);

        if (businessVerificationStatus == "VERIFIED")
        {
            businessProfile.VerificationSubmissionCount = 0;
            businessProfile.VerificationLockedUntil = null;
        }
        else
        {
            businessProfile.VerificationSubmissionCount += 1;
            businessProfile.VerificationLockedUntil = null;
        }

        businessProfile.VerifiedAt = businessVerificationStatus == "VERIFIED"
            ? now
            : null;

        businessProfile.UpdatedAt = now;

        user.Status = MapUserStatusFromBusinessVerification(
            businessVerificationStatus
        );

        user.UpdatedAt = now;

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

        if (await _clientProfileRepository.PhoneNumberExistsExceptClientProfileAsync(
                phoneNumber,
                clientProfile.ClientProfileId))
        {
            throw new InvalidOperationException("Phone number already exists.");
        }

        var address = request.Address!.Trim();

        user.FullName = NameNormalizer.NormalizeFullName(request.FullName);

        if (request.AvatarUrl != null)
        {
            user.AvatarUrl = NormalizeNullableText(request.AvatarUrl);
        }

        user.UpdatedAt = DateTime.UtcNow;

        clientProfile.PhoneNumber = phoneNumber;
        clientProfile.Address = address;
        clientProfile.PlatformFeeRate = await _platformFeePolicyService.GetFeeRateForClientTypeAsync("INDIVIDUAL");
        clientProfile.UpdatedAt = DateTime.UtcNow;

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

        var phoneNumber = ValidateAndNormalizePhoneNumber(request.PhoneNumber);

        if (await _clientProfileRepository.PhoneNumberExistsExceptClientProfileAsync(
                phoneNumber,
                clientProfile.ClientProfileId))
        {
            throw new InvalidOperationException("Phone number already exists.");
        }

        var businessPhone = ValidateAndNormalizeOptionalPhoneNumber(
            request.BusinessPhone,
            "Business phone"
        );

        var businessEmail = NormalizeOptionalEmail(request.BusinessEmail);

        if (businessEmail != null
            && await _clientProfileRepository.BusinessEmailExistsExceptBusinessProfileAsync(
                businessEmail,
                clientProfile.BusinessProfile.BusinessProfileId))
        {
            throw new InvalidOperationException("Business email already exists.");
        }

        user.FullName = NameNormalizer.NormalizeFullName(request.FullName);

        if (request.AvatarUrl != null)
        {
            user.AvatarUrl = NormalizeNullableText(request.AvatarUrl);
        }

        user.UpdatedAt = DateTime.UtcNow;

        clientProfile.PhoneNumber = phoneNumber;
        clientProfile.Address = NormalizeNullableText(request.Address);
        clientProfile.PlatformFeeRate = await _platformFeePolicyService.GetFeeRateForClientTypeAsync("BUSINESS");
        clientProfile.UpdatedAt = DateTime.UtcNow;

        clientProfile.BusinessProfile.BusinessEmail = businessEmail;

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
        string taxCode,
        string industry,
        string? businessEmail,
        string? businessPhone)
    {
        return await _businessVerificationProvider.VerifyAsync(
            new BusinessVerificationProviderRequest
            {
                CompanyName = string.Empty,
                TaxCode = taxCode,
                Industry = industry,
                CompanyAddress = string.Empty,
                BusinessEmail = businessEmail,
                BusinessPhone = businessPhone
            }
        );
    }

    private static void ValidateIndividualProfileUpdateRequest(
        UpdateIndividualClientProfileRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.FullName))
        {
            throw new InvalidOperationException("Full name is required.");
        }

        var fullName = NameNormalizer.NormalizeFullName(request.FullName);

        if (fullName.Length < 2 || fullName.Length > 255)
        {
            throw new InvalidOperationException("Full name length is invalid.");
        }

        ValidateAndNormalizePhoneNumber(request.PhoneNumber);

        if (string.IsNullOrWhiteSpace(request.Address))
        {
            throw new InvalidOperationException("Address is required.");
        }

        ValidateMaxLength(request.Address, 500, "Address");
        ValidateMaxLength(request.AvatarUrl, 500, "Avatar URL");
    }

    private static void ValidateBusinessProfileUpdateRequest(
        UpdateBusinessClientProfileRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.FullName))
        {
            throw new InvalidOperationException("Full name is required.");
        }

        var fullName = NameNormalizer.NormalizeFullName(request.FullName);

        if (fullName.Length < 2 || fullName.Length > 255)
        {
            throw new InvalidOperationException("Full name length is invalid.");
        }

        ValidateAndNormalizePhoneNumber(request.PhoneNumber);

        var businessEmail = NormalizeOptionalEmail(request.BusinessEmail);

        if (businessEmail != null && !IsValidEmail(businessEmail))
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
        string taxCode,
        string industry,
        string? businessEmail)
    {
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

        if (!string.IsNullOrWhiteSpace(businessEmail)
            && !IsValidEmail(businessEmail))
        {
            throw new InvalidOperationException(
                "Business email format is invalid."
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
            "LOCKED" => "LOCKED",
            _ => "NEEDS_CORRECTION"
        };
    }

    private static string MapUserStatusFromBusinessVerification(
        string verificationStatus)
    {
        return verificationStatus switch
        {
            "VERIFIED" => "ACTIVE",
            "LOCKED" => "BUSINESS_VERIFICATION_LOCKED",
            _ => "BUSINESS_NEEDS_CORRECTION"
        };
    }

    private static string? NormalizeNullableText(string? value)
    {
        var text = value?.Trim();

        return string.IsNullOrWhiteSpace(text)
            ? null
            : text;
    }

    private static string? NormalizeOptionalEmail(string? value)
    {
        var email = value?.Trim().ToLowerInvariant();

        return string.IsNullOrWhiteSpace(email)
            ? null
            : email;
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
            PlatformFeeRate = clientProfile.PlatformFeeRate,
            FreeJobPostCredits = clientProfile.FreeJobPostCredits,
            PaidJobPostCredits = clientProfile.PaidJobPostCredits,
            FreeAiGenerationCredits = clientProfile.FreeAiGenerationCredits,
            PaidAiGenerationCredits = clientProfile.PaidAiGenerationCredits,
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
                    VerificationSubmissionCount =
                        clientProfile.BusinessProfile.VerificationSubmissionCount,
                    VerificationLockedUntil =
                        clientProfile.BusinessProfile.VerificationLockedUntil,
                    VerifiedAt =
                        clientProfile.BusinessProfile.VerifiedAt
                }
        };
    }
}