BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260630132242_AddAiManagementTables'
)
BEGIN
    CREATE TABLE [AiSettings] (
        [AiSettingsId] int NOT NULL IDENTITY,
        [Provider] nvarchar(50) NOT NULL DEFAULT N'Groq',
        [PrimaryModel] nvarchar(100) NOT NULL,
        [FallbackModel] nvarchar(100) NULL,
        [IsEnabled] bit NOT NULL DEFAULT CAST(1 AS bit),
        [MonthlyTokenLimit] int NOT NULL DEFAULT 1000000,
        [MonthlyRequestLimit] int NOT NULL DEFAULT 50000,
        [DailyRequestLimitPerUser] int NOT NULL DEFAULT 50,
        [IsActive] bit NOT NULL DEFAULT CAST(1 AS bit),
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NULL,
        [UpdatedByAdminId] int NULL,
        CONSTRAINT [PK_AiSettings] PRIMARY KEY ([AiSettingsId]),
        CONSTRAINT [FK_AiSettings_Users_UpdatedByAdminId] FOREIGN KEY ([UpdatedByAdminId]) REFERENCES [Users] ([UserId]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260630132242_AddAiManagementTables'
)
BEGIN
    CREATE TABLE [AiUsageLogs] (
        [AiUsageLogId] int NOT NULL IDENTITY,
        [UserId] int NULL,
        [Feature] nvarchar(100) NOT NULL,
        [EntityType] nvarchar(100) NULL,
        [EntityId] int NULL,
        [Provider] nvarchar(50) NOT NULL DEFAULT N'Groq',
        [Model] nvarchar(100) NOT NULL,
        [UsedFallback] bit NOT NULL DEFAULT CAST(0 AS bit),
        [PromptTokens] int NOT NULL DEFAULT 0,
        [CompletionTokens] int NOT NULL DEFAULT 0,
        [TotalTokens] int NOT NULL DEFAULT 0,
        [Status] nvarchar(30) NOT NULL,
        [StatusCode] int NULL,
        [ErrorCode] nvarchar(100) NULL,
        [ErrorMessage] nvarchar(1000) NULL,
        [CreatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_AiUsageLogs] PRIMARY KEY ([AiUsageLogId]),
        CONSTRAINT [FK_AiUsageLogs_Users_UserId] FOREIGN KEY ([UserId]) REFERENCES [Users] ([UserId]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260630132242_AddAiManagementTables'
)
BEGIN
    CREATE INDEX [IX_AiSettings_IsActive] ON [AiSettings] ([IsActive]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260630132242_AddAiManagementTables'
)
BEGIN
    CREATE INDEX [IX_AiSettings_Provider] ON [AiSettings] ([Provider]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260630132242_AddAiManagementTables'
)
BEGIN
    CREATE INDEX [IX_AiSettings_UpdatedByAdminId] ON [AiSettings] ([UpdatedByAdminId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260630132242_AddAiManagementTables'
)
BEGIN
    CREATE INDEX [IX_AiUsageLogs_CreatedAt] ON [AiUsageLogs] ([CreatedAt]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260630132242_AddAiManagementTables'
)
BEGIN
    CREATE INDEX [IX_AiUsageLogs_Feature] ON [AiUsageLogs] ([Feature]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260630132242_AddAiManagementTables'
)
BEGIN
    CREATE INDEX [IX_AiUsageLogs_Model] ON [AiUsageLogs] ([Model]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260630132242_AddAiManagementTables'
)
BEGIN
    CREATE INDEX [IX_AiUsageLogs_Status] ON [AiUsageLogs] ([Status]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260630132242_AddAiManagementTables'
)
BEGIN
    CREATE INDEX [IX_AiUsageLogs_UserId] ON [AiUsageLogs] ([UserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260630132242_AddAiManagementTables'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260630132242_AddAiManagementTables', N'10.0.8');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260630160920_RefactorAiAdminDbModelCatalog'
)
BEGIN
    DECLARE @var nvarchar(max);
    SELECT @var = QUOTENAME([d].[name])
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[AiUsageLogs]') AND [c].[name] = N'UsedFallback');
    IF @var IS NOT NULL EXEC(N'ALTER TABLE [AiUsageLogs] DROP CONSTRAINT ' + @var + ';');
    ALTER TABLE [AiUsageLogs] DROP COLUMN [UsedFallback];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260630160920_RefactorAiAdminDbModelCatalog'
)
BEGIN
    DECLARE @var1 nvarchar(max);
    SELECT @var1 = QUOTENAME([d].[name])
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[AiSettings]') AND [c].[name] = N'FallbackModel');
    IF @var1 IS NOT NULL EXEC(N'ALTER TABLE [AiSettings] DROP CONSTRAINT ' + @var1 + ';');
    ALTER TABLE [AiSettings] DROP COLUMN [FallbackModel];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260630160920_RefactorAiAdminDbModelCatalog'
)
BEGIN
    DECLARE @var2 nvarchar(max);
    SELECT @var2 = QUOTENAME([d].[name])
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[AiSettings]') AND [c].[name] = N'PrimaryModel');
    IF @var2 IS NOT NULL EXEC(N'ALTER TABLE [AiSettings] DROP CONSTRAINT ' + @var2 + ';');
    ALTER TABLE [AiSettings] DROP COLUMN [PrimaryModel];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260630160920_RefactorAiAdminDbModelCatalog'
)
BEGIN
    ALTER TABLE [AiSettings] ADD [ExpertSkillMaxTokens] int NOT NULL DEFAULT 1500;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260630160920_RefactorAiAdminDbModelCatalog'
)
BEGIN
    ALTER TABLE [AiSettings] ADD [JobAssistantMaxTokens] int NOT NULL DEFAULT 3000;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260630160920_RefactorAiAdminDbModelCatalog'
)
BEGIN
    ALTER TABLE [AiSettings] ADD [JsonObjectResponse] bit NOT NULL DEFAULT CAST(1 AS bit);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260630160920_RefactorAiAdminDbModelCatalog'
)
BEGIN
    ALTER TABLE [AiSettings] ADD [Model] nvarchar(100) NOT NULL DEFAULT N'openai/gpt-oss-120b';
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260630160920_RefactorAiAdminDbModelCatalog'
)
BEGIN
    ALTER TABLE [AiSettings] ADD [ProfileReviewMaxTokens] int NOT NULL DEFAULT 2000;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260630160920_RefactorAiAdminDbModelCatalog'
)
BEGIN
    ALTER TABLE [AiSettings] ADD [SkillValidatorMaxTokens] int NOT NULL DEFAULT 1200;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260630160920_RefactorAiAdminDbModelCatalog'
)
BEGIN
    ALTER TABLE [AiSettings] ADD [Temperature] float NOT NULL DEFAULT 0.10000000000000001E0;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260630160920_RefactorAiAdminDbModelCatalog'
)
BEGIN
    CREATE TABLE [AiAllowedModels] (
        [AiAllowedModelId] int NOT NULL IDENTITY,
        [Provider] nvarchar(50) NOT NULL DEFAULT N'Groq',
        [Model] nvarchar(100) NOT NULL,
        [DisplayName] nvarchar(150) NOT NULL,
        [IsEnabled] bit NOT NULL DEFAULT CAST(1 AS bit),
        [SupportsJsonObjectResponse] bit NOT NULL DEFAULT CAST(1 AS bit),
        [MaxOutputTokens] int NOT NULL DEFAULT 4096,
        [Notes] nvarchar(1000) NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NULL,
        [UpdatedByAdminId] int NULL,
        CONSTRAINT [PK_AiAllowedModels] PRIMARY KEY ([AiAllowedModelId]),
        CONSTRAINT [FK_AiAllowedModels_Users_UpdatedByAdminId] FOREIGN KEY ([UpdatedByAdminId]) REFERENCES [Users] ([UserId]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260630160920_RefactorAiAdminDbModelCatalog'
)
BEGIN
    CREATE INDEX [IX_AiAllowedModels_IsEnabled] ON [AiAllowedModels] ([IsEnabled]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260630160920_RefactorAiAdminDbModelCatalog'
)
BEGIN
    CREATE UNIQUE INDEX [IX_AiAllowedModels_Provider_Model] ON [AiAllowedModels] ([Provider], [Model]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260630160920_RefactorAiAdminDbModelCatalog'
)
BEGIN
    CREATE INDEX [IX_AiAllowedModels_UpdatedByAdminId] ON [AiAllowedModels] ([UpdatedByAdminId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260630160920_RefactorAiAdminDbModelCatalog'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260630160920_RefactorAiAdminDbModelCatalog', N'10.0.8');
END;

COMMIT;
GO

