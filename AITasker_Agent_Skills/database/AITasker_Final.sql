/*
AITasker Final ERD Database Script - SQL Server
Version: Final ERD with Skills table + AI API/SignalR/Client Type updates

Main design:
- Users can be Client, Expert, or Admin.
- Admin creates Services as AI service/templates.
- ExpertProfiles M-N Services is implemented by ExpertServices.
- JobPostings M-N Services is implemented by JobServices.
- Skills is a master/lookup table.
- JobSkills references Skills to describe required skills of a job.
- ExpertSkills references Skills to describe skills of an expert.
- AIRecommendations stores matching result between JobPostings and ExpertProfiles based on JobSkills, ExpertSkills, and Skills.
- Main workflow: JobPosting -> Proposal -> ProjectContract -> Project -> Milestone -> Deliverable -> Escrow/Payment -> Dispute/Client-to-Expert Review.

How to run:
1. Open SQL Server Management Studio or Azure Data Studio.
2. Execute the whole file.
3. Database created: AITaskerDb.

WARNING:
- This script DROPS and RECREATES AITaskerDb to make setup repeatable.
- Run only on demo/test environment.
*/

IF DB_ID(N'AITaskerDb') IS NOT NULL
BEGIN
    ALTER DATABASE [AITaskerDb] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE [AITaskerDb];
END
GO

CREATE DATABASE [AITaskerDb];
GO

USE [AITaskerDb];
GO

/* =========================================================
   1. CORE USERS, PROFILES, WALLET
   ========================================================= */

CREATE TABLE dbo.Users (
    UserId INT IDENTITY(1,1) NOT NULL,
    Email NVARCHAR(255) NOT NULL,
    PasswordHash NVARCHAR(255) NULL,
    FullName NVARCHAR(255) NOT NULL,
    Role NVARCHAR(20) NULL,
    AuthProvider NVARCHAR(20) NOT NULL CONSTRAINT DF_Users_AuthProvider DEFAULT N'LOCAL',
    GoogleId NVARCHAR(255) NULL,
    AvatarUrl NVARCHAR(500) NULL,
    Status NVARCHAR(30) NOT NULL CONSTRAINT DF_Users_Status DEFAULT N'PENDING_ROLE',
    CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_Users_CreatedAt DEFAULT SYSUTCDATETIME(),
    UpdatedAt DATETIME2 NULL,

    CONSTRAINT PK_Users PRIMARY KEY (UserId),
    CONSTRAINT UQ_Users_Email UNIQUE (Email),
    CONSTRAINT CK_Users_Role CHECK (Role IS NULL OR Role IN (N'CLIENT', N'EXPERT', N'ADMIN')),
    CONSTRAINT CK_Users_AuthProvider CHECK (AuthProvider IN (N'LOCAL', N'GOOGLE')),
    CONSTRAINT CK_Users_Status CHECK (Status IN (
        N'PENDING_ROLE',
        N'PENDING_PROFILE',
        N'PENDING_AI_REVIEW',
        N'ACTIVE',
        N'SUSPENDED',
        N'BANNED'
    ))
);
GO

CREATE UNIQUE INDEX UX_Users_GoogleId_NotNull
ON dbo.Users(GoogleId)
WHERE GoogleId IS NOT NULL;
GO

CREATE TABLE dbo.ClientProfiles (
    ClientId INT IDENTITY(1,1) NOT NULL,
    UserId INT NOT NULL,
    ClientType NVARCHAR(20) NOT NULL,
    PhoneNumber NVARCHAR(30) NULL,
    CompanyName NVARCHAR(255) NULL,
    TaxCode NVARCHAR(50) NULL,
    Industry NVARCHAR(255) NULL,
    CompanyAddress NVARCHAR(500) NULL,
    BusinessVerificationStatus NVARCHAR(30) NOT NULL CONSTRAINT DF_ClientProfiles_BusinessVerificationStatus DEFAULT N'NOT_REQUIRED',
    BusinessType NVARCHAR(100) NULL,
    CompanySize NVARCHAR(50) NULL,
    AINeeds NVARCHAR(MAX) NULL,
    MainProblems NVARCHAR(MAX) NULL,
    ExpectedBudgetMin DECIMAL(18,2) NULL,
    ExpectedBudgetMax DECIMAL(18,2) NULL,
    PlatformFeeRate DECIMAL(5,2) NOT NULL,
    CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_ClientProfiles_CreatedAt DEFAULT SYSUTCDATETIME(),

    CONSTRAINT PK_ClientProfiles PRIMARY KEY (ClientId),
    CONSTRAINT UQ_ClientProfiles_UserId UNIQUE (UserId),
    CONSTRAINT FK_ClientProfiles_Users FOREIGN KEY (UserId) REFERENCES dbo.Users(UserId),
    CONSTRAINT CK_ClientProfiles_ClientType CHECK (ClientType IN (N'INDIVIDUAL', N'BUSINESS')),
    CONSTRAINT CK_ClientProfiles_BusinessVerificationStatus CHECK (
        BusinessVerificationStatus IN (N'NOT_REQUIRED', N'PENDING_REVIEW', N'VERIFIED', N'REJECTED')
    ),
    CONSTRAINT CK_ClientProfiles_PlatformFeeRate CHECK (
        (ClientType = N'INDIVIDUAL' AND PlatformFeeRate = 5.00 AND BusinessVerificationStatus = N'NOT_REQUIRED')
        OR
        (ClientType = N'BUSINESS' AND PlatformFeeRate = 10.00 AND BusinessVerificationStatus IN (N'PENDING_REVIEW', N'VERIFIED', N'REJECTED'))
    ),
    CONSTRAINT CK_ClientProfiles_IndividualRequiredFields CHECK (
        ClientType <> N'INDIVIDUAL'
        OR (PhoneNumber IS NOT NULL AND AINeeds IS NOT NULL AND MainProblems IS NOT NULL)
    ),
    CONSTRAINT CK_ClientProfiles_BusinessRequiredFields CHECK (
        ClientType <> N'BUSINESS'
        OR (CompanyName IS NOT NULL AND TaxCode IS NOT NULL AND Industry IS NOT NULL AND CompanyAddress IS NOT NULL)
    ),
    CONSTRAINT CK_ClientProfiles_Budget CHECK (
        ExpectedBudgetMin IS NULL OR ExpectedBudgetMax IS NULL OR ExpectedBudgetMin <= ExpectedBudgetMax
    )
);
GO

