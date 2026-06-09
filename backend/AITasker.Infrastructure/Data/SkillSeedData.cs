using AITasker.Domain.Entities;

namespace AITasker.Infrastructure.Data;

public static class SkillSeedData
{
    public static readonly DateTime SeededAt = new(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc);

    public static readonly Skill[] Items =
    {
        new() { SkillId = 1,  SkillName = "Chatbot",            Category = "AI Application", Description = "Thiết kế và triển khai chatbot cho website, fanpage hoặc hệ thống nội bộ.", IsActive = true, CreatedAt = SeededAt },
        new() { SkillId = 2,  SkillName = "NLP",                Category = "AI Core",        Description = "Xử lý ngôn ngữ tự nhiên, phân loại văn bản, trích xuất ý định.",          IsActive = true, CreatedAt = SeededAt },
        new() { SkillId = 3,  SkillName = "OpenAI API",         Category = "LLM",            Description = "Tích hợp API LLM như OpenAI vào sản phẩm.",                               IsActive = true, CreatedAt = SeededAt },
        new() { SkillId = 4,  SkillName = "Python",             Category = "Programming",    Description = "Lập trình Python cho AI, automation và data pipeline.",                   IsActive = true, CreatedAt = SeededAt },
        new() { SkillId = 5,  SkillName = "Computer Vision",    Category = "AI Core",        Description = "Xử lý ảnh, nhận diện đối tượng, phân loại ảnh.",                          IsActive = true, CreatedAt = SeededAt },
        new() { SkillId = 6,  SkillName = "OCR",                Category = "Document AI",    Description = "Trích xuất chữ từ ảnh, PDF, hóa đơn và tài liệu scan.",                   IsActive = true, CreatedAt = SeededAt },
        new() { SkillId = 7,  SkillName = "Data Analytics",     Category = "Data",           Description = "Phân tích dữ liệu, dashboard, metrics và insight.",                       IsActive = true, CreatedAt = SeededAt },
        new() { SkillId = 8,  SkillName = "Automation",         Category = "Automation",     Description = "Tự động hóa quy trình nghiệp vụ và báo cáo.",                             IsActive = true, CreatedAt = SeededAt },
        new() { SkillId = 9,  SkillName = "Prompt Engineering", Category = "LLM",            Description = "Thiết kế prompt, workflow LLM và đánh giá output.",                       IsActive = true, CreatedAt = SeededAt },
        new() { SkillId = 10, SkillName = "RAG",                Category = "LLM",            Description = "Retrieval-Augmented Generation cho tài liệu nội bộ.",                     IsActive = true, CreatedAt = SeededAt },
        new() { SkillId = 11, SkillName = "SQL",                Category = "Data",           Description = "Thiết kế truy vấn, xử lý dữ liệu và báo cáo từ database.",                IsActive = true, CreatedAt = SeededAt },
        new() { SkillId = 12, SkillName = "Power BI",           Category = "Data",           Description = "Tạo dashboard và báo cáo trực quan.",                                     IsActive = true, CreatedAt = SeededAt },
        new() { SkillId = 13, SkillName = "ASP.NET Core",       Category = "Backend",        Description = "Xây dựng RESTful API bằng ASP.NET Core.",                                 IsActive = true, CreatedAt = SeededAt },
        new() { SkillId = 14, SkillName = "SignalR",            Category = "Backend",        Description = "Xây dựng realtime chat và notification.",                                 IsActive = true, CreatedAt = SeededAt },
    };
}
