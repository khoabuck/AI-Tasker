# 04_BACKEND_GUIDE.md — Backend Coding Guide

## Backend Stack

- ASP.NET Core Web API
- C#
- Entity Framework Core
- SQL Server
- JWT Authentication
- Google OAuth
- SignalR
- Gemini/DeepSeek API integration

---

## Recommended Architecture

Use layered architecture:

```text
Controllers
  -> Services
    -> Repositories
      -> DbContext / EF Core
```

Recommended folders:

```text
backend/
├── Controllers/
├── Services/
│   ├── Interfaces/
│   └── Implementations/
├── Repositories/
│   ├── Interfaces/
│   └── Implementations/
├── Entities/
├── DTOs/
│   ├── Requests/
│   └── Responses/
├── Hubs/
├── Middleware/
├── Helpers/
├── Constants/
├── Options/
└── Data/
```

---

## Controller Rules

Controllers should:

- Accept request DTOs.
- Validate ModelState.
- Call service layer.
- Return standard API response.
- Not contain heavy business logic.
- Use `[Authorize]` where required.
- Use role/resource authorization.

---

## Service Rules

Services should handle business logic:

- AuthService
- ClientProfileService
- ExpertProfileService
- AiService
- JobService
- RecommendationService
- ProposalService
- ContractService
- ChatService
- WalletService
- EscrowService
- ProjectService
- MilestoneService
- DeliverableService
- DisputeService
- ReviewService
- NotificationService
- AdminService

Do not put business logic directly in controllers.

---

## Repository Rules

Repositories should:

- Query database.
- Encapsulate EF Core access.
- Not contain business decisions.
- Use async methods.

Example:

```csharp
Task<JobPosting?> GetJobByIdAsync(int jobId);
Task<bool> HasProposalAsync(int jobId, int expertId);
Task AddProposalAsync(Proposal proposal);
```

---

## Standard API Response

Create a generic response class:

```csharp
public class ApiResponse<T>
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
    public T? Data { get; set; }
    public List<string> Errors { get; set; } = new();
}
```

Helper methods:

```csharp
ApiResponse<T> Ok(T data, string message = "Success");
ApiResponse<T> Fail(string message, List<string>? errors = null);
```

---

## Auth Rules

- Use JWT access token.
- Hash password using BCrypt or Argon2.
- Never store raw password.
- Use Google OAuth id token verification.
- Store `AuthProvider = LOCAL` or `GOOGLE`.
- New user status = `PENDING_ROLE`.

---

## Authorization Rules

Use role-based authorization:

```csharp
[Authorize(Roles = "CLIENT")]
[Authorize(Roles = "EXPERT")]
[Authorize(Roles = "ADMIN")]
```

Use resource-based checks:

- Client can edit only own jobs.
- Expert can edit only own proposals.
- Only job Client can view job proposals.
- Only project Client/Expert can access project chat.
- Only project Client can review Expert.
- Only Admin can resolve dispute.

---

## Enum / Status Rules

All enums/status strings must match `docs/07_ENUM_STATUS_RULES.md`.

Do not create new enum values randomly.

---

## AI Integration Rules

- AI features must call `IAiProviderService` or equivalent.
- Provider keys must come from environment variables.
- Store important AI request/response in `AIRequestLogs`.
- AI output must be validated before saving.
- If AI fails, return clear error and allow manual flow.
- Do not replace AI features with rule-based/mock logic as main implementation.

Recommended interfaces:

```csharp
public interface IAiProviderService
{
    Task<AiJobSuggestionResponse> SuggestJobAsync(AiJobSuggestionRequest request);
    Task<AiProfileCheckResponse> CheckExpertProfileAsync(AiProfileCheckRequest request);
    Task<List<AiRecommendationResponse>> RecommendExpertsAsync(AiRecommendationRequest request);
    Task<AiContractDraftResponse> DraftContractAsync(AiContractDraftRequest request);
}
```

---

## SignalR Rules

- Use `/hubs/chat` for chat.
- Use `/hubs/notifications` for notifications if needed.
- Persist messages before or immediately after broadcast.
- Use rooms:
  - `proposal-{proposalId}`
  - `project-{projectId}`
- Only authorized participants can join rooms.

---

## Wallet/Escrow Transaction Rules

Use database transaction for:

- Escrow lock.
- Escrow release.
- Refund.
- Partial refund.
- Dispute freeze.

Never update wallet and escrow separately without transaction handling.

---

## Review Rules

Backend must enforce:

- Project status must be COMPLETED.
- Current user must be the project Client.
- Reviewee must be the project Expert.
- One review per project.
- Rating from 1 to 5.
- Only Expert rating average/review count is updated.

---

## Validation Rules

Use DTO validation attributes where possible:

```csharp
[Required]
[StringLength(255)]
[Range(1, 5)] // for review rating
[Range(0, 100)] // for Expert ProfileScore and MatchScore
```

Also validate in service layer for business rules.

---

## Error Handling

Use centralized middleware:

- Catch exceptions.
- Return consistent ApiResponse.
- Do not expose stack trace in production.
- Log exception details.

---

## Environment Variables

Recommended backend environment variables:

```text
ASPNETCORE_ENVIRONMENT
ConnectionStrings__DefaultConnection
Jwt__Key
Jwt__Issuer
Jwt__Audience
GoogleAuth__ClientId
Gemini__ApiKey
DeepSeek__ApiKey
Frontend__BaseUrl
```

---

## Health Check

Implement:

```text
GET /api/health
```

Return OK if API is running.

---

## Do Not Do

- Do not implement real payment gateway in current scope.
- Do not allow Expert to review Client.
- Do not bypass escrow before project starts.
- Do not release money for unapproved/disputed milestone.
- Do not hardcode AI keys.
- Do not expose PasswordHash.
- Do not return EF entities directly if they contain sensitive data.
