using System.Globalization;
using System.Net;
using System.Text;
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

    private sealed record CourseraCertificateData(
        string? CertificateName,
        string? HolderName,
        DateTime? IssuedAt,
        string? PartnerName
    );

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
            CertificateType = NormalizeText(request.CertificateType),
            CertificateName = NormalizeText(request.CertificateName),
            CertificateIssuer = NormalizeText(request.CertificateIssuer),
            CertificateUrl = NormalizeText(request.CertificateUrl),
            VerificationStatus = "NEEDS_REVIEW",
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

        var nonCertificateEvidenceReason = DetectNonCertificateEvidenceUrl(uri);

        if (!string.IsNullOrWhiteSpace(nonCertificateEvidenceReason))
        {
            result.VerificationStatus = "NEEDS_REVIEW";
            result.VerificationScore = 0;
            result.VerificationNote = nonCertificateEvidenceReason;
            result.IsReachable = false;
            result.DetectedIssuer = DetectIssuer(string.Empty, request.CertificateIssuer, uri.Host);
            result.DetectedCertificateName = string.Empty;

            return result;
        }

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
                result.VerificationStatus = "NEEDS_REVIEW";
                result.VerificationScore = 0;
                result.VerificationNote = response.StatusCode == HttpStatusCode.Forbidden
                    ? "Certificate URL is protected or blocks automated verification. Holder name could not be verified."
                    : $"Certificate URL returned HTTP {(int)response.StatusCode}. Holder name could not be verified.";

                return result;
            }

            pageContent = await response.Content.ReadAsStringAsync();

            pageContent = LimitText(pageContent, 1_000_000);

            result.PageTitle = ExtractTitle(pageContent);

            plainText = ExtractPlainText(pageContent);

            result.ExtractedText = LimitText(plainText, 1500);
        }
        catch (TaskCanceledException)
        {
            result.VerificationStatus = "NEEDS_REVIEW";
            result.VerificationScore = 0;
            result.VerificationNote =
                "Certificate URL request timed out. Holder name could not be verified.";
            return result;
        }
        catch (HttpRequestException ex)
        {
            result.VerificationStatus = "NEEDS_REVIEW";
            result.VerificationScore = 0;
            result.VerificationNote =
                $"Certificate URL could not be checked: {ex.Message}. Holder name could not be verified.";
            return result;
        }
        catch (Exception ex)
        {
            result.VerificationStatus = "NEEDS_REVIEW";
            result.VerificationScore = 0;
            result.VerificationNote =
                $"Certificate URL could not be fully verified: {ex.Message}. Holder name could not be verified.";
            return result;
        }

        var searchableText = $"{result.PageTitle} {plainText}";

        CourseraCertificateData? courseraData = null;

        if (IsCourseraPersonalCredentialUrl(uri))
        {
            courseraData = ExtractCourseraCertificateData(pageContent);

            if (courseraData is not null)
            {
                searchableText = $"{searchableText} {BuildCourseraStructuredText(courseraData)}";
            }
        }

        var detectedIssuedAt = request.IssuedAt
            ?? courseraData?.IssuedAt
            ?? DetectIssuedDate(searchableText);

        var detectedIssuer = courseraData is not null
            ? "Coursera"
            : DetectIssuer(searchableText, request.CertificateIssuer, uri.Host);

        var detectedCertificateName = !string.IsNullOrWhiteSpace(courseraData?.CertificateName)
            ? courseraData.CertificateName
            : !string.IsNullOrWhiteSpace(request.CertificateName)
                ? request.CertificateName.Trim()
                : result.PageTitle;

        result.DetectedIssuer = detectedIssuer;
        result.DetectedCertificateName = detectedCertificateName;

        result.ContainsCertificateName = !string.IsNullOrWhiteSpace(detectedCertificateName)
            && ContainsMeaningfulText(searchableText, detectedCertificateName);

        result.ContainsIssuer = !string.IsNullOrWhiteSpace(detectedIssuer)
            && (result.IsTrustedDomain || ContainsMeaningfulText(searchableText, detectedIssuer));

        var detectedHolderName = !string.IsNullOrWhiteSpace(courseraData?.HolderName)
            ? courseraData.HolderName!.Trim()
            : ContainsPersonName(searchableText, request.ExpertFullName)
                ? request.ExpertFullName.Trim()
                : null;

        result.DetectedHolderName = detectedHolderName;

        if (!string.IsNullOrWhiteSpace(detectedHolderName))
        {
            result.ContainsHolderName = IsHolderNameMatched(
                request.ExpertFullName,
                detectedHolderName
            );
            result.IsHolderNameMismatch = !result.ContainsHolderName;
        }

        result.DetectedIssuedAt = detectedIssuedAt;
        result.DetectedIssuedDateText = detectedIssuedAt.HasValue
            ? BuildDetectedIssuedDateText(detectedIssuedAt.Value)
            : null;

        result.ContainsIssuedDate = detectedIssuedAt.HasValue;

        result.IsRelatedToExpertSkills = IsRelatedToSkills(
            searchableText,
            request.ExpertSkillsText,
            request.ExpertBio
        );

        result.IsIssuedAtReasonable = IsIssuedAtReasonable(detectedIssuedAt);

        result.VerificationScore = CalculateScore(result, request);

        result.VerificationStatus = DetermineStatus(result);

        if (result.VerificationStatus is "NAME_MISMATCH" or "NEEDS_REVIEW")
        {
            result.VerificationScore = 0;
        }

        result.VerificationNote = BuildVerificationNote(result, request);

        return result;
    }

    private static decimal CalculateScore(
        CertificateVerificationResult result,
        CertificateVerificationRequest request
    )
    {
        if (result.IsHolderNameMismatch || !result.ContainsHolderName)
        {
            return 0m;
        }

        var score = 0m;

        if (result.IsReachable)
        {
            score += 15m;
        }

        if (result.IsHttps)
        {
            score += 5m;
        }

        if (result.IsTrustedDomain)
        {
            score += 15m;
        }

        if (result.ContainsCertificateName)
        {
            score += 15m;
        }

        if (result.ContainsIssuer)
        {
            score += 10m;
        }

        if (result.ContainsHolderName)
        {
            score += 35m;
        }

        if (result.ContainsIssuedDate)
        {
            score += 5m;
        }

        return Math.Clamp(score, 0m, 100m);
    }

    private static string DetermineStatus(CertificateVerificationResult result)
    {
        if (result.IsHolderNameMismatch)
        {
            return "NAME_MISMATCH";
        }

        if (!result.IsReachable)
        {
            return "NEEDS_REVIEW";
        }

        if (string.IsNullOrWhiteSpace(result.DetectedHolderName))
        {
            return "NEEDS_REVIEW";
        }

        if (!result.ContainsHolderName)
        {
            return "NAME_MISMATCH";
        }

        if (result.VerificationScore >= 50m)
        {
            return "VERIFIED";
        }

        return "NEEDS_REVIEW";
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

        if (result.VerificationStatus == "NAME_MISMATCH")
        {
            notes.Add(
                $"Certificate holder name '{NormalizeText(result.DetectedHolderName ?? string.Empty)}' does not match expert full name '{NormalizeText(request.ExpertFullName)}'. Please submit a certificate that belongs to you or remove this certificate."
            );

            return string.Join(" ", notes);
        }

        if (!result.IsReachable)
        {
            notes.Add("Certificate URL is not reachable or could not be checked automatically.");
        }

        if (!result.IsHttps)
        {
            notes.Add("Certificate URL does not use HTTPS.");
        }

        if (!result.IsTrustedDomain)
        {
            notes.Add("Certificate domain is not in the trusted issuer list.");
        }

        if (string.IsNullOrWhiteSpace(result.DetectedHolderName))
        {
            notes.Add("Certificate holder name could not be detected from the provided URL, so this certificate is not counted as verified evidence.");
        }
        else if (!result.ContainsHolderName)
        {
            notes.Add(
                $"Detected certificate holder '{NormalizeText(result.DetectedHolderName)}' does not match expert full name '{NormalizeText(request.ExpertFullName)}'."
            );
        }

        if (!result.ContainsCertificateName)
        {
            if (HasUsefulDetectedValue(result.DetectedCertificateName, result.PageTitle))
            {
                notes.Add(
                    $"Detected certificate name: '{NormalizeText(result.DetectedCertificateName!)}', but page content is not strong enough for full verification."
                );
            }
            else
            {
                notes.Add("Page content does not clearly expose the certificate name.");
            }
        }

        if (!result.ContainsIssuer)
        {
            if (HasUsefulDetectedValue(result.DetectedIssuer, null))
            {
                notes.Add(
                    $"Detected certificate issuer/domain: '{NormalizeText(result.DetectedIssuer!)}', but issuer evidence is not strong enough for full verification."
                );
            }
            else
            {
                notes.Add("Page content does not clearly expose the certificate issuer.");
            }
        }

        if (!result.ContainsIssuedDate)
        {
            notes.Add("Page content does not clearly expose the certificate issued date.");
        }

        if (!result.IsRelatedToExpertSkills)
        {
            notes.Add("Certificate content does not clearly relate to the expert's skills.");
        }

        if (result.VerificationStatus == "NEEDS_REVIEW")
        {
            notes.Add("This optional certificate needs review and is not counted toward certificate evidence score.");
        }

        if (notes.Count == 0)
        {
            notes.Add("Certificate URL is reachable and the detected holder name matches the expert full name.");
        }

        return string.Join(" ", notes);
    }

    private static bool HasUsefulDetectedValue(string? detectedValue, string? pageTitle)
    {
        if (string.IsNullOrWhiteSpace(detectedValue))
        {
            return false;
        }

        var normalizedDetected = NormalizeForCompare(detectedValue);

        if (string.IsNullOrWhiteSpace(normalizedDetected))
        {
            return false;
        }

        if (!string.IsNullOrWhiteSpace(pageTitle) &&
            normalizedDetected == NormalizeForCompare(pageTitle))
        {
            return false;
        }

        if (normalizedDetected.Contains("online courses") ||
            normalizedDetected.Contains("join for free") ||
            normalizedDetected.Contains("credentials from top educators"))
        {
            return false;
        }

        return true;
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

        return matchedTokens >= Math.Ceiling(expectedTokens.Count * 0.7);
    }

    private static bool IsHolderNameMatched(string expertFullName, string detectedHolderName)
    {
        var normalizedExpertName = NormalizeForCompare(expertFullName);
        var normalizedHolderName = NormalizeForCompare(detectedHolderName);

        if (string.IsNullOrWhiteSpace(normalizedExpertName) ||
            string.IsNullOrWhiteSpace(normalizedHolderName))
        {
            return false;
        }

        if (normalizedExpertName == normalizedHolderName)
        {
            return true;
        }

        var expertTokens = normalizedExpertName
            .Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Where(x => x.Length >= 2)
            .ToList();

        var holderTokens = normalizedHolderName
            .Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Where(x => x.Length >= 2)
            .ToList();

        if (expertTokens.Count < 2 || holderTokens.Count < 2)
        {
            return false;
        }

        var matchedTokens = holderTokens.Count(token => expertTokens.Contains(token));

        return matchedTokens == holderTokens.Count &&
               holderTokens.Count >= Math.Ceiling(expertTokens.Count * 0.7);
    }

    private static bool ContainsPersonName(string source, string fullName)
    {
        if (string.IsNullOrWhiteSpace(source) || string.IsNullOrWhiteSpace(fullName))
        {
            return false;
        }

        var normalizedName = NormalizeForCompare(fullName);

        if (string.IsNullOrWhiteSpace(normalizedName) ||
            normalizedName is "string" or "test" or "user" or "unknown")
        {
            return false;
        }

        var normalizedSource = NormalizeForCompare(source);

        if (normalizedSource.Contains(normalizedName))
        {
            return true;
        }

        var nameTokens = normalizedName
            .Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Where(x => x.Length >= 2)
            .Distinct()
            .ToList();

        if (nameTokens.Count < 2)
        {
            return false;
        }

        var matchedTokens = nameTokens.Count(token =>
            normalizedSource.Contains(token)
        );

        // Vietnamese names and English names may have middle names omitted on certificates.
        // Require at least two name parts and at least 70% token match.
        return matchedTokens >= 2 &&
               matchedTokens >= Math.Ceiling(nameTokens.Count * 0.7);
    }

    private static DateTime? DetectIssuedDate(string source)
    {
        if (string.IsNullOrWhiteSpace(source))
        {
            return null;
        }

        var normalized = source.Trim();

        var patterns = new[]
        {
            @"\b(?<year>20\d{2}|19\d{2})[-/](?<month>0?[1-9]|1[0-2])[-/](?<day>0?[1-9]|[12]\d|3[01])\b",
            @"\b(?<day>0?[1-9]|[12]\d|3[01])[-/](?<month>0?[1-9]|1[0-2])[-/](?<year>20\d{2}|19\d{2})\b"
        };

        foreach (var pattern in patterns)
        {
            var match = Regex.Match(normalized, pattern);

            if (!match.Success)
            {
                continue;
            }

            if (int.TryParse(match.Groups["year"].Value, out var year)
                && int.TryParse(match.Groups["month"].Value, out var month)
                && int.TryParse(match.Groups["day"].Value, out var day)
                && DateTime.TryParse(
                    $"{year:D4}-{month:D2}-{day:D2}",
                    CultureInfo.InvariantCulture,
                    DateTimeStyles.AssumeUniversal,
                    out var parsedDate
                ))
            {
                var date = parsedDate.Date;

                if (IsIssuedAtReasonable(date))
                {
                    return date;
                }
            }
        }

        var monthPattern =
            @"\b(?<month>January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\s+(?<day>0?[1-9]|[12]\d|3[01]),?\s+(?<year>20\d{2}|19\d{2})\b";

        var monthMatch = Regex.Match(
            normalized,
            monthPattern,
            RegexOptions.IgnoreCase
        );

        if (monthMatch.Success
            && DateTime.TryParse(
                monthMatch.Value,
                CultureInfo.InvariantCulture,
                DateTimeStyles.AssumeUniversal,
                out var monthDate
            )
            && IsIssuedAtReasonable(monthDate.Date))
        {
            return monthDate.Date;
        }

        return null;
    }

    private static bool ContainsIssuedDate(string source, DateTime? issuedAt)
    {
        if (string.IsNullOrWhiteSpace(source) || !issuedAt.HasValue)
        {
            return false;
        }

        var normalizedSource = NormalizeForCompare(source);
        var date = issuedAt.Value.Date;

        var monthName = CultureInfo.InvariantCulture.DateTimeFormat.GetMonthName(date.Month).ToLowerInvariant();
        var shortMonthName = CultureInfo.InvariantCulture.DateTimeFormat.GetAbbreviatedMonthName(date.Month).ToLowerInvariant();

        var candidates = new List<string>
        {
            date.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
            date.ToString("yyyy/MM/dd", CultureInfo.InvariantCulture),
            date.ToString("dd/MM/yyyy", CultureInfo.InvariantCulture),
            date.ToString("MM/dd/yyyy", CultureInfo.InvariantCulture),
            date.ToString("yyyyMMdd", CultureInfo.InvariantCulture),
            $"{monthName} {date.Year}",
            $"{shortMonthName} {date.Year}",
            $"{date.Month} {date.Year}",
            $"{date.Month:D2} {date.Year}",
            $"{date.Year}"
        };

        var normalizedCandidates = candidates
            .Select(NormalizeForCompare)
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .Distinct()
            .ToList();

        // Exact day/month/year or month/year match is strong.
        if (normalizedCandidates
            .Where(x => x != date.Year.ToString(CultureInfo.InvariantCulture))
            .Any(normalizedSource.Contains))
        {
            return true;
        }

        // Year-only is too weak by itself, but acceptable when the certificate also has month words nearby.
        var year = date.Year.ToString(CultureInfo.InvariantCulture);
        return normalizedSource.Contains(year) &&
               (normalizedSource.Contains(monthName) || normalizedSource.Contains(shortMonthName));
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

        var withoutDiacritics = RemoveDiacritics(value);

        var normalized = withoutDiacritics
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
            .Replace(")", " ")
            .Replace("[", " ")
            .Replace("]", " ")
            .Replace("{", " ")
            .Replace("}", " ");

        return Regex.Replace(normalized, @"\s+", " ").Trim();
    }

    private static string RemoveDiacritics(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return string.Empty;
        }

        var normalizedString = value.Normalize(NormalizationForm.FormD);
        var stringBuilder = new StringBuilder();

        foreach (var character in normalizedString)
        {
            var unicodeCategory = CharUnicodeInfo.GetUnicodeCategory(character);

            if (unicodeCategory != UnicodeCategory.NonSpacingMark)
            {
                stringBuilder.Append(character);
            }
        }

        return stringBuilder
            .ToString()
            .Normalize(NormalizationForm.FormC)
            .Replace('đ', 'd')
            .Replace('Đ', 'D');
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

    private static string BuildDetectedIssuedDateText(DateTime issuedAt)
    {
        return issuedAt.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
    }

    private static bool IsCourseraPersonalCredentialUrl(Uri uri)
    {
        var host = uri.Host.ToLowerInvariant();
        var path = uri.AbsolutePath.Trim('/').ToLowerInvariant();

        return host.EndsWith("coursera.org") &&
               (
                   path.StartsWith("account/accomplishments/verify/") ||
                   path.StartsWith("account/accomplishments/certificate/") ||
                   path.StartsWith("account/accomplishments/specialization/") ||
                   path.StartsWith("verify/")
               );
    }

    private static CourseraCertificateData? ExtractCourseraCertificateData(string html)
    {
        if (string.IsNullOrWhiteSpace(html))
        {
            return null;
        }

        var decoded = WebUtility.HtmlDecode(html)
            .Replace("\\u002F", "/")
            .Replace("\\/", "/");

        var firstName = MatchJsonString(decoded, "firstName");
        var middleName = MatchJsonString(decoded, "middleName");
        var lastName = MatchJsonString(decoded, "lastName");

        var holderName = string.Join(" ", new[]
        {
            firstName,
            middleName,
            lastName
        }.Where(x => !string.IsNullOrWhiteSpace(x)));

        var grantedAtText = MatchJsonNumber(decoded, "grantedAt");

        DateTime? issuedAt = null;

        if (long.TryParse(grantedAtText, out var grantedAtMilliseconds))
        {
            issuedAt = DateTimeOffset
                .FromUnixTimeMilliseconds(grantedAtMilliseconds)
                .UtcDateTime
                .Date;
        }

        var certificateName = ExtractCourseraCourseName(decoded);
        var partnerName = ExtractCourseraPartnerName(decoded);

        if (string.IsNullOrWhiteSpace(certificateName) &&
            string.IsNullOrWhiteSpace(holderName) &&
            issuedAt is null)
        {
            return null;
        }

        return new CourseraCertificateData(
            certificateName,
            holderName,
            issuedAt,
            partnerName
        );
    }

    private static string BuildCourseraStructuredText(CourseraCertificateData data)
    {
        var parts = new List<string>();

        if (!string.IsNullOrWhiteSpace(data.CertificateName))
        {
            parts.Add(data.CertificateName);
        }

        if (!string.IsNullOrWhiteSpace(data.HolderName))
        {
            parts.Add(data.HolderName);
        }

        if (data.IssuedAt.HasValue)
        {
            parts.Add(data.IssuedAt.Value.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture));
            parts.Add(data.IssuedAt.Value.ToString("MMMM d, yyyy", CultureInfo.InvariantCulture));
            parts.Add(data.IssuedAt.Value.ToString("MMM d, yyyy", CultureInfo.InvariantCulture));
        }

        if (!string.IsNullOrWhiteSpace(data.PartnerName))
        {
            parts.Add(data.PartnerName);
        }

        parts.Add("Coursera");

        return string.Join(" ", parts);
    }

    private static string? MatchJsonString(string text, string key)
    {
        var match = Regex.Match(
            text,
            $"\\\"{Regex.Escape(key)}\\\"\\s*:\\s*\\\"(?<value>(?:\\\\.|[^\\\"])*)\\\"",
            RegexOptions.IgnoreCase | RegexOptions.Singleline
        );

        return match.Success
            ? Regex.Unescape(match.Groups["value"].Value).Trim()
            : null;
    }

    private static string? MatchJsonNumber(string text, string key)
    {
        var match = Regex.Match(
            text,
            $"\\\"{Regex.Escape(key)}\\\"\\s*:\\s*(?<value>\\d+)",
            RegexOptions.IgnoreCase | RegexOptions.Singleline
        );

        return match.Success
            ? match.Groups["value"].Value.Trim()
            : null;
    }

    private static string? ExtractCourseraCourseName(string text)
    {
        var courseMatch = Regex.Match(
            text,
            "\\\"__typename\\\"\\s*:\\s*\\\"Course_Course\\\".*?\\\"name\\\"\\s*:\\s*\\\"(?<name>(?:\\\\.|[^\\\"])*)\\\"",
            RegexOptions.IgnoreCase | RegexOptions.Singleline
        );

        if (courseMatch.Success)
        {
            return Regex.Unescape(courseMatch.Groups["name"].Value).Trim();
        }

        var xdpMatch = Regex.Match(
            text,
            "\\\"__typename\\\"\\s*:\\s*\\\"XdpV1\\\".*?\\\"name\\\"\\s*:\\s*\\\"(?<name>(?:\\\\.|[^\\\"])*)\\\"",
            RegexOptions.IgnoreCase | RegexOptions.Singleline
        );

        if (xdpMatch.Success)
        {
            return Regex.Unescape(xdpMatch.Groups["name"].Value).Trim();
        }

        return null;
    }

    private static string? ExtractCourseraPartnerName(string text)
    {
        var partnerMatch = Regex.Match(
            text,
            "\\\"__typename\\\"\\s*:\\s*\\\"Partner_Partner\\\".*?\\\"name\\\"\\s*:\\s*\\\"(?<name>(?:\\\\.|[^\\\"])*)\\\"",
            RegexOptions.IgnoreCase | RegexOptions.Singleline
        );

        if (partnerMatch.Success)
        {
            return Regex.Unescape(partnerMatch.Groups["name"].Value).Trim();
        }

        return null;
    }

    private static string? DetectNonCertificateEvidenceUrl(Uri uri)
    {
        var host = uri.Host.ToLowerInvariant();
        var path = uri.AbsolutePath.Trim('/').ToLowerInvariant();

        if (host.EndsWith("coursera.org"))
        {
            var isPersonalCredentialUrl =
                path.StartsWith("account/accomplishments/verify/") ||
                path.StartsWith("account/accomplishments/certificate/") ||
                path.StartsWith("account/accomplishments/specialization/") ||
                path.StartsWith("verify/");

            var isCourseOrCatalogUrl =
                path.StartsWith("specializations/") ||
                path.StartsWith("learn/") ||
                path.StartsWith("professional-certificates/") ||
                path.StartsWith("browse/") ||
                path.StartsWith("collections/");

            if (!isPersonalCredentialUrl && isCourseOrCatalogUrl)
            {
                return "This Coursera URL is a course, specialization, professional certificate, or catalog page, not a personal certificate verification URL. Please provide a Coursera accomplishment or verify URL.";
            }
        }

        if (host.EndsWith("udemy.com") && path.StartsWith("course/"))
        {
            return "This Udemy URL is a course landing page, not a personal certificate verification URL. Please provide the expert's personal certificate URL.";
        }

        if (host.EndsWith("edx.org") &&
            (path.StartsWith("learn/") || path.StartsWith("course/")))
        {
            return "This edX URL is a course page, not a personal certificate verification URL. Please provide the expert's personal certificate or credential URL.";
        }

        return null;
    }
}
