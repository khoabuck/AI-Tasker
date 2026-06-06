using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using AITasker.Application.DTOs.Requests;
using AITasker.Application.DTOs.Responses;
using AITasker.Application.Interfaces;
using Microsoft.Extensions.Configuration;

namespace AITasker.Infrastructure.BusinessVerification;

public class GroqBusinessVerificationProvider : IBusinessVerificationProvider
{
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;

    public GroqBusinessVerificationProvider(
        HttpClient httpClient,
        IConfiguration configuration)
    {
        _httpClient = httpClient;
        _configuration = configuration;
    }

    public async Task<BusinessVerificationProviderResult> VerifyAsync(
        BusinessVerificationProviderRequest request)
    {
        var vietQrResult = await LookupBusinessByTaxCodeAsync(request.TaxCode);

        if (!vietQrResult.Success || vietQrResult.Data == null)
        {
            return new BusinessVerificationProviderResult
            {
                Status = "PENDING_REVIEW",
                ConfidenceScore = 0,
                Note = $"VietQR lookup failed or tax code not found. Detail: {vietQrResult.Message}"
            };
        }

        var groqResult = await AnalyzeWithGroqAsync(request, vietQrResult.Data);

        if (!groqResult.Success)
        {
            return new BusinessVerificationProviderResult
            {
                Status = "PENDING_REVIEW",
                ConfidenceScore = 0,
                Note = $"VietQR found business, but Groq analysis failed. Detail: {groqResult.Note}"
            };
        }

        var minConfidenceText =
            _configuration["BusinessVerification:AutoApproveMinConfidence"];

        var minConfidence = decimal.TryParse(
            minConfidenceText,
            out var parsedConfidence
        )
            ? parsedConfidence
            : 0.85m;

        if (groqResult.Decision == "VERIFIED"
            && groqResult.ConfidenceScore >= minConfidence)
        {
            return new BusinessVerificationProviderResult
            {
                Status = "VERIFIED",
                ConfidenceScore = groqResult.ConfidenceScore,
                Note = $"Verified by VietQR and Groq. {groqResult.Note}"
            };
        }

        return new BusinessVerificationProviderResult
        {
            Status = "PENDING_REVIEW",
            ConfidenceScore = groqResult.ConfidenceScore,
            Note = $"Admin review required. {groqResult.Note}"
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
                    Message = "VietQR rate limit exceeded."
                };
            }

            if (!response.IsSuccessStatusCode)
            {
                return new VietQrLookupResult
                {
                    Success = false,
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
                    Message = "VietQR response is empty."
                };
            }

            if (payload.Code != "00" || payload.Data == null)
            {
                return new VietQrLookupResult
                {
                    Success = false,
                    Message = payload.Desc ?? "Tax code not found."
                };
            }

