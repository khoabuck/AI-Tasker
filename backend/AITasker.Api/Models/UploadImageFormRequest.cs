using Microsoft.AspNetCore.Mvc;

namespace AITasker.Api.Models;

public class UploadImageFormRequest
{
    [FromForm(Name = "file")]
    public IFormFile? File { get; set; }

    [FromForm(Name = "purpose")]
    public string? Purpose { get; set; }
}