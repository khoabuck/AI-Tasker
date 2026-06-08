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

        [HttpGet("me")]
        public async Task<IActionResult> GetMyWallet()
        {
            try
            {
                int userId = GetCurrentUserId();

                var wallet = await _walletService.GetWalletByUserIdAsync(userId);

                if (wallet == null)
                {
                    return NotFound(new { message = "Wallet not found for this user." });
                }

                return Ok(new 
                {
                    userId = wallet.UserId,
                    availableBalance = wallet.AvailableBalance,
                    lockedBalance = wallet.LockedBalance,
                    totalEarning = wallet.TotalEarning,
                    updatedAt = wallet.UpdatedAt
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("top-up")]
        public async Task<IActionResult> TopUpSimulation([FromBody] decimal amount)
        {
            try
            {
                int userId = GetCurrentUserId();
                if (amount <= 0)
                {
                    return BadRequest(new { message = "Top-up amount must be greater than 0." });
                }

                var success = await _walletService.DepositAsync(userId, amount, "[Simulation] Mockup top-up wallet funds for testing", "MOCK_VNPAY_123");
                if (!success) return BadRequest(new { message = "Top-up simulation failed." });

                return Ok(new { success = true, message = $"Successfully simulated top-up of {amount} VND into your wallet." });
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
                if (amount <= 0) return BadRequest(new { message = "Deposit amount must be greater than 0." });
                if (string.IsNullOrWhiteSpace(returnUrl)) return BadRequest(new { message = "Return URL is required." });

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

                    await _walletService.DepositAsync(userId, amount, $"[VNPay] Deposit success. Info: {vnp_OrderInfo}", vnp_TxnRef);
                    return Ok(new { success = true, message = "Wallet balance updated successfully." });
                }
                return BadRequest(new { success = false, message = "Payment failed." });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}