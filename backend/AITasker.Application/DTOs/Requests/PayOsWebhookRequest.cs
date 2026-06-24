using System.Text.Json;

namespace AITasker.Application.DTOs.Requests
{
    public class PayOsWebhookRequest
    {
        public string Code { get; set; } = string.Empty;

        public string Desc { get; set; } = string.Empty;

        public bool Success { get; set; }

        public JsonElement Data { get; set; }

        public string Signature { get; set; } = string.Empty;
    }
}