using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;
using AITasker.Application.DTOs.Requests;
using AITasker.Application.DTOs.Responses;
using AITasker.Application.Interfaces;

namespace AITasker.Infrastructure.Banking
{
    public class MockBankAccountVerificationService : IBankAccountVerificationService
    {
        private static readonly HashSet<string> SupportedBankCodes = new(StringComparer.OrdinalIgnoreCase)
        {
            "VCB",
            "TCB",
            "MB",
            "ACB",
            "BIDV",
            "CTG",
            "VPB",
            "TPB",
            "VIB",
            "STB",
            "HDB",
            "OCB",
            "MSB",
            "SHB",
            "LPB"
        };

        public Task<BankAccountVerificationResponse> VerifyAsync(
            BankAccountVerificationRequest request)
        {
            var now = DateTime.UtcNow;

            var bankCode = NormalizeSimple(request.BankCode);
            var bankName = request.BankName?.Trim() ?? string.Empty;
            var accountNumber = request.BankAccountNumber?.Trim() ?? string.Empty;
            var accountHolder = request.BankAccountHolder?.Trim() ?? string.Empty;
            var normalizedHolder = NormalizeVietnameseName(accountHolder);

            if (string.IsNullOrWhiteSpace(bankCode))
            {
                return Task.FromResult(Fail(
                    bankCode,
                    bankName,
                    accountNumber,
                    accountHolder,
                    normalizedHolder,
                    "Bank code is required.",
                    now));
            }

            if (!SupportedBankCodes.Contains(bankCode))
            {
                return Task.FromResult(Fail(
                    bankCode,
                    bankName,
                    accountNumber,
                    accountHolder,
                    normalizedHolder,
                    "Unsupported bank code in mock provider.",
                    now));
            }

            if (string.IsNullOrWhiteSpace(accountNumber))
            {
                return Task.FromResult(Fail(
                    bankCode,
                    bankName,
                    accountNumber,
                    accountHolder,
                    normalizedHolder,
                    "Bank account number is required.",
                    now));
            }

            if (!Regex.IsMatch(accountNumber, @"^\d{6,20}$"))
            {
                return Task.FromResult(Fail(
                    bankCode,
                    bankName,
                    accountNumber,
                    accountHolder,
                    normalizedHolder,
                    "Bank account number must contain 6 to 20 digits.",
                    now));
            }

            if (string.IsNullOrWhiteSpace(accountHolder))
            {
                return Task.FromResult(Fail(
                    bankCode,
                    bankName,
                    accountNumber,
                    accountHolder,
                    normalizedHolder,
                    "Bank account holder is required.",
                    now));
            }

            if (normalizedHolder.Length < 5)
            {
                return Task.FromResult(Fail(
                    bankCode,
                    bankName,
                    accountNumber,
                    accountHolder,
                    normalizedHolder,
                    "Bank account holder name is too short.",
                    now));
            }

            // Mock fail rules để FE/test Swagger kiểm tra:
            // 1. Số tài khoản kết thúc bằng 0000 => invalid
            // 2. Tên chứa FAIL / SAI / INVALID => invalid
            if (accountNumber.EndsWith("0000") ||
                normalizedHolder.Contains("FAIL") ||
                normalizedHolder.Contains("SAI") ||
                normalizedHolder.Contains("INVALID"))
            {
                return Task.FromResult(Fail(
                    bankCode,
                    bankName,
                    accountNumber,
                    accountHolder,
                    normalizedHolder,
                    "Bank account information does not match.",
                    now));
            }

            return Task.FromResult(new BankAccountVerificationResponse
            {
                IsValid = true,
                Provider = "MOCK_BANK_ACCOUNT_PROVIDER",
                BankCode = bankCode,
                BankName = bankName,
                BankAccountNumber = accountNumber,
                BankAccountHolder = accountHolder,
                NormalizedBankAccountHolder = normalizedHolder,
                Message = "Bank account verified successfully in mock mode.",
                CheckedAt = now
            });
        }

        private static BankAccountVerificationResponse Fail(
            string bankCode,
            string bankName,
            string accountNumber,
            string accountHolder,
            string normalizedHolder,
            string message,
            DateTime checkedAt)
        {
            return new BankAccountVerificationResponse
            {
                IsValid = false,
                Provider = "MOCK_BANK_ACCOUNT_PROVIDER",
                BankCode = bankCode,
                BankName = bankName,
                BankAccountNumber = accountNumber,
                BankAccountHolder = accountHolder,
                NormalizedBankAccountHolder = normalizedHolder,
                Message = message,
                CheckedAt = checkedAt
            };
        }

        private static string NormalizeSimple(string? value)
        {
            return string.IsNullOrWhiteSpace(value)
                ? string.Empty
                : value.Trim().ToUpperInvariant();
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
    }
}