using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AITasker.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class RemoveAiCostManagementFromRuntime : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
{
    migrationBuilder.Sql(@"
IF EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_AIUsageLogs_AIModelPricingPolicies_AIModelPricingPolicyId')
    ALTER TABLE [AIUsageLogs] DROP CONSTRAINT [FK_AIUsageLogs_AIModelPricingPolicies_AIModelPricingPolicyId];

IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_AIUsageLogs_AIModelPricingPolicyId' AND object_id = OBJECT_ID(N'[AIUsageLogs]'))
    DROP INDEX [IX_AIUsageLogs_AIModelPricingPolicyId] ON [AIUsageLogs];

IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_AIUsageLogs_Status' AND object_id = OBJECT_ID(N'[AIUsageLogs]'))
    DROP INDEX [IX_AIUsageLogs_Status] ON [AIUsageLogs];

IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = N'AIUsageLogs' AND COLUMN_NAME = N'AIModelPricingPolicyId')
    ALTER TABLE [AIUsageLogs] DROP COLUMN [AIModelPricingPolicyId];

IF OBJECT_ID(N'[AIModelPricingPolicies]', N'U') IS NOT NULL
    DROP TABLE [AIModelPricingPolicies];

IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = N'AIUsageLogs' AND COLUMN_NAME = N'ModuleName')
AND NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = N'AIUsageLogs' AND COLUMN_NAME = N'Feature')
    EXEC sp_rename N'AIUsageLogs.ModuleName', N'Feature', N'COLUMN';

IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = N'AIUsageLogs' AND COLUMN_NAME = N'ModelName')
AND NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = N'AIUsageLogs' AND COLUMN_NAME = N'Model')
    EXEC sp_rename N'AIUsageLogs.ModelName', N'Model', N'COLUMN';

IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = N'AIUsageLogs' AND COLUMN_NAME = N'InputTokens')
AND NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = N'AIUsageLogs' AND COLUMN_NAME = N'PromptTokens')
    EXEC sp_rename N'AIUsageLogs.InputTokens', N'PromptTokens', N'COLUMN';

IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = N'AIUsageLogs' AND COLUMN_NAME = N'OutputTokens')
AND NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = N'AIUsageLogs' AND COLUMN_NAME = N'CompletionTokens')
    EXEC sp_rename N'AIUsageLogs.OutputTokens', N'CompletionTokens', N'COLUMN';

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = N'AIUsageLogs' AND COLUMN_NAME = N'EntityId')
    ALTER TABLE [AIUsageLogs] ADD [EntityId] int NULL;

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = N'AIUsageLogs' AND COLUMN_NAME = N'EntityType')
    ALTER TABLE [AIUsageLogs] ADD [EntityType] nvarchar(100) NULL;

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = N'AIUsageLogs' AND COLUMN_NAME = N'ErrorCode')
    ALTER TABLE [AIUsageLogs] ADD [ErrorCode] nvarchar(100) NULL;

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = N'AIUsageLogs' AND COLUMN_NAME = N'StatusCode')
    ALTER TABLE [AIUsageLogs] ADD [StatusCode] int NULL;

IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = N'AIUsageLogs' AND COLUMN_NAME = N'ActualInputCostUsd')
    ALTER TABLE [AIUsageLogs] DROP COLUMN [ActualInputCostUsd];

IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = N'AIUsageLogs' AND COLUMN_NAME = N'ActualOutputCostUsd')
    ALTER TABLE [AIUsageLogs] DROP COLUMN [ActualOutputCostUsd];

IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = N'AIUsageLogs' AND COLUMN_NAME = N'ActualTotalCostUsd')
    ALTER TABLE [AIUsageLogs] DROP COLUMN [ActualTotalCostUsd];

IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = N'AIUsageLogs' AND COLUMN_NAME = N'ActualTotalCostVnd')
    ALTER TABLE [AIUsageLogs] DROP COLUMN [ActualTotalCostVnd];

IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = N'AIUsageLogs' AND COLUMN_NAME = N'EstimatedInputCostUsd')
    ALTER TABLE [AIUsageLogs] DROP COLUMN [EstimatedInputCostUsd];

IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = N'AIUsageLogs' AND COLUMN_NAME = N'EstimatedOutputCostUsd')
    ALTER TABLE [AIUsageLogs] DROP COLUMN [EstimatedOutputCostUsd];

IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = N'AIUsageLogs' AND COLUMN_NAME = N'EstimatedTotalCostUsd')
    ALTER TABLE [AIUsageLogs] DROP COLUMN [EstimatedTotalCostUsd];

IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = N'AIUsageLogs' AND COLUMN_NAME = N'EstimatedTotalCostVnd')
    ALTER TABLE [AIUsageLogs] DROP COLUMN [EstimatedTotalCostVnd];

IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = N'AIUsageLogs' AND COLUMN_NAME = N'ExchangeRateToVnd')
    ALTER TABLE [AIUsageLogs] DROP COLUMN [ExchangeRateToVnd];

IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = N'AIUsageLogs' AND COLUMN_NAME = N'FreeTierSavingsUsd')
    ALTER TABLE [AIUsageLogs] DROP COLUMN [FreeTierSavingsUsd];

IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = N'AIUsageLogs' AND COLUMN_NAME = N'FreeTierSavingsVnd')
    ALTER TABLE [AIUsageLogs] DROP COLUMN [FreeTierSavingsVnd];

IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = N'AIUsageLogs' AND COLUMN_NAME = N'InputPricePerMillionTokensUsd')
    ALTER TABLE [AIUsageLogs] DROP COLUMN [InputPricePerMillionTokensUsd];

IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = N'AIUsageLogs' AND COLUMN_NAME = N'OutputPricePerMillionTokensUsd')
    ALTER TABLE [AIUsageLogs] DROP COLUMN [OutputPricePerMillionTokensUsd];

IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = N'AIUsageLogs' AND COLUMN_NAME = N'IsChargedToPlatform')
    ALTER TABLE [AIUsageLogs] DROP COLUMN [IsChargedToPlatform];

IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = N'AIUsageLogs' AND COLUMN_NAME = N'IsChargedToUser')
    ALTER TABLE [AIUsageLogs] DROP COLUMN [IsChargedToUser];

IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = N'AIUsageLogs' AND COLUMN_NAME = N'IsFreeTier')
    ALTER TABLE [AIUsageLogs] DROP COLUMN [IsFreeTier];

IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = N'AIUsageLogs' AND COLUMN_NAME = N'RequestPreview')
    ALTER TABLE [AIUsageLogs] DROP COLUMN [RequestPreview];

IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = N'AIUsageLogs' AND COLUMN_NAME = N'ResponsePreview')
    ALTER TABLE [AIUsageLogs] DROP COLUMN [ResponsePreview];

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_AIUsageLogs_Feature' AND object_id = OBJECT_ID(N'[AIUsageLogs]'))
    CREATE INDEX [IX_AIUsageLogs_Feature] ON [AIUsageLogs]([Feature]);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_AIUsageLogs_Model' AND object_id = OBJECT_ID(N'[AIUsageLogs]'))
    CREATE INDEX [IX_AIUsageLogs_Model] ON [AIUsageLogs]([Model]);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_AIUsageLogs_Provider' AND object_id = OBJECT_ID(N'[AIUsageLogs]'))
    CREATE INDEX [IX_AIUsageLogs_Provider] ON [AIUsageLogs]([Provider]);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_AIUsageLogs_CreatedAt' AND object_id = OBJECT_ID(N'[AIUsageLogs]'))
    CREATE INDEX [IX_AIUsageLogs_CreatedAt] ON [AIUsageLogs]([CreatedAt]);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_AIUsageLogs_UserId' AND object_id = OBJECT_ID(N'[AIUsageLogs]'))
    CREATE INDEX [IX_AIUsageLogs_UserId] ON [AIUsageLogs]([UserId]);
");
}

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            
        }
    }
}
