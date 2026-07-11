using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace AITasker.Infrastructure.Data;

public sealed class UtcDateTimeConverter : ValueConverter<DateTime, DateTime>
{
    public UtcDateTimeConverter()
        : base(
            value => NormalizeForStorage(value),
            value => DateTime.SpecifyKind(value, DateTimeKind.Utc))
    {
    }

    private static DateTime NormalizeForStorage(DateTime value)
    {
        return value.Kind switch
        {
            DateTimeKind.Utc => value,
            DateTimeKind.Local => value.ToUniversalTime(),
            _ => throw new InvalidOperationException(
                "A persisted timestamp must be UTC or Local. DateTimeKind.Unspecified is not allowed.")
        };
    }
}

public sealed class NullableUtcDateTimeConverter : ValueConverter<DateTime?, DateTime?>
{
    public NullableUtcDateTimeConverter()
        : base(
            value => NormalizeForStorage(value),
            value => value.HasValue
                ? DateTime.SpecifyKind(value.Value, DateTimeKind.Utc)
                : null)
    {
    }

    private static DateTime? NormalizeForStorage(DateTime? value)
    {
        if (!value.HasValue)
        {
            return null;
        }

        return value.Value.Kind switch
        {
            DateTimeKind.Utc => value.Value,
            DateTimeKind.Local => value.Value.ToUniversalTime(),
            _ => throw new InvalidOperationException(
                "A persisted timestamp must be UTC or Local. DateTimeKind.Unspecified is not allowed.")
        };
    }
}
