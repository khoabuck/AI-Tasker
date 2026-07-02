using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;

namespace AITasker.Infrastructure.Banking
{
    internal static class VietnamBankResolver
    {
        private static readonly List<VietnamBankInfo> Banks = new()
        {
            new("VCB", "970436", "Vietcombank", "VIETCOMBANK", "VCB", "NGAN HANG NGOAI THUONG", "NGOAI THUONG"),
            new("BIDV", "970418", "BIDV", "BIDV", "NGAN HANG DAU TU VA PHAT TRIEN"),
            new("CTG", "970415", "VietinBank", "VIETINBANK", "CTG", "ICB", "NGAN HANG CONG THUONG"),
            new("AGR", "970405", "Agribank", "AGRIBANK", "VBARD", "NGAN HANG NONG NGHIEP"),
            new("TCB", "970407", "Techcombank", "TECHCOMBANK", "TCB", "KY THUONG"),
            new("MB", "970422", "MB Bank", "MB", "MBB", "MBBANK", "MILITARY BANK", "QUAN DOI"),
            new("ACB", "970416", "ACB", "ACB", "A CHAU"),
            new("VPB", "970432", "VPBank", "VPBANK", "VPB", "VIETNAM PROSPERITY"),
            new("TPB", "970423", "TPBank", "TPBANK", "TPB", "TIEN PHONG"),
            new("VIB", "970441", "VIB", "VIB", "QUOC TE"),
            new("STB", "970403", "Sacombank", "SACOMBANK", "STB", "SAI GON THUONG TIN"),
            new("HDB", "970437", "HDBank", "HDBANK", "HDB", "HD BANK"),
            new("OCB", "970448", "OCB", "OCB", "PHUONG DONG"),
            new("MSB", "970426", "MSB", "MSB", "MARITIME BANK", "HANG HAI"),
            new("SHB", "970443", "SHB", "SHB", "SAI GON HA NOI"),
            new("LPB", "970449", "LPBank", "LPBANK", "LIENVIETPOSTBANK", "LIEN VIET POST BANK", "LIEN VIET"),
            new("SEAB", "970440", "SeABank", "SEABANK", "SEAB", "DONG NAM A"),
            new("EIB", "970431", "Eximbank", "EXIMBANK", "EIB", "XUAT NHAP KHAU"),
            new("NAB", "970428", "Nam A Bank", "NAM A BANK", "NAMABANK", "NAB"),
            new("ABB", "970425", "ABBank", "ABBANK", "ABB", "AN BINH"),
            new("BAB", "970409", "Bac A Bank", "BAC A BANK", "BACA", "BAB"),
            new("BVB", "970438", "BaoViet Bank", "BAOVIET BANK", "BAO VIET", "BVB"),
            new("PVCB", "970412", "PVcomBank", "PVCOMBANK", "PVCB", "DAI CHUNG"),
            new("VIETABANK", "970427", "VietABank", "VIET A BANK", "VIETABANK", "VAB"),
            new("SAIGONBANK", "970400", "SaigonBank", "SAIGONBANK", "SAI GON CONG THUONG"),
            new("PGB", "970430", "PGBank", "PGBANK", "PGB"),
            new("KLB", "970452", "KienlongBank", "KIENLONGBANK", "KIEN LONG", "KLB"),
            new("NCB", "970419", "NCB", "NCB", "QUOC DAN"),
            new("SCB", "970429", "SCB", "SCB", "SAI GON BANK"),
            new("UOB", "970458", "UOB Vietnam", "UOB", "UNITED OVERSEAS BANK"),
            new("CIMB", "422589", "CIMB Vietnam", "CIMB"),
            new("WOO", "970457", "Woori Bank Vietnam", "WOORI", "WOORI BANK"),
            new("HSBC", "458761", "HSBC Vietnam", "HSBC"),
            new("SHBVN", "970424", "Shinhan Bank Vietnam", "SHINHAN", "SHINHAN BANK"),
            new("PBVN", "970439", "Public Bank Vietnam", "PUBLIC BANK", "PBVN"),
            new("VRB", "970421", "VRB", "VRB", "VIET NGA"),
            new("IVB", "970434", "Indovina Bank", "INDOVINA", "IVB"),
            new("VCCB", "970454", "Viet Capital Bank", "VIET CAPITAL BANK", "BAN VIET", "VCCB"),
        };

