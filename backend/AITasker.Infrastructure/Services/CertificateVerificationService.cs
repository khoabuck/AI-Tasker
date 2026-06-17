using System.Net;
using System.Text.RegularExpressions;
using AITasker.Application.DTOs.Requests;
using AITasker.Application.DTOs.Responses;
using AITasker.Application.Interfaces;

namespace AITasker.Infrastructure.Services;

public class CertificateVerificationService : ICertificateVerificationService
{
    private static readonly string[] TrustedDomains =
    {
        "coursera.org",
        "udemy.com",
        "edx.org",
        "credly.com",
        "microsoft.com",
        "learn.microsoft.com",
        "aws.amazon.com",
        "cloud.google.com",
        "oracle.com",
        "ibm.com",
        "datacamp.com",
        "freecodecamp.org",
        "linkedin.com",
        "certiprof.com",
        "scrum.org",
        "comptia.org"
    };

    private readonly HttpClient _httpClient;

    public CertificateVerificationService(HttpClient httpClient)
    {
        _httpClient = httpClient;
    }

    public async Task<List<CertificateVerificationResult>> VerifyManyAsync(
        List<CertificateVerificationRequest> requests
    )
    {
        var results = new List<CertificateVerificationResult>();

        foreach (var request in requests)
        {
            var result = await VerifyAsync(request);
            results.Add(result);
        }

        return results;
    }

    public async Task<CertificateVerificationResult> VerifyAsync(
        CertificateVerificationRequest request
    )
    {
        var checkedAt = DateTime.UtcNow;

        var result = new CertificateVerificationResult
        {
            CertificateName = NormalizeText(request.CertificateName),
            CertificateIssuer = NormalizeText(request.CertificateIssuer),
            CertificateUrl = NormalizeText(request.CertificateUrl),
            VerificationStatus = "NEEDS_EVIDENCE",
            CheckedAt = checkedAt
        };

        if (string.IsNullOrWhiteSpace(request.CertificateUrl))
        {
            result.VerificationStatus = "INVALID";
            result.VerificationScore = 0;
            result.VerificationNote = "Certificate URL is required.";
            return result;
        }

        if (!Uri.TryCreate(request.CertificateUrl, UriKind.Absolute, out var uri))
        {
            result.VerificationStatus = "INVALID";
            result.VerificationScore = 0;
            result.VerificationNote = "Certificate URL is not a valid absolute URL.";
            return result;
        }

        if (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps)
        {
            result.VerificationStatus = "INVALID";
            result.VerificationScore = 0;
            result.VerificationNote = "Certificate URL must use HTTP or HTTPS.";
            return result;
        }

        result.IsHttps = uri.Scheme == Uri.UriSchemeHttps;
        result.IsTrustedDomain = IsTrustedDomain(uri.Host, request.CertificateIssuer);

        string pageContent;
        string plainText;

        try
        {
            using var httpRequest = new HttpRequestMessage(HttpMethod.Get, uri);

            httpRequest.Headers.UserAgent.ParseAdd(
                "Mozilla/5.0 (compatible; AITaskerBot/1.0; +https://aitasker.local)"
            );

            using var response = await _httpClient.SendAsync(httpRequest);

            result.HttpStatusCode = (int)response.StatusCode;
            result.IsReachable = response.IsSuccessStatusCode;

            if (!response.IsSuccessStatusCode)
            {
                result.VerificationStatus = IsClearlyInvalidHttpStatus(response.StatusCode)
                    ? "INVALID"
                    : "NEEDS_EVIDENCE";

                result.VerificationScore = CalculateScore(result, request);
                result.VerificationNote = result.VerificationStatus == "INVALID"
                    ? $"Certificate URL is invalid or not found. HTTP status code: {(int)response.StatusCode}."
                    : $"Certificate URL could not be fully verified. HTTP status code: {(int)response.StatusCode}. More evidence is required.";

                return result;
            }

            pageContent = await response.Content.ReadAsStringAsync();

            pageContent = LimitText(pageContent, 120_000);

            result.PageTitle = ExtractTitle(pageContent);

            plainText = ExtractPlainText(pageContent);

            result.ExtractedText = LimitText(plainText, 1500);
        }
        catch (TaskCanceledException)
        {
            result.VerificationStatus = "NEEDS_EVIDENCE";
            result.VerificationScore = CalculateScore(result, request);
            result.VerificationNote =
                "Certificate URL request timed out. More evidence is required.";
            return result;
        }
        catch (HttpRequestException ex)
        {
            result.VerificationStatus = "INVALID";
            result.VerificationScore = CalculateScore(result, request);
            result.VerificationNote =
                $"Certificate URL could not be checked: {ex.Message}";
            return result;
        }
        catch (Exception ex)
        {
            result.VerificationStatus = "NEEDS_EVIDENCE";
            result.VerificationScore = CalculateScore(result, request);
            result.VerificationNote =
                $"Certificate URL could not be fully verified: {ex.Message}. More evidence is required.";
            return result;
        }

        var searchableText = $"{result.PageTitle} {plainText}";

        result.ContainsCertificateName = ContainsMeaningfulText(
            searchableText,
            request.CertificateName
        );

        result.ContainsIssuer = ContainsMeaningfulText(
            searchableText,
            request.CertificateIssuer
        );

        result.IsRelatedToExpertSkills = IsRelatedToSkills(
            searchableText,
            request.ExpertSkillsText,
            request.ExpertBio
        );

        result.IsIssuedAtReasonable = IsIssuedAtReasonable(request.IssuedAt);

        result.DetectedIssuer = DetectIssuer(searchableText, request.CertificateIssuer, uri.Host);

        result.DetectedCertificateName = result.ContainsCertificateName
            ? request.CertificateName.Trim()
            : result.PageTitle;

        result.VerificationScore = CalculateScore(result, request);

        result.VerificationStatus = DetermineStatus(
            result.VerificationScore,
            result.IsReachable
        );

        result.VerificationNote = BuildVerificationNote(result, request);

        return result;
    }

