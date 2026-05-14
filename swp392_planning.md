# SWP392 — Kế Hoạch Dự Án (3 Topics)

> **Bối cảnh team:** 5 thành viên (4 BE mới + 1 BE có kinh nghiệm .NET C#) | 9 tuần | .NET C# + ReactJS + SQL Server

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
Tuần 1:   Nghiên cứu nghiệp vụ, phân tích yêu cầu, chọn scope
Tuần 2-3: SRS hoàn chỉnh + ERD (Conceptual & Logical)
           Setup project (.NET API + React), DB migration
           Auth module (Register/Login/JWT/Role)
Tuần 4:   [Assessment 1] Present SRS + Data Modeling
Tuần 5:   BE: Tournament CRUD, Race scheduling API
           FE: Layout, Login page, Admin dashboard
Tuần 6:   BE: Horse/Jockey management, RaceEntry API, Result API
           FE: Horse Owner flows, Jockey invitation UI
Tuần 7:   [Assessment 2] Demo tiến độ
           BE: Referee module, Prediction API
           FE: Spectator view, Prediction UI, Referee UI
Tuần 8:   Integration testing, fix bug, Polish UI
           Viết User Guide
Tuần 9:   [Assessment 3] Complete Product Demo
```

#### Phân công (gợi ý)
| Member | Role |
|---|---|
| BE Junior (kinh nghiệm) | Setup base project, Auth module, hỗ trợ các BE khác |
| BE 1 | Tournament + Race + Schedule API |
| BE 2 | Horse + Jockey + RaceEntry API |
| BE 3 | Result + Prediction + Referee API |
| BE 4 | ReactJS: tất cả UI + call API (cả team cùng hỗ trợ) |

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
Tuần 1:   Nghiên cứu nghiệp vụ hackathon, xác định scope
Tuần 2-3: SRS + ERD; Setup project; Auth + User Approval flow
Tuần 4:   [Assessment 1] Present SRS + ERD
Tuần 5:   BE: Event + Round + Category CRUD; Criteria management
           FE: Coordinator dashboard, Event management UI
Tuần 6:   BE: Team registration, Submission API, Judge assignment
           FE: Team flows, Submission form, Judge scoring UI
Tuần 7:   [Assessment 2] Demo tiến độ
           BE: Auto-ranking logic, Promotion rules, Disqualification
           FE: Ranking page, Results announcement UI
Tuần 8:   BE: Award management, Export CSV/Excel
           FE: Polish, integration test, bug fix
           Viết User Guide
Tuần 9:   [Assessment 3] Complete Product Demo
```

#### Phân công (gợi ý)
| Member | Role |
|---|---|
| BE Junior (kinh nghiệm) | Setup base project, Auth, User Approval flow |
| BE 1 | Event + Round + Category + Criteria API |
| BE 2 | Team + TeamMember + Submission API |
| BE 3 | Scoring + Ranking + Award + Export API |
| BE 4 | ReactJS toàn bộ UI + API integration |

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
Tuần 1:   Tìm hiểu nghiệp vụ bãi xe, xác định scope, phân tích flow
Tuần 2-3: SRS + ERD (Conceptual & Logical)
           Setup project .NET API + React; Auth module; DB seed data
Tuần 4:   [Assessment 1] Present SRS + ERD
Tuần 5:   BE: Building + Floor + Slot management API; VehicleType API
           FE: Manager dashboard, Slot map UI (theo tầng)
Tuần 6:   BE: PricingPolicy API; ParkingSession (check-in/check-out + fee calc)
           FE: Staff check-in/out UI; Fee display; Slot status real-time
Tuần 7:   [Assessment 2] Demo tiến độ
           BE: Reservation API; Report/Statistics API
           FE: Driver view (bảng giá, slot trống, đặt chỗ)
Tuần 8:   BE: Payment integration (bonus VNPay); Exception handling (mất thẻ)
           FE: Lịch sử gửi xe, Payment UI, báo cáo doanh thu
           Bug fix, polish UI, User Guide
Tuần 9:   [Assessment 3] Complete Product Demo
```

#### Phân công (gợi ý)
| Member | Role |
|---|---|
| BE Junior (kinh nghiệm) | Setup base project, Auth, Slot management API |
| BE 1 | Building + Floor + VehicleType + PricingPolicy API |
| BE 2 | ParkingSession (check-in/check-out + fee calculation) API |
| BE 3 | Reservation + Report + Payment API |
| BE 4 | ReactJS toàn bộ UI + API integration |

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