        public static VietnamBankInfo Resolve(string? bankCode, string? bankBin, string? bankName)
        {
            var normalizedBin = NormalizeDigits(bankBin);
            if (!string.IsNullOrWhiteSpace(normalizedBin))
            {
                if (!Regex.IsMatch(normalizedBin, @"^\d{6}$"))
                {
                    throw new InvalidOperationException("Bank BIN must contain exactly 6 digits.");
                }

                var byBin = Banks.FirstOrDefault(x => x.Bin == normalizedBin);
                if (byBin != null)
                {
                    return byBin;
                }

                var fallbackName = string.IsNullOrWhiteSpace(bankName) ? bankCode : bankName;
                return new VietnamBankInfo(
                    NormalizeBankCode(bankCode) ?? normalizedBin,
                    normalizedBin,
                    string.IsNullOrWhiteSpace(fallbackName) ? normalizedBin : fallbackName!.Trim(),
                    fallbackName ?? normalizedBin);
            }

            var normalizedCode = NormalizeBankCode(bankCode);
            if (!string.IsNullOrWhiteSpace(normalizedCode))
            {
                var byCode = Banks.FirstOrDefault(x =>
                    string.Equals(x.Code, normalizedCode, StringComparison.OrdinalIgnoreCase) ||
                    x.Aliases.Any(alias => string.Equals(NormalizeSearchKey(alias), normalizedCode, StringComparison.OrdinalIgnoreCase)));

                if (byCode != null)
                {
                    return byCode;
                }
            }

            var normalizedName = NormalizeSearchKey(bankName);
            if (!string.IsNullOrWhiteSpace(normalizedName))
            {
                var byName = Banks.FirstOrDefault(x => x.Matches(normalizedName));
                if (byName != null)
                {
                    return byName;
                }
            }

            throw new InvalidOperationException("Unsupported bank. Please enter a clearer bank name, for example: Vietcombank, Techcombank, MB Bank, BIDV, VietinBank, ACB, VPBank.");
        }

        public static bool TryResolve(string? bankCode, string? bankBin, string? bankName, out VietnamBankInfo bank, out string error)
        {
            try
            {
                bank = Resolve(bankCode, bankBin, bankName);
                error = string.Empty;
                return true;
            }
            catch (InvalidOperationException ex)
            {
                bank = VietnamBankInfo.Empty;
                error = ex.Message;
                return false;
            }
        }

        private static string? NormalizeBankCode(string? value)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                return null;
            }

            return NormalizeSearchKey(value);
        }

        private static string NormalizeDigits(string? value)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                return string.Empty;
            }

            return Regex.Replace(value.Trim(), @"\D", string.Empty);
        }

        private static string NormalizeSearchKey(string? value)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                return string.Empty;
            }

            var normalized = value.Trim().Normalize(NormalizationForm.FormD);
            var builder = new StringBuilder();

            foreach (var character in normalized)
            {
                var unicodeCategory = CharUnicodeInfo.GetUnicodeCategory(character);

                if (unicodeCategory != UnicodeCategory.NonSpacingMark)
                {
                    builder.Append(character);
                }
            }

            var withoutDiacritics = builder
                .ToString()
                .Normalize(NormalizationForm.FormC)
                .Replace("Đ", "D")
                .Replace("đ", "d");

            withoutDiacritics = Regex.Replace(withoutDiacritics, @"[^a-zA-Z0-9]+", " ");
            withoutDiacritics = Regex.Replace(withoutDiacritics, @"\s+", " ");

            return withoutDiacritics.Trim().ToUpperInvariant();
        }
    }

    internal sealed class VietnamBankInfo
    {
        public static VietnamBankInfo Empty { get; } = new(string.Empty, string.Empty, string.Empty, string.Empty);

        public VietnamBankInfo(string code, string bin, string displayName, params string[] aliases)
        {
            Code = code;
            Bin = bin;
            DisplayName = displayName;
            Aliases = aliases
                .Append(code)
                .Append(displayName)
                .Select(NormalizeAlias)
                .Where(x => !string.IsNullOrWhiteSpace(x))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToArray();
        }

        public string Code { get; }

        public string Bin { get; }

        public string DisplayName { get; }

        public IReadOnlyCollection<string> Aliases { get; }

        public bool Matches(string normalizedInput)
        {
            if (string.IsNullOrWhiteSpace(normalizedInput))
            {
                return false;
            }

            return Aliases.Any(alias =>
                string.Equals(alias, normalizedInput, StringComparison.OrdinalIgnoreCase) ||
                alias.Contains(normalizedInput, StringComparison.OrdinalIgnoreCase) ||
                normalizedInput.Contains(alias, StringComparison.OrdinalIgnoreCase));
        }

        private static string NormalizeAlias(string value)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                return string.Empty;
            }

            var normalized = value.Trim().Normalize(NormalizationForm.FormD);
            var builder = new StringBuilder();

            foreach (var character in normalized)
            {
                var unicodeCategory = CharUnicodeInfo.GetUnicodeCategory(character);

                if (unicodeCategory != UnicodeCategory.NonSpacingMark)
                {
                    builder.Append(character);
                }
            }

            var withoutDiacritics = builder
                .ToString()
                .Normalize(NormalizationForm.FormC)
                .Replace("Đ", "D")
                .Replace("đ", "d");

            withoutDiacritics = Regex.Replace(withoutDiacritics, @"[^a-zA-Z0-9]+", " ");
            withoutDiacritics = Regex.Replace(withoutDiacritics, @"\s+", " ");

            return withoutDiacritics.Trim().ToUpperInvariant();
        }
    }
}
