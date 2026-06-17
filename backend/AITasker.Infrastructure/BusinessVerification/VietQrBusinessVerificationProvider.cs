using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using AITasker.Application.DTOs.Requests;
using AITasker.Application.DTOs.Responses;
using AITasker.Application.Interfaces;
using Microsoft.Extensions.Configuration;

namespace AITasker.Infrastructure.BusinessVerification;

public class VietQrBusinessVerificationProvider : IBusinessVerificationProvider
{
    private const string UnknownCompanyName = "Unknown company name from VietQR";
    private const string UnknownCompanyAddress = "Unknown company address from VietQR";

    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;

    public VietQrBusinessVerificationProvider(
        HttpClient httpClient,
        IConfiguration configuration)
    {
        _httpClient = httpClient;
        _configuration = configuration;
    }

    public async Task<BusinessVerificationProviderResult> VerifyAsync(
        BusinessVerificationProviderRequest request)
    {
        var taxCode = request.TaxCode?.Trim() ?? string.Empty;

        if (string.IsNullOrWhiteSpace(taxCode))
        {
            return new BusinessVerificationProviderResult
            {
                Status = "NEEDS_CORRECTION",
                ConfidenceScore = 0,
                Note = "Tax code is required."
            };
        }

        var vietQrResult = await LookupBusinessByTaxCodeAsync(taxCode);

        if (!vietQrResult.Success || vietQrResult.Data == null)
        {
            return new BusinessVerificationProviderResult
            {
                Status = "NEEDS_CORRECTION",
                ConfidenceScore = 0,
                Note = vietQrResult.IsSystemError
                    ? $"VietQR verification service issue. Please try again later. Detail: {vietQrResult.Message}"
                    : $"Tax code was not found on VietQR. Detail: {vietQrResult.Message}"
            };
        }

        var officialTaxCode = NormalizeNullableText(vietQrResult.Data.Id)
            ?? taxCode;

        var officialCompanyName = NormalizeNullableText(vietQrResult.Data.Name)
            ?? UnknownCompanyName;

        var officialCompanyAddress = NormalizeNullableText(vietQrResult.Data.Address)
            ?? UnknownCompanyAddress;

        var internationalName = NormalizeNullableText(
            vietQrResult.Data.InternationalName
        );

        var shortName = NormalizeNullableText(vietQrResult.Data.ShortName);

        return new BusinessVerificationProviderResult
        {
            Status = "VERIFIED",
            ConfidenceScore = 1,
            TaxCode = officialTaxCode,
            OfficialCompanyName = officialCompanyName,
            OfficialCompanyAddress = officialCompanyAddress,
            InternationalName = internationalName,
            ShortName = shortName,
            Note =
                "Verified by VietQR tax code lookup. " +
                $"TaxCode='{officialTaxCode}', " +
                $"OfficialName='{officialCompanyName}', " +
                $"OfficialAddress='{officialCompanyAddress}'."
        };
    }

    private async Task<VietQrLookupResult> LookupBusinessByTaxCodeAsync(
        string taxCode)
    {
        try
        {
            var baseUrl = _configuration["BusinessVerification:VietQr:BaseUrl"];

            if (string.IsNullOrWhiteSpace(baseUrl))
            {
                baseUrl = "https://api.vietqr.io";
            }

            var url =
                $"{baseUrl.TrimEnd('/')}/v2/business/{Uri.EscapeDataString(taxCode)}";

            using var response = await _httpClient.GetAsync(url);

            if (response.StatusCode == HttpStatusCode.TooManyRequests)
            {
                return new VietQrLookupResult
                {
                    Success = false,
                    IsSystemError = true,
                    Message = "VietQR rate limit exceeded."
                };
            }

            if (response.StatusCode == HttpStatusCode.NotFound
                || response.StatusCode == HttpStatusCode.BadRequest)
            {
                return new VietQrLookupResult
                {
                    Success = false,
                    IsSystemError = false,
                    Message =
                        $"Tax code not found. VietQR HTTP status: {(int)response.StatusCode}"
                };
            }

            if (!response.IsSuccessStatusCode)
            {
                return new VietQrLookupResult
                {
                    Success = false,
                    IsSystemError = true,
                    Message = $"VietQR HTTP error: {(int)response.StatusCode}"
                };
            }

            var payload = await response.Content.ReadFromJsonAsync<VietQrBusinessResponse>(
                JsonOptions()
            );

            if (payload == null)
            {
                return new VietQrLookupResult
                {
                    Success = false,
                    IsSystemError = true,
                    Message = "VietQR response is empty."
                };
            }

            if (payload.Code != "00" || payload.Data == null)
            {
                return new VietQrLookupResult
                {
                    Success = false,
                    IsSystemError = false,
                    Message = payload.Desc ?? "Tax code not found."
                };
            }

            if (string.IsNullOrWhiteSpace(payload.Data.Id)
                && string.IsNullOrWhiteSpace(payload.Data.Name))
            {
                return new VietQrLookupResult
                {
                    Success = false,
                    IsSystemError = false,
                    Message = "Tax code not found. VietQR returned empty business data."
                };
            }

            return new VietQrLookupResult
            {
                Success = true,
                IsSystemError = false,
                Message = payload.Desc ?? "Success",
                Data = payload.Data
            };
        }
        catch (TaskCanceledException)
        {
            return new VietQrLookupResult
            {
                Success = false,
                IsSystemError = true,
                Message = "VietQR request timeout."
            };
        }
        catch (HttpRequestException ex)
        {
            return new VietQrLookupResult
            {
                Success = false,
                IsSystemError = true,
                Message = $"VietQR network error: {ex.Message}"
            };
        }
        catch (JsonException ex)
        {
            return new VietQrLookupResult
            {
                Success = false,
                IsSystemError = true,
                Message = $"VietQR JSON parse error: {ex.Message}"
            };
        }
        catch (Exception ex)
        {
            return new VietQrLookupResult
            {
                Success = false,
                IsSystemError = true,
                Message = ex.Message
            };
        }
    }

    private static string? NormalizeNullableText(string? value)
    {
        var text = value?.Trim();

        return string.IsNullOrWhiteSpace(text)
            ? null
            : text;
    }

    private static JsonSerializerOptions JsonOptions()
    {
        return new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true,
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        };
    }

    private sealed class VietQrLookupResult
    {
        public bool Success { get; set; }

        public bool IsSystemError { get; set; }

        public string Message { get; set; } = string.Empty;

        public VietQrBusinessData? Data { get; set; }
    }

    private sealed class VietQrBusinessResponse
    {
        public string? Code { get; set; }

        public string? Desc { get; set; }

        public VietQrBusinessData? Data { get; set; }
    }

    private sealed class VietQrBusinessData
    {
        public string? Id { get; set; }

        public string? Name { get; set; }

        public string? InternationalName { get; set; }

        public string? ShortName { get; set; }

        public string? Address { get; set; }
    }
}