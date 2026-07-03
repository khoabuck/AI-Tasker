using AITasker.Application.Interfaces;
using Google.Apis.Auth.OAuth2;
using Google.Apis.Auth.OAuth2.Flows;
using Google.Apis.Auth.OAuth2.Responses;
using Google.Apis.Gmail.v1;
using Google.Apis.Gmail.v1.Data;
using Google.Apis.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using MimeKit;

namespace AITasker.Infrastructure.Email;

public class GmailApiEmailSender : IEmailSender
{
    private static readonly string[] Scopes =
    [
        GmailService.Scope.GmailSend
    ];

    private readonly IConfiguration _configuration;
    private readonly ILogger<GmailApiEmailSender> _logger;

    public GmailApiEmailSender(
        IConfiguration configuration,
        ILogger<GmailApiEmailSender> logger)
    {
        _configuration = configuration;
        _logger = logger;
    }

    public async Task SendEmailAsync(string toEmail, string subject, string htmlBody)
    {
        using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(20));

        var clientId = _configuration["GmailApi:ClientId"];
        var clientSecret = _configuration["GmailApi:ClientSecret"];
        var refreshToken = _configuration["GmailApi:RefreshToken"];
        var fromEmail = _configuration["GmailApi:FromEmail"];
        var fromName = _configuration["GmailApi:FromName"] ?? "AITasker";
        var applicationName = _configuration["GmailApi:ApplicationName"] ?? "AITasker";

        if (string.IsNullOrWhiteSpace(clientId))
            throw new InvalidOperationException("Gmail API client id is missing.");

        if (string.IsNullOrWhiteSpace(clientSecret))
            throw new InvalidOperationException("Gmail API client secret is missing.");

        if (string.IsNullOrWhiteSpace(refreshToken))
            throw new InvalidOperationException("Gmail API refresh token is missing.");

        if (string.IsNullOrWhiteSpace(fromEmail))
            throw new InvalidOperationException("Gmail API from email is missing.");

        try
        {
            _logger.LogInformation(
                "Preparing Gmail API email sender. From={FromEmail}, To={ToEmail}, Subject={Subject}",
                fromEmail,
                toEmail,
                subject
            );

            var credential = CreateCredential(clientId, clientSecret, refreshToken);

            _logger.LogInformation("Refreshing Gmail API access token...");

            var refreshed = await credential.RefreshTokenAsync(cts.Token);

            if (!refreshed)
                throw new InvalidOperationException("Could not refresh Gmail API access token.");

            _logger.LogInformation("Gmail API access token refreshed successfully.");

            using var gmailService = new GmailService(new BaseClientService.Initializer
            {
                HttpClientInitializer = credential,
                ApplicationName = applicationName
            });

            var mimeMessage = BuildMimeMessage(fromName, fromEmail, toEmail, subject, htmlBody);

            var gmailMessage = new Message
            {
                Raw = EncodeMessageToBase64Url(mimeMessage)
            };

            _logger.LogInformation(
                "Sending email via Gmail API. From={FromEmail}, To={ToEmail}, Subject={Subject}",
                fromEmail,
                toEmail,
                subject
            );

            var response = await gmailService.Users.Messages
                .Send(gmailMessage, "me")
                .ExecuteAsync(cts.Token);

            _logger.LogInformation(
                "Email sent successfully via Gmail API. MessageId={MessageId}, To={ToEmail}, Subject={Subject}",
                response.Id,
                toEmail,
                subject
            );
        }
        catch (OperationCanceledException ex)
        {
            _logger.LogError(
                ex,
                "Gmail API email sending timed out after 20 seconds. To={ToEmail}, Subject={Subject}",
                toEmail,
                subject
            );

            throw;
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "Failed to send email via Gmail API. From={FromEmail}, To={ToEmail}, Subject={Subject}",
                fromEmail,
                toEmail,
                subject
            );

            throw;
        }
    }

    private static UserCredential CreateCredential(
        string clientId,
        string clientSecret,
        string refreshToken)
    {
        var flow = new GoogleAuthorizationCodeFlow(new GoogleAuthorizationCodeFlow.Initializer
        {
            ClientSecrets = new ClientSecrets
            {
                ClientId = clientId,
                ClientSecret = clientSecret
            },
            Scopes = Scopes
        });

        var token = new TokenResponse
        {
            RefreshToken = refreshToken
        };

        return new UserCredential(flow, "me", token);
    }

    private static MimeMessage BuildMimeMessage(
        string fromName,
        string fromEmail,
        string toEmail,
        string subject,
        string htmlBody)
    {
        var message = new MimeMessage();

        message.From.Add(new MailboxAddress(fromName, fromEmail));
        message.To.Add(MailboxAddress.Parse(toEmail));
        message.Subject = subject;

        message.Body = new BodyBuilder
        {
            HtmlBody = htmlBody,
            TextBody = BuildPlainTextBody(subject)
        }.ToMessageBody();

        return message;
    }

    private static string EncodeMessageToBase64Url(MimeMessage mimeMessage)
    {
        using var memoryStream = new MemoryStream();

        mimeMessage.WriteTo(memoryStream);

        return Convert.ToBase64String(memoryStream.ToArray())
            .Replace("+", "-")
            .Replace("/", "_")
            .Replace("=", string.Empty);
    }

    private static string BuildPlainTextBody(string subject)
    {
        if (subject.Contains("reset", StringComparison.OrdinalIgnoreCase))
            return "Please use the password reset link in this email to reset your AITasker password.";

        if (subject.Contains("verify", StringComparison.OrdinalIgnoreCase))
            return "Please use the verification link in this email to verify your AITasker account.";

        return "Please open this email in an HTML-compatible email client.";
    }
}