CREATE TABLE dbo.ExpertProfiles (
    ExpertId INT IDENTITY(1,1) NOT NULL,
    UserId INT NOT NULL,
    Bio NVARCHAR(MAX) NOT NULL,
    PortfolioUrl NVARCHAR(500) NOT NULL,
    CertificateUrl NVARCHAR(500) NULL,
    ExperienceYears INT NOT NULL,
    HourlyRate DECIMAL(18,2) NOT NULL,
    RatingAverage DECIMAL(3,2) NOT NULL CONSTRAINT DF_ExpertProfiles_RatingAverage DEFAULT 0,
    ReviewCount INT NOT NULL CONSTRAINT DF_ExpertProfiles_ReviewCount DEFAULT 0,
    CompletedProjects INT NOT NULL CONSTRAINT DF_ExpertProfiles_CompletedProjects DEFAULT 0,
    ProfileScore DECIMAL(5,2) NOT NULL,
    Level NVARCHAR(20) NOT NULL,
    ProfileReviewStatus NVARCHAR(30) NOT NULL CONSTRAINT DF_ExpertProfiles_ProfileReviewStatus DEFAULT N'PENDING_REVIEW',
    ProfileReviewNote NVARCHAR(MAX) NULL,
    IsVerified BIT NOT NULL CONSTRAINT DF_ExpertProfiles_IsVerified DEFAULT 0,
    CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_ExpertProfiles_CreatedAt DEFAULT SYSUTCDATETIME(),

    CONSTRAINT PK_ExpertProfiles PRIMARY KEY (ExpertId),
    CONSTRAINT UQ_ExpertProfiles_UserId UNIQUE (UserId),
    CONSTRAINT FK_ExpertProfiles_Users FOREIGN KEY (UserId) REFERENCES dbo.Users(UserId),
    CONSTRAINT CK_ExpertProfiles_ExperienceYears CHECK (ExperienceYears >= 0),
    CONSTRAINT CK_ExpertProfiles_HourlyRate CHECK (HourlyRate >= 0),
    CONSTRAINT CK_ExpertProfiles_RatingAverage CHECK (RatingAverage BETWEEN 0 AND 5),
    CONSTRAINT CK_ExpertProfiles_ReviewCount CHECK (ReviewCount >= 0),
    CONSTRAINT CK_ExpertProfiles_CompletedProjects CHECK (CompletedProjects >= 0),
    CONSTRAINT CK_ExpertProfiles_ProfileScore CHECK (ProfileScore BETWEEN 0 AND 100),
    CONSTRAINT CK_ExpertProfiles_Level CHECK (Level IN (N'JUNIOR', N'MID', N'SENIOR')),
    CONSTRAINT CK_ExpertProfiles_ProfileReviewStatus CHECK (ProfileReviewStatus IN (
        N'PENDING_REVIEW',
        N'APPROVED',
        N'REJECTED'
    ))
);
GO

CREATE TABLE dbo.Wallets (
    WalletId INT IDENTITY(1,1) NOT NULL,
    UserId INT NOT NULL,
    AvailableBalance DECIMAL(18,2) NOT NULL CONSTRAINT DF_Wallets_AvailableBalance DEFAULT 0,
    LockedBalance DECIMAL(18,2) NOT NULL CONSTRAINT DF_Wallets_LockedBalance DEFAULT 0,
    TotalEarning DECIMAL(18,2) NOT NULL CONSTRAINT DF_Wallets_TotalEarning DEFAULT 0,
    UpdatedAt DATETIME2 NOT NULL CONSTRAINT DF_Wallets_UpdatedAt DEFAULT SYSUTCDATETIME(),

    CONSTRAINT PK_Wallets PRIMARY KEY (WalletId),
    CONSTRAINT UQ_Wallets_UserId UNIQUE (UserId),
    CONSTRAINT FK_Wallets_Users FOREIGN KEY (UserId) REFERENCES dbo.Users(UserId),
    CONSTRAINT CK_Wallets_AvailableBalance CHECK (AvailableBalance >= 0),
    CONSTRAINT CK_Wallets_LockedBalance CHECK (LockedBalance >= 0),
    CONSTRAINT CK_Wallets_TotalEarning CHECK (TotalEarning >= 0)
);
GO

/* =========================================================
   2. SERVICE TEMPLATES, SKILLS, EXPERT SERVICE MAPPING
   ========================================================= */

CREATE TABLE dbo.Services (
    ServiceId INT IDENTITY(1,1) NOT NULL,
    CreatedByAdminId INT NOT NULL,
    ServiceName NVARCHAR(255) NOT NULL,
    Description NVARCHAR(MAX) NOT NULL,
    AIgeneratedDescription NVARCHAR(MAX) NULL,
    Category NVARCHAR(100) NULL,
    Status NVARCHAR(30) NOT NULL CONSTRAINT DF_Services_Status DEFAULT N'ACTIVE',
    CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_Services_CreatedAt DEFAULT SYSUTCDATETIME(),
    UpdatedAt DATETIME2 NULL,

    CONSTRAINT PK_Services PRIMARY KEY (ServiceId),
    CONSTRAINT FK_Services_CreatedByAdmin FOREIGN KEY (CreatedByAdminId) REFERENCES dbo.Users(UserId),
    CONSTRAINT UQ_Services_ServiceName UNIQUE (ServiceName),
    CONSTRAINT CK_Services_Status CHECK (Status IN (N'ACTIVE', N'INACTIVE', N'HIDDEN'))
);
GO

CREATE TABLE dbo.Skills (
    SkillId INT IDENTITY(1,1) NOT NULL,
    SkillName NVARCHAR(100) NOT NULL,
    Description NVARCHAR(500) NULL,
    Category NVARCHAR(100) NULL,
    IsActive BIT NOT NULL CONSTRAINT DF_Skills_IsActive DEFAULT 1,
    CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_Skills_CreatedAt DEFAULT SYSUTCDATETIME(),

    CONSTRAINT PK_Skills PRIMARY KEY (SkillId),
    CONSTRAINT UQ_Skills_SkillName UNIQUE (SkillName)
);
GO

