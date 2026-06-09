using System;
using System.Collections.Generic;
using System.Globalization;
using System.Net;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Configuration;

namespace AITasker.Infrastructure.Banking
{
    public class VNPayService
    {
        private readonly IConfiguration _configuration;

        public VNPayService(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        public string CreatePaymentUrl(int userId, decimal amount, string ipAddress, string returnUrl)
        {
            string tmnCode = _configuration["VNPay:TmnCode"] ?? "DEMO1234";
            string hashSecret = _configuration["VNPay:HashSecret"] ?? "SECRET_KEY_VNPAY_DEMO";
            string vnpUrl = _configuration["VNPay:BaseUrl"] ?? "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";

            var vnpParams = new SortedDictionary<string, string>(StringComparer.Ordinal)
            {
                { "vnp_Version", "2.1.0" },
                { "vnp_Command", "pay" },
                { "vnp_TmnCode", tmnCode },
                { "vnp_Amount", ((long)(amount * 100)).ToString() },
                { "vnp_CreateDate", DateTime.Now.ToString("yyyyMMddHHmmss") },
                { "vnp_CurrCode", "VND" },
                { "vnp_IpAddr", ipAddress },
                { "vnp_Locale", "en" },
                { "vnp_OrderInfo", $"Deposit money for User ID {userId}" },
                { "vnp_OrderType", "other" },
                { "vnp_ReturnUrl", returnUrl },
                { "vnp_TxnRef", $"{userId}_{DateTime.UtcNow.Ticks}" }
            };

            var baseUrlBuilder = new StringBuilder();
            var hashDataBuilder = new StringBuilder();

            foreach (var kvp in vnpParams)
            {
                if (!string.IsNullOrEmpty(kvp.Value))
                {
                    baseUrlBuilder.Append($"{WebUtility.UrlEncode(kvp.Key)}={WebUtility.UrlEncode(kvp.Value)}&");
                    hashDataBuilder.Append($"{kvp.Key}={kvp.Value}&");
                }
            }

            if (baseUrlBuilder.Length > 0) baseUrlBuilder.Length--;
            if (hashDataBuilder.Length > 0) hashDataBuilder.Length--;

            string vnpSecureHash = HmacSha512(hashSecret, hashDataBuilder.ToString());
            string paymentUrl = $"{vnpUrl}?{baseUrlBuilder}&vnp_SecureHash={vnpSecureHash}";

            return paymentUrl;
        }

        private string HmacSha512(string key, string inputData)
        {
            var hash = new StringBuilder();
            byte[] keyBytes = Encoding.UTF8.GetBytes(key);
            byte[] inputBytes = Encoding.UTF8.GetBytes(inputData);

            using (var hmac = new HMACSHA512(keyBytes))
            {
                byte[] hashValue = hmac.ComputeHash(inputBytes);
                foreach (var theByte in hashValue)
                {
                    hash.Append(theByte.ToString("x2"));
                }
            }
            return hash.ToString();
        }
    }
}