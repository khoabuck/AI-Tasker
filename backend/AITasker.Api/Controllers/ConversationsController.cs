using System.Security.Claims;
using AITasker.Application.DTOs.Requests;
using AITasker.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AITasker.Api.Controllers
{
    [ApiController]
    [Route("api/conversations")]
    [Authorize]
    public class ConversationsController : ControllerBase
    {
        private readonly IConversationService _conversationService;

        public ConversationsController(IConversationService conversationService)
        {
            _conversationService = conversationService;
        }

        [HttpPost]
        public async Task<IActionResult> CreateOrGetConversation(
            [FromBody] CreateConversationRequest request)
        {
            try
            {
                var userId = GetCurrentUserId();

                var result = await _conversationService.CreateOrGetConversationAsync(
                    userId,
                    request);

                return Ok(new
                {
                    success = true,
                    message = "Conversation retrieved successfully.",
                    data = result
                });
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new
                {
                    success = false,
                    message = ex.Message
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

        [HttpGet("me")]
        public async Task<IActionResult> GetMyConversations()
        {
            try
            {
                var userId = GetCurrentUserId();

                var result = await _conversationService.GetMyConversationsAsync(userId);

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

        [HttpGet("{conversationId:int}")]
        public async Task<IActionResult> GetConversationById(int conversationId)
        {
            try
            {
                var userId = GetCurrentUserId();

                var result = await _conversationService.GetConversationByIdAsync(
                    userId,
                    conversationId);

                return Ok(new
                {
                    success = true,
                    data = result
                });
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new
                {
                    success = false,
                    message = ex.Message
                });
            }
            catch (InvalidOperationException ex)
            {
                return NotFound(new
                {
                    success = false,
                    message = ex.Message
                });
            }
        }

        [HttpGet("{conversationId:int}/messages")]
        public async Task<IActionResult> GetMessages(int conversationId)
        {
            try
            {
                var userId = GetCurrentUserId();

                var result = await _conversationService.GetMessagesAsync(
                    userId,
                    conversationId);

                return Ok(new
                {
                    success = true,
                    data = result
                });
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new
                {
                    success = false,
                    message = ex.Message
                });
            }
            catch (InvalidOperationException ex)
            {
                return NotFound(new
                {
                    success = false,
                    message = ex.Message
                });
            }
        }

        [HttpPost("{conversationId:int}/messages")]
        public async Task<IActionResult> SendMessage(
            int conversationId,
            [FromBody] SendConversationMessageRequest request)
        {
            try
            {
                var userId = GetCurrentUserId();

                var result = await _conversationService.SendMessageAsync(
                    userId,
                    conversationId,
                    request);

                return Ok(new
                {
                    success = true,
                    message = "Message sent successfully.",
                    data = result
                });
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new
                {
                    success = false,
                    message = ex.Message
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

        private int GetCurrentUserId()
        {
            var userIdValue =
                User.FindFirstValue("userId") ??
                User.FindFirstValue(ClaimTypes.NameIdentifier) ??
                User.FindFirstValue("sub");

            if (!int.TryParse(userIdValue, out var userId))
            {
                throw new InvalidOperationException("Invalid user token.");
            }

            return userId;
        }
    }
}