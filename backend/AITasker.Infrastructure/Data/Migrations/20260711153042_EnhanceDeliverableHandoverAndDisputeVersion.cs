using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AITasker.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class EnhanceDeliverableHandoverAndDisputeVersion : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "DeliverableId",
                table: "Disputes",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DemoInstructions",
                table: "Deliverables",
                type: "nvarchar(2000)",
                maxLength: 2000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DemoValidationStatus",
                table: "Deliverables",
                type: "nvarchar(30)",
                maxLength: 30,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TestSummary",
                table: "Deliverables",
                type: "nvarchar(2000)",
                maxLength: 2000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TestValidationStatus",
                table: "Deliverables",
                type: "nvarchar(30)",
                maxLength: 30,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "DeliverableArtifacts",
                columns: table => new
                {
                    DeliverableArtifactId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    DeliverableId = table.Column<int>(type: "int", nullable: false),
                    ArtifactType = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Label = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Url = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    Provider = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    AccessLevel = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    Version = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    CommitHash = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    Checksum = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    ValidationStatus = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    ValidatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DeliverableArtifacts", x => x.DeliverableArtifactId);
                    table.CheckConstraint("CK_DeliverableArtifacts_AccessLevel", "[AccessLevel] IN ('PUBLIC','RESTRICTED')");
                    table.CheckConstraint("CK_DeliverableArtifacts_ArtifactType", "[ArtifactType] IN ('FILE','FOLDER','ARCHIVE','SOURCE_REPOSITORY','DOCUMENTATION','DESIGN','DATASET','MODEL','BUILD','OTHER')");
                    table.CheckConstraint("CK_DeliverableArtifacts_ValidationStatus", "[ValidationStatus] IN ('VALID','AUTH_REQUIRED')");
                    table.ForeignKey(
                        name: "FK_DeliverableArtifacts_Deliverables_DeliverableId",
                        column: x => x.DeliverableId,
                        principalTable: "Deliverables",
                        principalColumn: "DeliverableId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Disputes_DeliverableId",
                table: "Disputes",
                column: "DeliverableId");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Deliverables_DemoValidationStatus",
                table: "Deliverables",
                sql: "[DemoValidationStatus] IS NULL OR [DemoValidationStatus] IN ('VALID','AUTH_REQUIRED')");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Deliverables_TestValidationStatus",
                table: "Deliverables",
                sql: "[TestValidationStatus] IS NULL OR [TestValidationStatus] IN ('VALID','AUTH_REQUIRED')");

            migrationBuilder.CreateIndex(
                name: "IX_DeliverableArtifacts_DeliverableId",
                table: "DeliverableArtifacts",
                column: "DeliverableId");

            migrationBuilder.CreateIndex(
                name: "IX_DeliverableArtifacts_DeliverableId_Url",
                table: "DeliverableArtifacts",
                columns: new[] { "DeliverableId", "Url" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Disputes_Deliverables_DeliverableId",
                table: "Disputes",
                column: "DeliverableId",
                principalTable: "Deliverables",
                principalColumn: "DeliverableId",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Disputes_Deliverables_DeliverableId",
                table: "Disputes");

            migrationBuilder.DropTable(
                name: "DeliverableArtifacts");

            migrationBuilder.DropIndex(
                name: "IX_Disputes_DeliverableId",
                table: "Disputes");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Deliverables_DemoValidationStatus",
                table: "Deliverables");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Deliverables_TestValidationStatus",
                table: "Deliverables");

            migrationBuilder.DropColumn(
                name: "DeliverableId",
                table: "Disputes");

            migrationBuilder.DropColumn(
                name: "DemoInstructions",
                table: "Deliverables");

            migrationBuilder.DropColumn(
                name: "DemoValidationStatus",
                table: "Deliverables");

            migrationBuilder.DropColumn(
                name: "TestSummary",
                table: "Deliverables");

            migrationBuilder.DropColumn(
                name: "TestValidationStatus",
                table: "Deliverables");
        }
    }
}
