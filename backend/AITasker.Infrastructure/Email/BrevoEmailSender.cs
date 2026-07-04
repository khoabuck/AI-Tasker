using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using AITasker.Application.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace AITasker.Infrastructure.Email;

public class BrevoEmailSender : IEmailSender
{
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;
    private readonly ILogger<BrevoEmailSender> _logger;

    public BrevoEmailSender(
        HttpClient httpClient,
        IConfiguration configuration,
        ILogger<BrevoEmailSender> logger)
    {
        _httpClient = httpClient;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task SendEmailAsync(string toEmail, string subject, string htmlBody)
    {
        var apiKey = _configuration["Brevo:ApiKey"];
        var fromEmail = _configuration["Brevo:FromEmail"];
        var fromName = _configuration["Brevo:FromName"] ?? "AITasker";

        if (string.IsNullOrWhiteSpace(apiKey))
        {
            throw new InvalidOperationException("Brevo API key is missing.");
        }

        if (string.IsNullOrWhiteSpace(fromEmail))
        {
            throw new InvalidOperationException("Brevo from email is missing.");
        }

        var payload = new
        {
            sender = new
            {
                name = fromName,
                email = fromEmail
            },
            to = new[]
            {
                new
                {
                    email = toEmail
                }
            },
            subject = subject,
            htmlContent = htmlBody,
            textContent = BuildPlainTextBody(subject)
        };

        var json = JsonSerializer.Serialize(payload);

        using var request = new HttpRequestMessage(
            HttpMethod.Post,
            "https://api.brevo.com/v3/smtp/email"
        );

        request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        request.Headers.Add("api-key", apiKey);

        request.Content = new StringContent(json, Encoding.UTF8, "application/json");

        try
        {
            _logger.LogInformation(
                "Sending email via Brevo API. From={FromEmail}, To={ToEmail}, Subject={Subject}",
                fromEmail,
                toEmail,
                subject
            );

            using var response = await _httpClient.SendAsync(request);
            var responseBody = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError(
                    "Brevo API failed. StatusCode={StatusCode}, Response={ResponseBody}",
                    (int)response.StatusCode,
                    responseBody
                );

                throw new InvalidOperationException(
                    $"Brevo API failed with status {(int)response.StatusCode}: {responseBody}"
                );
            }

            _logger.LogInformation(
                "Email sent successfully via Brevo API. To={ToEmail}, Subject={Subject}, Response={ResponseBody}",
                toEmail,
                subject,
                responseBody
            );
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "Failed to send email via Brevo API. To={ToEmail}, Subject={Subject}",
                toEmail,
                subject
            );

            throw;
        }
    }

    private static string BuildPlainTextBody(string subject)
    {
        if (subject.Contains("reset", StringComparison.OrdinalIgnoreCase))
        {
            return "Please use the password reset link in this email to reset your AITasker password.";
        }

        if (subject.Contains("verify", StringComparison.OrdinalIgnoreCase))
        {
            return "Please use the verification link in this email to verify your AITasker account.";
        }

        return "Please open this email in an HTML-compatible email client.";
    }
}