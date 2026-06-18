using System.Text.Json;
using AITasker.Application.DTOs.Requests;
using AITasker.Application.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace AITasker.Api.Controllers
{
    [ApiController]
    [Route("api/payment-webhooks")]
    public class PaymentWebhooksController : ControllerBase
    {
        private readonly IWalletService _walletService;

        public PaymentWebhooksController(IWalletService walletService)
        {
            _walletService = walletService;
        }

        [HttpGet("payos")]
        public IActionResult PayOsWebhookHealthCheck()
        {
            return Ok(new
            {
                success = true,
                message = "payOS webhook endpoint is active."
            });
        }

        [HttpPost("payos")]
        public async Task<IActionResult> PayOsWebhook([FromBody] JsonElement body)
        {
            try
            {
                // payOS dashboard có thể gọi thử webhook để kiểm tra URL.
                // Nếu body rỗng/không đủ dữ liệu thì chỉ trả 200 để xác nhận endpoint sống,
                // tuyệt đối không cộng ví ở nhánh này.
                if (body.ValueKind == JsonValueKind.Undefined ||
                    body.ValueKind == JsonValueKind.Null ||
                    body.ValueKind == JsonValueKind.Object && !body.EnumerateObject().Any())
                {
                    return Ok(new
                    {
                        success = true,
                        message = "payOS webhook endpoint is active."
                    });
                }

                if (!body.TryGetProperty("signature", out var signatureElement) ||
                    signatureElement.ValueKind == JsonValueKind.Null ||
                    string.IsNullOrWhiteSpace(signatureElement.GetString()) ||
                    !body.TryGetProperty("data", out var dataElement) ||
                    dataElement.ValueKind != JsonValueKind.Object)
                {
                    return Ok(new
                    {
                        success = true,
                        message = "payOS webhook validation request received. No wallet balance was changed."
                    });
                }

                var request = JsonSerializer.Deserialize<PayOsWebhookRequest>(
                    body.GetRawText(),
                    new JsonSerializerOptions
                    {
                        PropertyNameCaseInsensitive = true
                    });

                if (request == null)
                {
                    return Ok(new
                    {
                        success = true,
                        message = "payOS webhook validation request received. No wallet balance was changed."
                    });
                }

                await _walletService.ConfirmPayOsWebhookAsync(request);

                return Ok(new
                {
                    success = true,
                    message = "payOS webhook processed successfully."
                });
            }
            catch (InvalidOperationException ex)
            {
                // Khi payOS lưu webhook, có thể nó gửi sample orderCode không tồn tại trong DB.
                // Trường hợp đó vẫn trả 200 để cho phép lưu webhook,
                // nhưng không cộng ví vì không tìm thấy DepositOrder thật.
                if (ex.Message.Contains("Deposit order not found", StringComparison.OrdinalIgnoreCase) ||
                    ex.Message.Contains("payOS webhook is not successful", StringComparison.OrdinalIgnoreCase))
                {
                    return Ok(new
                    {
                        success = true,
                        message = "payOS webhook received but ignored. No matching deposit order was found."
                    });
                }

                return BadRequest(new
                {
                    success = false,
                    message = ex.Message
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new
                {
                    success = false,
                    message = ex.Message
                });
            }
        }
    }
}