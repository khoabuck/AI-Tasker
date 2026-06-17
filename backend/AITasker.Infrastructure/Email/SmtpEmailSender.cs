using AITasker.Application.Interfaces;
using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Configuration;
using MimeKit;

namespace AITasker.Infrastructure.Email;

public class SmtpEmailSender : IEmailSender
{
    private readonly IConfiguration _configuration;

    public SmtpEmailSender(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public async Task SendEmailAsync(string toEmail, string subject, string htmlBody)
    {
        var host = _configuration["Smtp:Host"];
        var portText = _configuration["Smtp:Port"];
        var username = _configuration["Smtp:Username"];
        var password = _configuration["Smtp:Password"];
        var fromEmail = _configuration["Smtp:FromEmail"];
        var fromName = _configuration["Smtp:FromName"] ?? "AITasker";

        if (string.IsNullOrWhiteSpace(host)
            || string.IsNullOrWhiteSpace(username)
            || string.IsNullOrWhiteSpace(password)
            || string.IsNullOrWhiteSpace(fromEmail))
        {
            throw new InvalidOperationException("SMTP configuration is missing.");
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
            HtmlBody = htmlBody
        }.ToMessageBody();

        using var smtpClient = new SmtpClient();

        smtpClient.ServerCertificateValidationCallback = (s, c, h, e) => true;

        await smtpClient.ConnectAsync(host, port, SecureSocketOptions.StartTls);
        await smtpClient.AuthenticateAsync(username, password);
        await smtpClient.SendAsync(message);
        await smtpClient.DisconnectAsync(true);
    }
}