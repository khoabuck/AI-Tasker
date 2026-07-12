using AITasker.Application.Interfaces;
using AITasker.Infrastructure.Common;

namespace AITasker.Api.BackgroundServices
{
    public class JobDigestNotificationHostedService : BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<JobDigestNotificationHostedService> _logger;

        public JobDigestNotificationHostedService(
            IServiceScopeFactory scopeFactory,
            ILogger<JobDigestNotificationHostedService> logger)
        {
            _scopeFactory = scopeFactory;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(
            CancellationToken stoppingToken)
        {
            _logger.LogInformation("Job digest hosted service started.");

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    var nextRunUtc = GetNextRunUtc();
                    var delay = nextRunUtc - DateTime.UtcNow;

                    if (delay < TimeSpan.Zero)
                    {
                        delay = TimeSpan.Zero;
                    }

                    _logger.LogInformation(
                        "Next job digest run scheduled at Utc={NextRunUtc}, VietnamTime={VietnamTime}",
                        nextRunUtc,
                        VietnamTimeZone.ToVietnamTime(nextRunUtc));

                    await Task.Delay(delay, stoppingToken);

                    if (stoppingToken.IsCancellationRequested)
                    {
                        break;
                    }

                    using var scope = _scopeFactory.CreateScope();

                    var digestService = scope.ServiceProvider
                        .GetRequiredService<IJobDigestNotificationService>();

                    await digestService.SendDailyJobDigestAsync(nextRunUtc);
                }
                catch (TaskCanceledException)
                {
                    break;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Job digest hosted service failed.");
                    await Task.Delay(TimeSpan.FromMinutes(5), stoppingToken);
                }
            }
        }

        private static DateTime GetNextRunUtc()
        {
            var nowUtc = DateTime.UtcNow;
            var nowVietnam = VietnamTimeZone.ToVietnamTime(nowUtc);

            var nextRunVietnam = new DateTime(
                nowVietnam.Year,
                nowVietnam.Month,
                nowVietnam.Day,
                18,
                0,
                0,
                DateTimeKind.Unspecified);

            if (nowVietnam >= nextRunVietnam)
            {
                nextRunVietnam = nextRunVietnam.AddDays(1);
            }

            return VietnamTimeZone.ToUtc(nextRunVietnam);
        }
    }
}
