using System.Globalization;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;
using AITasker.Application.DTOs.Requests;
using AITasker.Application.DTOs.Responses;
using AITasker.Application.Interfaces;
using Microsoft.Extensions.Configuration;

namespace AITasker.Infrastructure.Banking
{
    public class VietQrBankAccountVerificationService : IBankAccountVerificationService
    {
        private readonly HttpClient _httpClient;
        private readonly IConfiguration _configuration;

        public VietQrBankAccountVerificationService(
            HttpClient httpClient,
            IConfiguration configuration)
        {
            _httpClient = httpClient;
            _configuration = configuration;
        }

        public async Task<BankAccountVerificationResponse> VerifyAsync(
            BankAccountVerificationRequest request)
        {
            var now = DateTime.UtcNow;

            ValidateRequest(request);

            var baseUrl = _configuration["BankVerification:VietQrBaseUrl"]?.TrimEnd('/');
            var clientId = _configuration["BankVerification:VietQrClientId"];
            var apiKey = _configuration["BankVerification:VietQrApiKey"];

            if (string.IsNullOrWhiteSpace(baseUrl) ||
                string.IsNullOrWhiteSpace(clientId) ||
                string.IsNullOrWhiteSpace(apiKey))
            {
                return Fail(
                    request,
                    string.Empty,
                    "VietQR configuration is missing.",
                    now);
            }

            var httpRequest = new HttpRequestMessage(
                HttpMethod.Post,
                $"{baseUrl}/v2/lookup");

            httpRequest.Headers.Add("x-client-id", clientId);
            httpRequest.Headers.Add("x-api-key", apiKey);

            httpRequest.Content = JsonContent.Create(new VietQrLookupRequest
            {
                Bin = request.BankBin.Trim(),
                AccountNumber = request.BankAccountNumber.Trim()
            });

            HttpResponseMessage httpResponse;

            try
            {
                httpResponse = await _httpClient.SendAsync(httpRequest);
            }
            catch (Exception ex)
            {
                return Fail(
                    request,
                    string.Empty,
                    $"Cannot connect to VietQR provider. {ex.Message}",
                    now);
            }

            VietQrLookupResponse? providerResponse;

            try
            {
                providerResponse = await httpResponse.Content.ReadFromJsonAsync<VietQrLookupResponse>();
            }
            catch
            {
                return Fail(
                    request,
                    string.Empty,
                    "Cannot parse VietQR provider response.",
                    now);
            }

            if (!httpResponse.IsSuccessStatusCode || providerResponse == null)
            {
                return Fail(
                    request,
                    string.Empty,
                    $"VietQR provider returned HTTP {(int)httpResponse.StatusCode}.",
                    now);
            }

            var providerAccountName = providerResponse.Data?.AccountName?.Trim() ?? string.Empty;

            if (string.IsNullOrWhiteSpace(providerAccountName))
            {
                return Fail(
                    request,
                    string.Empty,
                    providerResponse.Desc ?? "Bank account not found.",
                    now);
            }

            var inputName = NormalizeVietnameseName(request.BankAccountHolder);
            var providerName = NormalizeVietnameseName(providerAccountName);

            var isNameMatched = IsNameMatched(inputName, providerName);

            if (!isNameMatched)
            {
                return new BankAccountVerificationResponse
                {
                    IsValid = false,
                    Provider = "VIETQR",
                    BankCode = request.BankCode.Trim().ToUpperInvariant(),
                    BankName = request.BankName.Trim(),
                    BankAccountNumber = request.BankAccountNumber.Trim(),
                    BankAccountHolder = request.BankAccountHolder.Trim(),
                    NormalizedBankAccountHolder = providerName,
                    Message = $"Bank account exists but holder name does not match. Provider name: {providerAccountName}",
                    CheckedAt = now
                };
            }

            return new BankAccountVerificationResponse
            {
                IsValid = true,
                Provider = "VIETQR",
                BankCode = request.BankCode.Trim().ToUpperInvariant(),
                BankName = request.BankName.Trim(),
                BankAccountNumber = request.BankAccountNumber.Trim(),
                BankAccountHolder = providerAccountName,
                NormalizedBankAccountHolder = providerName,
                Message = "Bank account verified successfully.",
                CheckedAt = now
            };
        }

