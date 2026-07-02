using AITasker.Application.Interfaces;
using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Configuration;
using MimeKit;

namespace AITasker.Infrastructure.Email;

public class GmailSmtpEmailSender : IEmailSender
{
    private readonly IConfiguration _configuration;

    public GmailSmtpEmailSender(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public async Task SendEmailAsync(string toEmail, string subject, string htmlBody)
    {
        var host = _configuration["GmailSmtp:Host"] ?? "smtp.gmail.com";
        var portText = _configuration["GmailSmtp:Port"] ?? "587";
        var username = _configuration["GmailSmtp:Username"];
        var password = _configuration["GmailSmtp:Password"];
        var fromEmail = _configuration["GmailSmtp:FromEmail"] ?? username;
        var fromName = _configuration["GmailSmtp:FromName"] ?? "AITasker";

        if (string.IsNullOrWhiteSpace(username))
        {
            throw new InvalidOperationException("Gmail SMTP username is missing.");
        }

        if (string.IsNullOrWhiteSpace(password))
        {
            throw new InvalidOperationException("Gmail SMTP app password is missing.");
        }

        if (!int.TryParse(portText, out var port))
        {
            port = 587;
        }

        var message = new MimeMessage();
        message.From.Add(new MailboxAddress(fromName, fromEmail));
        message.To.Add(MailboxAddress.Parse(toEmail));
        message.Subject = subject;

        message.Body = new BodyBuilder
        {
            HtmlBody = htmlBody,
            TextBody = "Please verify your AITasker account using the verification link in this email."
        }.ToMessageBody();

        using var smtp = new SmtpClient();

        await smtp.ConnectAsync(host, port, SecureSocketOptions.StartTls);
        await smtp.AuthenticateAsync(username, password);
        await smtp.SendAsync(message);
        await smtp.DisconnectAsync(true);
    }
}