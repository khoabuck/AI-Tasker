using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace AITasker.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddSkillsAndExpertSkills : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "CompletedProjects",
                table: "ExpertProfiles",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<decimal>(
                name: "RatingAverage",
                table: "ExpertProfiles",
                type: "decimal(3,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<int>(
                name: "ReviewCount",
                table: "ExpertProfiles",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateTable(
                name: "Skills",
                columns: table => new
                {
                    SkillId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    SkillName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    Category = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Skills", x => x.SkillId);
                });

            migrationBuilder.CreateTable(
                name: "ExpertSkills",
                columns: table => new
                {
                    ExpertSkillId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ExpertProfileId = table.Column<int>(type: "int", nullable: false),
                    SkillId = table.Column<int>(type: "int", nullable: false),
                    SkillLevel = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    YearsOfExperience = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ExpertSkills", x => x.ExpertSkillId);
                    table.ForeignKey(
                        name: "FK_ExpertSkills_ExpertProfiles_ExpertProfileId",
                        column: x => x.ExpertProfileId,
                        principalTable: "ExpertProfiles",
                        principalColumn: "ExpertProfileId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ExpertSkills_Skills_SkillId",
                        column: x => x.SkillId,
                        principalTable: "Skills",
                        principalColumn: "SkillId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.InsertData(
                table: "Skills",
                columns: new[] { "SkillId", "Category", "CreatedAt", "Description", "IsActive", "SkillName" },
                values: new object[,]
                {
                    { 1, "AI Application", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Thiết kế và triển khai chatbot cho website, fanpage hoặc hệ thống nội bộ.", true, "Chatbot" },
                    { 2, "AI Core", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Xử lý ngôn ngữ tự nhiên, phân loại văn bản, trích xuất ý định.", true, "NLP" },
                    { 3, "LLM", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Tích hợp API LLM như OpenAI vào sản phẩm.", true, "OpenAI API" },
                    { 4, "Programming", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Lập trình Python cho AI, automation và data pipeline.", true, "Python" },
                    { 5, "AI Core", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Xử lý ảnh, nhận diện đối tượng, phân loại ảnh.", true, "Computer Vision" },
                    { 6, "Document AI", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Trích xuất chữ từ ảnh, PDF, hóa đơn và tài liệu scan.", true, "OCR" },
                    { 7, "Data", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Phân tích dữ liệu, dashboard, metrics và insight.", true, "Data Analytics" },
                    { 8, "Automation", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Tự động hóa quy trình nghiệp vụ và báo cáo.", true, "Automation" },
                    { 9, "LLM", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Thiết kế prompt, workflow LLM và đánh giá output.", true, "Prompt Engineering" },
                    { 10, "LLM", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Retrieval-Augmented Generation cho tài liệu nội bộ.", true, "RAG" },
                    { 11, "Data", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Thiết kế truy vấn, xử lý dữ liệu và báo cáo từ database.", true, "SQL" },
                    { 12, "Data", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Tạo dashboard và báo cáo trực quan.", true, "Power BI" },
                    { 13, "Backend", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Xây dựng RESTful API bằng ASP.NET Core.", true, "ASP.NET Core" },
                    { 14, "Backend", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Xây dựng realtime chat và notification.", true, "SignalR" }
                });

            migrationBuilder.CreateIndex(
                name: "IX_ExpertSkills_ExpertProfileId_SkillId",
                table: "ExpertSkills",
                columns: new[] { "ExpertProfileId", "SkillId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ExpertSkills_SkillId",
                table: "ExpertSkills",
                column: "SkillId");

            migrationBuilder.CreateIndex(
                name: "IX_Skills_SkillName",
                table: "Skills",
                column: "SkillName",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ExpertSkills");

            migrationBuilder.DropTable(
                name: "Skills");

            migrationBuilder.DropColumn(
                name: "CompletedProjects",
                table: "ExpertProfiles");

            migrationBuilder.DropColumn(
                name: "RatingAverage",
                table: "ExpertProfiles");

            migrationBuilder.DropColumn(
                name: "ReviewCount",
                table: "ExpertProfiles");
        }
    }
}
