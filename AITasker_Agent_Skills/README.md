# AITasker Agent Skill Pack

Bộ file này dùng để cho AI coding agent đọc trước khi code dự án **AITasker — AI Marketplace Platform for AI Automation Services**.

## Cách dùng

1. Copy toàn bộ folder này vào root repository.
2. Giữ `AGENTS.md` ở root repo để Agent đọc đầu tiên.
3. Giữ folder `docs/` và `database/` theo đúng cấu trúc.
4. Khi prompt Agent, luôn yêu cầu Agent đọc theo thứ tự:
   1. `AGENTS.md`
   2. `docs/00_PROJECT_CONTEXT.md`
   3. `docs/01_BUSINESS_RULES.md`
   4. `docs/03_API_CONTRACT.md`
   5. `docs/07_ENUM_STATUS_RULES.md`
   6. File guide liên quan tới task hiện tại.

## Source of Truth

- `database/AITasker_Final_UPDATED.sql` for schema, constraints, and enum values.
- `docs/07_ENUM_STATUS_RULES.md` for backend/frontend constants.
- `docs/AITasker_SWP391_Report.md` for business scope and main flows.
- `docs/03_API_CONTRACT.md` for API request/response shapes.

## Cảnh báo cho Agent

Không được tự ý đổi nghiệp vụ. Nếu có mâu thuẫn giữa code và docs, ưu tiên docs/report/sql mới nhất.
