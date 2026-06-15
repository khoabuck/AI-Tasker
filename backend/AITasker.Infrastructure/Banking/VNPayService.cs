using System.Globalization;
using System.Net;
using System.Security.Cryptography;
using System.Text;
using AITasker.Application.Interfaces;
using AITasker.Domain.Entities;
using AITasker.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace AITasker.Infrastructure.Banking
{
    public class VNPayService
    {
        private readonly IConfiguration _configuration;
        private readonly AITaskerDbContext _context;
        private readonly INotificationService _notificationService;

        public VNPayService(
            IConfiguration configuration,
            AITaskerDbContext context,
            INotificationService notificationService)
        {
            _configuration = configuration;
            _context = context;
            _notificationService = notificationService;
        }

        public string CreatePaymentUrl(int userId, decimal amount, string ipAddress, string returnUrl)
        {
            if (amount <= 0)
                throw new InvalidOperationException("Amount must be greater than 0.");

            string tmnCode = _configuration["VNPay:TmnCode"] ?? "DEMO1234";
            string hashSecret = _configuration["VNPay:HashSecret"] ?? "SECRET_KEY_VNPAY_DEMO";
            string vnpUrl = _configuration["VNPay:BaseUrl"] ?? "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";

            var txnRef = $"{userId}_{DateTime.UtcNow.Ticks}";

            var vnpParams = new SortedDictionary<string, string>(StringComparer.Ordinal)
            {
                { "vnp_Version", "2.1.0" },
                { "vnp_Command", "pay" },
                { "vnp_TmnCode", tmnCode },
                { "vnp_Amount", ((long)(amount * 100)).ToString(CultureInfo.InvariantCulture) },
                { "vnp_CreateDate", DateTime.Now.ToString("yyyyMMddHHmmss") },
                { "vnp_CurrCode", "VND" },
                { "vnp_IpAddr", ipAddress },
                { "vnp_Locale", "vn" },
                { "vnp_OrderInfo", $"Deposit money for User ID {userId}" },
                { "vnp_OrderType", "other" },
                { "vnp_ReturnUrl", returnUrl },
                { "vnp_TxnRef", txnRef }
            };

            var queryBuilder = new StringBuilder();
            var hashDataBuilder = new StringBuilder();

            foreach (var kvp in vnpParams)
            {
                if (!string.IsNullOrEmpty(kvp.Value))
                {
                    var encodedKey = WebUtility.UrlEncode(kvp.Key);
                    var encodedValue = WebUtility.UrlEncode(kvp.Value);

                    queryBuilder.Append($"{encodedKey}={encodedValue}&");
                    hashDataBuilder.Append($"{encodedKey}={encodedValue}&");
                }
            }

            if (queryBuilder.Length > 0)
                queryBuilder.Length--;

            if (hashDataBuilder.Length > 0)
                hashDataBuilder.Length--;

            var secureHash = HmacSha512(hashSecret, hashDataBuilder.ToString());

            return $"{vnpUrl}?{queryBuilder}&vnp_SecureHash={secureHash}";
        }

        public async Task<VNPayDepositResult> ProcessReturnAsync(IDictionary<string, string> query)
        {
            var isValidSignature = VerifySignature(query);

            if (!isValidSignature)
            {
                return new VNPayDepositResult
                {
                    Success = false,
                    Message = "Invalid VNPay signature."
                };
            }

            var responseCode = query["vnp_ResponseCode"].ToString();
            var transactionStatus = query["vnp_TransactionStatus"].ToString();
            var txnRef = query["vnp_TxnRef"].ToString();
            var amountRaw = query["vnp_Amount"].ToString();
            var bankTranNo = query.ContainsKey("vnp_BankTranNo") ? query["vnp_BankTranNo"].ToString() : string.Empty;
            var transactionNo = query.ContainsKey("vnp_TransactionNo") ? query["vnp_TransactionNo"].ToString() : string.Empty;

            if (string.IsNullOrWhiteSpace(txnRef))
            {
                return new VNPayDepositResult
                {
                    Success = false,
                    Message = "Missing transaction reference."
                };
            }

            if (!long.TryParse(amountRaw, out var amountInSmallestUnit))
            {
                return new VNPayDepositResult
                {
                    Success = false,
                    Message = "Invalid amount from VNPay."
                };
            }

            var amount = amountInSmallestUnit / 100m;

            var userId = ExtractUserIdFromTxnRef(txnRef);
            if (userId <= 0)
            {
                return new VNPayDepositResult
                {
                    Success = false,
                    Message = "Invalid user id in transaction reference."
                };
            }

            if (responseCode != "00" || transactionStatus != "00")
            {
                return new VNPayDepositResult
                {
                    Success = false,
                    UserId = userId,
                    Amount = amount,
                    TransactionRef = txnRef,
                    Message = "VNPay payment was not successful."
                };
            }

            var userExists = await _context.Users.AnyAsync(u => u.UserId == userId);
            if (!userExists)
            {
                return new VNPayDepositResult
                {
                    Success = false,
                    UserId = userId,
                    Amount = amount,
                    TransactionRef = txnRef,
                    Message = "User not found."
                };
            }

            var alreadyProcessed = await _context.Transactions.AnyAsync(t =>
                t.ReferenceId == txnRef &&
                t.Type == "Deposit" &&
                t.Status == "SUCCESS");

            if (alreadyProcessed)
            {
                return new VNPayDepositResult
                {
                    Success = true,
                    UserId = userId,
                    Amount = amount,
                    TransactionRef = txnRef,
                    Message = "Payment was already processed."
                };
            }

            await using var dbTransaction = await _context.Database.BeginTransactionAsync();

            try
            {
                var wallet = await _context.Wallets.FirstOrDefaultAsync(w => w.UserId == userId);

                if (wallet == null)
                {
                    wallet = new Wallet
                    {
                        UserId = userId,
                        AvailableBalance = 0m,
                        LockedBalance = 0m,
                        TotalEarning = 0m,
                        UpdatedAt = DateTime.UtcNow
                    };

                    _context.Wallets.Add(wallet);
                    await _context.SaveChangesAsync();
                }

                wallet.AvailableBalance += amount;
                wallet.UpdatedAt = DateTime.UtcNow;

                var transaction = new Transaction
                {
                    UserId = userId,
                    ProjectId = null,
                    MilestoneId = null,
                    Amount = amount,
                    Type = "Deposit",
                    Status = "SUCCESS",
                    Description = $"[VNPay Deposit] BankTranNo: {bankTranNo}, TransactionNo: {transactionNo}",
                    ReferenceId = txnRef,
                    CreatedAt = DateTime.UtcNow
                };

                _context.Transactions.Add(transaction);
                await _context.SaveChangesAsync();

                await dbTransaction.CommitAsync();

                await _notificationService.CreateNotificationAsync(
                    userId,
                    "Deposit successful",
                    $"Your VNPay deposit of {amount:N0} VND was successful.",
                    "DEPOSIT_SUCCESS"
                );

                return new VNPayDepositResult
                {
                    Success = true,
                    UserId = userId,
                    Amount = amount,
                    TransactionRef = txnRef,
                    Message = "Deposit successful."
                };
            }
            catch
            {
                await dbTransaction.RollbackAsync();

                return new VNPayDepositResult
                {
                    Success = false,
                    UserId = userId,
                    Amount = amount,
                    TransactionRef = txnRef,
                    Message = "Failed to process deposit."
                };
            }
        }

        private bool VerifySignature(IDictionary<string, string> query)
        {
            string hashSecret = _configuration["VNPay:HashSecret"] ?? "SECRET_KEY_VNPAY_DEMO";

            if (!query.TryGetValue("vnp_SecureHash", out var receivedHash) || string.IsNullOrWhiteSpace(receivedHash))
                return false;

            var sortedParams = new SortedDictionary<string, string>(StringComparer.Ordinal);

            foreach (var item in query)
            {
                var key = item.Key;
                var value = item.Value;

                if (
                    string.IsNullOrWhiteSpace(value) ||
                    key.Equals("vnp_SecureHash", StringComparison.OrdinalIgnoreCase) ||
                    key.Equals("vnp_SecureHashType", StringComparison.OrdinalIgnoreCase)
                )
                {
                    continue;
                }

                sortedParams[key] = value;
            }

            var hashDataBuilder = new StringBuilder();

            foreach (var kvp in sortedParams)
            {
                var encodedKey = WebUtility.UrlEncode(kvp.Key);
                var encodedValue = WebUtility.UrlEncode(kvp.Value);

                hashDataBuilder.Append($"{encodedKey}={encodedValue}&");
            }

            if (hashDataBuilder.Length > 0)
                hashDataBuilder.Length--;

            var calculatedHash = HmacSha512(hashSecret, hashDataBuilder.ToString());

            return calculatedHash.Equals(receivedHash, StringComparison.OrdinalIgnoreCase);
        }

        private static int ExtractUserIdFromTxnRef(string txnRef)
        {
            var parts = txnRef.Split('_', StringSplitOptions.RemoveEmptyEntries);

            if (parts.Length == 0)
                return 0;

            return int.TryParse(parts[0], out var userId) ? userId : 0;
        }

        private static string HmacSha512(string key, string inputData)
        {
            var hash = new StringBuilder();
            var keyBytes = Encoding.UTF8.GetBytes(key);
            var inputBytes = Encoding.UTF8.GetBytes(inputData);

            using var hmac = new HMACSHA512(keyBytes);
            var hashValue = hmac.ComputeHash(inputBytes);

            foreach (var theByte in hashValue)
            {
                hash.Append(theByte.ToString("x2"));
            }

            return hash.ToString();
        }
    }

    public class VNPayDepositResult
    {
        public bool Success { get; set; }
        public int UserId { get; set; }
        public decimal Amount { get; set; }
        public string? TransactionRef { get; set; }
        public string Message { get; set; } = string.Empty;
    }
}