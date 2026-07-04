namespace AITasker.Infrastructure.Common;

public static class VietnamDateTime
{
    public const int UtcOffsetHours = 7;

    public static DateTime Now => DateTime.UtcNow.AddHours(UtcOffsetHours);
}
