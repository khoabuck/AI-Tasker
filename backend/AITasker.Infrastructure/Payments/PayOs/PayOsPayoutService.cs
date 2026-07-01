using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using System.Text.Encodings.Web;
using System.Text.Json;
using AITasker.Application.DTOs.Responses;
using AITasker.Application.Interfaces;
using Microsoft.Extensions.Configuration;

namespace AITasker.Infrastructure.Payments.PayOs
{
    public class PayOsPayoutService : IPayOsPayoutService
    {
        private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
        {
            Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
            WriteIndented = false
        };

        private readonly HttpClient _httpClient;
        private readonly IConfiguration _configuration;

        public PayOsPayoutService(HttpClient httpClient, IConfiguration configuration)
        {
            _httpClient = httpClient;
            _configuration = configuration;
        }

        public async Task<PayOsPayoutCreateResult> CreateSinglePayoutAsync(PayOsPayoutCreateRequest request)
        {
            EnsureConfigured();

            if (request == null)
            {
                throw new InvalidOperationException("PayOS payout request is required.");
            }

            if (string.IsNullOrWhiteSpace(request.IdempotencyKey))
            {
                throw new InvalidOperationException("PayOS payout idempotency key is required.");
            }

            var body = new SortedDictionary<string, object?>
            {
                ["amount"] = request.Amount,
                ["category"] = request.Category?.ToArray() ?? new[] { "withdrawal" },
                ["description"] = request.Description,
                ["referenceId"] = request.ReferenceId,
                ["toAccountNumber"] = request.ToAccountNumber,
                ["toBin"] = request.ToBin
            };

            var signature = CreatePayoutSignature(body);
            var url = $"{GetBaseUrl().TrimEnd('/')}/v1/payouts";

            using var httpRequest = new HttpRequestMessage(HttpMethod.Post, url)
            {
                Content = new StringContent(JsonSerializer.Serialize(body, JsonOptions), Encoding.UTF8, "application/json")
            };

            AddAuthHeaders(httpRequest);
            httpRequest.Headers.Add("x-idempotency-key", request.IdempotencyKey);
            httpRequest.Headers.Add("x-signature", signature);

            using var response = await _httpClient.SendAsync(httpRequest);
            var raw = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                throw new InvalidOperationException($"PayOS payout request failed with HTTP {(int)response.StatusCode}: {raw}");
            }

            using var document = JsonDocument.Parse(raw);
            EnsurePayOsCodeSuccess(document.RootElement, raw);

            var data = document.RootElement.GetProperty("data");

            return new PayOsPayoutCreateResult
            {
                PayoutId = GetString(data, "id"),
                ReferenceId = GetString(data, "referenceId"),
                ApprovalState = GetString(data, "approvalState"),
                FirstTransaction = ExtractFirstTransaction(data),
                RawResponse = raw
            };
        }

        public async Task<PayOsPayoutDetailResult> GetPayoutAsync(string payoutId)
        {
            EnsureConfigured();

            if (string.IsNullOrWhiteSpace(payoutId))
            {
                throw new InvalidOperationException("PayOS payout id is required.");
            }

            var url = $"{GetBaseUrl().TrimEnd('/')}/v1/payouts/{Uri.EscapeDataString(payoutId.Trim())}";

            using var httpRequest = new HttpRequestMessage(HttpMethod.Get, url);
            AddAuthHeaders(httpRequest);

            using var response = await _httpClient.SendAsync(httpRequest);
            var raw = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                throw new InvalidOperationException($"PayOS payout detail request failed with HTTP {(int)response.StatusCode}: {raw}");
            }

            using var document = JsonDocument.Parse(raw);
            EnsurePayOsCodeSuccess(document.RootElement, raw);

            var data = document.RootElement.GetProperty("data");

