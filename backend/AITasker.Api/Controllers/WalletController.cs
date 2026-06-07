using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Security.Claims;
using System.Threading.Tasks;
using AITasker.Application.Interfaces;
using AITasker.Infrastructure.Banking;

namespace AITasker.Api.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/wallets")]
    public class WalletController : ControllerBase
    {
        private readonly IWalletService _walletService;
        private readonly VNPayService _vnpayService;

        public WalletController(IWalletService walletService, VNPayService vnpayService)
        {
            _walletService = walletService;
            _vnpayService = vnpayService;
        }

        private int GetCurrentUserId()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !int.TryParse(userIdClaim.Value, out int userId))
            {
                throw new InvalidOperationException("Unauthorized or invalid user token structure.");
            }
            return userId;
        }

        [HttpGet("me/balance")]
        public async Task<IActionResult> GetMyBalance()
        {
            try
            {
                int userId = GetCurrentUserId();
                var balance = await _walletService.GetBalanceAsync(userId);
                return Ok(new { userId, balance });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("me/deposit-url")]
        public async Task<IActionResult> GetDepositUrl([FromBody] decimal amount, [FromQuery] string returnUrl)
        {
            try
            {
                int userId = GetCurrentUserId();
                if (amount <= 0)
                {
                    return BadRequest(new { message = "Deposit amount must be greater than 0." });
                }

                if (string.IsNullOrWhiteSpace(returnUrl))
                {
                    return BadRequest(new { message = "Return URL is required for payment redirection." });
                }

                string ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1";
                
                string paymentUrl = _vnpayService.CreatePaymentUrl(userId, amount, ipAddress, returnUrl);

                return Ok(new { url = paymentUrl });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [AllowAnonymous]
        [HttpGet("vnpay-callback")]
        public async Task<IActionResult> VNPayCallback(
            [FromQuery] string vnp_TxnRef,
            [FromQuery] string vnp_ResponseCode,
            [FromQuery] string vnp_Amount,
            [FromQuery] string vnp_OrderInfo)
        {
            try
            {
                if (vnp_ResponseCode == "00")
                {
                    int userId = int.Parse(vnp_TxnRef.Split('_')[0]);
                    
                    decimal amount = decimal.Parse(vnp_Amount) / 100m;

                    await _walletService.DepositAsync(userId, amount, $"[VNPay] Nạp tiền thành công. Nội dung: {vnp_OrderInfo}", vnp_TxnRef);

                    return Ok(new { success = true, message = "Wallet balance updated successfully." });
                }

                return BadRequest(new { success = false, message = "Payment failed or cancelled by user." });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}