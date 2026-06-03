# 08_AI_INTEGRATION_GUIDE.md — AI Integration Guide

## Goal

AITasker uses real AI API providers for AI features. Do not use rule-based/mock logic as the main AI logic.

Preferred provider:

```text
Gemini API
```

Fallback provider:

```text
DeepSeek API
```

---

## AI Provider Rules

| Rule | Description |
|---|---|
| AI-01 | AI features must call AI API service. |
| AI-02 | Provider keys must come from environment variables. |
| AI-03 | AI output must be JSON or normalized into JSON. |
| AI-04 | Backend must validate AI output before saving. |
| AI-05 | Important AI requests/responses must be logged to AIRequestLogs. |
| AI-06 | If AI API fails, return clear error and allow manual fallback. |
| AI-07 | AI suggestions do not replace user/Admin decisions. |

---

## Environment Variables

```text
Gemini__ApiKey
Gemini__Model
AI__DefaultProvider
DeepSeek__ApiKey
DeepSeek__Model
```

Use actual names consistently in backend config.

---

## AI Modules

### 1. AI Job Assistant

Input:

```json
{
  "shortRequirement": "I need a Vietnamese chatbot for website FAQ."
}
```

Expected output:

```json
{
  "title": "Vietnamese AI Chatbot for Website FAQ",
  "description": "Build and integrate a chatbot that answers customer FAQ in Vietnamese.",
  "requiredSkills": ["Chatbot", "NLP", "API Integration"],
  "budgetMin": 500,
  "budgetMax": 1500,
  "timelineDays": 30,
  "deliverables": "Chatbot demo, integration guide, source code, test questions",
  "complexity": "MEDIUM"
}
```

Validation:

- Title not empty.
- Budget min/max >= 0.
- Timeline > 0.
- Skills not empty.
- Complexity in enum.

---

### 2. AI Profile Checker

Input:

- Bio
- Skills
- Portfolio URL
- Certificate URL
- Experience years
- Hourly rate

Expected output:

```json
{
  "profileScore": 82,
  "suggestedLevel": "MID",
  "profileReviewStatus": "APPROVED",
  "reviewNote": "Good AI chatbot portfolio and relevant NLP skill.",
  "missingInformation": []
}
```

Rules:

- Profile score range: 0–100.
- Level: JUNIOR / MID / SENIOR.
- Status: PENDING_REVIEW / APPROVED / REJECTED. Do not use NEEDS_REVISION unless SQL is changed first.

---

### 3. AI Expert Recommendation

Input:

- Job skills
- Job budget
- Job complexity
- Expert skills
- Expert rating/profile score
- Completed projects
- Experience years
- Expert hourly rate

Expected output:

```json
[
  {
    "expertId": 10,
    "matchScore": 88,
    "matchedSkills": ["Chatbot", "NLP"],
    "matchReason": "Expert has strong chatbot and Vietnamese NLP experience.",
    "riskNote": "Budget is slightly low compared to hourly rate."
  }
]
```

Formula:

```text
Match Score =
50% Skill Match
+ 20% Rating/Profile Score
+ 20% Completed Projects/Experience
+ 10% Budget Fit
```

---

### 4. AI Proposal Analyzer

Input:

- Job requirement
- Proposal content

Expected output:

```json
{
  "proposalScore": 85,
  "completeness": "GOOD",
  "warnings": ["Milestone plan is not detailed."],
  "improvementSuggestions": ["Add acceptance criteria for each milestone."]
}
```

This module supports Client decision only. It does not auto-accept/reject proposals.

---

### 5. AI Contract Draft Assistant

Input:

- Proposal data
- Counter offer data
- Chat summary
- Client type/platform fee

Expected output:

```json
{
  "projectScope": "Build Vietnamese FAQ chatbot and integrate into website.",
  "finalPrice": 1200,
  "finalTimelineDays": 30,
  "milestones": [
    {
      "title": "Prototype",
      "amount": 400,
      "dueDays": 10,
      "expectedDeliverable": "Working chatbot prototype",
      "acceptanceCriteria": "Can answer 20 provided FAQ questions."
    }
  ],
  "deliverables": "Source code, demo link, documentation",
  "revisionLimit": 2,
  "paymentTerms": "Escrow simulation release by milestone",
  "acceptanceCriteria": "Deliverables must match agreed scope."
}
```

Validation:

- Sum of milestone amounts = final price.
- Final price > 0.
- Timeline > 0.
- Deliverables not empty.
- Acceptance criteria not empty.

---

### 6. AI Deliverable Review Assistant

Input:

- Deliverable description
- Acceptance criteria
- Optional test result

Output:

```json
{
  "checklist": ["FAQ answers tested", "Demo link accessible"],
  "missingItems": [],
  "qualityNote": "Deliverable appears aligned with acceptance criteria."
}
```

AI does not approve deliverables automatically. Client decides.

---

### 7. AI Dispute Summary Assistant

Input:

- Contract
- Chat history
- Deliverable versions
- Evidence
- Transactions

Output:

```json
{
  "summary": "Client claims deliverable misses Vietnamese FAQ support.",
  "timeline": ["Contract confirmed", "Deliverable submitted", "Client requested dispute"],
  "keyEvidence": ["Chat agreement mentions FAQ set"],
  "decisionSupportNote": "Admin should compare deliverable with acceptance criteria."
}
```

AI supports Admin only. Admin makes final decision.

---

## Logging to AIRequestLogs

Log fields:

- UserId
- ModuleName
- Provider
- Prompt/request payload
- Response/raw or normalized JSON
- Status
- ErrorMessage
- CreatedAt

Do not log secrets/API keys.

---

## Backend Implementation Suggestion

Interfaces:

```csharp
public interface IAiProviderService
{
    Task<string> GenerateAsync(string prompt, string moduleName);
}

public interface IAiApplicationService
{
    Task<AiJobSuggestionDto> SuggestJobAsync(string shortRequirement, int userId);
    Task<AiProfileCheckDto> CheckProfileAsync(int expertId, int userId);
    Task<List<AiRecommendationDto>> RecommendExpertsAsync(int jobId, int userId);
    Task<ContractDraftDto> DraftContractFromChatAsync(int proposalId, int userId);
}
```

---

## Do Not Do

- Do not hardcode AI output.
- Do not fake AI response as final implementation.
- Do not auto-approve profile/project/dispute using AI only.
- Do not expose AI API key to frontend.
- Do not call AI API directly from frontend.