    private static decimal CalculateScore(
        CertificateVerificationResult result,
        CertificateVerificationRequest request
    )
    {
        var score = 0m;

        if (result.IsReachable)
        {
            score += 20m;
        }

        if (result.IsHttps)
        {
            score += 10m;
        }

        if (result.IsTrustedDomain)
        {
            score += 20m;
        }

        if (result.ContainsCertificateName)
        {
            score += 20m;
        }

        if (result.ContainsIssuer)
        {
            score += 15m;
        }

        if (result.IsRelatedToExpertSkills)
        {
            score += 10m;
        }

        if (result.IsIssuedAtReasonable)
        {
            score += 5m;
        }

        return Math.Clamp(score, 0m, 100m);
    }

    private static string DetermineStatus(decimal score, bool isReachable)
    {
        if (!isReachable)
        {
            return "INVALID";
        }

        if (score >= 80m)
        {
            return "VERIFIED";
        }

        if (score >= 50m)
        {
            return "NEEDS_EVIDENCE";
        }

        if (score >= 20m)
        {
            return "SUSPICIOUS";
        }

        return "INVALID";
    }

    private static bool IsClearlyInvalidHttpStatus(HttpStatusCode statusCode)
    {
        return statusCode is HttpStatusCode.BadRequest
            or HttpStatusCode.NotFound
            or HttpStatusCode.Gone;
    }

    private static string BuildVerificationNote(
        CertificateVerificationResult result,
        CertificateVerificationRequest request
    )
    {
        var notes = new List<string>();

        if (!result.IsReachable)
        {
            notes.Add("Certificate URL is not reachable.");
        }

        if (!result.IsHttps)
        {
            notes.Add("Certificate URL does not use HTTPS.");
        }

        if (!result.IsTrustedDomain)
        {
            notes.Add("Certificate domain is not in the trusted issuer list.");
        }

        if (!result.ContainsCertificateName)
        {
            notes.Add("Page content does not clearly contain the claimed certificate name.");
        }

        if (!result.ContainsIssuer)
        {
            notes.Add("Page content does not clearly contain the claimed issuer.");
        }

        if (!result.IsRelatedToExpertSkills)
        {
            notes.Add("Certificate content does not clearly relate to the expert's skills.");
        }

        if (!result.IsIssuedAtReasonable)
        {
            notes.Add("Issued date is missing or unreasonable.");
        }

        if (result.VerificationStatus == "NEEDS_EVIDENCE")
        {
            notes.Add("More evidence is required to verify this certificate confidently.");
        }

        if (notes.Count == 0)
        {
            notes.Add("Certificate URL is reachable and evidence matches the claimed certificate information.");
        }

        return string.Join(" ", notes);
    }

    private static bool IsTrustedDomain(string host, string certificateIssuer)
    {
        var normalizedHost = NormalizeForCompare(host);

        if (TrustedDomains.Any(domain =>
                normalizedHost.EndsWith(NormalizeForCompare(domain))))
        {
            return true;
        }

        var normalizedIssuer = NormalizeForCompare(certificateIssuer);

        if (string.IsNullOrWhiteSpace(normalizedIssuer))
        {
            return false;
        }

        return normalizedHost.Contains(normalizedIssuer);
    }

