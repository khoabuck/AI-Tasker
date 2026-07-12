namespace AITasker.Infrastructure.Common;

/// <summary>
/// Converts between UTC and the Vietnam time zone at explicit system boundaries.
/// Persisted business timestamps must remain UTC and must not use this helper.
/// </summary>
public static class VietnamTimeZone
{
    public const string IanaId = "Asia/Ho_Chi_Minh";
    public const string WindowsId = "SE Asia Standard Time";

    public static TimeZoneInfo Instance { get; } = ResolveTimeZone();

    public static DateTime ToVietnamTime(DateTime utcDateTime)
    {
        if (utcDateTime.Kind != DateTimeKind.Utc)
        {
            throw new ArgumentException(
                "The input timestamp must have DateTimeKind.Utc.",
                nameof(utcDateTime));
        }

        return TimeZoneInfo.ConvertTimeFromUtc(utcDateTime, Instance);
    }

    public static DateTime ToUtc(DateTime vietnamLocalTime)
    {
        var unspecified = DateTime.SpecifyKind(
            vietnamLocalTime,
            DateTimeKind.Unspecified);

        if (Instance.IsInvalidTime(unspecified))
        {
            throw new ArgumentException(
                "The supplied Vietnam local time is invalid.",
                nameof(vietnamLocalTime));
        }

        return TimeZoneInfo.ConvertTimeToUtc(unspecified, Instance);
    }

    private static TimeZoneInfo ResolveTimeZone()
    {
        var timeZoneId = OperatingSystem.IsWindows()
            ? WindowsId
            : IanaId;

        return TimeZoneInfo.FindSystemTimeZoneById(timeZoneId);
    }
}
