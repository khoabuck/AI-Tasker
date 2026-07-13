namespace AITasker.Application.Common;

public class LoginBlockedException : Exception
{
    public LoginBlockedException(
        DateTime blockedUntilUtc,
        string message = "Too many failed login attempts. Please try again later.")
        : base(message)
    {
        BlockedUntilUtc = DateTime.SpecifyKind(blockedUntilUtc, DateTimeKind.Utc);
    }

    public DateTime BlockedUntilUtc { get; }

    public int RetryAfterSeconds
    {
        get
        {
            var remaining = BlockedUntilUtc - DateTime.UtcNow;

            return Math.Max(1, (int)Math.Ceiling(remaining.TotalSeconds));
        }
    }
}
