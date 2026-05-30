/*
AITasker Database Script - SQL Server
Generated for SWP391 demo.

How to run:
1. Open SQL Server Management Studio (SSMS) or Azure Data Studio.
2. Execute this whole file.
3. Database created: AITaskerDb

Note:
- This script DROPS and RECREATES AITaskerDb to make demo setup repeatable.
- Payment is simulated by Wallets, Escrows, and PaymentTransactions.
- Main flow follows Upwork-like job/proposal/project workflow.
- Services table is included as optional/Fiverr-style future enhancement.
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
   1. CORE ACCOUNT AND PROFILE TABLES
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
    CompanyName NVARCHAR(255) NOT NULL,
    Industry NVARCHAR(255) NOT NULL,
    BusinessType NVARCHAR(100) NOT NULL,
    CompanySize NVARCHAR(50) NULL,
    AINeeds NVARCHAR(MAX) NOT NULL,
    MainProblems NVARCHAR(MAX) NOT NULL,
    ExpectedBudgetMin DECIMAL(18,2) NULL,
    ExpectedBudgetMax DECIMAL(18,2) NULL,
    RatingAverage DECIMAL(3,2) NOT NULL CONSTRAINT DF_ClientProfiles_RatingAverage DEFAULT 0,
    ReviewCount INT NOT NULL CONSTRAINT DF_ClientProfiles_ReviewCount DEFAULT 0,
    CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_ClientProfiles_CreatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_ClientProfiles PRIMARY KEY (ClientId),
    CONSTRAINT UQ_ClientProfiles_UserId UNIQUE (UserId),
    CONSTRAINT FK_ClientProfiles_Users FOREIGN KEY (UserId) REFERENCES dbo.Users(UserId),
    CONSTRAINT CK_ClientProfiles_RatingAverage CHECK (RatingAverage BETWEEN 0 AND 5),
    CONSTRAINT CK_ClientProfiles_ReviewCount CHECK (ReviewCount >= 0),
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
    ProfileScore DECIMAL(3,2) NOT NULL,
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
    CONSTRAINT CK_ExpertProfiles_ProfileScore CHECK (ProfileScore BETWEEN 1 AND 5),
    CONSTRAINT CK_ExpertProfiles_Level CHECK (Level IN (N'JUNIOR', N'MID', N'SENIOR')),
    CONSTRAINT CK_ExpertProfiles_ProfileReviewStatus CHECK (ProfileReviewStatus IN (
        N'PENDING_REVIEW',
        N'APPROVED',
        N'REJECTED'
    ))
);
GO

CREATE TABLE dbo.Skills (
    SkillId INT IDENTITY(1,1) NOT NULL,
    SkillName NVARCHAR(100) NOT NULL,
    Description NVARCHAR(500) NOT NULL,
    CONSTRAINT PK_Skills PRIMARY KEY (SkillId),
    CONSTRAINT UQ_Skills_SkillName UNIQUE (SkillName)
);
GO

CREATE TABLE dbo.ExpertSkills (
    ExpertSkillId INT IDENTITY(1,1) NOT NULL,
    ExpertId INT NOT NULL,
    SkillId INT NOT NULL,
    Level NVARCHAR(20) NOT NULL,
    CONSTRAINT PK_ExpertSkills PRIMARY KEY (ExpertSkillId),
    CONSTRAINT FK_ExpertSkills_ExpertProfiles FOREIGN KEY (ExpertId) REFERENCES dbo.ExpertProfiles(ExpertId),
    CONSTRAINT FK_ExpertSkills_Skills FOREIGN KEY (SkillId) REFERENCES dbo.Skills(SkillId),
    CONSTRAINT UQ_ExpertSkills_ExpertId_SkillId UNIQUE (ExpertId, SkillId),
    CONSTRAINT CK_ExpertSkills_Level CHECK (Level IN (N'BEGINNER', N'INTERMEDIATE', N'ADVANCED'))
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
   2. JOB, RECOMMENDATION, PROPOSAL TABLES
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

CREATE TABLE dbo.JobSkills (
    JobSkillId INT IDENTITY(1,1) NOT NULL,
    JobId INT NOT NULL,
    SkillId INT NOT NULL,
    IsRequired BIT NOT NULL CONSTRAINT DF_JobSkills_IsRequired DEFAULT 1,
    CONSTRAINT PK_JobSkills PRIMARY KEY (JobSkillId),
    CONSTRAINT FK_JobSkills_JobPostings FOREIGN KEY (JobId) REFERENCES dbo.JobPostings(JobId),
    CONSTRAINT FK_JobSkills_Skills FOREIGN KEY (SkillId) REFERENCES dbo.Skills(SkillId),
    CONSTRAINT UQ_JobSkills_JobId_SkillId UNIQUE (JobId, SkillId)
);
GO

CREATE TABLE dbo.AIRecommendations (
    RecommendationId INT IDENTITY(1,1) NOT NULL,
    JobId INT NOT NULL,
    ExpertId INT NOT NULL,
    MatchScore DECIMAL(5,2) NOT NULL,
    Reason NVARCHAR(MAX) NOT NULL,
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
        N'REJECTED_BY_EXPERT',
        N'WITHDRAWN',
        N'NOT_SELECTED'
    ))
);
GO

CREATE TABLE dbo.ProposalMilestones (
    ProposalMilestoneId INT IDENTITY(1,1) NOT NULL,
    ProposalId INT NOT NULL,
    Title NVARCHAR(255) NOT NULL,
    Description NVARCHAR(MAX) NOT NULL,
    Amount DECIMAL(18,2) NOT NULL,
    OrderIndex INT NOT NULL,
    EstimatedDays INT NOT NULL,
    ExpectedDeliverable NVARCHAR(MAX) NOT NULL,
    CONSTRAINT PK_ProposalMilestones PRIMARY KEY (ProposalMilestoneId),
    CONSTRAINT FK_ProposalMilestones_Proposals FOREIGN KEY (ProposalId) REFERENCES dbo.Proposals(ProposalId),
    CONSTRAINT UQ_ProposalMilestones_ProposalId_OrderIndex UNIQUE (ProposalId, OrderIndex),
    CONSTRAINT CK_ProposalMilestones_Amount CHECK (Amount >= 0),
    CONSTRAINT CK_ProposalMilestones_OrderIndex CHECK (OrderIndex > 0),
    CONSTRAINT CK_ProposalMilestones_EstimatedDays CHECK (EstimatedDays > 0)
);
GO

/* =========================================================
   3. CONTRACT, PROJECT, MILESTONE, DELIVERABLE TABLES
   ========================================================= */

