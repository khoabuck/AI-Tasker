# SWP392 â€” Káº¿ Hoáº¡ch Dá»± Ãn (3 Topics)

> **Bá»‘i cáº£nh team:** 5 thÃ nh viÃªn â€” **3 BE** (1 intern + 2 BE má»›i) & **2 FE** (2 BE má»›i phá»¥ trÃ¡ch ReactJS) | 9 tuáº§n | .NET C# + ReactJS + SQL Server

---

## TOPIC 3 â€” Há»‡ Thá»‘ng Quáº£n LÃ½ Giáº£i Äua Ngá»±a

### 1. Scope Dá»± Kiáº¿n

> [!IMPORTANT]
> Táº­p trung vÃ o cÃ¡c luá»“ng nghiá»‡p vá»¥ cá»‘t lÃµi, bá» qua tÃ­nh nÄƒng phá»¥ phá»©c táº¡p Ä‘á»ƒ phÃ¹ há»£p vá»›i trÃ¬nh Ä‘á»™ team.

#### Actors & Features Ä‘Æ°á»£c chá»n thá»±c hiá»‡n

| Actor | Chá»©c nÄƒng thá»±c hiá»‡n |
|---|---|
| **Admin** | Quáº£n lÃ½ tÃ i khoáº£n & phÃ¢n quyá»n; Quáº£n lÃ½ giáº£i Ä‘áº¥u (táº¡o/sá»­a/xÃ³a tournament); Láº­p lá»‹ch cuá»™c Ä‘ua; Duyá»‡t Ä‘Äƒng kÃ½ tham gia; Quáº£n lÃ½ danh sÃ¡ch ngá»±a & jockey; PhÃ¢n cÃ´ng trá»ng tÃ i; CÃ´ng bá»‘ káº¿t quáº£ |
| **Horse Owner** | ÄÄƒng kÃ½ tÃ i khoáº£n; ÄÄƒng kÃ½ ngá»±a vÃ o giáº£i; Quáº£n lÃ½ thÃ´ng tin ngá»±a; Má»i/chá»n jockey; XÃ¡c nháº­n ngá»±a tham gia cuá»™c Ä‘ua; Xem lá»‹ch & káº¿t quáº£ |
| **Jockey** | ÄÄƒng kÃ½ tÃ i khoáº£n; Nháº­n & xÃ¡c nháº­n/tá»« chá»‘i lá»i má»i; Xem lá»‹ch thi Ä‘áº¥u; Xem káº¿t quáº£ & thÃ nh tÃ­ch cÃ¡ nhÃ¢n |
| **Race Referee** | Kiá»ƒm tra thÃ´ng tin ngá»±a trÆ°á»›c Ä‘ua; Ghi nháº­n vi pháº¡m; XÃ¡c nháº­n káº¿t quáº£ cuá»™c Ä‘ua |
| **Spectator** | Xem thÃ´ng tin giáº£i & lá»‹ch Ä‘ua; Xem káº¿t quáº£ & báº£ng xáº¿p háº¡ng; **Dá»± Ä‘oÃ¡n káº¿t quáº£** (MVP) |

#### Chá»©c nÄƒng **KHÃ”NG** thá»±c hiá»‡n (Ä‘á»ƒ tiáº¿t kiá»‡m thá»i gian)
- Thanh toÃ¡n tiá»n thÆ°á»Ÿng online
- Streaming/theo dÃµi Ä‘ua trá»±c tiáº¿p real-time
- Thá»‘ng kÃª phá»©c táº¡p / AI prediction

---

### 2. Ká»¹ Thuáº­t & CÃ´ng Nghá»‡

