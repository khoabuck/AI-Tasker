using System;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using AITasker.Domain.Entities;
using AITasker.Infrastructure.Data;
using Microsoft.Extensions.Configuration;

namespace AITasker.Infrastructure.AI
{
    public class GroqService
    {
        private readonly HttpClient _httpClient;
        private readonly string _apiKey;
        private readonly string _baseUrl;
        private readonly string _model;
        private readonly AITaskerDbContext _context;

        public GroqService(HttpClient httpClient, IConfiguration configuration, AITaskerDbContext context)
        {
            _httpClient = httpClient;
            _context = context;
            
            _baseUrl = configuration["BusinessVerification:Groq:BaseUrl"] ?? "https://api.groq.com/openai/v1";
            _apiKey = configuration["BusinessVerification:Groq:ApiKey"] ?? "";
            _model = configuration["BusinessVerification:Groq:Model"] ?? "llama-3.3-70b-versatile";
        }

        public async Task<string> CallGroqAsync(string systemPrompt, string userPrompt, string featureName)
        {
            if (string.IsNullOrWhiteSpace(_apiKey))
            {
                throw new InvalidOperationException("Groq API Key is missing in the configuration settings.");
            }

            var requestUrl = $"{_baseUrl}/chat/completions";
            var requestBody = new
            {
                model = _model,
                messages = new[] {
                    new { role = "system", content = systemPrompt },
                    new { role = "user", content = userPrompt }
                },
                temperature = 0.2
            };

            var jsonRequest = JsonSerializer.Serialize(requestBody);
            var requestMessage = new HttpRequestMessage(HttpMethod.Post, requestUrl)
            {
                Content = new StringContent(jsonRequest, Encoding.UTF8, "application/json")
            };
            requestMessage.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", _apiKey);

            string jsonResponse = string.Empty;
            string status = "Success";

            try
            {
                var response = await _httpClient.SendAsync(requestMessage);
                jsonResponse = await response.Content.ReadAsStringAsync();

                if (!response.IsSuccessStatusCode)
                {
                    status = "Failure";
                    return $"[AI Error] Groq gateway returned an error status: {response.StatusCode}. Details: {jsonResponse}";
                }
                
                using var doc = JsonDocument.Parse(jsonResponse);
                var content = doc.RootElement.GetProperty("choices")[0].GetProperty("message").GetProperty("content").GetString();
                return content ?? "AI did not return any content.";
            }
            catch (Exception ex)
            {
                status = "Failure";
                jsonResponse = ex.InnerException?.Message ?? ex.Message;
                throw;
            }
            finally
            {
                var log = new AiRequestLog
                {
                    Id = Guid.NewGuid(),
                    Feature = featureName,
                    RequestBody = userPrompt,
                    ResponseBody = jsonResponse,
                    Status = status,
                    CreatedAt = DateTime.UtcNow
                };

                _context.AiRequestLogs.Add(log);
                await _context.SaveChangesAsync();
            }
        }
    }
}