CREATE TABLE dbo.ProjectContracts (
    ContractId INT IDENTITY(1,1) NOT NULL,
    ProposalId INT NOT NULL,
    ClientId INT NOT NULL,
    ExpertId INT NOT NULL,
    ProjectScope NVARCHAR(MAX) NOT NULL,
    FinalPrice DECIMAL(18,2) NOT NULL,
    FinalTimelineDays INT NOT NULL,
    Deliverables NVARCHAR(MAX) NOT NULL,
    RevisionLimit INT NOT NULL,
    PaymentTerms NVARCHAR(MAX) NOT NULL,
    AcceptanceCriteria NVARCHAR(MAX) NOT NULL,
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
    CONSTRAINT CK_ProjectContracts_FinalTimelineDays CHECK (FinalTimelineDays > 0),
    CONSTRAINT CK_ProjectContracts_RevisionLimit CHECK (RevisionLimit >= 0),
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
    CONSTRAINT CK_Projects_Status CHECK (Status IN (
        N'PENDING_ESCROW',
        N'ACTIVE',
        N'COMPLETED',
        N'CANCELLED',
        N'DISPUTED'
    )),
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
    CONSTRAINT CK_Milestones_PaymentStatus CHECK (PaymentStatus IN (
        N'ESCROW_LOCKED',
        N'RELEASED',
        N'REFUNDED',
        N'FROZEN'
    )),
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

CREATE TABLE dbo.Deliverables (
    DeliverableId INT IDENTITY(1,1) NOT NULL,
    MilestoneId INT NOT NULL,
    ExpertId INT NOT NULL,
    FileUrl NVARCHAR(500) NULL,
    DemoUrl NVARCHAR(500) NULL,
    Description NVARCHAR(MAX) NOT NULL,
    Notes NVARCHAR(MAX) NULL,
    VersionNumber INT NOT NULL,
    Status NVARCHAR(20) NOT NULL CONSTRAINT DF_Deliverables_Status DEFAULT N'SUBMITTED',
    SubmittedAt DATETIME2 NOT NULL CONSTRAINT DF_Deliverables_SubmittedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_Deliverables PRIMARY KEY (DeliverableId),
    CONSTRAINT FK_Deliverables_Milestones FOREIGN KEY (MilestoneId) REFERENCES dbo.Milestones(MilestoneId),
    CONSTRAINT FK_Deliverables_ExpertProfiles FOREIGN KEY (ExpertId) REFERENCES dbo.ExpertProfiles(ExpertId),
    CONSTRAINT UQ_Deliverables_MilestoneId_VersionNumber UNIQUE (MilestoneId, VersionNumber),
    CONSTRAINT CK_Deliverables_VersionNumber CHECK (VersionNumber > 0),
    CONSTRAINT CK_Deliverables_Status CHECK (Status IN (
        N'SUBMITTED',
        N'APPROVED',
        N'REVISION_REQUESTED',
        N'DISPUTED'
    ))
);
GO

/* =========================================================
   4. ESCROW, PAYMENT, CHAT, DISPUTE, REVIEW TABLES
   ========================================================= */

CREATE TABLE dbo.Escrows (
    EscrowId INT IDENTITY(1,1) NOT NULL,
    ProjectId INT NOT NULL,
    MilestoneId INT NULL,
    ClientId INT NOT NULL,
    ExpertId INT NOT NULL,
    Amount DECIMAL(18,2) NOT NULL,
    Status NVARCHAR(30) NOT NULL CONSTRAINT DF_Escrows_Status DEFAULT N'PENDING',
    CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_Escrows_CreatedAt DEFAULT SYSUTCDATETIME(),
    UpdatedAt DATETIME2 NULL,
    CONSTRAINT PK_Escrows PRIMARY KEY (EscrowId),
    CONSTRAINT FK_Escrows_Projects FOREIGN KEY (ProjectId) REFERENCES dbo.Projects(ProjectId),
    CONSTRAINT FK_Escrows_Milestones FOREIGN KEY (MilestoneId) REFERENCES dbo.Milestones(MilestoneId),
    CONSTRAINT FK_Escrows_ClientProfiles FOREIGN KEY (ClientId) REFERENCES dbo.ClientProfiles(ClientId),
    CONSTRAINT FK_Escrows_ExpertProfiles FOREIGN KEY (ExpertId) REFERENCES dbo.ExpertProfiles(ExpertId),
    CONSTRAINT CK_Escrows_Amount CHECK (Amount >= 0),
    CONSTRAINT CK_Escrows_Status CHECK (Status IN (N'PENDING', N'LOCKED', N'RELEASED', N'REFUNDED', N'FROZEN'))
);
GO

CREATE TABLE dbo.PaymentTransactions (
    TransactionId INT IDENTITY(1,1) NOT NULL,
    ProjectId INT NOT NULL,
    MilestoneId INT NULL,
    UserId INT NOT NULL,
    Type NVARCHAR(30) NOT NULL,
    Amount DECIMAL(18,2) NOT NULL,
    Status NVARCHAR(20) NOT NULL CONSTRAINT DF_PaymentTransactions_Status DEFAULT N'PENDING',
    CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_PaymentTransactions_CreatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_PaymentTransactions PRIMARY KEY (TransactionId),
    CONSTRAINT FK_PaymentTransactions_Projects FOREIGN KEY (ProjectId) REFERENCES dbo.Projects(ProjectId),
    CONSTRAINT FK_PaymentTransactions_Milestones FOREIGN KEY (MilestoneId) REFERENCES dbo.Milestones(MilestoneId),
    CONSTRAINT FK_PaymentTransactions_Users FOREIGN KEY (UserId) REFERENCES dbo.Users(UserId),
    CONSTRAINT CK_PaymentTransactions_Type CHECK (Type IN (
        N'ESCROW_LOCK',
        N'ESCROW_RELEASE',
        N'REFUND',
        N'PARTIAL_REFUND'
    )),
    CONSTRAINT CK_PaymentTransactions_Amount CHECK (Amount >= 0),
    CONSTRAINT CK_PaymentTransactions_Status CHECK (Status IN (N'PENDING', N'SUCCESS', N'FAILED'))
);
GO

CREATE TABLE dbo.Messages (
    MessageId INT IDENTITY(1,1) NOT NULL,
    ProjectId INT NULL,
    JobId INT NULL,
    ProposalId INT NULL,
    SenderId INT NOT NULL,
    MessageText NVARCHAR(MAX) NOT NULL,
    SentAt DATETIME2 NOT NULL CONSTRAINT DF_Messages_SentAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_Messages PRIMARY KEY (MessageId),
    CONSTRAINT FK_Messages_Projects FOREIGN KEY (ProjectId) REFERENCES dbo.Projects(ProjectId),
    CONSTRAINT FK_Messages_JobPostings FOREIGN KEY (JobId) REFERENCES dbo.JobPostings(JobId),
    CONSTRAINT FK_Messages_Proposals FOREIGN KEY (ProposalId) REFERENCES dbo.Proposals(ProposalId),
    CONSTRAINT FK_Messages_Users FOREIGN KEY (SenderId) REFERENCES dbo.Users(UserId),
    CONSTRAINT CK_Messages_Context CHECK (
        ProjectId IS NOT NULL OR JobId IS NOT NULL OR ProposalId IS NOT NULL
    )
);
GO

CREATE TABLE dbo.Disputes (
    DisputeId INT IDENTITY(1,1) NOT NULL,
    ProjectId INT NOT NULL,
    MilestoneId INT NULL,
    OpenedBy INT NOT NULL,
    RespondentId INT NOT NULL,
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
    CONSTRAINT FK_Disputes_OpenedBy FOREIGN KEY (OpenedBy) REFERENCES dbo.Users(UserId),
    CONSTRAINT FK_Disputes_RespondentId FOREIGN KEY (RespondentId) REFERENCES dbo.Users(UserId),
    CONSTRAINT CK_Disputes_DisputedAmount CHECK (DisputedAmount >= 0),
    CONSTRAINT CK_Disputes_Status CHECK (Status IN (N'OPEN', N'UNDER_REVIEW', N'RESOLVED')),
    CONSTRAINT CK_Disputes_ResolutionType CHECK (
        ResolutionType IS NULL OR ResolutionType IN (
            N'RELEASE_TO_EXPERT',
            N'REFUND_TO_CLIENT',
            N'PARTIAL_SPLIT'
        )
    )
);
GO

CREATE TABLE dbo.DisputeEvidences (
    EvidenceId INT IDENTITY(1,1) NOT NULL,
    DisputeId INT NOT NULL,
    UploadedBy INT NOT NULL,
    EvidenceText NVARCHAR(MAX) NOT NULL,
    FileUrl NVARCHAR(500) NULL,
    CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_DisputeEvidences_CreatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_DisputeEvidences PRIMARY KEY (EvidenceId),
    CONSTRAINT FK_DisputeEvidences_Disputes FOREIGN KEY (DisputeId) REFERENCES dbo.Disputes(DisputeId),
    CONSTRAINT FK_DisputeEvidences_Users FOREIGN KEY (UploadedBy) REFERENCES dbo.Users(UserId)
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
    CONSTRAINT UQ_Reviews_ProjectId_ReviewerId_RevieweeId UNIQUE (ProjectId, ReviewerId, RevieweeId),
    CONSTRAINT CK_Reviews_Rating CHECK (Rating BETWEEN 1 AND 5),
    CONSTRAINT CK_Reviews_Status CHECK (Status IN (N'VISIBLE', N'HIDDEN')),
    CONSTRAINT CK_Reviews_Reviewer_Not_Reviewee CHECK (ReviewerId <> RevieweeId)
);
GO

/* =========================================================
   5. OPTIONAL SERVICE MARKETPLACE, NOTIFICATION, AUDIT TABLES
   ========================================================= */

CREATE TABLE dbo.Services (
    ServiceId INT IDENTITY(1,1) NOT NULL,
    ExpertId INT NOT NULL,
    Title NVARCHAR(255) NOT NULL,
    Description NVARCHAR(MAX) NOT NULL,
    AIgeneratedDescription NVARCHAR(MAX) NULL,
    Tags NVARCHAR(500) NULL,
    Price DECIMAL(18,2) NOT NULL,
    DeliveryDays INT NOT NULL,
    RevisionLimit INT NOT NULL,
    DemoUrl NVARCHAR(500) NULL,
    Status NVARCHAR(30) NOT NULL CONSTRAINT DF_Services_Status DEFAULT N'DRAFT',
    RejectionReason NVARCHAR(MAX) NULL,
    ReviewedBy INT NULL,
    ReviewedAt DATETIME2 NULL,
    CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_Services_CreatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_Services PRIMARY KEY (ServiceId),
    CONSTRAINT FK_Services_ExpertProfiles FOREIGN KEY (ExpertId) REFERENCES dbo.ExpertProfiles(ExpertId),
    CONSTRAINT FK_Services_ReviewedBy FOREIGN KEY (ReviewedBy) REFERENCES dbo.Users(UserId),
    CONSTRAINT CK_Services_Price CHECK (Price >= 0),
    CONSTRAINT CK_Services_DeliveryDays CHECK (DeliveryDays > 0),
    CONSTRAINT CK_Services_RevisionLimit CHECK (RevisionLimit >= 0),
    CONSTRAINT CK_Services_Status CHECK (Status IN (
        N'DRAFT',
        N'PENDING_REVIEW',
        N'ACTIVE',
        N'REJECTED',
        N'HIDDEN',
        N'REMOVED'
    ))
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

/* =========================================================
   6. INDEXES FOR DEMO PERFORMANCE
   ========================================================= */

CREATE INDEX IX_Users_Email ON dbo.Users(Email);
CREATE INDEX IX_Users_Role_Status ON dbo.Users(Role, Status);
CREATE INDEX IX_JobPostings_Status ON dbo.JobPostings(Status);
CREATE INDEX IX_JobPostings_ClientId ON dbo.JobPostings(ClientId);
CREATE INDEX IX_JobPostings_Deadline ON dbo.JobPostings(Deadline);
CREATE INDEX IX_Proposals_JobId_Status ON dbo.Proposals(JobId, Status);
CREATE INDEX IX_Projects_Status ON dbo.Projects(Status);
CREATE INDEX IX_Projects_ClientId_ExpertId ON dbo.Projects(ClientId, ExpertId);
CREATE INDEX IX_Milestones_ProjectId_Status ON dbo.Milestones(ProjectId, Status);
CREATE INDEX IX_PaymentTransactions_ProjectId_Type ON dbo.PaymentTransactions(ProjectId, Type);
CREATE INDEX IX_Disputes_Status ON dbo.Disputes(Status);
CREATE INDEX IX_Reviews_RevieweeId ON dbo.Reviews(RevieweeId);
CREATE INDEX IX_Notifications_UserId_IsRead ON dbo.Notifications(UserId, IsRead);
GO

/* =========================================================
   7. DUMMY DATA
   ========================================================= */

SET IDENTITY_INSERT dbo.Users ON;

INSERT INTO dbo.Users (UserId, Email, PasswordHash, FullName, Role, AuthProvider, GoogleId, AvatarUrl, Status, CreatedAt, UpdatedAt)
VALUES
(1, N'admin@aitasker.vn', N'$2a$12$demo_admin_hash', N'Nguyễn Quang Admin', N'ADMIN', N'LOCAL', NULL, NULL, N'ACTIVE', '2026-05-01T08:00:00', NULL),
(2, N'client.greenmart@example.com', N'$2a$12$demo_client_hash_01', N'Trần Mai Anh', N'CLIENT', N'LOCAL', NULL, NULL, N'ACTIVE', '2026-05-02T09:10:00', NULL),
(3, N'client.legalwise@example.com', N'$2a$12$demo_client_hash_02', N'Lê Đức Huy', N'CLIENT', N'GOOGLE', N'google-client-legalwise-001', N'https://cdn.aitasker.vn/avatar/legalwise.png', N'ACTIVE', '2026-05-03T10:00:00', NULL),
(4, N'client.healthplus@example.com', N'$2a$12$demo_client_hash_03', N'Phạm Thu Hà', N'CLIENT', N'LOCAL', NULL, NULL, N'ACTIVE', '2026-05-03T13:20:00', NULL),
(5, N'expert.linhai@example.com', N'$2a$12$demo_expert_hash_01', N'Võ Hoàng Linh', N'EXPERT', N'LOCAL', NULL, NULL, N'ACTIVE', '2026-05-04T08:30:00', NULL),
(6, N'expert.minhocr@example.com', N'$2a$12$demo_expert_hash_02', N'Đặng Minh Phúc', N'EXPERT', N'GOOGLE', N'google-expert-minhocr-002', N'https://cdn.aitasker.vn/avatar/minhocr.png', N'ACTIVE', '2026-05-04T09:15:00', NULL),
(7, N'expert.andata@example.com', N'$2a$12$demo_expert_hash_03', N'Ngô Bảo An', N'EXPERT', N'LOCAL', NULL, NULL, N'ACTIVE', '2026-05-05T11:45:00', NULL),
(8, N'expert.thaorag@example.com', N'$2a$12$demo_expert_hash_04', N'Bùi Minh Thảo', N'EXPERT', N'LOCAL', NULL, NULL, N'ACTIVE', '2026-05-06T14:00:00', NULL),
(9, N'expert.khoavision@example.com', N'$2a$12$demo_expert_hash_05', N'Hoàng Gia Khoa', N'EXPERT', N'LOCAL', NULL, NULL, N'ACTIVE', '2026-05-06T15:20:00', NULL),
(10, N'expert.namreview@example.com', N'$2a$12$demo_expert_hash_06', N'Đỗ Quốc Nam', N'EXPERT', N'LOCAL', NULL, NULL, N'PENDING_AI_REVIEW', '2026-05-07T09:00:00', NULL),
(11, N'client.suspended@example.com', N'$2a$12$demo_client_hash_suspended', N'Công ty Demo Suspended', N'CLIENT', N'LOCAL', NULL, NULL, N'SUSPENDED', '2026-05-07T12:00:00', NULL);

SET IDENTITY_INSERT dbo.Users OFF;
GO

SET IDENTITY_INSERT dbo.ClientProfiles ON;

INSERT INTO dbo.ClientProfiles (ClientId, UserId, CompanyName, Industry, BusinessType, CompanySize, AINeeds, MainProblems, ExpectedBudgetMin, ExpectedBudgetMax, RatingAverage, ReviewCount, CreatedAt)
VALUES
(1, 2, N'GreenMart Việt Nam', N'E-commerce / Retail', N'SME', N'51-200', N'Cần chatbot tiếng Việt hỗ trợ khách hàng, gợi ý sản phẩm và tự động trả lời câu hỏi đơn hàng.', N'Team CSKH quá tải, phản hồi chậm ngoài giờ hành chính.', 1000, 2500, 4.80, 1, '2026-05-02T09:30:00'),
(2, 3, N'LegalWise Consulting', N'Legal Tech', N'Startup', N'11-50', N'Cần OCR và tìm kiếm tài liệu pháp lý bằng AI, hỗ trợ tiếng Việt.', N'Tài liệu scan nhiều, luật sư mất thời gian đọc và phân loại.', 1500, 4000, 0.00, 0, '2026-05-03T10:25:00'),
(3, 4, N'HealthPlus Clinic', N'Healthcare', N'SME', N'51-200', N'Cần dashboard phân tích lịch hẹn, doanh thu, tỷ lệ tái khám và cảnh báo bất thường.', N'Dữ liệu nằm rải rác trong Excel, khó theo dõi hiệu suất vận hành.', 2000, 5000, 5.00, 1, '2026-05-03T13:40:00'),
(4, 11, N'Suspended Demo Company', N'Demo', N'SME', N'1-10', N'Dữ liệu demo cho tài khoản bị khóa.', N'Tài khoản bị suspended để test admin.', 500, 1000, 0.00, 0, '2026-05-07T12:10:00');

SET IDENTITY_INSERT dbo.ClientProfiles OFF;
GO

SET IDENTITY_INSERT dbo.ExpertProfiles ON;

INSERT INTO dbo.ExpertProfiles (ExpertId, UserId, Bio, PortfolioUrl, CertificateUrl, ExperienceYears, HourlyRate, RatingAverage, ReviewCount, CompletedProjects, ProfileScore, Level, ProfileReviewStatus, ProfileReviewNote, IsVerified, CreatedAt)
VALUES
(1, 5, N'AI engineer chuyên chatbot, RAG, OpenAI API và tích hợp hệ thống web cho doanh nghiệp vừa và nhỏ.', N'https://portfolio.aitasker.vn/linh-ai', N'https://certs.aitasker.vn/linh-openai.pdf', 4, 35, 4.80, 1, 6, 4.70, N'SENIOR', N'APPROVED', N'Hồ sơ rõ ràng, portfolio phù hợp với chatbot và RAG.', 1, '2026-05-04T08:50:00'),
(2, 6, N'Chuyên OCR hóa đơn, trích xuất dữ liệu từ PDF, xử lý ảnh và pipeline Python.', N'https://portfolio.aitasker.vn/minh-ocr', N'https://certs.aitasker.vn/minh-cv.pdf', 3, 28, 0.00, 0, 2, 4.20, N'MID', N'APPROVED', N'Kỹ năng OCR và Computer Vision phù hợp.', 1, '2026-05-04T09:40:00'),
(3, 7, N'Data analyst triển khai dashboard Power BI, SQL, Python automation và báo cáo quản trị.', N'https://portfolio.aitasker.vn/an-data', NULL, 5, 40, 5.00, 1, 8, 4.90, N'SENIOR', N'APPROVED', N'Hồ sơ mạnh về analytics và automation.', 1, '2026-05-05T12:10:00'),
(4, 8, N'AI consultant chuyên RAG, semantic search, LLM evaluation và prompt engineering cho tài liệu nội bộ.', N'https://portfolio.aitasker.vn/thao-rag', N'https://certs.aitasker.vn/thao-rag.pdf', 4, 45, 0.00, 0, 4, 4.60, N'SENIOR', N'APPROVED', N'Hồ sơ phù hợp với RAG và legal knowledge base.', 1, '2026-05-06T14:30:00'),
(5, 9, N'Computer vision engineer chuyên phân loại hình ảnh, YOLO, OCR và kiểm tra chất lượng bằng ảnh.', N'https://portfolio.aitasker.vn/khoa-vision', NULL, 2, 25, 0.00, 0, 1, 3.90, N'MID', N'APPROVED', N'Portfolio có demo computer vision rõ ràng.', 1, '2026-05-06T15:45:00'),
(6, 10, N'Junior AI developer đang hoàn thiện portfolio về chatbot và Python automation.', N'https://portfolio.aitasker.vn/nam-review', NULL, 1, 15, 0.00, 0, 0, 3.20, N'JUNIOR', N'PENDING_REVIEW', N'Cần bổ sung demo project và mô tả rõ kinh nghiệm.', 0, '2026-05-07T09:20:00');

SET IDENTITY_INSERT dbo.ExpertProfiles OFF;
GO

SET IDENTITY_INSERT dbo.Skills ON;

INSERT INTO dbo.Skills (SkillId, SkillName, Description)
VALUES
(1, N'Chatbot', N'Thiết kế và triển khai chatbot cho website, fanpage hoặc hệ thống nội bộ.'),
(2, N'NLP', N'Xử lý ngôn ngữ tự nhiên, phân loại văn bản, trích xuất ý định.'),
(3, N'OpenAI API', N'Tích hợp API LLM như OpenAI vào sản phẩm.'),
(4, N'Python', N'Lập trình Python cho AI, automation, data pipeline.'),
(5, N'Computer Vision', N'Xử lý ảnh, nhận diện đối tượng, phân loại ảnh.'),
(6, N'OCR', N'Trích xuất chữ từ ảnh, PDF, hóa đơn, tài liệu scan.'),
(7, N'Data Analytics', N'Phân tích dữ liệu, dashboard, metrics và insight.'),
(8, N'Automation', N'Tự động hóa quy trình nghiệp vụ và báo cáo.'),
(9, N'Prompt Engineering', N'Thiết kế prompt, workflow LLM và đánh giá output.'),
(10, N'RAG', N'Retrieval-Augmented Generation cho tài liệu nội bộ.'),
(11, N'SQL', N'Thiết kế truy vấn, xử lý dữ liệu và báo cáo từ database.'),
(12, N'Power BI', N'Tạo dashboard và báo cáo trực quan.'),
(13, N'SignalR', N'Xây dựng realtime chat và notification.'),
(14, N'ASP.NET Core', N'Xây dựng RESTful API bằng ASP.NET Core.');

SET IDENTITY_INSERT dbo.Skills OFF;
GO

SET IDENTITY_INSERT dbo.ExpertSkills ON;

INSERT INTO dbo.ExpertSkills (ExpertSkillId, ExpertId, SkillId, Level)
VALUES
(1, 1, 1, N'ADVANCED'),
(2, 1, 2, N'ADVANCED'),
(3, 1, 3, N'ADVANCED'),
(4, 1, 9, N'ADVANCED'),
(5, 1, 10, N'INTERMEDIATE'),
(6, 1, 14, N'INTERMEDIATE'),
(7, 2, 4, N'ADVANCED'),
(8, 2, 5, N'ADVANCED'),
(9, 2, 6, N'ADVANCED'),
(10, 2, 8, N'INTERMEDIATE'),
(11, 3, 4, N'ADVANCED'),
(12, 3, 7, N'ADVANCED'),
(13, 3, 8, N'ADVANCED'),
(14, 3, 11, N'ADVANCED'),
(15, 3, 12, N'ADVANCED'),
(16, 4, 2, N'ADVANCED'),
(17, 4, 3, N'ADVANCED'),
(18, 4, 9, N'ADVANCED'),
(19, 4, 10, N'ADVANCED'),
(20, 5, 4, N'INTERMEDIATE'),
(21, 5, 5, N'ADVANCED'),
(22, 5, 6, N'INTERMEDIATE'),
(23, 6, 1, N'BEGINNER'),
(24, 6, 4, N'INTERMEDIATE'),
(25, 6, 9, N'BEGINNER');

SET IDENTITY_INSERT dbo.ExpertSkills OFF;
GO

SET IDENTITY_INSERT dbo.Wallets ON;

INSERT INTO dbo.Wallets (WalletId, UserId, AvailableBalance, LockedBalance, TotalEarning, UpdatedAt)
VALUES
(1, 1, 0, 0, 0, '2026-05-20T08:00:00'),
(2, 2, 3500, 1000, 0, '2026-05-20T08:10:00'),
(3, 3, 4000, 1200, 0, '2026-05-20T08:10:00'),
(4, 4, 2600, 0, 0, '2026-05-20T08:10:00'),
(5, 5, 500, 0, 500, '2026-05-20T08:10:00'),
(6, 6, 0, 0, 0, '2026-05-20T08:10:00'),
(7, 7, 2400, 0, 2400, '2026-05-20T08:10:00'),
(8, 8, 800, 0, 800, '2026-05-20T08:10:00'),
(9, 9, 0, 0, 0, '2026-05-20T08:10:00'),
(10, 10, 0, 0, 0, '2026-05-20T08:10:00'),
(11, 11, 0, 0, 0, '2026-05-20T08:10:00');

SET IDENTITY_INSERT dbo.Wallets OFF;
GO

SET IDENTITY_INSERT dbo.JobPostings ON;

INSERT INTO dbo.JobPostings (JobId, ClientId, Title, Description, AIgeneratedDescription, BudgetMin, BudgetMax, Deadline, ProjectType, Complexity, ExpectedDeliverables, Status, IsAIAssisted, CreatedAt, UpdatedAt)
VALUES
(1, 1, N'Xây dựng chatbot AI tiếng Việt cho website bán lẻ', N'Cần chatbot trả lời câu hỏi về đơn hàng, chính sách đổi trả và gợi ý sản phẩm dựa trên FAQ hiện có.', N'AI gợi ý: Xây dựng chatbot tiếng Việt tích hợp OpenAI API, có intent detection, fallback và dashboard câu hỏi thường gặp.', 1200, 1800, '2026-07-10T23:59:00', N'Chatbot / Customer Support', N'MEDIUM', N'Chatbot demo, API tích hợp website, tài liệu hướng dẫn, kịch bản FAQ.', N'CLOSED', 1, '2026-05-08T09:00:00', '2026-05-10T10:00:00'),
(2, 2, N'OCR tài liệu pháp lý và trích xuất thông tin chính', N'Cần hệ thống OCR cho PDF scan hợp đồng, trích xuất bên ký, ngày hiệu lực, điều khoản chính và xuất Excel.', N'AI gợi ý: OCR pipeline xử lý PDF scan tiếng Việt, trích xuất entity pháp lý và xuất dữ liệu có cấu trúc.', 1500, 3000, '2026-07-20T23:59:00', N'OCR / Document AI', N'COMPLEX', N'OCR pipeline, schema output, file Excel mẫu, hướng dẫn sử dụng.', N'OPEN', 1, '2026-05-11T10:00:00', NULL),
(3, 3, N'Dashboard phân tích lịch hẹn và doanh thu phòng khám', N'Tổng hợp dữ liệu Excel và tạo dashboard Power BI theo ngày, bác sĩ, dịch vụ và tỷ lệ tái khám.', NULL, 2000, 2800, '2026-06-25T23:59:00', N'Data Analytics', N'MEDIUM', N'Data model, Power BI dashboard, tài liệu nhập liệu.', N'CLOSED', 0, '2026-05-09T14:00:00', '2026-05-20T16:30:00'),
(4, 1, N'Tự động tạo báo cáo doanh số hàng tuần', N'Draft: tự động tổng hợp file Excel bán hàng và gửi báo cáo qua email.', NULL, 600, 1000, '2026-08-01T23:59:00', N'Automation', N'SIMPLE', N'Script automation, template report, hướng dẫn cài đặt.', N'DRAFT', 0, '2026-05-15T11:10:00', NULL),
(5, 2, N'RAG legal assistant cho kho tài liệu nội bộ', N'Cần prototype hỏi đáp trên tài liệu nội bộ, có citation nguồn, upload PDF và kiểm tra câu trả lời.', N'AI gợi ý: RAG assistant cho tài liệu pháp lý, dùng vector search, citation và đánh giá độ tin cậy câu trả lời.', 1800, 2500, '2026-07-05T23:59:00', N'RAG / Legal AI', N'COMPLEX', N'Prototype RAG, pipeline ingest PDF, demo hỏi đáp, báo cáo đánh giá.', N'CLOSED', 1, '2026-05-10T08:45:00', '2026-05-16T13:00:00'),
(6, 3, N'Phân loại ảnh xét nghiệm sơ bộ bằng Computer Vision', N'Cần mô hình demo phân loại ảnh xét nghiệm theo nhóm bình thường/cần kiểm tra thêm, phục vụ nghiên cứu nội bộ.', N'AI gợi ý: Computer vision prototype phân loại ảnh, dashboard đánh giá accuracy, không dùng cho chẩn đoán thật.', 2500, 4500, '2026-08-10T23:59:00', N'Computer Vision', N'COMPLEX', N'Model demo, notebook huấn luyện, báo cáo accuracy, demo upload ảnh.', N'OPEN', 1, '2026-05-18T09:30:00', NULL);

SET IDENTITY_INSERT dbo.JobPostings OFF;
GO

SET IDENTITY_INSERT dbo.JobSkills ON;

INSERT INTO dbo.JobSkills (JobSkillId, JobId, SkillId, IsRequired)
VALUES
(1, 1, 1, 1),
(2, 1, 2, 1),
(3, 1, 3, 1),
(4, 1, 9, 0),
(5, 2, 6, 1),
(6, 2, 5, 1),
(7, 2, 4, 1),
(8, 2, 8, 0),
(9, 3, 7, 1),
(10, 3, 11, 1),
(11, 3, 12, 1),
(12, 3, 8, 0),
(13, 4, 4, 1),
(14, 4, 8, 1),
(15, 4, 11, 0),
(16, 5, 10, 1),
(17, 5, 3, 1),
(18, 5, 2, 1),
(19, 5, 9, 0),
(20, 6, 5, 1),
(21, 6, 4, 1),
(22, 6, 7, 0);

SET IDENTITY_INSERT dbo.JobSkills OFF;
GO

SET IDENTITY_INSERT dbo.AIRecommendations ON;

INSERT INTO dbo.AIRecommendations (RecommendationId, JobId, ExpertId, MatchScore, Reason, CreatedAt)
VALUES
(1, 1, 1, 94.50, N'Trùng Chatbot, NLP, OpenAI API; rating và profile score cao; budget phù hợp.', '2026-05-08T09:05:00'),
(2, 1, 4, 81.20, N'Mạnh về OpenAI API, RAG và prompt engineering; thiếu kinh nghiệm chatbot triển khai website.', '2026-05-08T09:05:00'),
(3, 2, 2, 92.30, N'Trùng OCR, Computer Vision và Python; portfolio có demo OCR PDF.', '2026-05-11T10:05:00'),
(4, 2, 5, 76.80, N'Mạnh về Computer Vision, có OCR mức trung bình; budget phù hợp.', '2026-05-11T10:05:00'),
(5, 3, 3, 96.00, N'Trùng Data Analytics, SQL, Power BI và automation; completed projects cao.', '2026-05-09T14:05:00'),
(6, 5, 4, 93.00, N'Trùng RAG, OpenAI API, NLP và prompt engineering; phù hợp legal assistant.', '2026-05-10T08:50:00'),
(7, 6, 5, 88.50, N'Trùng Computer Vision và Python; hourly rate phù hợp budget.', '2026-05-18T09:35:00'),
(8, 6, 2, 84.00, N'Mạnh về OCR và Computer Vision; có thể hỗ trợ preprocessing ảnh.', '2026-05-18T09:35:00'),
(9, 6, 3, 62.00, N'Mạnh về data analytics, có Python nhưng thiếu computer vision chuyên sâu.', '2026-05-18T09:35:00');

SET IDENTITY_INSERT dbo.AIRecommendations OFF;
GO

SET IDENTITY_INSERT dbo.Proposals ON;

INSERT INTO dbo.Proposals (ProposalId, JobId, ExpertId, CoverLetter, ProposedPrice, ProposedTimelineDays, ExpectedOutputs, WorkingApproach, CounterPrice, CounterTimelineDays, CounterMessage, Status, CreatedAt)
VALUES
(1, 1, 1, N'Tôi sẽ xây chatbot theo FAQ hiện có, tích hợp OpenAI API và bổ sung fallback khi câu hỏi ngoài phạm vi.', 1500, 30, N'Chatbot demo, API backend, tài liệu hướng dẫn, prompt template.', N'Khảo sát FAQ, thiết kế intent, xây API, test với câu hỏi thật, bàn giao tài liệu.', NULL, NULL, NULL, N'ACCEPTED', '2026-05-08T12:00:00'),
(2, 1, 4, N'Tôi đề xuất dùng RAG mini trên FAQ để chatbot trả lời có nguồn trích dẫn.', 1700, 35, N'Prototype RAG chatbot, vector search, demo web.', N'Tạo knowledge base, indexing, prompt và kiểm thử.', NULL, NULL, NULL, N'NOT_SELECTED', '2026-05-08T13:30:00'),
(3, 2, 2, N'Tôi có kinh nghiệm OCR hợp đồng PDF scan, sẽ xây pipeline Python trích xuất trường dữ liệu chính.', 2600, 35, N'OCR pipeline, output Excel, file cấu hình, tài liệu hướng dẫn.', N'Phân tích mẫu PDF, OCR preprocessing, entity extraction, validation và export.', NULL, NULL, NULL, N'SUBMITTED', '2026-05-11T11:00:00'),
(4, 2, 5, N'Tôi có thể xử lý phần preprocessing ảnh và OCR cơ bản, phối hợp rule-based extraction.', 2200, 40, N'OCR demo, preprocessing notebook, export CSV.', N'Tối ưu chất lượng ảnh trước OCR, sau đó trích xuất thông tin bằng regex/rule.', NULL, NULL, NULL, N'SUBMITTED', '2026-05-11T15:20:00'),
(5, 3, 3, N'Tôi sẽ chuẩn hóa dữ liệu Excel, tạo model dữ liệu và dashboard Power BI cho phòng khám.', 2400, 25, N'Data model, dashboard, tài liệu sử dụng, file Power BI.', N'Làm sạch dữ liệu, thiết kế KPI, tạo dashboard, training người dùng.', NULL, NULL, NULL, N'ACCEPTED', '2026-05-09T15:00:00'),
(6, 5, 4, N'Tôi đề xuất prototype RAG có citation nguồn và cơ chế đánh giá câu trả lời trên tài liệu pháp lý.', 2000, 28, N'Prototype RAG, ingestion PDF, semantic search, report đánh giá.', N'Phân tích tài liệu, xây vector store, prompt có citation, test trên câu hỏi pháp lý.', NULL, NULL, NULL, N'ACCEPTED', '2026-05-10T11:20:00'),
(7, 6, 5, N'Tôi sẽ xây mô hình computer vision demo và dashboard đánh giá accuracy cho dữ liệu ảnh xét nghiệm.', 3800, 45, N'Notebook train, model demo, report accuracy, demo upload ảnh.', N'Tiền xử lý ảnh, train baseline, đánh giá, tối ưu model và bàn giao demo.', NULL, NULL, NULL, N'SUBMITTED', '2026-05-18T11:00:00'),
(8, 6, 2, N'Tôi có thể hỗ trợ preprocessing ảnh và baseline phân loại bằng CNN nhẹ.', 3500, 50, N'Pipeline preprocessing, baseline model, report kết quả.', N'Làm sạch ảnh, chia tập dữ liệu, train baseline và đánh giá.', NULL, NULL, NULL, N'SUBMITTED', '2026-05-18T12:30:00');

SET IDENTITY_INSERT dbo.Proposals OFF;
GO

SET IDENTITY_INSERT dbo.ProposalMilestones ON;

INSERT INTO dbo.ProposalMilestones (ProposalMilestoneId, ProposalId, Title, Description, Amount, OrderIndex, EstimatedDays, ExpectedDeliverable)
VALUES
(1, 1, N'Khảo sát và thiết kế chatbot', N'Phân tích FAQ, thiết kế luồng hội thoại và intent chính.', 500, 1, 10, N'Document intent, prompt base, flow chatbot.'),
(2, 1, N'Triển khai prototype và bàn giao', N'Xây API, tích hợp demo website, test và bàn giao.', 1000, 2, 20, N'Prototype chatbot, API, tài liệu hướng dẫn.'),
(3, 3, N'OCR preprocessing', N'Làm sạch ảnh/PDF và tạo pipeline OCR ban đầu.', 1000, 1, 15, N'Notebook preprocessing và OCR sample.'),
(4, 3, N'Entity extraction và export', N'Trích xuất trường pháp lý và xuất Excel.', 1600, 2, 20, N'Pipeline hoàn chỉnh và Excel output.'),
(5, 5, N'Làm sạch dữ liệu và data model', N'Chuẩn hóa Excel, xây model dữ liệu.', 900, 1, 10, N'Data model và file dữ liệu sạch.'),
(6, 5, N'Tạo dashboard và training', N'Xây dashboard Power BI và hướng dẫn sử dụng.', 1500, 2, 15, N'File PBIX, tài liệu training.'),
(7, 6, N'Ingestion và semantic search', N'Upload PDF, chunking, embedding và search.', 800, 1, 12, N'Pipeline ingest và search demo.'),
(8, 6, N'Legal Q&A prototype', N'Xây giao diện hỏi đáp, citation và report đánh giá.', 1200, 2, 16, N'Prototype Q&A và báo cáo đánh giá.'),
(9, 7, N'Dataset preprocessing', N'Tiền xử lý và chia tập dữ liệu ảnh.', 1200, 1, 15, N'Preprocessing notebook và report dataset.'),
(10, 7, N'Model demo và dashboard accuracy', N'Train baseline model, demo upload ảnh và dashboard kết quả.', 2600, 2, 30, N'Model demo, notebook, accuracy report.');

SET IDENTITY_INSERT dbo.ProposalMilestones OFF;
GO

SET IDENTITY_INSERT dbo.ProjectContracts ON;

INSERT INTO dbo.ProjectContracts (ContractId, ProposalId, ClientId, ExpertId, ProjectScope, FinalPrice, FinalTimelineDays, Deliverables, RevisionLimit, PaymentTerms, AcceptanceCriteria, ClientConfirmed, ExpertConfirmed, Status, CreatedAt, ConfirmedAt)
VALUES
(1, 1, 1, 1, N'Xây dựng chatbot AI tiếng Việt cho website GreenMart, trả lời FAQ, chính sách và gợi ý sản phẩm cơ bản.', 1500, 30, N'Chatbot demo, API backend, tài liệu hướng dẫn, test cases.', 2, N'Escrow theo 2 milestones, release khi Client approve từng milestone.', N'Chatbot trả lời đúng tối thiểu 80% test cases FAQ và có fallback an toàn.', 1, 1, N'CONFIRMED', '2026-05-09T09:00:00', '2026-05-09T10:00:00'),
(2, 5, 3, 3, N'Xây dashboard phân tích lịch hẹn, doanh thu, tỷ lệ tái khám cho HealthPlus Clinic.', 2400, 25, N'Data model, Power BI dashboard, tài liệu sử dụng, training.', 1, N'Escrow theo 2 milestones, release khi Client approve.', N'Dashboard hiển thị đúng KPI đã chốt và lọc theo ngày, bác sĩ, dịch vụ.', 1, 1, N'CONFIRMED', '2026-05-10T09:30:00', '2026-05-10T10:30:00'),
(3, 6, 2, 4, N'Xây prototype RAG legal assistant cho kho tài liệu LegalWise, có citation nguồn.', 2000, 28, N'Ingestion PDF, semantic search, Q&A prototype, evaluation report.', 2, N'Escrow theo 2 milestones, release/refund theo dispute decision nếu có.', N'Câu trả lời phải có citation nguồn và không bịa thông tin ngoài tài liệu.', 1, 1, N'CONFIRMED', '2026-05-12T09:00:00', '2026-05-12T10:00:00');

SET IDENTITY_INSERT dbo.ProjectContracts OFF;
GO

SET IDENTITY_INSERT dbo.Projects ON;

INSERT INTO dbo.Projects (ProjectId, ContractId, ProposalId, ClientId, ExpertId, TotalAmount, Status, EscrowStatus, StartDate, EndDate, CreatedAt)
VALUES
(1, 1, 1, 1, 1, 1500, N'ACTIVE', N'PARTIALLY_RELEASED', '2026-05-09T10:30:00', NULL, '2026-05-09T10:30:00'),
(2, 2, 5, 3, 3, 2400, N'COMPLETED', N'RELEASED', '2026-05-10T11:00:00', '2026-05-20T16:30:00', '2026-05-10T11:00:00'),
(3, 3, 6, 2, 4, 2000, N'DISPUTED', N'FROZEN', '2026-05-12T10:30:00', NULL, '2026-05-12T10:30:00');

SET IDENTITY_INSERT dbo.Projects OFF;
GO

SET IDENTITY_INSERT dbo.Milestones ON;

INSERT INTO dbo.Milestones (MilestoneId, ProjectId, Title, Description, Amount, OrderIndex, DueDate, RevisionLimit, RevisionUsed, PaymentStatus, Status)
VALUES
(1, 1, N'Khảo sát và thiết kế chatbot', N'Phân tích FAQ, thiết kế luồng hội thoại và intent chính.', 500, 1, '2026-05-19T23:59:00', 2, 0, N'RELEASED', N'APPROVED'),
(2, 1, N'Triển khai prototype và bàn giao', N'Xây API, tích hợp demo website, test và bàn giao.', 1000, 2, '2026-06-08T23:59:00', 2, 1, N'ESCROW_LOCKED', N'SUBMITTED'),
(3, 2, N'Làm sạch dữ liệu và data model', N'Chuẩn hóa Excel, xây model dữ liệu.', 900, 1, '2026-05-17T23:59:00', 1, 0, N'RELEASED', N'APPROVED'),
(4, 2, N'Tạo dashboard và training', N'Xây dashboard Power BI và hướng dẫn sử dụng.', 1500, 2, '2026-05-25T23:59:00', 1, 0, N'RELEASED', N'APPROVED'),
(5, 3, N'Ingestion và semantic search', N'Upload PDF, chunking, embedding và search.', 800, 1, '2026-05-24T23:59:00', 2, 0, N'RELEASED', N'APPROVED'),
(6, 3, N'Legal Q&A prototype', N'Xây giao diện hỏi đáp, citation và report đánh giá.', 1200, 2, '2026-06-09T23:59:00', 2, 2, N'FROZEN', N'DISPUTED');

SET IDENTITY_INSERT dbo.Milestones OFF;
GO

SET IDENTITY_INSERT dbo.Deliverables ON;

INSERT INTO dbo.Deliverables (DeliverableId, MilestoneId, ExpertId, FileUrl, DemoUrl, Description, Notes, VersionNumber, Status, SubmittedAt)
VALUES
(1, 1, 1, N'https://files.aitasker.vn/project1/m1-design.pdf', NULL, N'Tài liệu thiết kế chatbot, intent list và prompt base.', N'Đã bao gồm test questions ban đầu.', 1, N'APPROVED', '2026-05-17T17:30:00'),
(2, 2, 1, N'https://files.aitasker.vn/project1/m2-chatbot-v1.zip', N'https://demo.aitasker.vn/greenmart-chatbot-v1', N'Prototype chatbot v1 tích hợp FAQ và fallback.', N'Client đã yêu cầu chỉnh sửa câu trả lời đổi trả.', 1, N'REVISION_REQUESTED', '2026-05-26T15:20:00'),
(3, 2, 1, N'https://files.aitasker.vn/project1/m2-chatbot-v2.zip', N'https://demo.aitasker.vn/greenmart-chatbot-v2', N'Prototype chatbot v2 đã chỉnh sửa chính sách đổi trả.', N'Đang chờ Client review.', 2, N'SUBMITTED', '2026-05-27T09:10:00'),
(4, 3, 3, N'https://files.aitasker.vn/project2/m1-data-model.pbix', NULL, N'Data model và dataset sạch cho dashboard.', NULL, 1, N'APPROVED', '2026-05-16T18:00:00'),
(5, 4, 3, N'https://files.aitasker.vn/project2/m2-dashboard.pbix', N'https://demo.aitasker.vn/healthplus-dashboard', N'Dashboard Power BI hoàn chỉnh và tài liệu hướng dẫn.', N'Training đã hoàn tất.', 1, N'APPROVED', '2026-05-20T15:45:00'),
(6, 5, 4, N'https://files.aitasker.vn/project3/m1-ingestion.zip', NULL, N'Pipeline ingest PDF và semantic search demo.', NULL, 1, N'APPROVED', '2026-05-23T16:00:00'),
(7, 6, 4, N'https://files.aitasker.vn/project3/m2-rag-v1.zip', N'https://demo.aitasker.vn/legal-rag-v1', N'Prototype Q&A có citation nhưng một số câu trả lời thiếu nguồn rõ ràng.', N'Client mở dispute do output chưa đạt acceptance criteria.', 1, N'DISPUTED', '2026-05-26T10:30:00');

SET IDENTITY_INSERT dbo.Deliverables OFF;
GO

SET IDENTITY_INSERT dbo.Escrows ON;

INSERT INTO dbo.Escrows (EscrowId, ProjectId, MilestoneId, ClientId, ExpertId, Amount, Status, CreatedAt, UpdatedAt)
VALUES
(1, 1, 1, 1, 1, 500, N'RELEASED', '2026-05-09T10:40:00', '2026-05-18T09:00:00'),
(2, 1, 2, 1, 1, 1000, N'LOCKED', '2026-05-09T10:40:00', NULL),
(3, 2, 3, 3, 3, 900, N'RELEASED', '2026-05-10T11:10:00', '2026-05-17T09:00:00'),
(4, 2, 4, 3, 3, 1500, N'RELEASED', '2026-05-10T11:10:00', '2026-05-20T16:30:00'),
(5, 3, 5, 2, 4, 800, N'RELEASED', '2026-05-12T10:40:00', '2026-05-24T09:00:00'),
(6, 3, 6, 2, 4, 1200, N'FROZEN', '2026-05-12T10:40:00', '2026-05-26T11:20:00');

SET IDENTITY_INSERT dbo.Escrows OFF;
GO

SET IDENTITY_INSERT dbo.PaymentTransactions ON;

INSERT INTO dbo.PaymentTransactions (TransactionId, ProjectId, MilestoneId, UserId, Type, Amount, Status, CreatedAt)
VALUES
(1, 1, NULL, 2, N'ESCROW_LOCK', 1500, N'SUCCESS', '2026-05-09T10:40:00'),
(2, 1, 1, 5, N'ESCROW_RELEASE', 500, N'SUCCESS', '2026-05-18T09:00:00'),
(3, 2, NULL, 4, N'ESCROW_LOCK', 2400, N'SUCCESS', '2026-05-10T11:10:00'),
(4, 2, 3, 7, N'ESCROW_RELEASE', 900, N'SUCCESS', '2026-05-17T09:00:00'),
(5, 2, 4, 7, N'ESCROW_RELEASE', 1500, N'SUCCESS', '2026-05-20T16:30:00'),
(6, 3, NULL, 3, N'ESCROW_LOCK', 2000, N'SUCCESS', '2026-05-12T10:40:00'),
(7, 3, 5, 8, N'ESCROW_RELEASE', 800, N'SUCCESS', '2026-05-24T09:00:00');

SET IDENTITY_INSERT dbo.PaymentTransactions OFF;
GO

SET IDENTITY_INSERT dbo.Messages ON;

INSERT INTO dbo.Messages (MessageId, ProjectId, JobId, ProposalId, SenderId, MessageText, SentAt)
VALUES
(1, NULL, 1, 1, 2, N'Bạn có thể demo chatbot bằng dữ liệu FAQ hiện có trước không?', '2026-05-08T12:30:00'),
(2, NULL, 1, 1, 5, N'Có, tôi sẽ dùng FAQ hiện có để làm prototype và gửi test cases cho bạn duyệt.', '2026-05-08T12:45:00'),
(3, 1, NULL, 1, 2, N'Milestone 1 ổn, vui lòng chú ý phần chính sách đổi trả trong milestone 2.', '2026-05-18T09:05:00'),
(4, 1, NULL, 1, 5, N'Tôi đã cập nhật prompt cho chính sách đổi trả và gửi bản v2.', '2026-05-27T09:15:00'),
(5, 2, NULL, 5, 4, N'Dashboard hoạt động tốt, team phòng khám đã xem được KPI theo bác sĩ.', '2026-05-20T16:00:00'),
(6, 3, NULL, 6, 3, N'Một số câu trả lời không có citation rõ ràng, tôi cần mở dispute cho milestone 2.', '2026-05-26T11:00:00'),
(7, 3, NULL, 6, 8, N'Tôi sẽ gửi thêm log retrieval và giải thích cách citation hoạt động.', '2026-05-26T11:15:00');

SET IDENTITY_INSERT dbo.Messages OFF;
GO

SET IDENTITY_INSERT dbo.Disputes ON;

INSERT INTO dbo.Disputes (DisputeId, ProjectId, MilestoneId, OpenedBy, RespondentId, Reason, DisputedAmount, Status, ResolutionType, AdminDecision, CreatedAt, ResolvedAt)
VALUES
(1, 3, 6, 3, 8, N'Milestone 2 chưa đạt acceptance criteria vì một số câu trả lời không có citation nguồn rõ ràng và có dấu hiệu suy diễn ngoài tài liệu.', 1200, N'UNDER_REVIEW', NULL, NULL, '2026-05-26T11:20:00', NULL);

SET IDENTITY_INSERT dbo.Disputes OFF;
GO

SET IDENTITY_INSERT dbo.DisputeEvidences ON;

INSERT INTO dbo.DisputeEvidences (EvidenceId, DisputeId, UploadedBy, EvidenceText, FileUrl, CreatedAt)
VALUES
(1, 1, 3, N'Client gửi file test cases có 6/20 câu trả lời thiếu citation rõ ràng.', N'https://files.aitasker.vn/disputes/1/client-test-cases.xlsx', '2026-05-26T11:25:00'),
(2, 1, 8, N'Expert gửi retrieval logs chứng minh hệ thống có lấy context nhưng citation chưa hiển thị đủ trong UI.', N'https://files.aitasker.vn/disputes/1/expert-retrieval-logs.zip', '2026-05-26T13:00:00');

SET IDENTITY_INSERT dbo.DisputeEvidences OFF;
GO

SET IDENTITY_INSERT dbo.Reviews ON;

INSERT INTO dbo.Reviews (ReviewId, ProjectId, ReviewerId, RevieweeId, Rating, Comment, Status, CreatedAt)
VALUES
(1, 2, 4, 7, 5, N'Expert làm dashboard rất rõ ràng, đúng KPI, hướng dẫn sử dụng dễ hiểu.', N'VISIBLE', '2026-05-21T09:00:00'),
(2, 2, 7, 4, 5, N'Client cung cấp dữ liệu và phản hồi nhanh, scope rõ ràng.', N'VISIBLE', '2026-05-21T10:00:00');

SET IDENTITY_INSERT dbo.Reviews OFF;
GO

SET IDENTITY_INSERT dbo.Services ON;

INSERT INTO dbo.Services (ServiceId, ExpertId, Title, Description, AIgeneratedDescription, Tags, Price, DeliveryDays, RevisionLimit, DemoUrl, Status, RejectionReason, ReviewedBy, ReviewedAt, CreatedAt)
VALUES
(1, 1, N'Tạo chatbot AI tiếng Việt cho website SME', N'Tôi sẽ xây chatbot AI tiếng Việt cho website, tích hợp FAQ, OpenAI API và fallback an toàn.', N'AI gợi ý: Dịch vụ chatbot AI cho SME, hỗ trợ FAQ, sản phẩm, chính sách và tích hợp web.', N'chatbot,openai,vietnamese,customer-support', 900, 14, 2, N'https://demo.aitasker.vn/service-chatbot-linh', N'ACTIVE', NULL, 1, '2026-05-07T09:00:00', '2026-05-06T09:00:00'),
(2, 2, N'OCR hóa đơn và hợp đồng PDF', N'Dịch vụ OCR tài liệu scan, trích xuất trường dữ liệu chính và xuất Excel/CSV.', N'AI gợi ý: OCR pipeline cho tài liệu PDF, hóa đơn, hợp đồng, có preprocessing ảnh.', N'ocr,pdf,computer-vision,python', 750, 10, 2, N'https://demo.aitasker.vn/service-ocr-minh', N'ACTIVE', NULL, 1, '2026-05-07T10:00:00', '2026-05-06T10:00:00'),
(3, 4, N'RAG chatbot cho tài liệu nội bộ', N'Xây prototype hỏi đáp trên tài liệu nội bộ với semantic search và citation nguồn.', N'AI gợi ý: RAG assistant cho knowledge base doanh nghiệp, hỗ trợ PDF và citation.', N'rag,llm,openai,semantic-search', 1200, 21, 2, N'https://demo.aitasker.vn/service-rag-thao', N'PENDING_REVIEW', NULL, NULL, NULL, '2026-05-19T09:00:00');

SET IDENTITY_INSERT dbo.Services OFF;
GO

SET IDENTITY_INSERT dbo.Notifications ON;

INSERT INTO dbo.Notifications (NotificationId, UserId, Title, Content, Type, IsRead, CreatedAt)
VALUES
(1, 5, N'Job phù hợp mới', N'Bạn được gợi ý cho job: Xây dựng chatbot AI tiếng Việt cho website bán lẻ.', N'JOB_ALERT', 1, '2026-05-08T09:05:00'),
(2, 2, N'Proposal mới', N'Võ Hoàng Linh đã gửi proposal cho job chatbot của bạn.', N'PROPOSAL', 1, '2026-05-08T12:00:00'),
(3, 5, N'Project started', N'Project chatbot GreenMart đã bắt đầu sau khi escrow được khóa.', N'PROJECT', 1, '2026-05-09T10:45:00'),
(4, 2, N'Deliverable cần review', N'Expert đã nộp deliverable version 2 cho milestone chatbot prototype.', N'MILESTONE', 0, '2026-05-27T09:12:00'),
(5, 7, N'Payment released', N'Tiền milestone dashboard đã được release vào ví mô phỏng của bạn.', N'PAYMENT', 1, '2026-05-20T16:30:00'),
(6, 1, N'Dispute cần xử lý', N'LegalWise đã mở dispute cho project RAG legal assistant.', N'DISPUTE', 0, '2026-05-26T11:22:00'),
(7, 3, N'Dispute đang được xem xét', N'Admin đã nhận dispute của bạn và đang xem xét bằng chứng.', N'DISPUTE', 0, '2026-05-26T11:23:00'),
(8, 4, N'Yêu cầu review', N'Project dashboard đã hoàn thành. Vui lòng đánh giá Expert.', N'REVIEW', 1, '2026-05-20T16:35:00'),
(9, 1, N'Service chờ duyệt', N'Có service RAG chatbot mới đang chờ Admin review.', N'SERVICE', 0, '2026-05-19T09:05:00');

SET IDENTITY_INSERT dbo.Notifications OFF;
GO

SET IDENTITY_INSERT dbo.AuditLogs ON;

INSERT INTO dbo.AuditLogs (AuditLogId, UserId, Action, EntityName, EntityId, Description, CreatedAt)
VALUES
(1, 1, N'APPROVE_EXPERT_PROFILE', N'ExpertProfiles', 1, N'Admin approve hồ sơ Expert Võ Hoàng Linh.', '2026-05-04T09:00:00'),
(2, 1, N'APPROVE_EXPERT_PROFILE', N'ExpertProfiles', 2, N'Admin approve hồ sơ Expert Đặng Minh Phúc.', '2026-05-04T10:00:00'),
(3, 2, N'CREATE_JOB', N'JobPostings', 1, N'Client GreenMart tạo job chatbot bằng AI Job Assistant.', '2026-05-08T09:00:00'),
(4, 5, N'SUBMIT_PROPOSAL', N'Proposals', 1, N'Expert Võ Hoàng Linh gửi proposal cho job chatbot.', '2026-05-08T12:00:00'),
(5, 2, N'CONFIRM_ESCROW', N'Projects', 1, N'Client xác nhận escrow cho project chatbot.', '2026-05-09T10:40:00'),
(6, 4, N'APPROVE_MILESTONE', N'Milestones', 4, N'Client HealthPlus approve milestone dashboard.', '2026-05-20T16:30:00'),
(7, 3, N'OPEN_DISPUTE', N'Disputes', 1, N'Client LegalWise mở dispute cho milestone Legal Q&A prototype.', '2026-05-26T11:20:00'),
(8, 1, N'APPROVE_SERVICE', N'Services', 1, N'Admin approve service chatbot AI tiếng Việt.', '2026-05-07T09:00:00');

SET IDENTITY_INSERT dbo.AuditLogs OFF;
GO

/* =========================================================
   8. DEMO VIEWS
   ========================================================= */

CREATE VIEW dbo.V_AdminDashboard AS
SELECT
    (SELECT COUNT(*) FROM dbo.Users) AS TotalUsers,
    (SELECT COUNT(*) FROM dbo.Users WHERE Role = N'CLIENT') AS TotalClients,
    (SELECT COUNT(*) FROM dbo.Users WHERE Role = N'EXPERT') AS TotalExperts,
    (SELECT COUNT(*) FROM dbo.JobPostings) AS TotalJobs,
    (SELECT COUNT(*) FROM dbo.JobPostings WHERE Status = N'OPEN') AS OpenJobs,
    (SELECT COUNT(*) FROM dbo.Proposals) AS TotalProposals,
    (SELECT COUNT(*) FROM dbo.Projects) AS TotalProjects,
    (SELECT COUNT(*) FROM dbo.Projects WHERE Status = N'ACTIVE') AS ActiveProjects,
    (SELECT COUNT(*) FROM dbo.Projects WHERE Status = N'COMPLETED') AS CompletedProjects,
    (SELECT COUNT(*) FROM dbo.Disputes WHERE Status <> N'RESOLVED') AS OpenDisputes,
    (SELECT ISNULL(SUM(Amount), 0) FROM dbo.PaymentTransactions WHERE Type = N'ESCROW_RELEASE' AND Status = N'SUCCESS') AS SimulatedReleasedAmount,
    (SELECT ISNULL(SUM(Amount), 0) FROM dbo.Escrows WHERE Status IN (N'LOCKED', N'FROZEN')) AS EscrowLockedAmount;
GO

CREATE VIEW dbo.V_ExpertPublicProfile AS
SELECT
    ep.ExpertId,
    u.FullName,
    ep.Bio,
    ep.PortfolioUrl,
    ep.ExperienceYears,
    ep.HourlyRate,
    ep.RatingAverage,
    ep.ReviewCount,
    ep.CompletedProjects,
    ep.ProfileScore,
    ep.Level,
    ep.IsVerified,
    STRING_AGG(s.SkillName, N', ') AS Skills
FROM dbo.ExpertProfiles ep
JOIN dbo.Users u ON ep.UserId = u.UserId
LEFT JOIN dbo.ExpertSkills es ON ep.ExpertId = es.ExpertId
LEFT JOIN dbo.Skills s ON es.SkillId = s.SkillId
WHERE u.Status = N'ACTIVE' AND ep.ProfileReviewStatus = N'APPROVED'
GROUP BY
    ep.ExpertId,
    u.FullName,
    ep.Bio,
    ep.PortfolioUrl,
    ep.ExperienceYears,
    ep.HourlyRate,
    ep.RatingAverage,
    ep.ReviewCount,
    ep.CompletedProjects,
    ep.ProfileScore,
    ep.Level,
    ep.IsVerified;
GO

CREATE VIEW dbo.V_OpenJobsWithSkills AS
SELECT
    j.JobId,
    cp.CompanyName,
    j.Title,
    j.BudgetMin,
    j.BudgetMax,
    j.Deadline,
    j.ProjectType,
    j.Complexity,
    j.Status,
    j.IsAIAssisted,
    STRING_AGG(s.SkillName, N', ') AS RequiredSkills
FROM dbo.JobPostings j
JOIN dbo.ClientProfiles cp ON j.ClientId = cp.ClientId
LEFT JOIN dbo.JobSkills js ON j.JobId = js.JobId
LEFT JOIN dbo.Skills s ON js.SkillId = s.SkillId
WHERE j.Status = N'OPEN'
GROUP BY
    j.JobId,
    cp.CompanyName,
    j.Title,
    j.BudgetMin,
    j.BudgetMax,
    j.Deadline,
    j.ProjectType,
    j.Complexity,
    j.Status,
    j.IsAIAssisted;
GO

/* =========================================================
   9. QUICK TEST QUERIES
   ========================================================= */

SELECT * FROM dbo.V_AdminDashboard;
SELECT * FROM dbo.V_OpenJobsWithSkills ORDER BY Deadline;
SELECT * FROM dbo.V_ExpertPublicProfile ORDER BY RatingAverage DESC, ProfileScore DESC;

SELECT
    j.Title AS JobTitle,
    u.FullName AS RecommendedExpert,
    r.MatchScore,
    r.Reason
FROM dbo.AIRecommendations r
JOIN dbo.JobPostings j ON r.JobId = j.JobId
JOIN dbo.ExpertProfiles ep ON r.ExpertId = ep.ExpertId
JOIN dbo.Users u ON ep.UserId = u.UserId
ORDER BY j.JobId, r.MatchScore DESC;

SELECT
    p.ProjectId,
    c.CompanyName AS ClientCompany,
    expertUser.FullName AS ExpertName,
    p.Status AS ProjectStatus,
    p.EscrowStatus,
    m.Title AS MilestoneTitle,
    m.Status AS MilestoneStatus,
    m.PaymentStatus,
    m.Amount
FROM dbo.Projects p
JOIN dbo.ClientProfiles c ON p.ClientId = c.ClientId
JOIN dbo.ExpertProfiles ep ON p.ExpertId = ep.ExpertId
JOIN dbo.Users expertUser ON ep.UserId = expertUser.UserId
JOIN dbo.Milestones m ON p.ProjectId = m.ProjectId
ORDER BY p.ProjectId, m.OrderIndex;
GO
