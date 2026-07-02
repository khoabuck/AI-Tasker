using AITasker.Application.Interfaces;
using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using MimeKit;

namespace AITasker.Infrastructure.Email;

public class GmailSmtpEmailSender : IEmailSender
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<GmailSmtpEmailSender> _logger;

    public GmailSmtpEmailSender(
        IConfiguration configuration,
        ILogger<GmailSmtpEmailSender> logger)
    {
        _configuration = configuration;
        _logger = logger;
    }

    public async Task SendEmailAsync(string toEmail, string subject, string htmlBody)
    {
        var host = _configuration["GmailSmtp:Host"] ?? "smtp.gmail.com";
        var portText = _configuration["GmailSmtp:Port"] ?? "465";
        var username = _configuration["GmailSmtp:Username"];
        var password = _configuration["GmailSmtp:Password"];
        var fromName = _configuration["GmailSmtp:FromName"] ?? "AITasker";

        if (string.IsNullOrWhiteSpace(username))
        {
            throw new InvalidOperationException("Gmail SMTP username is missing.");
        }

        if (string.IsNullOrWhiteSpace(password))
        {
            throw new InvalidOperationException("Gmail SMTP app password is missing.");
        }

        var fromEmail = _configuration["GmailSmtp:FromEmail"];

        if (string.IsNullOrWhiteSpace(fromEmail))
        {
            fromEmail = username;
        }

        if (!int.TryParse(portText, out var port))
        {
            port = 465;
        }

        var socketOption = port == 465
            ? SecureSocketOptions.SslOnConnect
            : SecureSocketOptions.StartTls;

        var message = new MimeMessage();
        message.From.Add(new MailboxAddress(fromName, fromEmail));
        message.To.Add(MailboxAddress.Parse(toEmail));
        message.Subject = subject;

        message.Body = new BodyBuilder
        {
            HtmlBody = htmlBody,
            TextBody = BuildPlainTextBody(subject)
        }.ToMessageBody();

        using var smtp = new SmtpClient
        {
            Timeout = 15000
        };

        try
        {
            _logger.LogInformation(
                "Sending email via Gmail SMTP. Host={Host}, Port={Port}, SocketOption={SocketOption}, From={FromEmail}, To={ToEmail}, Subject={Subject}",
                host,
                port,
                socketOption,
                fromEmail,
                toEmail,
                subject
            );

            await smtp.ConnectAsync(host, port, socketOption);
            await smtp.AuthenticateAsync(username, password);
            await smtp.SendAsync(message);
            await smtp.DisconnectAsync(true);

            _logger.LogInformation(
                "Email sent successfully via Gmail SMTP. To={ToEmail}, Subject={Subject}",
                toEmail,
                subject
            );
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "Failed to send email via Gmail SMTP. Host={Host}, Port={Port}, From={FromEmail}, To={ToEmail}, Subject={Subject}",
                host,
                port,
                fromEmail,
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