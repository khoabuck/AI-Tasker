# SWP392 — Kế Hoạch Dự Án (3 Topics)

> **Bối cảnh team:** 5 thành viên — **3 BE** (1 BE Intern + 2 BE mới) & **2 FE** (2 BE mới phụ trách ReactJS) | 9 tuần | .NET C# + ReactJS + SQL Server

---

## TOPIC 3 — Hệ Thống Quản Lý Giải Đua Ngựa

### 1. Scope Dự Kiến

> [!IMPORTANT]
> Tập trung vào các luồng nghiệp vụ cốt lõi, bỏ qua tính năng phụ phức tạp để phù hợp với trình độ team.

#### Actors & Features được chọn thực hiện

| Actor | Chức năng thực hiện |
|---|---|
| **Admin** | Quản lý tài khoản & phân quyền; Quản lý giải đấu (tạo/sửa/xóa tournament); Lập lịch cuộc đua; Duyệt đăng ký tham gia; Quản lý danh sách ngựa & jockey; Phân công trọng tài; Công bố kết quả |
| **Horse Owner** | Đăng ký tài khoản; Đăng ký ngựa vào giải; Quản lý thông tin ngựa; Mời/chọn jockey; Xác nhận ngựa tham gia cuộc đua; Xem lịch & kết quả |
| **Jockey** | Đăng ký tài khoản; Nhận & xác nhận/từ chối lời mời; Xem lịch thi đấu; Xem kết quả & thành tích cá nhân |
| **Race Referee** | Kiểm tra thông tin ngựa trước đua; Ghi nhận vi phạm; Xác nhận kết quả cuộc đua |
| **Spectator** | Xem thông tin giải & lịch đua; Xem kết quả & bảng xếp hạng; **Dự đoán kết quả** (MVP) |

#### Chức năng **KHÔNG** thực hiện (để tiết kiệm thời gian)
- Thanh toán tiền thưởng online
- Streaming/theo dõi đua trực tiếp real-time
- Thống kê phức tạp / AI prediction

---

### 2. Kỹ Thuật & Công Nghệ