CREATE TABLE dbo.ExpertServices (
    ExpertServiceId INT IDENTITY(1,1) NOT NULL,
    ExpertId INT NOT NULL,
    ServiceId INT NOT NULL,
    CustomDescription NVARCHAR(MAX) NULL,
    CustomPrice DECIMAL(18,2) NULL,
    DeliveryDays INT NULL,
    Status NVARCHAR(30) NOT NULL CONSTRAINT DF_ExpertServices_Status DEFAULT N'ACTIVE',
    CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_ExpertServices_CreatedAt DEFAULT SYSUTCDATETIME(),

    CONSTRAINT PK_ExpertServices PRIMARY KEY (ExpertServiceId),
    CONSTRAINT FK_ExpertServices_ExpertProfiles FOREIGN KEY (ExpertId) REFERENCES dbo.ExpertProfiles(ExpertId),
    CONSTRAINT FK_ExpertServices_Services FOREIGN KEY (ServiceId) REFERENCES dbo.Services(ServiceId),
    CONSTRAINT UQ_ExpertServices_ExpertId_ServiceId UNIQUE (ExpertId, ServiceId),
    CONSTRAINT CK_ExpertServices_CustomPrice CHECK (CustomPrice IS NULL OR CustomPrice >= 0),
    CONSTRAINT CK_ExpertServices_DeliveryDays CHECK (DeliveryDays IS NULL OR DeliveryDays > 0),
    CONSTRAINT CK_ExpertServices_Status CHECK (Status IN (N'ACTIVE', N'PAUSED', N'REMOVED'))
);
GO

/* =========================================================
   3. JOB, JOB-SERVICE, SKILLS, RECOMMENDATION, PROPOSAL
   ========================================================= */

CREATE TABLE dbo.JobPostings (
    JobId INT IDENTITY(1,1) NOT NULL,
    ClientId INT NOT NULL,
    Title NVARCHAR(255) NOT NULL,
    Description NVARCHAR(MAX) NOT NULL,
    AIgeneratedDescription NVARCHAR(MAX) NULL,
    BudgetMin DECIMAL(18,2) NOT NULL,
    BudgetMax DECIMAL(18,2) NOT NULL,
    Deadline DATETIME2 NOT NULL,
    ProjectType NVARCHAR(100) NOT NULL,
    Complexity NVARCHAR(50) NOT NULL,
    ExpectedDeliverables NVARCHAR(MAX) NOT NULL,
    Status NVARCHAR(20) NOT NULL CONSTRAINT DF_JobPostings_Status DEFAULT N'DRAFT',
    IsAIAssisted BIT NOT NULL CONSTRAINT DF_JobPostings_IsAIAssisted DEFAULT 0,
    CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_JobPostings_CreatedAt DEFAULT SYSUTCDATETIME(),
    UpdatedAt DATETIME2 NULL,

    CONSTRAINT PK_JobPostings PRIMARY KEY (JobId),
    CONSTRAINT FK_JobPostings_ClientProfiles FOREIGN KEY (ClientId) REFERENCES dbo.ClientProfiles(ClientId),
    CONSTRAINT CK_JobPostings_Budget CHECK (BudgetMin >= 0 AND BudgetMax >= BudgetMin),
    CONSTRAINT CK_JobPostings_Complexity CHECK (Complexity IN (N'SIMPLE', N'MEDIUM', N'COMPLEX')),
    CONSTRAINT CK_JobPostings_Status CHECK (Status IN (N'DRAFT', N'OPEN', N'CLOSED', N'CANCELLED', N'EXPIRED'))
);
GO

CREATE TABLE dbo.JobServices (
    JobServiceId INT IDENTITY(1,1) NOT NULL,
    JobId INT NOT NULL,
    ServiceId INT NOT NULL,

    CONSTRAINT PK_JobServices PRIMARY KEY (JobServiceId),
    CONSTRAINT FK_JobServices_JobPostings FOREIGN KEY (JobId) REFERENCES dbo.JobPostings(JobId),
    CONSTRAINT FK_JobServices_Services FOREIGN KEY (ServiceId) REFERENCES dbo.Services(ServiceId),
    CONSTRAINT UQ_JobServices_JobId_ServiceId UNIQUE (JobId, ServiceId)
);
GO

CREATE TABLE dbo.JobSkills (
    JobSkillId INT IDENTITY(1,1) NOT NULL,
    JobId INT NOT NULL,
    SkillId INT NOT NULL,
    SkillLevelRequired NVARCHAR(30) NULL,
    IsRequired BIT NOT NULL CONSTRAINT DF_JobSkills_IsRequired DEFAULT 1,

    CONSTRAINT PK_JobSkills PRIMARY KEY (JobSkillId),
    CONSTRAINT FK_JobSkills_JobPostings FOREIGN KEY (JobId) REFERENCES dbo.JobPostings(JobId),
    CONSTRAINT FK_JobSkills_Skills FOREIGN KEY (SkillId) REFERENCES dbo.Skills(SkillId),
    CONSTRAINT UQ_JobSkills_JobId_SkillId UNIQUE (JobId, SkillId),
    CONSTRAINT CK_JobSkills_SkillLevelRequired CHECK (
        SkillLevelRequired IS NULL OR SkillLevelRequired IN (N'BEGINNER', N'INTERMEDIATE', N'ADVANCED')
    )
);
GO

CREATE TABLE dbo.ExpertSkills (
    ExpertSkillId INT IDENTITY(1,1) NOT NULL,
    ExpertId INT NOT NULL,
    SkillId INT NOT NULL,
    SkillLevel NVARCHAR(30) NOT NULL,
    YearsOfExperience INT NULL,

    CONSTRAINT PK_ExpertSkills PRIMARY KEY (ExpertSkillId),
    CONSTRAINT FK_ExpertSkills_ExpertProfiles FOREIGN KEY (ExpertId) REFERENCES dbo.ExpertProfiles(ExpertId),
    CONSTRAINT FK_ExpertSkills_Skills FOREIGN KEY (SkillId) REFERENCES dbo.Skills(SkillId),
    CONSTRAINT UQ_ExpertSkills_ExpertId_SkillId UNIQUE (ExpertId, SkillId),
    CONSTRAINT CK_ExpertSkills_SkillLevel CHECK (SkillLevel IN (N'BEGINNER', N'INTERMEDIATE', N'ADVANCED')),
    CONSTRAINT CK_ExpertSkills_YearsOfExperience CHECK (YearsOfExperience IS NULL OR YearsOfExperience >= 0)
);
GO