            return new PayOsPayoutDetailResult
            {
                PayoutId = GetString(data, "id"),
                ReferenceId = GetString(data, "referenceId"),
                ApprovalState = GetString(data, "approvalState"),
                FirstTransaction = ExtractFirstTransaction(data),
                RawResponse = raw
            };
        }

        public async Task<PayOsPayoutAccountBalanceResponse> GetPayoutAccountBalanceAsync()
        {
            EnsureConfigured();

            var url = $"{GetBaseUrl().TrimEnd('/')}/v1/payouts-account/balance";

            using var httpRequest = new HttpRequestMessage(HttpMethod.Get, url);
            AddAuthHeaders(httpRequest);

            using var response = await _httpClient.SendAsync(httpRequest);
            var raw = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                throw new InvalidOperationException($"PayOS payout account balance request failed with HTTP {(int)response.StatusCode}: {raw}");
            }

            using var document = JsonDocument.Parse(raw);
            EnsurePayOsCodeSuccess(document.RootElement, raw);

            var data = document.RootElement.GetProperty("data");

            return new PayOsPayoutAccountBalanceResponse
            {
                AccountNumber = GetString(data, "accountNumber"),
                AccountName = GetString(data, "accountName"),
                Currency = GetString(data, "currency", "VND"),
                Balance = ParseDecimal(GetString(data, "balance"))
            };
        }

        private void EnsureConfigured()
        {
            if (!IsPayOsEnabled())
            {
                throw new InvalidOperationException("PayOS payout is disabled. Enable Payment:PayOs:Enabled or Payment:PayOs:PayoutEnabled first.");
            }

            if (string.IsNullOrWhiteSpace(GetClientId()))
            {
                throw new InvalidOperationException("PayOS ClientId is not configured.");
            }

            if (string.IsNullOrWhiteSpace(GetApiKey()))
            {
                throw new InvalidOperationException("PayOS ApiKey is not configured.");
            }

            if (string.IsNullOrWhiteSpace(GetChecksumKey()))
            {
                throw new InvalidOperationException("PayOS ChecksumKey is not configured.");
            }
        }

        private bool IsPayOsEnabled()
        {
            if (_configuration.GetSection("Payment:PayOs:PayoutEnabled").Exists())
            {
                return _configuration.GetValue<bool>("Payment:PayOs:PayoutEnabled");
            }

            return _configuration.GetValue<bool>("Payment:PayOs:Enabled");
        }

        private void AddAuthHeaders(HttpRequestMessage request)
        {
            request.Headers.Add("x-client-id", GetClientId());
            request.Headers.Add("x-api-key", GetApiKey());
        }

        private string CreatePayoutSignature(SortedDictionary<string, object?> body)
        {
            var queryString = string.Join(
                "&",
                body.Select(x =>
                {
                    var value = NormalizeSignatureValue(x.Value);
                    return $"{Uri.EscapeDataString(x.Key)}={Uri.EscapeDataString(value)}";
                }));

            using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(GetChecksumKey()));
            var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(queryString));

            return Convert.ToHexString(hash).ToLowerInvariant();
        }

        private static string NormalizeSignatureValue(object? value)
        {
            if (value == null)
            {
                return string.Empty;
            }

            if (value is string stringValue)
            {
                return stringValue;
            }

            if (value is bool boolValue)
            {
                return boolValue ? "true" : "false";
            }

            if (value is IFormattable formattable && value is not System.Collections.IEnumerable)
            {
                return formattable.ToString(null, CultureInfo.InvariantCulture) ?? string.Empty;
            }

            return JsonSerializer.Serialize(DeepSort(value), JsonOptions);
        }

        private static object? DeepSort(object? value)
        {
            if (value == null || value is string || value is ValueType)
            {
                return value;
            }

            if (value is System.Collections.IDictionary dictionary)
            {
                var result = new SortedDictionary<string, object?>();

                foreach (System.Collections.DictionaryEntry entry in dictionary)
                {
                    if (entry.Key == null)
                    {
                        continue;
                    }

                    result[entry.Key.ToString() ?? string.Empty] = DeepSort(entry.Value);
                }

                return result;
            }

            if (value is System.Collections.IEnumerable enumerable)
            {
                var result = new List<object?>();

                foreach (var item in enumerable)
                {
                    result.Add(DeepSort(item));
                }

                return result;
            }

            var properties = value.GetType()
                .GetProperties()
                .Where(p => p.GetIndexParameters().Length == 0)
                .OrderBy(p => JsonNamingPolicy.CamelCase.ConvertName(p.Name), StringComparer.Ordinal);

            var obj = new SortedDictionary<string, object?>();

            foreach (var property in properties)
            {
                obj[JsonNamingPolicy.CamelCase.ConvertName(property.Name)] = DeepSort(property.GetValue(value));
            }

            return obj;
        }

        private static void EnsurePayOsCodeSuccess(JsonElement root, string raw)
        {
            var code = GetString(root, "code");

            if (!string.Equals(code, "00", StringComparison.OrdinalIgnoreCase))
            {
                var desc = GetString(root, "desc", "Unknown PayOS error");
                throw new InvalidOperationException($"PayOS returned code {code}: {desc}. Raw: {raw}");
            }
        }

        private static PayOsPayoutTransactionResult? ExtractFirstTransaction(JsonElement data)
        {
            if (!data.TryGetProperty("transactions", out var transactions))
            {
                return null;
            }

            JsonElement? first = null;

            if (transactions.ValueKind == JsonValueKind.Array)
            {
                first = transactions.EnumerateArray().FirstOrDefault();
            }
            else if (transactions.ValueKind == JsonValueKind.Object)
            {
                var firstProperty = transactions.EnumerateObject().FirstOrDefault();

                if (firstProperty.Value.ValueKind == JsonValueKind.Object)
                {
                    first = firstProperty.Value;
                }
            }

            if (first == null || first.Value.ValueKind != JsonValueKind.Object)
            {
                return null;
            }

            var value = first.Value;

            return new PayOsPayoutTransactionResult
            {
                TransactionId = GetString(value, "id"),
                ReferenceId = GetString(value, "referenceId"),
                Amount = ParseLong(value, "amount"),
                ToBin = GetString(value, "toBin"),
                ToAccountNumber = GetString(value, "toAccountNumber"),
                ToAccountName = GetNullableString(value, "toAccountName"),
                State = GetString(value, "state"),
                ErrorCode = GetNullableString(value, "errorCode"),
                ErrorMessage = GetNullableString(value, "errorMessage")
            };
        }

        private static string GetString(JsonElement element, string propertyName, string defaultValue = "")
        {
            if (!element.TryGetProperty(propertyName, out var property))
            {
                return defaultValue;
            }

            return property.ValueKind switch
            {
                JsonValueKind.String => property.GetString() ?? defaultValue,
                JsonValueKind.Number => property.GetRawText(),
                JsonValueKind.True => "true",
                JsonValueKind.False => "false",
                _ => defaultValue
            };
        }

        private static string? GetNullableString(JsonElement element, string propertyName)
        {
            if (!element.TryGetProperty(propertyName, out var property) || property.ValueKind == JsonValueKind.Null)
            {
                return null;
            }

            return property.ValueKind == JsonValueKind.String
                ? property.GetString()
                : property.GetRawText();
        }

        private static long ParseLong(JsonElement element, string propertyName)
        {
            if (!element.TryGetProperty(propertyName, out var property))
            {
                return 0;
            }

            if (property.ValueKind == JsonValueKind.Number && property.TryGetInt64(out var result))
            {
                return result;
            }

            return long.TryParse(GetString(element, propertyName), NumberStyles.Any, CultureInfo.InvariantCulture, out result)
                ? result
                : 0;
        }

        private static decimal ParseDecimal(string? value)
        {
            return decimal.TryParse(value, NumberStyles.Any, CultureInfo.InvariantCulture, out var result)
                ? result
                : 0;
        }

        private string GetBaseUrl()
        {
            return _configuration["Payment:PayOs:BaseUrl"]?.Trim()
                ?? "https://api-merchant.payos.vn";
        }

        private string GetClientId()
        {
            return _configuration["Payment:PayOs:ClientId"]?.Trim() ?? string.Empty;
        }

        private string GetApiKey()
        {
            return _configuration["Payment:PayOs:ApiKey"]?.Trim() ?? string.Empty;
        }

        private string GetChecksumKey()
        {
            return _configuration["Payment:PayOs:ChecksumKey"]?.Trim() ?? string.Empty;
        }
    }
}
