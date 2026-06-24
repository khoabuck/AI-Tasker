using System.Globalization;
using System.Text.RegularExpressions;

namespace AITasker.Application.Common;

public static class NameNormalizer
{
    private static readonly CultureInfo VietnameseCulture =
        CultureInfo.GetCultureInfo("vi-VN");

    public static string NormalizeFullName(string? value)
    {
        var fullName = value?.Trim() ?? string.Empty;

        if (string.IsNullOrWhiteSpace(fullName))
        {
            return string.Empty;
        }

        fullName = Regex.Replace(fullName, @"\s+", " ");

        return VietnameseCulture.TextInfo.ToTitleCase(
            fullName.ToLower(VietnameseCulture)
        );
    }
}