CREATE TABLE dbo.AIRecommendations (
    RecommendationId INT IDENTITY(1,1) NOT NULL,
    JobId INT NOT NULL,
    ExpertId INT NOT NULL,
    MatchScore DECIMAL(5,2) NOT NULL,
    MatchedSkillSummary NVARCHAR(MAX) NULL,
    MatchReason NVARCHAR(MAX) NOT NULL,
    RiskNote NVARCHAR(MAX) NULL,
    CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_AIRecommendations_CreatedAt DEFAULT SYSUTCDATETIME(),

    CONSTRAINT PK_AIRecommendations PRIMARY KEY (RecommendationId),
    CONSTRAINT FK_AIRecommendations_JobPostings FOREIGN KEY (JobId) REFERENCES dbo.JobPostings(JobId),
    CONSTRAINT FK_AIRecommendations_ExpertProfiles FOREIGN KEY (ExpertId) REFERENCES dbo.ExpertProfiles(ExpertId),
    CONSTRAINT UQ_AIRecommendations_JobId_ExpertId UNIQUE (JobId, ExpertId),
    CONSTRAINT CK_AIRecommendations_MatchScore CHECK (MatchScore BETWEEN 0 AND 100)
);
GO

CREATE TABLE dbo.Proposals (
    ProposalId INT IDENTITY(1,1) NOT NULL,
    JobId INT NOT NULL,
    ExpertId INT NOT NULL,
    CoverLetter NVARCHAR(MAX) NOT NULL,
    ProposedPrice DECIMAL(18,2) NOT NULL,
    ProposedTimelineDays INT NOT NULL,
    ExpectedOutputs NVARCHAR(MAX) NOT NULL,
    WorkingApproach NVARCHAR(MAX) NOT NULL,
    PreliminaryMilestonePlan NVARCHAR(MAX) NULL,
    CounterPrice DECIMAL(18,2) NULL,
    CounterTimelineDays INT NULL,
    CounterMessage NVARCHAR(MAX) NULL,
    Status NVARCHAR(30) NOT NULL CONSTRAINT DF_Proposals_Status DEFAULT N'SUBMITTED',
    CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_Proposals_CreatedAt DEFAULT SYSUTCDATETIME(),

    CONSTRAINT PK_Proposals PRIMARY KEY (ProposalId),
    CONSTRAINT FK_Proposals_JobPostings FOREIGN KEY (JobId) REFERENCES dbo.JobPostings(JobId),
    CONSTRAINT FK_Proposals_ExpertProfiles FOREIGN KEY (ExpertId) REFERENCES dbo.ExpertProfiles(ExpertId),
    CONSTRAINT UQ_Proposals_JobId_ExpertId UNIQUE (JobId, ExpertId),
    CONSTRAINT CK_Proposals_ProposedPrice CHECK (ProposedPrice >= 0),
    CONSTRAINT CK_Proposals_ProposedTimelineDays CHECK (ProposedTimelineDays > 0),
    CONSTRAINT CK_Proposals_CounterPrice CHECK (CounterPrice IS NULL OR CounterPrice >= 0),
    CONSTRAINT CK_Proposals_CounterTimelineDays CHECK (CounterTimelineDays IS NULL OR CounterTimelineDays > 0),
    CONSTRAINT CK_Proposals_Status CHECK (Status IN (
        N'SUBMITTED',
        N'COUNTER_OFFERED',
        N'ACCEPTED',
        N'REJECTED',
        N'WITHDRAWN',
        N'NOT_SELECTED'
    ))
);
GO

/* =========================================================
   4. CONTRACT, PROJECT, MILESTONE, ESCROW, DELIVERABLE
   ========================================================= */

CREATE TABLE dbo.ProjectContracts (
    ContractId INT IDENTITY(1,1) NOT NULL,
    ProposalId INT NOT NULL,
    ClientId INT NOT NULL,
    ExpertId INT NOT NULL,
    ProjectScope NVARCHAR(MAX) NOT NULL,
    FinalPrice DECIMAL(18,2) NOT NULL,
    PlatformFeeRate DECIMAL(5,2) NOT NULL,
    PlatformFeeAmount DECIMAL(18,2) NOT NULL,
    TotalClientPayment DECIMAL(18,2) NOT NULL,
    FinalTimelineDays INT NOT NULL,
    Deliverables NVARCHAR(MAX) NOT NULL,
    AcceptanceCriteria NVARCHAR(MAX) NOT NULL,
    RevisionLimit INT NOT NULL,
    PaymentTerms NVARCHAR(MAX) NOT NULL,
    ContractSource NVARCHAR(30) NOT NULL CONSTRAINT DF_ProjectContracts_ContractSource DEFAULT N'PROPOSAL',
    ChatSummary NVARCHAR(MAX) NULL,
    ClientConfirmed BIT NOT NULL CONSTRAINT DF_ProjectContracts_ClientConfirmed DEFAULT 0,
    ExpertConfirmed BIT NOT NULL CONSTRAINT DF_ProjectContracts_ExpertConfirmed DEFAULT 0,
    Status NVARCHAR(30) NOT NULL CONSTRAINT DF_ProjectContracts_Status DEFAULT N'DRAFT',
    CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_ProjectContracts_CreatedAt DEFAULT SYSUTCDATETIME(),
    ConfirmedAt DATETIME2 NULL,

    CONSTRAINT PK_ProjectContracts PRIMARY KEY (ContractId),
    CONSTRAINT UQ_ProjectContracts_ProposalId UNIQUE (ProposalId),
    CONSTRAINT FK_ProjectContracts_Proposals FOREIGN KEY (ProposalId) REFERENCES dbo.Proposals(ProposalId),
    CONSTRAINT FK_ProjectContracts_ClientProfiles FOREIGN KEY (ClientId) REFERENCES dbo.ClientProfiles(ClientId),
    CONSTRAINT FK_ProjectContracts_ExpertProfiles FOREIGN KEY (ExpertId) REFERENCES dbo.ExpertProfiles(ExpertId),
    CONSTRAINT CK_ProjectContracts_FinalPrice CHECK (FinalPrice >= 0),
    CONSTRAINT CK_ProjectContracts_PlatformFeeRate CHECK (PlatformFeeRate IN (5.00, 10.00)),
    CONSTRAINT CK_ProjectContracts_PlatformFeeAmount CHECK (PlatformFeeAmount >= 0),
    CONSTRAINT CK_ProjectContracts_TotalClientPayment CHECK (TotalClientPayment = FinalPrice + PlatformFeeAmount),
    CONSTRAINT CK_ProjectContracts_FinalTimelineDays CHECK (FinalTimelineDays > 0),
    CONSTRAINT CK_ProjectContracts_RevisionLimit CHECK (RevisionLimit >= 0),
    CONSTRAINT CK_ProjectContracts_ContractSource CHECK (ContractSource IN (N'PROPOSAL', N'CHAT_AGREEMENT')),
    CONSTRAINT CK_ProjectContracts_Status CHECK (Status IN (N'DRAFT', N'CONFIRMED', N'CANCELLED'))
);
GO