| ThÃ nh pháº§n | CÃ´ng nghá»‡ |
|---|---|
| **Backend** | ASP.NET Core Web API (C#), REST API, JWT Authentication |
| **Frontend** | ReactJS + React Router + Axios |
| **Database** | SQL Server â€” EF Core (Code First) |
| **API Docs** | Swagger / Swashbuckle |
| **Source Control** | Git / GitHub (branch theo feature) |
| **Project Management** | Jira hoáº·c Trello |
| **Deployment (bonus)** | Azure App Service / Railway |

#### Kiáº¿n trÃºc Ä‘á» xuáº¥t
```
React (SPA)  â†’  ASP.NET Core Web API  â†’  SQL Server
                    â†‘
               JWT Middleware
               Repository Pattern
               Service Layer
```

#### ERD Entities chÃ­nh
`User` â€” `Role` â€” `Horse` â€” `Jockey` â€” `Tournament` â€” `Race` â€” `RaceEntry` (Horse+Jockey trong Race) â€” `RaceResult` â€” `Violation` â€” `Prediction`

---

### 3. Káº¿ Hoáº¡ch Thá»±c Hiá»‡n (WBS)

```
Tuáº§n 1:   Cáº£ team: NghiÃªn cá»©u nghiá»‡p vá»¥, phÃ¢n tÃ­ch yÃªu cáº§u, chá»n scope
Tuáº§n 2-3: Cáº£ team: SRS hoÃ n chá»‰nh + ERD (Conceptual & Logical)
           BE: Setup .NET API project, DB migration, Auth module (JWT/Role)
           FE: Setup React project, cáº¥u hÃ¬nh Axios, routing, layout chung
Tuáº§n 4:   [Assessment 1] Present SRS + Data Modeling
Tuáº§n 5:   BE1: Tournament + Race + Schedule API
           BE2: Horse + Jockey management API
           FE1: Login/Register UI, Admin dashboard, Tournament management UI
           FE2: Horse management UI, Jockey list UI
Tuáº§n 6:   BE1: RaceEntry API (Ä‘Äƒng kÃ½ ngá»±a+jockey vÃ o race)
           BE2: Result API + Violation API
           FE1: Race scheduling UI, RaceEntry flow (Horse Owner)
           FE2: Jockey invitation UI, Referee module UI
Tuáº§n 7:   [Assessment 2] Demo tiáº¿n Ä‘á»™
           BE3(intern): Prediction API + Ranking API
           FE1: Spectator view, Báº£ng xáº¿p háº¡ng UI
           FE2: Prediction UI, káº¿t quáº£ cuá»™c Ä‘ua UI
Tuáº§n 8:   Integration testing, fix bug, Polish UI, Viáº¿t User Guide
Tuáº§n 9:   [Assessment 3] Complete Product Demo
```

#### PhÃ¢n cÃ´ng (gá»£i Ã½)
| Member | HÆ°á»›ng | Phá»¥ trÃ¡ch |
|---|---|---|
| BE Intern | **Backend** | Setup project, Auth/JWT/Role, Prediction + Ranking API, há»— trá»£ BE khÃ¡c |
| BE 1 | **Backend** | Tournament + Race + Schedule + RaceEntry API |
| BE 2 | **Backend** | Horse + Jockey + Result + Violation API |
| FE 1 | **Frontend** | Login/Register, Admin dashboard, Tournament UI, Race scheduling UI, Spectator view |
| FE 2 | **Frontend** | Horse Owner flows, Jockey invitation UI, Referee UI, Prediction UI, Ranking UI |

---
---

## TOPIC 4 â€” SEAL Hackathon Management System

### 1. Scope Dá»± Kiáº¿n

> [!IMPORTANT]
> Bá» pháº§n RBL Research (inter-rater reliability) vÃ¬ quÃ¡ phá»©c táº¡p. Táº­p trung vÃ o luá»“ng quáº£n lÃ½ sá»± kiá»‡n & cháº¥m Ä‘iá»ƒm cá»‘t lÃµi.

#### Actors & Features Ä‘Æ°á»£c chá»n thá»±c hiá»‡n

| Actor | Chá»©c nÄƒng |
|---|---|
| **Event Coordinator** | Quáº£n lÃ½ tÃ i khoáº£n & phÃª duyá»‡t user; Táº¡o & cáº¥u hÃ¬nh hackathon event; Táº¡o vÃ²ng thi (Preliminary / Final); Táº¡o & quáº£n lÃ½ Category (háº¡ng má»¥c); Thiáº¿t láº­p tiÃªu chÃ­ cháº¥m Ä‘iá»ƒm; PhÃ¢n cÃ´ng Judge; Äá»‹nh nghÄ©a quy táº¯c thÄƒng vÃ²ng; CÃ´ng bá»‘ káº¿t quáº£, trao giáº£i; Export CSV/Excel |
| **Team Leader** | ÄÄƒng kÃ½ tÃ i khoáº£n; ThÃ nh láº­p Ä‘á»™i (3â€“5 ngÆ°á»i); ÄÄƒng kÃ½ vÃ o Category; Ná»™p bÃ i (URL: repo, demo, slide); Xem káº¿t quáº£ & xáº¿p háº¡ng |
| **Team Member** | ÄÄƒng kÃ½ tÃ i khoáº£n; Xem thÃ´ng tin Ä‘á»™i & lá»‹ch ná»™p bÃ i; Xem káº¿t quáº£ |
| **Mentor** | ÄÆ°á»£c phÃ¢n cÃ´ng vÃ o Category; Xem thÃ´ng tin Ä‘á»™i trong Category cá»§a mÃ¬nh |
| **Judge** | Xem danh sÃ¡ch bÃ i ná»™p Ä‘Æ°á»£c phÃ¢n cÃ´ng; Cháº¥m Ä‘iá»ƒm theo tiÃªu chÃ­; Xem Ä‘iá»ƒm Ä‘Ã£ cháº¥m |

#### Chá»©c nÄƒng **KHÃ”NG** thá»±c hiá»‡n
- RBL Research Dashboard (inter-rater variance)
- Calibration round
- GitHub/GitLab API integration
- Guest judge temp account system (Ä‘Æ¡n giáº£n hÃ³a: dÃ¹ng chung flow user)

---

### 2. Ká»¹ Thuáº­t & CÃ´ng Nghá»‡

| ThÃ nh pháº§n | CÃ´ng nghá»‡ |
|---|---|
| **Backend** | ASP.NET Core Web API (C#), REST API, JWT |
| **Frontend** | ReactJS + React Router + Axios |
| **Database** | SQL Server â€” EF Core |
| **API Docs** | Swagger |
| **Export** | EPPlus (Excel) / CsvHelper |
| **Source Control** | Git / GitHub |
| **Project Management** | Jira / Notion |

#### ERD Entities chÃ­nh
`User` â€” `Role` â€” `Event` â€” `Round` â€” `Category` â€” `Criteria` â€” `Team` â€” `TeamMember` â€” `Submission` â€” `Score` (per judge per criteria) â€” `RankingResult` â€” `Award`

---

### 3. Káº¿ Hoáº¡ch Thá»±c Hiá»‡n (WBS)

```
Tuáº§n 1:   Cáº£ team: NghiÃªn cá»©u nghiá»‡p vá»¥ hackathon, xÃ¡c Ä‘á»‹nh scope
Tuáº§n 2-3: Cáº£ team: SRS + ERD
           BE: Setup .NET API, Auth, User Approval flow
           FE: Setup React, layout, routing, trang login/register
Tuáº§n 4:   [Assessment 1] Present SRS + ERD
Tuáº§n 5:   BE1: Event + Round CRUD API; BE2: Category + Criteria API
           FE1: Coordinator dashboard, Event management UI
           FE2: Category management UI, Criteria config UI
Tuáº§n 6:   BE1: Team registration + Submission API
           BE2: Judge assignment API
           FE1: Team Leader flow, Submission form UI
           FE2: Judge scoring UI, Mentor view UI
Tuáº§n 7:   [Assessment 2] Demo tiáº¿n Ä‘á»™
           BE3(intern): Auto-ranking + Promotion rules + Disqualification API
           FE1: Ranking page, Promotion results UI
           FE2: Results announcement UI, Award UI
Tuáº§n 8:   BE3: Export CSV/Excel
           FE: Polish, integration test, bug fix, User Guide
Tuáº§n 9:   [Assessment 3] Complete Product Demo
```

#### PhÃ¢n cÃ´ng (gá»£i Ã½)
| Member | HÆ°á»›ng | Phá»¥ trÃ¡ch |
|---|---|---|
| BE Intern | **Backend** | Setup project, Auth/JWT, User Approval, Ranking + Promotion + Export API |
| BE 1 | **Backend** | Event + Round + Category + Criteria + Judge Assignment API |
| BE 2 | **Backend** | Team + TeamMember + Submission + Scoring API |
| FE 1 | **Frontend** | Login/Register, Coordinator dashboard, Event/Round/Category UI, Ranking UI |
| FE 2 | **Frontend** | Team Leader flow, Submission form, Judge scoring UI, Mentor view, Award UI |

---
---

## TOPIC 8 â€” Há»‡ Thá»‘ng Quáº£n LÃ½ TÃ²a NhÃ  Gá»­i Xe

### 1. Scope Dá»± Kiáº¿n

> [!IMPORTANT]
> ÄÃ¢y lÃ  topic cÃ³ nghiá»‡p vá»¥ thá»±c táº¿ nháº¥t & dá»… demo. PhÃ¹ há»£p team má»›i vÃ¬ flow rÃµ rÃ ng. Bá» AI optimization.

#### Actors & Features Ä‘Æ°á»£c chá»n thá»±c hiá»‡n

| Actor | Chá»©c nÄƒng |
|---|---|
| **System Admin** | Quáº£n lÃ½ tÃ i khoáº£n & phÃ¢n quyá»n |
| **Parking Manager** | Quáº£n lÃ½ thÃ´ng tin tÃ²a nhÃ ; Quáº£n lÃ½ loáº¡i phÆ°Æ¡ng tiá»‡n; Quáº£n lÃ½ táº§ng (floor) & slot (tráº¡ng thÃ¡i: available / occupied / reserved / maintenance); Quáº£n lÃ½ báº£ng giÃ¡ theo loáº¡i xe & khung giá»; Xem bÃ¡o cÃ¡o: lÆ°á»£t xe, doanh thu, tá»· lá»‡ láº¥p Ä‘áº§y |
| **Parking Staff** | Xá»­ lÃ½ xe vÃ o: nháº­p biá»ƒn sá»‘, chá»n slot, táº¡o Parking Session; Xá»­ lÃ½ xe ra: tÃ¬m session, tÃ­nh phÃ­, thu tiá»n, cáº­p nháº­t slot; Xá»­ lÃ½ ngoáº¡i lá»‡: máº¥t tháº», sai biá»ƒn sá»‘ |
| **Parking User/Driver** | Xem thÃ´ng tin bÃ£i xe (giá» má»Ÿ cá»­a, báº£ng giÃ¡, slot trá»‘ng); Xem lá»‹ch sá»­ gá»­i xe cÃ¡ nhÃ¢n; **Äáº·t chá»— trÆ°á»›c** theo loáº¡i xe & thá»i gian (MVP); Thanh toÃ¡n online (bonus â€” dÃ¹ng VNPay/Momo) |

#### Chá»©c nÄƒng **KHÃ”NG** thá»±c hiá»‡n
- AI tá»‘i Æ°u phÃ¢n bá»• slot
- Camera/IoT tÃ­ch há»£p
- PhÃ¢n tÃ­ch dá»± bÃ¡o khung giá» cao Ä‘iá»ƒm phá»©c táº¡p

---

### 2. Ká»¹ Thuáº­t & CÃ´ng Nghá»‡

| ThÃ nh pháº§n | CÃ´ng nghá»‡ |
|---|---|
| **Backend** | ASP.NET Core Web API (C#), REST API, JWT |
| **Frontend** | ReactJS + React Router + Axios |
| **Database** | SQL Server â€” EF Core |
| **API Docs** | Swagger |
| **Payment (bonus)** | VNPay Sandbox |
| **Source Control** | Git / GitHub |
| **Project Management** | Trello / Jira |
| **Deployment (bonus)** | Railway / Azure |

#### ERD Entities chÃ­nh
`User` â€” `Role` â€” `ParkingBuilding` â€” `Floor` â€” `VehicleType` â€” `ParkingSlot` (status) â€” `PricingPolicy` (loáº¡i xe + khung giá») â€” `ParkingSession` (vehicle plate, slot, time in/out, fee) â€” `Reservation` â€” `Payment`

---

### 3. Káº¿ Hoáº¡ch Thá»±c Hiá»‡n (WBS)

```
Tuáº§n 1:   Cáº£ team: TÃ¬m hiá»ƒu nghiá»‡p vá»¥ bÃ£i xe, xÃ¡c Ä‘á»‹nh scope, phÃ¢n tÃ­ch flow
Tuáº§n 2-3: Cáº£ team: SRS + ERD (Conceptual & Logical)
           BE: Setup .NET API, Auth module, DB seed data
           FE: Setup React, layout, trang login, routing
Tuáº§n 4:   [Assessment 1] Present SRS + ERD
Tuáº§n 5:   BE1: Building + Floor + VehicleType API
           BE2: Slot management API (CRUD + tráº¡ng thÃ¡i slot)
           FE1: Manager dashboard, Building/Floor management UI
           FE2: Slot map UI theo táº§ng, tráº¡ng thÃ¡i slot
Tuáº§n 6:   BE1: PricingPolicy API
           BE2: ParkingSession API (check-in/check-out + fee calc)
           FE1: Staff check-in/out UI, fee display
           FE2: PricingPolicy UI, Slot status update UI
Tuáº§n 7:   [Assessment 2] Demo tiáº¿n Ä‘á»™
           BE3(intern): Reservation API + Report/Statistics API
           FE1: Driver view (báº£ng giÃ¡, slot trá»‘ng, Ä‘áº·t chá»— trÆ°á»›c)
           FE2: Lá»‹ch sá»­ gá»­i xe UI, bÃ¡o cÃ¡o doanh thu UI
Tuáº§n 8:   BE3: Payment integration (bonus VNPay); Exception handling (máº¥t tháº»)
           FE: Polish UI, Payment UI, integration test, bug fix, User Guide
Tuáº§n 9:   [Assessment 3] Complete Product Demo
```

#### PhÃ¢n cÃ´ng (gá»£i Ã½)
| Member | HÆ°á»›ng | Phá»¥ trÃ¡ch |
|---|---|---|
| BE Intern | **Backend** | Setup project, Auth/JWT, Reservation + Report/Statistics + Payment API |
| BE 1 | **Backend** | Building + Floor + VehicleType + PricingPolicy API |
| BE 2 | **Backend** | Slot management + ParkingSession (check-in/check-out + fee calc) API |
| FE 1 | **Frontend** | Login/Register, Manager dashboard, Building/Floor UI, Staff check-in/out UI, Driver view |
| FE 2 | **Frontend** | Slot map UI, PricingPolicy UI, Lá»‹ch sá»­ gá»­i xe, Payment UI, BÃ¡o cÃ¡o doanh thu |

---

## So SÃ¡nh 3 Topics

| TiÃªu chÃ­ | Topic 3 (Horse Racing) | Topic 4 (SEAL Hackathon) | Topic 8 (Parking) |
|---|---|---|---|
| **Äá»™ phá»©c táº¡p nghiá»‡p vá»¥** | Trung bÃ¬nh | Cao | Tháº¥pâ€“Trung bÃ¬nh |
| **Äá»™ phá»©c táº¡p ká»¹ thuáº­t** | Trung bÃ¬nh | Cao (scoring logic) | Trung bÃ¬nh |
| **Dá»… demo** | Trung bÃ¬nh | Tháº¥p | **Cao** â­ |
| **PhÃ¹ há»£p team má»›i** | âœ… Tá»‘t | âš ï¸ Cáº§n cÃ¢n nháº¯c | âœ… **Tá»‘t nháº¥t** |
| **Bonus potential** | Prediction feature | Export CSV/RBL | VNPay + AI slot |

> [!TIP]
> **Gá»£i Ã½ chá»n Topic:** Náº¿u team muá»‘n dá»… quáº£n lÃ½ vÃ  demo thá»±c táº¿ â†’ **Topic 8**. Náº¿u muá»‘n thá»­ thÃ¡ch hÆ¡n vÃ  cÃ³ tÃ­nh há»c thuáº­t cao â†’ **Topic 4**.