            return new VietQrLookupResult
            {
                Success = true,
                Message = payload.Desc ?? "Success",
                Data = payload.Data
            };
        }
        catch (Exception ex)
        {
            return new VietQrLookupResult
            {
                Success = false,
                Message = ex.Message
            };
        }
    }

    private async Task<GroqAnalysisResult> AnalyzeWithGroqAsync(
        BusinessVerificationProviderRequest request,
        VietQrBusinessData vietQrData)
    {
        try
        {
            var apiKey = _configuration["BusinessVerification:Groq:ApiKey"];

            if (string.IsNullOrWhiteSpace(apiKey)
                || apiKey == "YOUR_GROQ_API_KEY")
            {
                return new GroqAnalysisResult
                {
                    Success = false,
                    Decision = "PENDING_REVIEW",
                    ConfidenceScore = 0,
                    Note = "Groq API key is missing."
                };
            }

            var baseUrl = _configuration["BusinessVerification:Groq:BaseUrl"];

            if (string.IsNullOrWhiteSpace(baseUrl))
            {
                baseUrl = "https://api.groq.com/openai/v1";
            }

            var model = _configuration["BusinessVerification:Groq:Model"];

            if (string.IsNullOrWhiteSpace(model))
            {
                model = "llama-3.3-70b-versatile";
            }

            var groqRequest = new GroqChatRequest
            {
                Model = model,
                ResponseFormat = new GroqResponseFormat
                {
                    Type = "json_object"
                },
                Messages =
                [
                    new GroqMessage
                    {
                        Role = "system",
                        Content =
                            "You are a business verification assistant. " +
                            "You must return valid JSON only. " +
                            "Do not add markdown. " +
                            "Compare user-submitted Vietnamese business information with VietQR tax lookup data."
                    },
                    new GroqMessage
                    {
                        Role = "user",
                        Content = BuildGroqPrompt(request, vietQrData)
                    }
                ]
            };

            using var httpRequest = new HttpRequestMessage(
                HttpMethod.Post,
                $"{baseUrl.TrimEnd('/')}/chat/completions"
            );

            httpRequest.Headers.Authorization = new AuthenticationHeaderValue(
                "Bearer",
                apiKey
            );

            httpRequest.Content = JsonContent.Create(
                groqRequest,
                options: JsonOptions()
            );

            using var response = await _httpClient.SendAsync(httpRequest);

            if (!response.IsSuccessStatusCode)
            {
                var errorText = await response.Content.ReadAsStringAsync();

                return new GroqAnalysisResult
                {
                    Success = false,
                    Decision = "PENDING_REVIEW",
                    ConfidenceScore = 0,
                    Note = $"Groq HTTP error: {(int)response.StatusCode}. {errorText}"
                };
            }

            var chatResponse = await response.Content.ReadFromJsonAsync<GroqChatResponse>(
                JsonOptions()
            );

            var content = chatResponse?.Choices?.FirstOrDefault()?.Message?.Content;

            if (string.IsNullOrWhiteSpace(content))
            {
                return new GroqAnalysisResult
                {
                    Success = false,
                    Decision = "PENDING_REVIEW",
                    ConfidenceScore = 0,
                    Note = "Groq response is empty."
                };
            }

            var result = JsonSerializer.Deserialize<GroqBusinessDecision>(
                content,
                JsonOptions()
            );

            if (result == null)
            {
                return new GroqAnalysisResult
                {
                    Success = false,
                    Decision = "PENDING_REVIEW",
                    ConfidenceScore = 0,
                    Note = "Cannot parse Groq JSON result."
                };
            }

            var decision = NormalizeDecision(result.Decision);

            return new GroqAnalysisResult
            {
                Success = true,
                Decision = decision,
                ConfidenceScore = ClampConfidence(result.ConfidenceScore),
                Note = result.Reason ?? "Groq analysis completed."
            };
        }
        catch (Exception ex)
        {
            return new GroqAnalysisResult
            {
                Success = false,
                Decision = "PENDING_REVIEW",
                ConfidenceScore = 0,
                Note = ex.Message
            };
        }
    }

    private static string BuildGroqPrompt(
        BusinessVerificationProviderRequest request,
        VietQrBusinessData vietQrData)
    {
        return $$"""
        Return JSON only.

        Required JSON schema:
        {
          "decision": "VERIFIED or PENDING_REVIEW",
          "confidenceScore": 0.0,
          "reason": "short explanation"
        }

        Rules:
        - VERIFIED only if tax code exists and submitted company name/address are highly consistent with VietQR data.
        - PENDING_REVIEW if company name or address does not clearly match.
        - Never reject automatically. Use PENDING_REVIEW for uncertain cases.
        - confidenceScore must be between 0 and 1.

        User submitted business:
        {
          "companyName": "{{request.CompanyName}}",
          "taxCode": "{{request.TaxCode}}",
          "industry": "{{request.Industry}}",
          "companyAddress": "{{request.CompanyAddress}}",
          "businessEmail": "{{request.BusinessEmail}}",
          "businessPhone": "{{request.BusinessPhone}}"
        }

        VietQR tax lookup data:
        {
          "id": "{{vietQrData.Id}}",
          "name": "{{vietQrData.Name}}",
          "internationalName": "{{vietQrData.InternationalName}}",
          "shortName": "{{vietQrData.ShortName}}",
          "address": "{{vietQrData.Address}}"
        }
        """;
    }

    private static string NormalizeDecision(string? decision)
    {
        var value = decision?.Trim().ToUpperInvariant();

        return value == "VERIFIED"
            ? "VERIFIED"
            : "PENDING_REVIEW";
    }

    private static decimal ClampConfidence(decimal confidence)
    {
        if (confidence < 0)
        {
            return 0;
        }

        if (confidence > 1)
        {
            return 1;
        }

        return confidence;
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

    private sealed class GroqAnalysisResult
    {
        public bool Success { get; set; }

        public string Decision { get; set; } = "PENDING_REVIEW";

        public decimal ConfidenceScore { get; set; }

        public string Note { get; set; } = string.Empty;
    }

    private sealed class GroqBusinessDecision
    {
        public string? Decision { get; set; }

        public decimal ConfidenceScore { get; set; }

        public string? Reason { get; set; }
    }

    private sealed class GroqChatRequest
    {
        public string Model { get; set; } = "llama-3.3-70b-versatile";

        public List<GroqMessage> Messages { get; set; } = [];

        [JsonPropertyName("response_format")]
        public GroqResponseFormat ResponseFormat { get; set; } = new();
    }

    private sealed class GroqMessage
    {
        public string Role { get; set; } = string.Empty;

        public string Content { get; set; } = string.Empty;
    }

    private sealed class GroqResponseFormat
    {
        public string Type { get; set; } = "json_object";
    }

    private sealed class GroqChatResponse
    {
        public List<GroqChoice>? Choices { get; set; }
    }

    private sealed class GroqChoice
    {
        public GroqMessage? Message { get; set; }
    }
}