CREATE TABLE dbo.Projects (
    ProjectId INT IDENTITY(1,1) NOT NULL,
    ContractId INT NOT NULL,
    ProposalId INT NOT NULL,
    ClientId INT NOT NULL,
    ExpertId INT NOT NULL,
    TotalAmount DECIMAL(18,2) NOT NULL,
    Status NVARCHAR(30) NOT NULL CONSTRAINT DF_Projects_Status DEFAULT N'PENDING_ESCROW',
    EscrowStatus NVARCHAR(30) NOT NULL CONSTRAINT DF_Projects_EscrowStatus DEFAULT N'NOT_LOCKED',
    StartDate DATETIME2 NULL,
    EndDate DATETIME2 NULL,
    CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_Projects_CreatedAt DEFAULT SYSUTCDATETIME(),

    CONSTRAINT PK_Projects PRIMARY KEY (ProjectId),
    CONSTRAINT UQ_Projects_ContractId UNIQUE (ContractId),
    CONSTRAINT UQ_Projects_ProposalId UNIQUE (ProposalId),
    CONSTRAINT FK_Projects_ProjectContracts FOREIGN KEY (ContractId) REFERENCES dbo.ProjectContracts(ContractId),
    CONSTRAINT FK_Projects_Proposals FOREIGN KEY (ProposalId) REFERENCES dbo.Proposals(ProposalId),
    CONSTRAINT FK_Projects_ClientProfiles FOREIGN KEY (ClientId) REFERENCES dbo.ClientProfiles(ClientId),
    CONSTRAINT FK_Projects_ExpertProfiles FOREIGN KEY (ExpertId) REFERENCES dbo.ExpertProfiles(ExpertId),
    CONSTRAINT CK_Projects_TotalAmount CHECK (TotalAmount >= 0),
    CONSTRAINT CK_Projects_Status CHECK (Status IN (N'PENDING_ESCROW', N'ACTIVE', N'COMPLETED', N'CANCELLED', N'DISPUTED')),
    CONSTRAINT CK_Projects_EscrowStatus CHECK (EscrowStatus IN (
        N'NOT_LOCKED',
        N'LOCKED',
        N'PARTIALLY_RELEASED',
        N'RELEASED',
        N'REFUNDED',
        N'FROZEN'
    ))
);
GO

CREATE TABLE dbo.Milestones (
    MilestoneId INT IDENTITY(1,1) NOT NULL,
    ProjectId INT NOT NULL,
    Title NVARCHAR(255) NOT NULL,
    Description NVARCHAR(MAX) NOT NULL,
    ExpectedDeliverable NVARCHAR(MAX) NOT NULL,
    AcceptanceCriteria NVARCHAR(MAX) NOT NULL,
    Amount DECIMAL(18,2) NOT NULL,
    OrderIndex INT NOT NULL,
    DueDate DATETIME2 NOT NULL,
    RevisionLimit INT NOT NULL CONSTRAINT DF_Milestones_RevisionLimit DEFAULT 2,
    RevisionUsed INT NOT NULL CONSTRAINT DF_Milestones_RevisionUsed DEFAULT 0,
    PaymentStatus NVARCHAR(30) NOT NULL CONSTRAINT DF_Milestones_PaymentStatus DEFAULT N'ESCROW_LOCKED',
    Status NVARCHAR(30) NOT NULL CONSTRAINT DF_Milestones_Status DEFAULT N'PENDING',

    CONSTRAINT PK_Milestones PRIMARY KEY (MilestoneId),
    CONSTRAINT FK_Milestones_Projects FOREIGN KEY (ProjectId) REFERENCES dbo.Projects(ProjectId),
    CONSTRAINT UQ_Milestones_ProjectId_OrderIndex UNIQUE (ProjectId, OrderIndex),
    CONSTRAINT CK_Milestones_Amount CHECK (Amount >= 0),
    CONSTRAINT CK_Milestones_OrderIndex CHECK (OrderIndex > 0),
    CONSTRAINT CK_Milestones_RevisionLimit CHECK (RevisionLimit >= 0),
    CONSTRAINT CK_Milestones_RevisionUsed CHECK (RevisionUsed >= 0 AND RevisionUsed <= RevisionLimit),
    CONSTRAINT CK_Milestones_PaymentStatus CHECK (PaymentStatus IN (N'ESCROW_LOCKED', N'RELEASED', N'REFUNDED', N'FROZEN')),
    CONSTRAINT CK_Milestones_Status CHECK (Status IN (
        N'PENDING',
        N'IN_PROGRESS',
        N'SUBMITTED',
        N'REVISION_REQUESTED',
        N'APPROVED',
        N'DISPUTED',
        N'CANCELLED'
    ))
);
GO

