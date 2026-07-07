namespace AITasker.Application.Interfaces
{
    public interface IExternalUrlValidator
    {
        Task<string?> ValidateOptionalUrlAsync(
            string? value,
            string fieldName,
            int maxLength,
            bool requireImage = false,
            CancellationToken cancellationToken = default);
    }
}
