using System.Security.Claims;
using AITasker.Infrastructure.Banking;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AITasker.Api.Controllers
{
    [ApiController]
    [Route("api/vnpay")]
    public class VNPayController : ControllerBase
    {
        private readonly VNPayService _vnPayService;
        private readonly IConfiguration _configuration;

        public VNPayController(VNPayService vnPayService, IConfiguration configuration)
        {
            _vnPayService = vnPayService;
            _configuration = configuration;
        }

        [HttpPost("create-payment")]
        [Authorize]
        public IActionResult CreatePayment([FromQuery] decimal amount)
        {
            if (amount <= 0)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Amount must be greater than 0."
                });
            }

            var userId = GetCurrentUserId();
            var ipAddress = GetIpAddress();

            var returnUrl =
                _configuration["VNPay:ReturnUrl"]
                ?? $"{Request.Scheme}://{Request.Host}/api/vnpay/return";

            var paymentUrl = _vnPayService.CreatePaymentUrl(
                userId,
                amount,
                ipAddress,
                returnUrl);

            return Ok(new
            {
                success = true,
                paymentUrl
            });
        }

        [HttpGet("return")]
        [AllowAnonymous]
        public async Task<IActionResult> VNPayReturn()
        {
            var query = Request.Query.ToDictionary(
                x => x.Key,
                x => x.Value.ToString()
            );

            var result = await _vnPayService.ProcessReturnAsync(query);

            if (!result.Success)
            {
                return BadRequest(new
                {
                    success = false,
                    message = result.Message,
                    transactionRef = result.TransactionRef,
                    amount = result.Amount
                });
            }

            return Ok(new
            {
                success = true,
                message = result.Message,
                userId = result.UserId,
                amount = result.Amount,
                transactionRef = result.TransactionRef
            });
        }

        private int GetCurrentUserId()
        {
            var userIdValue =
                User.FindFirstValue(ClaimTypes.NameIdentifier)
                ?? User.FindFirstValue("userId")
                ?? User.FindFirstValue("sub");

            if (!int.TryParse(userIdValue, out var userId))
                throw new InvalidOperationException("Invalid user token.");

            return userId;
        }

        private string GetIpAddress()
        {
            var forwardedFor = Request.Headers["X-Forwarded-For"].FirstOrDefault();

            if (!string.IsNullOrWhiteSpace(forwardedFor))
                return forwardedFor.Split(',')[0].Trim();

            return HttpContext.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1";
        }
    }
}