CREATE TABLE dbo.Escrows (
    EscrowId INT IDENTITY(1,1) NOT NULL,
    ProjectId INT NOT NULL,
    MilestoneId INT NULL,
    ClientId INT NOT NULL,
    Amount DECIMAL(18,2) NOT NULL,
    Status NVARCHAR(30) NOT NULL CONSTRAINT DF_Escrows_Status DEFAULT N'PENDING',
    CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_Escrows_CreatedAt DEFAULT SYSUTCDATETIME(),
    UpdatedAt DATETIME2 NULL,

    CONSTRAINT PK_Escrows PRIMARY KEY (EscrowId),
    CONSTRAINT FK_Escrows_Projects FOREIGN KEY (ProjectId) REFERENCES dbo.Projects(ProjectId),
    CONSTRAINT FK_Escrows_Milestones FOREIGN KEY (MilestoneId) REFERENCES dbo.Milestones(MilestoneId),
    CONSTRAINT FK_Escrows_ClientProfiles FOREIGN KEY (ClientId) REFERENCES dbo.ClientProfiles(ClientId),
    CONSTRAINT CK_Escrows_Amount CHECK (Amount >= 0),
    CONSTRAINT CK_Escrows_Status CHECK (Status IN (N'PENDING', N'LOCKED', N'RELEASED', N'REFUNDED', N'FROZEN'))
);
GO

CREATE UNIQUE INDEX UX_Escrows_MilestoneId_NotNull
ON dbo.Escrows(MilestoneId)
WHERE MilestoneId IS NOT NULL;
GO

CREATE TABLE dbo.Deliverables (
    DeliverableId INT IDENTITY(1,1) NOT NULL,
    MilestoneId INT NOT NULL,
    ExpertId INT NOT NULL,
    FileUrl NVARCHAR(500) NULL,
    DemoUrl NVARCHAR(500) NULL,
    Description NVARCHAR(MAX) NOT NULL,
    HandoverNotes NVARCHAR(MAX) NULL,
    TestResultUrl NVARCHAR(500) NULL,
    ClientFeedback NVARCHAR(MAX) NULL,
    VersionNumber INT NOT NULL,
    Status NVARCHAR(30) NOT NULL CONSTRAINT DF_Deliverables_Status DEFAULT N'SUBMITTED',
    SubmittedAt DATETIME2 NOT NULL CONSTRAINT DF_Deliverables_SubmittedAt DEFAULT SYSUTCDATETIME(),

    CONSTRAINT PK_Deliverables PRIMARY KEY (DeliverableId),
    CONSTRAINT FK_Deliverables_Milestones FOREIGN KEY (MilestoneId) REFERENCES dbo.Milestones(MilestoneId),
    CONSTRAINT FK_Deliverables_ExpertProfiles FOREIGN KEY (ExpertId) REFERENCES dbo.ExpertProfiles(ExpertId),
    CONSTRAINT UQ_Deliverables_MilestoneId_VersionNumber UNIQUE (MilestoneId, VersionNumber),
    CONSTRAINT CK_Deliverables_VersionNumber CHECK (VersionNumber > 0),
    CONSTRAINT CK_Deliverables_Status CHECK (Status IN (N'SUBMITTED', N'APPROVED', N'REVISION_REQUESTED', N'DISPUTED'))
);
GO

/* =========================================================
   5. PAYMENT, CHAT, DISPUTE, REVIEW, NOTIFICATION, AUDIT
   ========================================================= */

CREATE TABLE dbo.PaymentTransactions (
    TransactionId INT IDENTITY(1,1) NOT NULL,
    EscrowId INT NULL,
    ProjectId INT NOT NULL,
    MilestoneId INT NULL,
    UserId INT NOT NULL,
    Type NVARCHAR(30) NOT NULL,
    Amount DECIMAL(18,2) NOT NULL,
    Status NVARCHAR(20) NOT NULL CONSTRAINT DF_PaymentTransactions_Status DEFAULT N'PENDING',
    CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_PaymentTransactions_CreatedAt DEFAULT SYSUTCDATETIME(),

    CONSTRAINT PK_PaymentTransactions PRIMARY KEY (TransactionId),
    CONSTRAINT FK_PaymentTransactions_Escrows FOREIGN KEY (EscrowId) REFERENCES dbo.Escrows(EscrowId),
    CONSTRAINT FK_PaymentTransactions_Projects FOREIGN KEY (ProjectId) REFERENCES dbo.Projects(ProjectId),
    CONSTRAINT FK_PaymentTransactions_Milestones FOREIGN KEY (MilestoneId) REFERENCES dbo.Milestones(MilestoneId),
    CONSTRAINT FK_PaymentTransactions_Users FOREIGN KEY (UserId) REFERENCES dbo.Users(UserId),
    CONSTRAINT CK_PaymentTransactions_Type CHECK (Type IN (N'ESCROW_LOCK', N'ESCROW_RELEASE', N'REFUND', N'PARTIAL_REFUND')),
    CONSTRAINT CK_PaymentTransactions_Amount CHECK (Amount >= 0),
    CONSTRAINT CK_PaymentTransactions_Status CHECK (Status IN (N'PENDING', N'SUCCESS', N'FAILED'))
);
GO

CREATE TABLE dbo.Messages (
    MessageId INT IDENTITY(1,1) NOT NULL,
    SenderId INT NOT NULL,
    JobId INT NULL,
    ProposalId INT NULL,
    ProjectId INT NULL,
    MessageText NVARCHAR(MAX) NOT NULL,
    MessageType NVARCHAR(30) NOT NULL CONSTRAINT DF_Messages_MessageType DEFAULT N'TEXT',
    IsAgreementMarked BIT NOT NULL CONSTRAINT DF_Messages_IsAgreementMarked DEFAULT 0,
    SentAt DATETIME2 NOT NULL CONSTRAINT DF_Messages_SentAt DEFAULT SYSUTCDATETIME(),
    IsRead BIT NOT NULL CONSTRAINT DF_Messages_IsRead DEFAULT 0,

    CONSTRAINT PK_Messages PRIMARY KEY (MessageId),
    CONSTRAINT FK_Messages_Users FOREIGN KEY (SenderId) REFERENCES dbo.Users(UserId),
    CONSTRAINT FK_Messages_JobPostings FOREIGN KEY (JobId) REFERENCES dbo.JobPostings(JobId),
    CONSTRAINT FK_Messages_Proposals FOREIGN KEY (ProposalId) REFERENCES dbo.Proposals(ProposalId),
    CONSTRAINT FK_Messages_Projects FOREIGN KEY (ProjectId) REFERENCES dbo.Projects(ProjectId),
    CONSTRAINT CK_Messages_MessageType CHECK (MessageType IN (N'TEXT', N'SYSTEM', N'AGREEMENT', N'CONTRACT_TRIGGER')),
    CONSTRAINT CK_Messages_AgreementType CHECK (
        IsAgreementMarked = 0 OR MessageType IN (N'AGREEMENT', N'CONTRACT_TRIGGER')
    ),
    CONSTRAINT CK_Messages_Context CHECK (JobId IS NOT NULL OR ProposalId IS NOT NULL OR ProjectId IS NOT NULL)
);
GO