| Thành phần | Công nghệ |
|---|---|
| **Backend** | ASP.NET Core Web API (C#), REST API, JWT Authentication |
| **Frontend** | ReactJS + React Router + Axios |
| **Database** | SQL Server — EF Core (Code First) |
| **API Docs** | Swagger / Swashbuckle |
| **Source Control** | Git / GitHub (branch theo feature) |
| **Project Management** | Jira hoặc Trello |
| **Deployment (bonus)** | Azure App Service / Railway |

#### Kiến trúc đề xuất
```
React (SPA)  →  ASP.NET Core Web API  →  SQL Server
                    ↑
               JWT Middleware
               Repository Pattern
               Service Layer
```

#### ERD Entities chính
`User` — `Role` — `Horse` — `Jockey` — `Tournament` — `Race` — `RaceEntry` (Horse+Jockey trong Race) — `RaceResult` — `Violation` — `Prediction`

---

### 3. Kế Hoạch Thực Hiện (WBS)

```
Tuần 1:   Cả team: Nghiên cứu nghiệp vụ, phân tích yêu cầu, chọn scope
Tuần 2-3: Cả team: SRS hoàn chỉnh + ERD (Conceptual & Logical)
           BE: Setup .NET API project, DB migration, Auth module (JWT/Role)
           FE: Setup React project, cấu hình Axios, routing, layout chung
Tuần 4:   [Assessment 1] Present SRS + Data Modeling
Tuần 5:   BE1: Tournament + Race + Schedule API
           BE2: Horse + Jockey management API
           FE1: Login/Register UI, Admin dashboard, Tournament management UI
           FE2: Horse management UI, Jockey list UI
Tuần 6:   BE1: RaceEntry API (đăng ký ngựa+jockey vào race)
           BE2: Result API + Violation API
           FE1: Race scheduling UI, RaceEntry flow (Horse Owner)
           FE2: Jockey invitation UI, Referee module UI
Tuần 7:   [Assessment 2] Demo tiến độ
           BE Intern: Prediction API + Ranking API
           FE1: Spectator view, Bảng xếp hạng UI
           FE2: Prediction UI, kết quả cuộc đua UI
Tuần 8:   Integration testing, fix bug, Polish UI, Viết User Guide
Tuần 9:   [Assessment 3] Complete Product Demo
```

#### Phân công (gợi ý)
| Member | Hướng | Phụ trách |
|---|---|---|
| BE Intern | **Backend** | Setup project, Auth/JWT/Role, Prediction + Ranking API, hỗ trợ BE khác |
| BE 1 | **Backend** | Tournament + Race + Schedule + RaceEntry API |
| BE 2 | **Backend** | Horse + Jockey + Result + Violation API |
| FE 1 | **Frontend** | Login/Register, Admin dashboard, Tournament UI, Race scheduling UI, Spectator view |
| FE 2 | **Frontend** | Horse Owner flows, Jockey invitation UI, Referee UI, Prediction UI, Ranking UI |

---
---

## TOPIC 4 — SEAL Hackathon Management System

### 1. Scope Dự Kiến

> [!IMPORTANT]
> Bỏ phần RBL Research (inter-rater reliability) vì quá phức tạp. Tập trung vào luồng quản lý sự kiện & chấm điểm cốt lõi.

#### Actors & Features được chọn thực hiện

| Actor | Chức năng |
|---|---|
| **Event Coordinator** | Quản lý tài khoản & phê duyệt user; Tạo & cấu hình hackathon event; Tạo vòng thi (Preliminary / Final); Tạo & quản lý Category (hạng mục); Thiết lập tiêu chí chấm điểm; Phân công Judge; Định nghĩa quy tắc thăng vòng; Công bố kết quả, trao giải; Export CSV/Excel |
| **Team Leader** | Đăng ký tài khoản; Thành lập đội (3–5 người); Đăng ký vào Category; Nộp bài (URL: repo, demo, slide); Xem kết quả & xếp hạng |
| **Team Member** | Đăng ký tài khoản; Xem thông tin đội & lịch nộp bài; Xem kết quả |
| **Mentor** | Được phân công vào Category; Xem thông tin đội trong Category của mình |
| **Judge** | Xem danh sách bài nộp được phân công; Chấm điểm theo tiêu chí; Xem điểm đã chấm |

#### Chức năng **KHÔNG** thực hiện
- RBL Research Dashboard (inter-rater variance)
- Calibration round
- GitHub/GitLab API integration
- Guest judge temp account system (đơn giản hóa: dùng chung flow user)

---

### 2. Kỹ Thuật & Công Nghệ

| Thành phần | Công nghệ |
|---|---|
| **Backend** | ASP.NET Core Web API (C#), REST API, JWT |
| **Frontend** | ReactJS + React Router + Axios |
| **Database** | SQL Server — EF Core |
| **API Docs** | Swagger |
| **Export** | EPPlus (Excel) / CsvHelper |
| **Source Control** | Git / GitHub |
| **Project Management** | Jira / Notion |

#### ERD Entities chính
`User` — `Role` — `Event` — `Round` — `Category` — `Criteria` — `Team` — `TeamMember` — `Submission` — `Score` (per judge per criteria) — `RankingResult` — `Award`

---

### 3. Kế Hoạch Thực Hiện (WBS)

```
Tuần 1:   Cả team: Nghiên cứu nghiệp vụ hackathon, xác định scope
Tuần 2-3: Cả team: SRS + ERD
           BE: Setup .NET API, Auth, User Approval flow
           FE: Setup React, layout, routing, trang login/register
Tuần 4:   [Assessment 1] Present SRS + ERD
Tuần 5:   BE1: Event + Round CRUD API; BE2: Category + Criteria API
           FE1: Coordinator dashboard, Event management UI
           FE2: Category management UI, Criteria config UI
Tuần 6:   BE1: Team registration + Submission API
           BE2: Judge assignment API
           FE1: Team Leader flow, Submission form UI
           FE2: Judge scoring UI, Mentor view UI
Tuần 7:   [Assessment 2] Demo tiến độ
           BE Intern: Auto-ranking + Promotion rules + Disqualification API
           FE1: Ranking page, Promotion results UI
           FE2: Results announcement UI, Award UI
Tuần 8:   BE Intern: Export CSV/Excel
           FE: Polish, integration test, bug fix, User Guide
Tuần 9:   [Assessment 3] Complete Product Demo
```

#### Phân công (gợi ý)
| Member | Hướng | Phụ trách |
|---|---|---|
| BE Intern | **Backend** | Setup project, Auth/JWT, User Approval, Ranking + Promotion + Export API |
| BE 1 | **Backend** | Event + Round + Category + Criteria + Judge Assignment API |
| BE 2 | **Backend** | Team + TeamMember + Submission + Scoring API |
| FE 1 | **Frontend** | Login/Register, Coordinator dashboard, Event/Round/Category UI, Ranking UI |
| FE 2 | **Frontend** | Team Leader flow, Submission form, Judge scoring UI, Mentor view, Award UI |

---
---

## TOPIC 8 — Hệ Thống Quản Lý Tòa Nhà Gửi Xe

### 1. Scope Dự Kiến

> [!IMPORTANT]
> Đây là topic có nghiệp vụ thực tế nhất & dễ demo. Phù hợp team mới vì flow rõ ràng. Bỏ AI optimization.

#### Actors & Features được chọn thực hiện

| Actor | Chức năng |
|---|---|
| **System Admin** | Quản lý tài khoản & phân quyền |
| **Parking Manager** | Quản lý thông tin tòa nhà; Quản lý loại phương tiện; Quản lý tầng (floor) & slot (trạng thái: available / occupied / reserved / maintenance); Quản lý bảng giá theo loại xe & khung giờ; Xem báo cáo: lượt xe, doanh thu, tỷ lệ lấp đầy |
| **Parking Staff** | Xử lý xe vào: nhập biển số, chọn slot, tạo Parking Session; Xử lý xe ra: tìm session, tính phí, thu tiền, cập nhật slot; Xử lý ngoại lệ: mất thẻ, sai biển số |
| **Parking User/Driver** | Xem thông tin bãi xe (giờ mở cửa, bảng giá, slot trống); Xem lịch sử gửi xe cá nhân; **Đặt chỗ trước** theo loại xe & thời gian (MVP); Thanh toán online (bonus — dùng VNPay/Momo) |

#### Chức năng **KHÔNG** thực hiện
- AI tối ưu phân bổ slot
- Camera/IoT tích hợp
- Phân tích dự báo khung giờ cao điểm phức tạp

---

### 2. Kỹ Thuật & Công Nghệ

| Thành phần | Công nghệ |
|---|---|
| **Backend** | ASP.NET Core Web API (C#), REST API, JWT |
| **Frontend** | ReactJS + React Router + Axios |
| **Database** | SQL Server — EF Core |
| **API Docs** | Swagger |
| **Payment (bonus)** | VNPay Sandbox |
| **Source Control** | Git / GitHub |
| **Project Management** | Trello / Jira |
| **Deployment (bonus)** | Railway / Azure |

#### ERD Entities chính
`User` — `Role` — `ParkingBuilding` — `Floor` — `VehicleType` — `ParkingSlot` (status) — `PricingPolicy` (loại xe + khung giờ) — `ParkingSession` (vehicle plate, slot, time in/out, fee) — `Reservation` — `Payment`

---

### 3. Kế Hoạch Thực Hiện (WBS)

```
Tuần 1:   Cả team: Tìm hiểu nghiệp vụ bãi xe, xác định scope, phân tích flow
Tuần 2-3: Cả team: SRS + ERD (Conceptual & Logical)
           BE: Setup .NET API, Auth module, DB seed data
           FE: Setup React, layout, trang login, routing
Tuần 4:   [Assessment 1] Present SRS + ERD
Tuần 5:   BE1: Building + Floor + VehicleType API
           BE2: Slot management API (CRUD + trạng thái slot)
           FE1: Manager dashboard, Building/Floor management UI
           FE2: Slot map UI theo tầng, trạng thái slot
Tuần 6:   BE1: PricingPolicy API
           BE2: ParkingSession API (check-in/check-out + fee calc)
           FE1: Staff check-in/out UI, fee display
           FE2: PricingPolicy UI, Slot status update UI
Tuần 7:   [Assessment 2] Demo tiến độ
           BE Intern: Reservation API + Report/Statistics API
           FE1: Driver view (bảng giá, slot trống, đặt chỗ trước)
           FE2: Lịch sử gửi xe UI, báo cáo doanh thu UI
Tuần 8:   BE Intern: Payment integration (bonus VNPay); Exception handling (mất thẻ)
           FE: Polish UI, Payment UI, integration test, bug fix, User Guide
Tuần 9:   [Assessment 3] Complete Product Demo
```

#### Phân công (gợi ý)
| Member | Hướng | Phụ trách |
|---|---|---|
| BE Intern | **Backend** | Setup project, Auth/JWT, Reservation + Report/Statistics + Payment API |
| BE 1 | **Backend** | Building + Floor + VehicleType + PricingPolicy API |
| BE 2 | **Backend** | Slot management + ParkingSession (check-in/check-out + fee calc) API |
| FE 1 | **Frontend** | Login/Register, Manager dashboard, Building/Floor UI, Staff check-in/out UI, Driver view |
| FE 2 | **Frontend** | Slot map UI, PricingPolicy UI, Lịch sử gửi xe, Payment UI, Báo cáo doanh thu |

---

## So Sánh 3 Topics

| Tiêu chí | Topic 3 (Horse Racing) | Topic 4 (SEAL Hackathon) | Topic 8 (Parking) |
|---|---|---|---|
| **Độ phức tạp nghiệp vụ** | Trung bình | Cao | Thấp–Trung bình |
| **Độ phức tạp kỹ thuật** | Trung bình | Cao (scoring logic) | Trung bình |
| **Dễ demo** | Trung bình | Thấp | **Cao** ⭐ |
| **Phù hợp team mới** | ✅ Tốt | ⚠️ Cần cân nhắc | ✅ **Tốt nhất** |
| **Bonus potential** | Prediction feature | Export CSV/RBL | VNPay + AI slot |

> [!TIP]
> **Gợi ý chọn Topic:** Nếu team muốn dễ quản lý và demo thực tế → **Topic 8**. Nếu muốn thử thách hơn và có tính học thuật cao → **Topic 4**.