    private static bool ContainsMeaningfulText(string source, string expected)
    {
        if (string.IsNullOrWhiteSpace(source) || string.IsNullOrWhiteSpace(expected))
        {
            return false;
        }

        var normalizedSource = NormalizeForCompare(source);
        var normalizedExpected = NormalizeForCompare(expected);

        if (normalizedExpected.Length < 3)
        {
            return false;
        }

        if (normalizedSource.Contains(normalizedExpected))
        {
            return true;
        }

        var expectedTokens = normalizedExpected
            .Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Where(x => x.Length >= 3)
            .Distinct()
            .ToList();

        if (expectedTokens.Count == 0)
        {
            return false;
        }

        var matchedTokens = expectedTokens.Count(token =>
            normalizedSource.Contains(token)
        );

        return matchedTokens >= Math.Ceiling(expectedTokens.Count * 0.6);
    }

    private static bool IsRelatedToSkills(
        string source,
        string expertSkillsText,
        string expertBio
    )
    {
        if (string.IsNullOrWhiteSpace(source))
        {
            return false;
        }

        var normalizedSource = NormalizeForCompare(source);

        var skillTokens = ExtractSkillTokens(expertSkillsText)
            .Concat(ExtractImportantTokens(expertBio))
            .Where(x => x.Length >= 3)
            .Distinct()
            .Take(50)
            .ToList();

        if (skillTokens.Count == 0)
        {
            return false;
        }

        var matchedCount = skillTokens.Count(token =>
            normalizedSource.Contains(token)
        );

        return matchedCount >= 1;
    }

    private static List<string> ExtractSkillTokens(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return new List<string>();
        }

        return value
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .SelectMany(x => NormalizeForCompare(x)
                .Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
            .Where(x => x.Length >= 2)
            .Distinct()
            .ToList();
    }

    private static List<string> ExtractImportantTokens(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return new List<string>();
        }

        var stopWords = new HashSet<string>
        {
            "the", "and", "for", "with", "that", "this", "have", "has",
            "been", "from", "into", "using", "tools", "system", "systems",
            "project", "projects", "business", "experience", "build",
            "built", "work", "working"
        };

        return NormalizeForCompare(value)
            .Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Where(x => x.Length >= 4 && !stopWords.Contains(x))
            .Distinct()
            .Take(30)
            .ToList();
    }

    private static bool IsIssuedAtReasonable(DateTime? issuedAt)
    {
        if (!issuedAt.HasValue)
        {
            return false;
        }

        var date = issuedAt.Value.Date;

        if (date > DateTime.UtcNow.Date)
        {
            return false;
        }

        if (date.Year < 1980)
        {
            return false;
        }

        return true;
    }

    private static string? DetectIssuer(
        string source,
        string claimedIssuer,
        string host
    )
    {
        if (!string.IsNullOrWhiteSpace(claimedIssuer) &&
            ContainsMeaningfulText(source, claimedIssuer))
        {
            return claimedIssuer.Trim();
        }

        var trusted = TrustedDomains.FirstOrDefault(domain =>
            NormalizeForCompare(host).EndsWith(NormalizeForCompare(domain)));

        return trusted;
    }

    private static string ExtractTitle(string html)
    {
        if (string.IsNullOrWhiteSpace(html))
        {
            return string.Empty;
        }

        var match = Regex.Match(
            html,
            @"<title[^>]*>(.*?)</title>",
            RegexOptions.IgnoreCase | RegexOptions.Singleline
        );

        if (!match.Success)
        {
            return string.Empty;
        }

        return WebUtility.HtmlDecode(match.Groups[1].Value).Trim();
    }

    private static string ExtractPlainText(string html)
    {
        if (string.IsNullOrWhiteSpace(html))
        {
            return string.Empty;
        }

        var noScript = Regex.Replace(
            html,
            @"<script[^>]*>.*?</script>",
            " ",
            RegexOptions.IgnoreCase | RegexOptions.Singleline
        );

        var noStyle = Regex.Replace(
            noScript,
            @"<style[^>]*>.*?</style>",
            " ",
            RegexOptions.IgnoreCase | RegexOptions.Singleline
        );

        var noTags = Regex.Replace(noStyle, "<.*?>", " ");

        var decoded = WebUtility.HtmlDecode(noTags);

        return Regex.Replace(decoded, @"\s+", " ").Trim();
    }

    private static string NormalizeForCompare(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return string.Empty;
        }

        var normalized = value
            .Trim()
            .ToLowerInvariant()
            .Replace("-", " ")
            .Replace("_", " ")
            .Replace(".", " ")
            .Replace("/", " ")
            .Replace(":", " ")
            .Replace("|", " ")
            .Replace(",", " ")
            .Replace("(", " ")
            .Replace(")", " ");

        return Regex.Replace(normalized, @"\s+", " ").Trim();
    }

    private static string NormalizeText(string value)
    {
        return string.IsNullOrWhiteSpace(value)
            ? string.Empty
            : value.Trim();
    }

    private static string LimitText(string value, int maxLength)
    {
        if (string.IsNullOrEmpty(value))
        {
            return string.Empty;
        }

        return value.Length <= maxLength
            ? value
            : value[..maxLength];
    }
}
