using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;
using AITasker.Infrastructure.AI;

namespace AITasker.Api.Controllers
{
    [ApiController]
    [Route("api/ai")]
    public class AIController : ControllerBase
    {
        private readonly GroqService _groqService;

        public AIController(GroqService groqService)
        {
            _groqService = groqService;
        }

        [HttpPost("job-assistant")]
        public async Task<IActionResult> GenerateJobDescription([FromBody] JobAssistantRequest request)
        {
            if (request == null || string.IsNullOrWhiteSpace(request.Prompt))
            {
                return BadRequest(new { message = "User prompt content cannot be empty." });
            }

            var systemPrompt = "You are an expert HR Specialist and a professional IT Job Description assistant. " +
                               "Please generate a well-structured and highly professional Job Description (JD) " +
                               "including sections: Job Title/Position, Technical Requirements, Benefits & Perks, and Estimated Salary Range based on the provided user inputs.";

            var result = await _groqService.CallGroqAsync(systemPrompt, request.Prompt, "JobAssistant");

            return Ok(new { data = result });
        }
    }

    public class JobAssistantRequest
    {
        public string Prompt { get; set; } = string.Empty;
    }
}