CREATE TABLE dbo.Disputes (
    DisputeId INT IDENTITY(1,1) NOT NULL,
    ProjectId INT NOT NULL,
    MilestoneId INT NULL,
    OpenedByUserId INT NOT NULL,
    RespondentUserId INT NOT NULL,
    Reason NVARCHAR(MAX) NOT NULL,
    DisputedAmount DECIMAL(18,2) NOT NULL,
    Status NVARCHAR(30) NOT NULL CONSTRAINT DF_Disputes_Status DEFAULT N'OPEN',
    ResolutionType NVARCHAR(30) NULL,
    AdminDecision NVARCHAR(MAX) NULL,
    CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_Disputes_CreatedAt DEFAULT SYSUTCDATETIME(),
    ResolvedAt DATETIME2 NULL,

    CONSTRAINT PK_Disputes PRIMARY KEY (DisputeId),
    CONSTRAINT FK_Disputes_Projects FOREIGN KEY (ProjectId) REFERENCES dbo.Projects(ProjectId),
    CONSTRAINT FK_Disputes_Milestones FOREIGN KEY (MilestoneId) REFERENCES dbo.Milestones(MilestoneId),
    CONSTRAINT FK_Disputes_OpenedBy FOREIGN KEY (OpenedByUserId) REFERENCES dbo.Users(UserId),
    CONSTRAINT FK_Disputes_Respondent FOREIGN KEY (RespondentUserId) REFERENCES dbo.Users(UserId),
    CONSTRAINT CK_Disputes_Users CHECK (OpenedByUserId <> RespondentUserId),
    CONSTRAINT CK_Disputes_DisputedAmount CHECK (DisputedAmount >= 0),
    CONSTRAINT CK_Disputes_Status CHECK (Status IN (N'OPEN', N'UNDER_REVIEW', N'RESOLVED')),
    CONSTRAINT CK_Disputes_ResolutionType CHECK (
        ResolutionType IS NULL OR ResolutionType IN (N'RELEASE_TO_EXPERT', N'REFUND_TO_CLIENT', N'PARTIAL_SPLIT')
    )
);
GO

CREATE TABLE dbo.DisputeEvidences (
    EvidenceId INT IDENTITY(1,1) NOT NULL,
    DisputeId INT NOT NULL,
    UploadedByUserId INT NOT NULL,
    EvidenceText NVARCHAR(MAX) NOT NULL,
    FileUrl NVARCHAR(500) NULL,
    CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_DisputeEvidences_CreatedAt DEFAULT SYSUTCDATETIME(),

    CONSTRAINT PK_DisputeEvidences PRIMARY KEY (EvidenceId),
    CONSTRAINT FK_DisputeEvidences_Disputes FOREIGN KEY (DisputeId) REFERENCES dbo.Disputes(DisputeId),
    CONSTRAINT FK_DisputeEvidences_Users FOREIGN KEY (UploadedByUserId) REFERENCES dbo.Users(UserId)
);
GO

CREATE TABLE dbo.Reviews (
    ReviewId INT IDENTITY(1,1) NOT NULL,
    ProjectId INT NOT NULL,
    ReviewerId INT NOT NULL,
    RevieweeId INT NOT NULL,
    Rating INT NOT NULL,
    Comment NVARCHAR(MAX) NOT NULL,
    Status NVARCHAR(20) NOT NULL CONSTRAINT DF_Reviews_Status DEFAULT N'VISIBLE',
    CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_Reviews_CreatedAt DEFAULT SYSUTCDATETIME(),

    CONSTRAINT PK_Reviews PRIMARY KEY (ReviewId),
    CONSTRAINT FK_Reviews_Projects FOREIGN KEY (ProjectId) REFERENCES dbo.Projects(ProjectId),
    CONSTRAINT FK_Reviews_Reviewer FOREIGN KEY (ReviewerId) REFERENCES dbo.Users(UserId),
    CONSTRAINT FK_Reviews_Reviewee FOREIGN KEY (RevieweeId) REFERENCES dbo.Users(UserId),
    CONSTRAINT UQ_Reviews_ProjectId UNIQUE (ProjectId),
    CONSTRAINT CK_Reviews_Rating CHECK (Rating BETWEEN 1 AND 5),
    CONSTRAINT CK_Reviews_Status CHECK (Status IN (N'VISIBLE', N'HIDDEN')),
    CONSTRAINT CK_Reviews_Reviewer_Not_Reviewee CHECK (ReviewerId <> RevieweeId)

);
GO

CREATE TABLE dbo.Notifications (
    NotificationId INT IDENTITY(1,1) NOT NULL,
    UserId INT NOT NULL,
    Title NVARCHAR(255) NOT NULL,
    Content NVARCHAR(MAX) NOT NULL,
    Type NVARCHAR(50) NOT NULL,
    IsRead BIT NOT NULL CONSTRAINT DF_Notifications_IsRead DEFAULT 0,
    CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_Notifications_CreatedAt DEFAULT SYSUTCDATETIME(),

    CONSTRAINT PK_Notifications PRIMARY KEY (NotificationId),
    CONSTRAINT FK_Notifications_Users FOREIGN KEY (UserId) REFERENCES dbo.Users(UserId),
    CONSTRAINT CK_Notifications_Type CHECK (Type IN (
        N'JOB_ALERT',
        N'PROPOSAL',
        N'CONTRACT',
        N'PROJECT',
        N'MILESTONE',
        N'DISPUTE',
        N'REVIEW',
        N'PAYMENT',
        N'SERVICE',
        N'SYSTEM'
    ))
);
GO

CREATE TABLE dbo.AuditLogs (
    AuditLogId INT IDENTITY(1,1) NOT NULL,
    UserId INT NULL,
    Action NVARCHAR(100) NOT NULL,
    EntityName NVARCHAR(100) NOT NULL,
    EntityId INT NULL,
    Description NVARCHAR(MAX) NOT NULL,
    CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_AuditLogs_CreatedAt DEFAULT SYSUTCDATETIME(),

    CONSTRAINT PK_AuditLogs PRIMARY KEY (AuditLogId),
    CONSTRAINT FK_AuditLogs_Users FOREIGN KEY (UserId) REFERENCES dbo.Users(UserId)
);
GO

