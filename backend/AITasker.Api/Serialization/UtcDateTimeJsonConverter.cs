using System.Globalization;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;

namespace AITasker.Api.Serialization;

/// <summary>
/// Serializes timestamps as UTC ISO 8601 values with Z.
/// Exact yyyy-MM-dd values remain calendar dates and are represented as Unspecified DateTime values.
/// Timestamp inputs without Z or an explicit offset are rejected.
/// </summary>
public sealed class UtcDateTimeJsonConverter : JsonConverter<DateTime>
{
    private static readonly Regex DateOnlyPattern = new(
        @"^\d{4}-\d{2}-\d{2}$",
        RegexOptions.Compiled | RegexOptions.CultureInvariant);

    private static readonly Regex OffsetPattern = new(
        @"(?:Z|[+-]\d{2}:\d{2})$",
        RegexOptions.Compiled | RegexOptions.CultureInvariant | RegexOptions.IgnoreCase);

    public override DateTime Read(
        ref Utf8JsonReader reader,
        Type typeToConvert,
        JsonSerializerOptions options)
    {
        if (reader.TokenType != JsonTokenType.String)
        {
            throw new JsonException("Date/time values must be JSON strings.");
        }

        var text = reader.GetString();

        if (string.IsNullOrWhiteSpace(text))
        {
            throw new JsonException("Date/time value is required.");
        }

        if (DateOnlyPattern.IsMatch(text))
        {
            if (!DateTime.TryParseExact(
                    text,
                    "yyyy-MM-dd",
                    CultureInfo.InvariantCulture,
                    DateTimeStyles.None,
                    out var calendarDate))
            {
                throw new JsonException($"Invalid calendar date value: {text}");
            }

            return DateTime.SpecifyKind(calendarDate.Date, DateTimeKind.Unspecified);
        }

        if (!OffsetPattern.IsMatch(text))
        {
            throw new JsonException(
                "Timestamp values must include Z or an explicit UTC offset.");
        }

        if (!DateTimeOffset.TryParse(
                text,
                CultureInfo.InvariantCulture,
                DateTimeStyles.RoundtripKind,
                out var parsed))
        {
            throw new JsonException($"Invalid timestamp value: {text}");
        }

        return parsed.UtcDateTime;
    }

    public override void Write(
        Utf8JsonWriter writer,
        DateTime value,
        JsonSerializerOptions options)
    {
        if (value.Kind == DateTimeKind.Unspecified)
        {
            if (value.TimeOfDay != TimeSpan.Zero)
            {
                throw new JsonException(
                    "An unspecified DateTime with a time component cannot be serialized as a timestamp.");
            }

            writer.WriteStringValue(value.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture));
            return;
        }

        var utc = value.Kind == DateTimeKind.Utc
            ? value
            : value.ToUniversalTime();

        writer.WriteStringValue(utc.ToString("O", CultureInfo.InvariantCulture));
    }
}
