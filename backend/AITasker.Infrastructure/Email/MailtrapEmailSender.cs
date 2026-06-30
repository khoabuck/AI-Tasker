using System.Net.Http.Json;
using AITasker.Application.Interfaces;
using Microsoft.Extensions.Configuration;

namespace AITasker.Infrastructure.Email;

public class MailtrapEmailSender : IEmailSender
{
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;

    public MailtrapEmailSender(HttpClient httpClient, IConfiguration configuration)
    {
        _httpClient = httpClient;
        _configuration = configuration;
    }

    public async Task SendEmailAsync(string toEmail, string subject, string htmlBody)
    {
        var apiToken =
            _configuration["Mailtrap:ApiToken"]
            ?? _configuration["Mailtrap:ApiKey"];

        var fromEmail = _configuration["Mailtrap:FromEmail"];
        var fromName = _configuration["Mailtrap:FromName"] ?? "AITasker";

        if (string.IsNullOrWhiteSpace(apiToken))
        {
            throw new InvalidOperationException("Mailtrap API token is missing.");
        }

        if (string.IsNullOrWhiteSpace(fromEmail))
        {
            throw new InvalidOperationException("Mailtrap FromEmail is missing.");
        }

        var payload = new
        {
            from = new
            {
                email = fromEmail,
                name = fromName
            },
            to = new[]
            {
                new
                {
                    email = toEmail
                }
            },
            subject = subject,
            html = htmlBody,
            text = "Please open this email in an HTML-compatible email client.",
            category = "AITasker Transactional"
        };

        using var request = new HttpRequestMessage(
            HttpMethod.Post,
            "https://send.api.mailtrap.io/api/send"
        );

        request.Headers.Add("Api-Token", apiToken);
        request.Content = JsonContent.Create(payload);

        using var response = await _httpClient.SendAsync(request);
        var responseText = await response.Content.ReadAsStringAsync();

        if (!response.IsSuccessStatusCode)
        {
            Console.WriteLine($"[MAILTRAP_ERROR] {(int)response.StatusCode} {responseText}");

            throw new InvalidOperationException(
                $"Mailtrap email failed: {(int)response.StatusCode} {responseText}"
            );
        }
    }
}