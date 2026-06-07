using System.Text;
using System.Text.RegularExpressions;
using AITasker.Application.DTOs.Requests;
using AITasker.Application.DTOs.Responses;
using AITasker.Application.Interfaces;

namespace AITasker.Infrastructure.Services;

public class UrlInspectionService : IUrlInspectionService
{
    private const int MaxHtmlBytes = 80_000;
    private readonly HttpClient _httpClient;

    public UrlInspectionService(HttpClient httpClient)
    {
        _httpClient = httpClient;
    }

    public async Task<List<UrlInspectionResult>> InspectAsync(
        List<UrlInspectionTarget> targets,
        CancellationToken cancellationToken = default
    )
    {
        var results = new List<UrlInspectionResult>();

        foreach (var target in targets)
        {
            var result = await InspectOneAsync(target, cancellationToken);
            results.Add(result);
        }

        return results;
    }

    private async Task<UrlInspectionResult> InspectOneAsync(
        UrlInspectionTarget target,
        CancellationToken cancellationToken
    )
    {
        var result = new UrlInspectionResult
        {
            Label = target.Label,
            Url = target.Url,
            IsRequiredProof = target.IsRequiredProof
        };

        if (!Uri.TryCreate(target.Url, UriKind.Absolute, out var uri)
            || (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps))
        {
            result.IsReachable = false;
            result.ErrorMessage = "Invalid URL format.";
            return result;
        }

        try
        {
            using var request = new HttpRequestMessage(HttpMethod.Get, uri);
            request.Headers.UserAgent.ParseAdd(
                "Mozilla/5.0 (compatible; AITaskerBot/1.0; +https://aitasker.local)"
            );

            using var response = await _httpClient.SendAsync(
                request,
                HttpCompletionOption.ResponseHeadersRead,
                cancellationToken
            );

            result.StatusCode = (int)response.StatusCode;
            result.ContentType = response.Content.Headers.ContentType?.MediaType;

            if ((int)response.StatusCode is 401 or 403 or 429)
            {
                result.IsReachable = false;
                result.IsBlockedOrUnknown = true;
                result.ErrorMessage = "URL may exist but access is blocked or rate-limited.";
                return result;
            }

            if (!response.IsSuccessStatusCode)
            {
                result.IsReachable = false;
                result.ErrorMessage = $"URL returned HTTP {(int)response.StatusCode}.";
                return result;
            }

            result.IsReachable = true;

            var contentType = response.Content.Headers.ContentType?.MediaType?.ToLower();

            if (contentType == null || !contentType.Contains("html"))
            {
                result.TextSnippet = $"Reachable non-HTML content. Content-Type: {contentType ?? "unknown"}.";
                return result;
            }

            await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
            using var memory = new MemoryStream();

            var buffer = new byte[8192];
            var totalRead = 0;

            while (totalRead < MaxHtmlBytes)
            {
                var read = await stream.ReadAsync(
                    buffer.AsMemory(0, Math.Min(buffer.Length, MaxHtmlBytes - totalRead)),
                    cancellationToken
                );

                if (read == 0)
                {
                    break;
                }

                await memory.WriteAsync(buffer.AsMemory(0, read), cancellationToken);
                totalRead += read;
            }

            var html = Encoding.UTF8.GetString(memory.ToArray());

            result.PageTitle = ExtractTitle(html);
            result.MetaDescription = ExtractMetaDescription(html);
            result.TextSnippet = ExtractTextSnippet(html);

            return result;
        }
        catch (TaskCanceledException)
        {
            result.IsReachable = false;
            result.IsBlockedOrUnknown = true;
            result.ErrorMessage = "URL check timed out.";
            return result;
        }
        catch (Exception ex)
        {
            result.IsReachable = false;
            result.IsBlockedOrUnknown = true;
            result.ErrorMessage = ex.Message;
            return result;
        }
    }

    private static string? ExtractTitle(string html)
    {
        var match = Regex.Match(
            html,
            @"<title[^>]*>(.*?)</title>",
            RegexOptions.IgnoreCase | RegexOptions.Singleline
        );

        return match.Success
            ? CleanText(match.Groups[1].Value, 200)
            : null;
    }

    private static string? ExtractMetaDescription(string html)
    {
        var match = Regex.Match(
            html,
            @"<meta\s+[^>]*name=[""']description[""'][^>]*content=[""'](.*?)[""'][^>]*>",
            RegexOptions.IgnoreCase | RegexOptions.Singleline
        );

        if (!match.Success)
        {
            match = Regex.Match(
                html,
                @"<meta\s+[^>]*content=[""'](.*?)[""'][^>]*name=[""']description[""'][^>]*>",
                RegexOptions.IgnoreCase | RegexOptions.Singleline
            );
        }

        return match.Success
            ? CleanText(match.Groups[1].Value, 300)
            : null;
    }

    private static string ExtractTextSnippet(string html)
    {
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

        var noTags = Regex.Replace(
            noStyle,
            "<.*?>",
            " ",
            RegexOptions.Singleline
        );

        return CleanText(noTags, 1200);
    }

    private static string CleanText(string value, int maxLength)
    {
        var decoded = System.Net.WebUtility.HtmlDecode(value);

        var cleaned = Regex.Replace(decoded, @"\s+", " ").Trim();

        return cleaned.Length <= maxLength
            ? cleaned
            : cleaned[..maxLength];
    }
}