        private static void ValidateRequest(BankAccountVerificationRequest request)
        {
            if (request == null)
                throw new InvalidOperationException("Bank account verification request is required.");

            if (string.IsNullOrWhiteSpace(request.BankBin))
                throw new InvalidOperationException("Bank bin is required.");

            if (!Regex.IsMatch(request.BankBin.Trim(), @"^\d{6}$"))
                throw new InvalidOperationException("Bank bin must contain exactly 6 digits.");

            if (string.IsNullOrWhiteSpace(request.BankAccountNumber))
                throw new InvalidOperationException("Bank account number is required.");

            if (!Regex.IsMatch(request.BankAccountNumber.Trim(), @"^\d{6,20}$"))
                throw new InvalidOperationException("Bank account number must contain 6 to 20 digits.");

            if (string.IsNullOrWhiteSpace(request.BankAccountHolder))
                throw new InvalidOperationException("Bank account holder is required.");
        }

        private static BankAccountVerificationResponse Fail(
            BankAccountVerificationRequest request,
            string providerName,
            string message,
            DateTime checkedAt)
        {
            return new BankAccountVerificationResponse
            {
                IsValid = false,
                Provider = "VIETQR",
                BankCode = request.BankCode?.Trim().ToUpperInvariant() ?? string.Empty,
                BankName = request.BankName?.Trim() ?? string.Empty,
                BankAccountNumber = request.BankAccountNumber?.Trim() ?? string.Empty,
                BankAccountHolder = request.BankAccountHolder?.Trim() ?? string.Empty,
                NormalizedBankAccountHolder = NormalizeVietnameseName(providerName),
                Message = message,
                CheckedAt = checkedAt
            };
        }

        private static bool IsNameMatched(
            string inputName,
            string providerName)
        {
            if (string.IsNullOrWhiteSpace(inputName) ||
                string.IsNullOrWhiteSpace(providerName))
            {
                return false;
            }

            if (inputName == providerName)
            {
                return true;
            }

            return providerName.Contains(inputName) || inputName.Contains(providerName);
        }

        private static string NormalizeVietnameseName(string? value)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                return string.Empty;
            }

            var normalized = value.Trim().Normalize(NormalizationForm.FormD);
            var builder = new StringBuilder();

            foreach (var character in normalized)
            {
                var unicodeCategory = CharUnicodeInfo.GetUnicodeCategory(character);

                if (unicodeCategory != UnicodeCategory.NonSpacingMark)
                {
                    builder.Append(character);
                }
            }

            var withoutDiacritics = builder
                .ToString()
                .Normalize(NormalizationForm.FormC)
                .Replace("Đ", "D")
                .Replace("đ", "d");

            withoutDiacritics = Regex.Replace(withoutDiacritics, @"\s+", " ");

            return withoutDiacritics.Trim().ToUpperInvariant();
        }

        private class VietQrLookupRequest
        {
            [JsonPropertyName("bin")]
            public string Bin { get; set; } = string.Empty;

            [JsonPropertyName("accountNumber")]
            public string AccountNumber { get; set; } = string.Empty;
        }

        private class VietQrLookupResponse
        {
            [JsonPropertyName("code")]
            public string? Code { get; set; }

            [JsonPropertyName("desc")]
            public string? Desc { get; set; }

            [JsonPropertyName("data")]
            public VietQrLookupData? Data { get; set; }
        }

        private class VietQrLookupData
        {
            [JsonPropertyName("accountName")]
            public string? AccountName { get; set; }
        }
    }
}