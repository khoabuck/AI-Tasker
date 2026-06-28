using AITasker.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AITasker.Api.Controllers
{
    [ApiController]
    [Route("api/admin/dashboard")]
    [Authorize(Roles = "ADMIN")]
    public class AdminDashboardController : ControllerBase
    {
        private readonly IAdminDashboardService _adminDashboardService;

        public AdminDashboardController(
            IAdminDashboardService adminDashboardService)
        {
            _adminDashboardService = adminDashboardService;
        }

        [HttpGet("summary")]
        public async Task<IActionResult> GetSummary()
        {
            try
            {
                var result = await _adminDashboardService.GetSummaryAsync();

                return Ok(new
                {
                    success = true,
                    data = result
                });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new
                {
                    success = false,
                    message = ex.Message
                });
            }
        }

        [HttpGet("revenue")]
        public async Task<IActionResult> GetRevenue()
        {
            try
            {
                var result = await _adminDashboardService.GetRevenueAsync();

                return Ok(new
                {
                    success = true,
                    data = result
                });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new
                {
                    success = false,
                    message = ex.Message
                });
            }
        }

        [HttpGet("projects")]
        public async Task<IActionResult> GetProjects()
        {
            try
            {
                var result = await _adminDashboardService.GetProjectsAsync();

                return Ok(new
                {
                    success = true,
                    data = result
                });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new
                {
                    success = false,
                    message = ex.Message
                });
            }
        }

        [HttpGet("finance")]
        public async Task<IActionResult> GetFinanceOverview()
        {
            try
            {
                var result = await _adminDashboardService.GetFinanceOverviewAsync();

                return Ok(new
                {
                    success = true,
                    data = result
                });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new
                {
                    success = false,
                    message = ex.Message
                });
            }
        }

        [HttpGet("platform-wallet")]
        public async Task<IActionResult> GetPlatformWallet()
        {
            try
            {
                var result = await _adminDashboardService.GetPlatformWalletAsync();

                return Ok(new
                {
                    success = true,
                    data = result
                });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new
                {
                    success = false,
                    message = ex.Message
                });
            }
        }

        [HttpGet("platform-transactions")]
        public async Task<IActionResult> GetPlatformTransactions(
            [FromQuery] string? type,
            [FromQuery] int take = 100)
        {
            try
            {
                var result = await _adminDashboardService.GetPlatformTransactionsAsync(type, take);

                return Ok(new
                {
                    success = true,
                    data = result
                });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new
                {
                    success = false,
                    message = ex.Message
                });
            }
        }

        [HttpGet("user-wallets")]
        public async Task<IActionResult> GetUserWallets(
            [FromQuery] string? role,
            [FromQuery] int take = 100)
        {
            try
            {
                var result = await _adminDashboardService.GetUserWalletsAsync(role, take);

                return Ok(new
                {
                    success = true,
                    data = result
                });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new
                {
                    success = false,
                    message = ex.Message
                });
            }
        }

        [HttpGet("transactions")]
        public async Task<IActionResult> GetTransactions(
            [FromQuery] string? type,
            [FromQuery] int take = 100)
        {
            try
            {
                var result = await _adminDashboardService.GetTransactionsAsync(type, take);

                return Ok(new
                {
                    success = true,
                    data = result
                });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new
                {
                    success = false,
                    message = ex.Message
                });
            }
        }

        [HttpGet("escrows")]
        public async Task<IActionResult> GetEscrows(
            [FromQuery] string? status,
            [FromQuery] int take = 100)
        {
            try
            {
                var result = await _adminDashboardService.GetEscrowsAsync(status, take);

                return Ok(new
                {
                    success = true,
                    data = result
                });
            }
            catch (InvalidOperationException ex)
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