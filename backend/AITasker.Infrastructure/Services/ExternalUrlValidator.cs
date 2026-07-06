using System.Net;
using System.Net.Sockets;
using AITasker.Application.Interfaces;

namespace AITasker.Infrastructure.Services
{
    public class ExternalUrlValidator : IExternalUrlValidator
    {
        private static readonly string[] ImageExtensions =
        {
            ".jpg", ".jpeg", ".png", ".webp", ".gif"
        };

        private readonly IHttpClientFactory _httpClientFactory;

        public ExternalUrlValidator(IHttpClientFactory httpClientFactory)
        {
            _httpClientFactory = httpClientFactory;
        }

        public async Task<string?> ValidateOptionalUrlAsync(
            string? value,
            string fieldName,
            int maxLength,
            bool requireImage = false,
            CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                return null;
            }

            var trimmed = value.Trim();

            if (trimmed.Length > maxLength)
            {
                throw new InvalidOperationException($"{fieldName} must not exceed {maxLength} characters.");
            }

            if (!Uri.TryCreate(trimmed, UriKind.Absolute, out var uri) ||
                (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps))
            {
                throw new InvalidOperationException($"{fieldName} must be a valid http or https URL.");
            }

            if (!string.IsNullOrWhiteSpace(uri.UserInfo))
            {
                throw new InvalidOperationException($"{fieldName} must not contain username or password information.");
            }

            await EnsurePublicHostAsync(uri, fieldName, cancellationToken);

            using var response = await SendProbeAsync(uri, cancellationToken);

            var code = (int)response.StatusCode;
            if (code < 200 || code >= 400)
            {
                throw new InvalidOperationException($"{fieldName} must be publicly accessible. HTTP status: {code}.");
            }

            if (requireImage)
            {
                var mediaType = response.Content.Headers.ContentType?.MediaType;
                var hasImageContentType = !string.IsNullOrWhiteSpace(mediaType) &&
                    mediaType.StartsWith("image/", StringComparison.OrdinalIgnoreCase);

                var hasImageExtension = ImageExtensions.Any(ext =>
                    uri.AbsolutePath.EndsWith(ext, StringComparison.OrdinalIgnoreCase));

                if (!hasImageContentType && !hasImageExtension)
                {
                    throw new InvalidOperationException($"{fieldName} must point to an image URL.");
                }
            }

            return trimmed;
        }

        private async Task<HttpResponseMessage> SendProbeAsync(
            Uri uri,
            CancellationToken cancellationToken)
        {
            var client = _httpClientFactory.CreateClient("ExternalUrlValidator");

            using var headRequest = new HttpRequestMessage(HttpMethod.Head, uri);
            headRequest.Headers.UserAgent.ParseAdd("AITasker/1.0 URL validator");

            var headResponse = await client.SendAsync(
                headRequest,
                HttpCompletionOption.ResponseHeadersRead,
                cancellationToken);

            if (headResponse.StatusCode != HttpStatusCode.MethodNotAllowed)
            {
                return headResponse;
            }

            headResponse.Dispose();

            using var getRequest = new HttpRequestMessage(HttpMethod.Get, uri);
            getRequest.Headers.UserAgent.ParseAdd("AITasker/1.0 URL validator");

            return await client.SendAsync(
                getRequest,
                HttpCompletionOption.ResponseHeadersRead,
                cancellationToken);
        }

        private static async Task EnsurePublicHostAsync(
            Uri uri,
            string fieldName,
            CancellationToken cancellationToken)
        {
            IPAddress[] addresses;

            try
            {
                addresses = await Dns.GetHostAddressesAsync(uri.Host, cancellationToken);
            }
            catch
            {
                throw new InvalidOperationException($"{fieldName} host cannot be resolved.");
            }

            if (addresses.Length == 0)
            {
                throw new InvalidOperationException($"{fieldName} host cannot be resolved.");
            }

            if (addresses.Any(IsPrivateOrLocalAddress))
            {
                throw new InvalidOperationException($"{fieldName} must point to a public URL.");
            }
        }

        private static bool IsPrivateOrLocalAddress(IPAddress address)
        {
            if (IPAddress.IsLoopback(address))
            {
                return true;
            }

            if (address.AddressFamily == AddressFamily.InterNetwork)
            {
                var bytes = address.GetAddressBytes();

                return
                    bytes[0] == 10 ||
                    bytes[0] == 127 ||
                    bytes[0] == 169 && bytes[1] == 254 ||
                    bytes[0] == 172 && bytes[1] >= 16 && bytes[1] <= 31 ||
                    bytes[0] == 192 && bytes[1] == 168;
            }

            if (address.AddressFamily == AddressFamily.InterNetworkV6)
            {
                return
                    address.IsIPv6LinkLocal ||
                    address.IsIPv6SiteLocal ||
                    address.Equals(IPAddress.IPv6Loopback);
            }

            return false;
        }
    }
}