CREATE TABLE dbo.AIRequestLogs (
    AIRequestLogId INT IDENTITY(1,1) NOT NULL,
    UserId INT NULL,
    ModuleName NVARCHAR(100) NOT NULL,
    Provider NVARCHAR(50) NOT NULL,
    Prompt NVARCHAR(MAX) NOT NULL,
    Response NVARCHAR(MAX) NULL,
    Status NVARCHAR(30) NOT NULL,
    ErrorMessage NVARCHAR(MAX) NULL,
    CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_AIRequestLogs_CreatedAt DEFAULT SYSUTCDATETIME(),

    CONSTRAINT PK_AIRequestLogs PRIMARY KEY (AIRequestLogId),
    CONSTRAINT FK_AIRequestLogs_Users FOREIGN KEY (UserId) REFERENCES dbo.Users(UserId),
    CONSTRAINT CK_AIRequestLogs_ModuleName CHECK (ModuleName IN (
        N'AI_JOB_ASSISTANT',
        N'PROFILE_CHECKER',
        N'RECOMMENDATION',
        N'PROPOSAL_ANALYZER',
        N'CONTRACT_DRAFT',
        N'DELIVERABLE_REVIEW',
        N'DISPUTE_SUMMARY'
    )),
    CONSTRAINT CK_AIRequestLogs_Provider CHECK (Provider IN (N'GEMINI', N'DEEPSEEK')),
    CONSTRAINT CK_AIRequestLogs_Status CHECK (Status IN (N'SUCCESS', N'FAILED'))
);
GO

/* =========================================================
   6. INDEXES
   ========================================================= */

CREATE INDEX IX_Users_Role_Status ON dbo.Users(Role, Status);
CREATE INDEX IX_ClientProfiles_UserId ON dbo.ClientProfiles(UserId);
CREATE INDEX IX_ExpertProfiles_UserId ON dbo.ExpertProfiles(UserId);
CREATE INDEX IX_Services_Status ON dbo.Services(Status);
CREATE INDEX IX_Skills_SkillName ON dbo.Skills(SkillName);
CREATE INDEX IX_ExpertServices_ExpertId ON dbo.ExpertServices(ExpertId);
CREATE INDEX IX_JobPostings_ClientId_Status ON dbo.JobPostings(ClientId, Status);
CREATE INDEX IX_JobPostings_Status_Deadline ON dbo.JobPostings(Status, Deadline);
CREATE INDEX IX_JobSkills_SkillId ON dbo.JobSkills(SkillId);
CREATE INDEX IX_ExpertSkills_SkillId ON dbo.ExpertSkills(SkillId);
CREATE INDEX IX_AIRecommendations_JobId_Score ON dbo.AIRecommendations(JobId, MatchScore DESC);
CREATE INDEX IX_Proposals_JobId_Status ON dbo.Proposals(JobId, Status);
CREATE INDEX IX_Projects_ClientId_ExpertId ON dbo.Projects(ClientId, ExpertId);
CREATE INDEX IX_Projects_Status ON dbo.Projects(Status);
CREATE INDEX IX_Milestones_ProjectId_Status ON dbo.Milestones(ProjectId, Status);
CREATE INDEX IX_Escrows_ProjectId_Status ON dbo.Escrows(ProjectId, Status);
CREATE INDEX IX_PaymentTransactions_ProjectId_Type ON dbo.PaymentTransactions(ProjectId, Type);
CREATE INDEX IX_Messages_ProjectId_SentAt ON dbo.Messages(ProjectId, SentAt);
CREATE INDEX IX_Disputes_Status ON dbo.Disputes(Status);
CREATE INDEX IX_Notifications_UserId_IsRead ON dbo.Notifications(UserId, IsRead);
CREATE INDEX IX_AIRequestLogs_UserId_CreatedAt ON dbo.AIRequestLogs(UserId, CreatedAt DESC);
CREATE INDEX IX_AIRequestLogs_ModuleName_Status ON dbo.AIRequestLogs(ModuleName, Status);
GO

/* =========================================================
   7. MASTER SEED DATA FOR SKILLS ONLY
   ========================================================= */

INSERT INTO dbo.Skills (SkillName, Description, Category)
VALUES
(N'Chatbot', N'Thiết kế và triển khai chatbot cho website, fanpage hoặc hệ thống nội bộ.', N'AI Application'),
(N'NLP', N'Xử lý ngôn ngữ tự nhiên, phân loại văn bản, trích xuất ý định.', N'AI Core'),
(N'OpenAI API', N'Tích hợp API LLM như OpenAI vào sản phẩm.', N'LLM'),
(N'Python', N'Lập trình Python cho AI, automation và data pipeline.', N'Programming'),
(N'Computer Vision', N'Xử lý ảnh, nhận diện đối tượng, phân loại ảnh.', N'AI Core'),
(N'OCR', N'Trích xuất chữ từ ảnh, PDF, hóa đơn và tài liệu scan.', N'Document AI'),
(N'Data Analytics', N'Phân tích dữ liệu, dashboard, metrics và insight.', N'Data'),
(N'Automation', N'Tự động hóa quy trình nghiệp vụ và báo cáo.', N'Automation'),
(N'Prompt Engineering', N'Thiết kế prompt, workflow LLM và đánh giá output.', N'LLM'),
(N'RAG', N'Retrieval-Augmented Generation cho tài liệu nội bộ.', N'LLM'),
(N'SQL', N'Thiết kế truy vấn, xử lý dữ liệu và báo cáo từ database.', N'Data'),
(N'Power BI', N'Tạo dashboard và báo cáo trực quan.', N'Data'),
(N'ASP.NET Core', N'Xây dựng RESTful API bằng ASP.NET Core.', N'Backend'),
(N'SignalR', N'Xây dựng realtime chat và notification.', N'Backend');
GO

/* =========================================================
   8. QUICK CHECK QUERIES
   ========================================================= */

SELECT TABLE_NAME
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_TYPE = 'BASE TABLE'
ORDER BY TABLE_NAME;
GO

SELECT * FROM dbo.Skills ORDER BY SkillName;
GO
