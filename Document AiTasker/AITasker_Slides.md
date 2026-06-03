# AITasker – AI Marketplace Platform for AI Automation Services

## Slide 1. Cover
* **Project:** AITasker – AI Marketplace Platform for AI Automation Services
* **Group Number:** [Insert Group Number]
* **Team Members:** [Insert Team Members]
* **Supervisor:** [Insert Supervisor]
* **Semester:** [Insert Semester]

---

## Slide 2. Technologies

### Frontend
* ReactJS / NextJS
* TailwindCSS
* Axios

### Backend
* ASP.NET Core Web API
* Entity Framework Core
* JWT Authentication

### Database
* SQL Server

### AI Services
* OpenAI API
* AI Job Assistant
* AI Matching Engine

### Cloud & DevOps
* GitHub
* Docker
* Azure/AWS

---

## Slide 3. Main Actors & Features

### Guest
* Register
* Login
* Browse Platform Information

### Client
* Create AI Job
* Manage Projects
* Hire Experts
* Escrow Payment
* Review Experts

### AI Expert
* Create Professional Profile
* Browse Jobs
* Send Proposal
* Execute Projects
* Receive Payments

### Admin
* User Management
* Dispute Resolution
* Platform Monitoring

### AI Services
* AI Job Assistant
* AI Matching Engine
* Recommendation System

---

## Slide 4. Scope (Context Diagram)

### External Entities
* Client
* AI Expert
* Admin
* Google Authentication
* Payment Gateway
* AI Services

### Central System
* AITasker Platform

> **[Insert Context Diagram Here]**

---

## Slide 5. Seven Main Flows Overview
* **Flow 1:** Register/Login & Profile Verification
* **Flow 2:** Client Creates Job with AI Assistant
* **Flow 3:** AI Matching Between Job and Expert
* **Flow 4:** Expert Reviews Jobs and Sends Proposal
* **Flow 5:** Negotiation and Contract Confirmation
* **Flow 6:** Escrow Management and Project Execution
* **Flow 7:** Project Completion, Review and Dispute Resolution

---

## Slide 6. Flow 1 – Register/Login with Email or Google & Role-Based Profile Verification

**Description:**
Users register using Email or Google Account and select their platform role (Client or AI Expert). The system authenticates the account and creates a role-specific profile. AI Experts must complete profile verification before accessing expert services and applying for projects.

**Actors (Swimlane Diagram):**
* User
* Authentication Service
* Google OAuth
* System
* Admin

> **[Insert Swimlane Diagram Here]**

---

## Slide 7. Flow 2 – Client Creates Main Request / Job with AI Job Assistant

**Description:**
The Client submits business requirements through the AI Job Assistant. The AI analyzes the request and automatically generates a structured project description, required skills, expected deliverables, estimated budget, and timeline before publishing the job.

**Actors (Swimlane Diagram):**
* Client
* AI Job Assistant
* System

> **[Insert Swimlane Diagram Here]**

---

## Slide 8. Flow 3 – System Matches Client Request with AI Expert Skills

**Description:**
Once a job is published, the AI Matching Engine evaluates job requirements and compares them with expert profiles, skills, experience, ratings, and historical performance to recommend the most suitable AI Experts.

**Actors (Swimlane Diagram):**
* Client
* Matching Engine
* System
* AI Expert

> **[Insert Swimlane Diagram Here]**

---

## Slide 9. Flow 4 – Expert Reviews Recommended Jobs / Browses Jobs and Sends Proposal

**Description:**
AI Experts receive recommended jobs from the matching engine or browse available jobs manually. Interested experts prepare and submit proposals containing technical approaches, estimated timelines, pricing, and milestone plans.

**Actors (Swimlane Diagram):**
* AI Expert
* System
* Client

> **[Insert Swimlane Diagram Here]**

---

## Slide 10. Flow 5 – Client and Expert Negotiate and Confirm Project Terms

**Description:**
The Client reviews received proposals and negotiates project details with selected experts. Both parties discuss scope, milestones, pricing, deliverables, and deadlines before confirming the project contract.

**Actors (Swimlane Diagram):**
* Client
* AI Expert
* System

> **[Insert Swimlane Diagram Here]**

---

## Slide 11. Flow 6 – Wallet-Based Escrow Management and Project Execution

**Description:**
The Client deposits project funds into the platform wallet. The payment is locked in escrow and released based on approved milestones. During this phase, the AI Expert performs project tasks, submits deliverables, and updates project progress.

**Actors (Swimlane Diagram):**
* Client
* Wallet System
* Payment Gateway
* AI Expert

> **[Insert Swimlane Diagram Here]**

---

## Slide 12. Flow 7 – Dispute Resolution, Project Completion, Review and Rating

**Description:**
After deliverables are submitted, the Client reviews the results. If disagreements occur, either party can initiate a dispute handled by the Admin. Once the project is finalized, both Client and Expert provide ratings and reviews to build platform trust and reputation.

**Actors (Swimlane Diagram):**
* Client
* AI Expert
* Admin
* System

> **[Insert Swimlane Diagram Here]**

---

## Slide 13. Business Rules

> **[Leave Blank for Future Addition]**

---

## Slide 14. Conceptual Data Model

**Main Entities:**
* User, Role, ClientProfile, ExpertProfile
* Skill, Job, Proposal, Contract, Milestone
* Wallet, Transaction, Review, Rating, Dispute

> **[Insert Conceptual Data Model Here]**

---

## Slide 15. Logical Data Model

**Key Relationships:**
* User (1) — (N) Job
* User (1) — (1) ClientProfile
* User (1) — (1) ExpertProfile
* ExpertProfile (N) — (N) Skill
* Job (1) — (N) Proposal
* ExpertProfile (1) — (N) Proposal
* Proposal (1) — (0..1) Contract
* Contract (1) — (N) Milestone
* Wallet (1) — (N) Transaction
* Contract (1) — (N) Review
* Contract (1) — (0..N) Dispute

> **[Insert Logical Data Model Here]**
