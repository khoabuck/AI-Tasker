using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AITasker.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddProposalVersionsAndRemoveProposalCounter : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_Proposals_Price_Timeline",
                table: "Proposals");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Proposals_Status",
                table: "Proposals");
            
            migrationBuilder.Sql(@"
                UPDATE [Proposals]
                SET [Status] = 'SUBMITTED'
                WHERE [Status] = 'COUNTER_OFFERED';
            ");

            migrationBuilder.DropColumn(
                name: "CounterMessage",
                table: "Proposals");

            migrationBuilder.DropColumn(
                name: "CounterPrice",
                table: "Proposals");

            migrationBuilder.DropColumn(
                name: "CounterTimelineDays",
                table: "Proposals");

            migrationBuilder.CreateTable(
                name: "Conversations",
                columns: table => new
                {
                    ConversationId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ConversationType = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    CreatedByUserId = table.Column<int>(type: "int", nullable: false),
                    ClientUserId = table.Column<int>(type: "int", nullable: true),
                    ExpertUserId = table.Column<int>(type: "int", nullable: true),
                    RelatedJobId = table.Column<int>(type: "int", nullable: true),
                    RelatedProposalId = table.Column<int>(type: "int", nullable: true),
                    RelatedContractId = table.Column<int>(type: "int", nullable: true),
                    RelatedProjectId = table.Column<int>(type: "int", nullable: true),
                    RelatedMilestoneId = table.Column<int>(type: "int", nullable: true),
                    RelatedDisputeId = table.Column<int>(type: "int", nullable: true),
                    Status = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    LastMessageAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Conversations", x => x.ConversationId);
                    table.CheckConstraint("CK_Conversations_Status", "[Status] IN ('ACTIVE','ARCHIVED','CLOSED')");
                    table.CheckConstraint("CK_Conversations_Type", "[ConversationType] IN ('DIRECT_CONTACT','JOB_INQUIRY','PROPOSAL_NEGOTIATION','CONTRACT_NEGOTIATION','PROJECT_DISCUSSION','MILESTONE_DISCUSSION','DISPUTE_DISCUSSION','SUPPORT')");
                    table.ForeignKey(
                        name: "FK_Conversations_Disputes_RelatedDisputeId",
                        column: x => x.RelatedDisputeId,
                        principalTable: "Disputes",
                        principalColumn: "DisputeId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Conversations_JobPostings_RelatedJobId",
                        column: x => x.RelatedJobId,
                        principalTable: "JobPostings",
                        principalColumn: "JobPostingId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Conversations_Milestones_RelatedMilestoneId",
                        column: x => x.RelatedMilestoneId,
                        principalTable: "Milestones",
                        principalColumn: "MilestoneId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Conversations_ProjectContracts_RelatedContractId",
                        column: x => x.RelatedContractId,
                        principalTable: "ProjectContracts",
                        principalColumn: "ContractId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Conversations_Projects_RelatedProjectId",
                        column: x => x.RelatedProjectId,
                        principalTable: "Projects",
                        principalColumn: "ProjectId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Conversations_Proposals_RelatedProposalId",
                        column: x => x.RelatedProposalId,
                        principalTable: "Proposals",
                        principalColumn: "ProposalId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Conversations_Users_ClientUserId",
                        column: x => x.ClientUserId,
                        principalTable: "Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Conversations_Users_CreatedByUserId",
                        column: x => x.CreatedByUserId,
                        principalTable: "Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Conversations_Users_ExpertUserId",
                        column: x => x.ExpertUserId,
                        principalTable: "Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ProposalVersions",
                columns: table => new
                {
                    ProposalVersionId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ProposalId = table.Column<int>(type: "int", nullable: false),
                    VersionNumber = table.Column<int>(type: "int", nullable: false),
                    CoverLetter = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ProposedPrice = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    ProposedTimelineDays = table.Column<int>(type: "int", nullable: false),
                    ExpectedOutputs = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    WorkingApproach = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    PreliminaryMilestonePlan = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ResubmitNote = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    CreatedByUserId = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProposalVersions", x => x.ProposalVersionId);
                    table.CheckConstraint("CK_ProposalVersions_Price_Timeline", "[ProposedPrice] > 0 AND [ProposedTimelineDays] > 0");
                    table.CheckConstraint("CK_ProposalVersions_VersionNumber", "[VersionNumber] > 0");
                    table.ForeignKey(
                        name: "FK_ProposalVersions_Proposals_ProposalId",
                        column: x => x.ProposalId,
                        principalTable: "Proposals",
                        principalColumn: "ProposalId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ProposalVersions_Users_CreatedByUserId",
                        column: x => x.CreatedByUserId,
                        principalTable: "Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ConversationMessages",
                columns: table => new
                {
                    ConversationMessageId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ConversationId = table.Column<int>(type: "int", nullable: false),
                    SenderUserId = table.Column<int>(type: "int", nullable: false),
                    Content = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: false),
                    MessageType = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    AttachmentUrl = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ConversationMessages", x => x.ConversationMessageId);
                    table.CheckConstraint("CK_ConversationMessages_MessageType", "[MessageType] IN ('TEXT','SYSTEM','FILE','PROPOSAL_VERSION','CONTRACT_DRAFT','MILESTONE_DRAFT','DELIVERABLE','DISPUTE_EVIDENCE')");
                    table.ForeignKey(
                        name: "FK_ConversationMessages_Conversations_ConversationId",
                        column: x => x.ConversationId,
                        principalTable: "Conversations",
                        principalColumn: "ConversationId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ConversationMessages_Users_SenderUserId",
                        column: x => x.SenderUserId,
                        principalTable: "Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.AddCheckConstraint(
                name: "CK_Proposals_Price_Timeline",
                table: "Proposals",
                sql: "[ProposedPrice] > 0 AND [ProposedTimelineDays] > 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Proposals_Status",
                table: "Proposals",
                sql: "[Status] IN ('SUBMITTED','ACCEPTED','REJECTED','WITHDRAWN','NOT_SELECTED')");

            migrationBuilder.CreateIndex(
                name: "IX_ConversationMessages_ConversationId",
                table: "ConversationMessages",
                column: "ConversationId");

            migrationBuilder.CreateIndex(
                name: "IX_ConversationMessages_ConversationId_CreatedAt",
                table: "ConversationMessages",
                columns: new[] { "ConversationId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_ConversationMessages_SenderUserId",
                table: "ConversationMessages",
                column: "SenderUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Conversations_ClientUserId",
                table: "Conversations",
                column: "ClientUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Conversations_ConversationType",
                table: "Conversations",
                column: "ConversationType");

            migrationBuilder.CreateIndex(
                name: "IX_Conversations_ConversationType_ClientUserId_ExpertUserId_RelatedJobId_RelatedProposalId_RelatedContractId_RelatedProjectId_R~",
                table: "Conversations",
                columns: new[] { "ConversationType", "ClientUserId", "ExpertUserId", "RelatedJobId", "RelatedProposalId", "RelatedContractId", "RelatedProjectId", "RelatedMilestoneId", "RelatedDisputeId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_Conversations_CreatedByUserId",
                table: "Conversations",
                column: "CreatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Conversations_ExpertUserId",
                table: "Conversations",
                column: "ExpertUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Conversations_RelatedContractId",
                table: "Conversations",
                column: "RelatedContractId");

            migrationBuilder.CreateIndex(
                name: "IX_Conversations_RelatedDisputeId",
                table: "Conversations",
                column: "RelatedDisputeId");

            migrationBuilder.CreateIndex(
                name: "IX_Conversations_RelatedJobId",
                table: "Conversations",
                column: "RelatedJobId");

            migrationBuilder.CreateIndex(
                name: "IX_Conversations_RelatedMilestoneId",
                table: "Conversations",
                column: "RelatedMilestoneId");

            migrationBuilder.CreateIndex(
                name: "IX_Conversations_RelatedProjectId",
                table: "Conversations",
                column: "RelatedProjectId");

            migrationBuilder.CreateIndex(
                name: "IX_Conversations_RelatedProposalId",
                table: "Conversations",
                column: "RelatedProposalId");

            migrationBuilder.CreateIndex(
                name: "IX_Conversations_Status",
                table: "Conversations",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_ProposalVersions_CreatedByUserId",
                table: "ProposalVersions",
                column: "CreatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_ProposalVersions_ProposalId",
                table: "ProposalVersions",
                column: "ProposalId");

            migrationBuilder.CreateIndex(
                name: "IX_ProposalVersions_ProposalId_VersionNumber",
                table: "ProposalVersions",
                columns: new[] { "ProposalId", "VersionNumber" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ConversationMessages");

            migrationBuilder.DropTable(
                name: "ProposalVersions");

            migrationBuilder.DropTable(
                name: "Conversations");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Proposals_Price_Timeline",
                table: "Proposals");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Proposals_Status",
                table: "Proposals");

            migrationBuilder.AddColumn<string>(
                name: "CounterMessage",
                table: "Proposals",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "CounterPrice",
                table: "Proposals",
                type: "decimal(18,2)",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "CounterTimelineDays",
                table: "Proposals",
                type: "int",
                nullable: true);

            migrationBuilder.AddCheckConstraint(
                name: "CK_Proposals_Price_Timeline",
                table: "Proposals",
                sql: "[ProposedPrice] > 0 AND [ProposedTimelineDays] > 0 AND ([CounterPrice] IS NULL OR [CounterPrice] > 0) AND ([CounterTimelineDays] IS NULL OR [CounterTimelineDays] > 0)");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Proposals_Status",
                table: "Proposals",
                sql: "[Status] IN ('SUBMITTED','COUNTER_OFFERED','ACCEPTED','REJECTED','WITHDRAWN','NOT_SELECTED')");
        }
    }
}
