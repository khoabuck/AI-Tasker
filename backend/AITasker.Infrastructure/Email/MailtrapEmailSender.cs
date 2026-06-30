using AITasker.Application.Interfaces;
using Mailtrap;
using Mailtrap.Emails.Requests;
using Mailtrap.Emails.Responses;
using Microsoft.Extensions.Configuration;

namespace AITasker.Infrastructure.Email;

public class MailtrapEmailSender : IEmailSender
{
    private readonly IConfiguration _configuration;

    public MailtrapEmailSender(IConfiguration configuration)
    {
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

        try
        {
            using var mailtrapClientFactory = new MailtrapClientFactory(apiToken);

            IMailtrapClient mailtrapClient =
                mailtrapClientFactory.CreateClient();

            SendEmailRequest request = SendEmailRequest
                .Create()
                .From(fromEmail, fromName)
                .To(toEmail)
                .Subject(subject)
                .Category("AITasker Transactional")
                .Text("Please view this email in an HTML-compatible email client.")
                .Html(htmlBody);

            SendEmailResponse? response = await mailtrapClient
                .Email()
                .Send(request);
        }
        catch (MailtrapException ex)
        {
            Console.WriteLine($"[MAILTRAP_ERROR] {ex}");

            throw new InvalidOperationException(
                $"Mailtrap email failed: {ex.Message}",
                ex
            );
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[EMAIL_ERROR] {ex}");

            throw new InvalidOperationException(
                $"Cannot send email: {ex.Message}",
                ex
            );
        }
    }
}