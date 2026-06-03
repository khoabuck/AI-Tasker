# 09_SIGNALR_CHAT_GUIDE.md — SignalR Chat Guide

## Goal

AITasker uses ASP.NET Core SignalR for realtime negotiation chat, project chat, typing status, online status, and realtime notification.

---

## Hubs

```text
/hubs/chat
/hubs/notifications
```

---

## Room Naming

| Context | Room Name |
|---|---|
| Proposal negotiation | `proposal-{proposalId}` |
| Project chat | `project-{projectId}` |
| User notification | `user-{userId}` |

---

## Chat Hub Events

### Client -> Server

| Event | Payload | Meaning |
|---|---|---|
| JoinRoom | `{ roomName }` | Join proposal/project room. |
| LeaveRoom | `{ roomName }` | Leave room. |
| SendMessage | `{ roomName, messageText, messageType }` | Send chat message. |
| Typing | `{ roomName }` | User is typing. |
| StopTyping | `{ roomName }` | User stopped typing. |
| MarkAsRead | `{ roomName, messageId }` | Mark message read. |
| MarkAsAgreed | `{ proposalId, isAgreed }` | Mark negotiation agreement. |

### Server -> Client

| Event | Payload | Meaning |
|---|---|---|
| ReceiveMessage | message object | New message. |
| UserTyping | `{ userId, fullName }` | Someone typing. |
| UserStoppedTyping | `{ userId }` | Typing stopped. |
| MessageRead | `{ messageId, userId }` | Message read update. |
| AgreementUpdated | `{ proposalId, clientAgreed, expertAgreed }` | Agreement state update. |
| CreateContractAvailable | `{ proposalId }` | Both sides agreed, show Create Contract button. |
| ContractCreated | `{ contractId, proposalId }` | Contract draft created. |

---

## Notification Hub Events

### Server -> Client

| Event | Meaning |
|---|---|
| ReceiveNotification | New notification. |
| ProjectStarted | Project became ACTIVE. |
| DeliverableSubmitted | Expert submitted deliverable. |
| DisputeOpened | A dispute was opened. |
| DisputeResolved | Admin resolved dispute. |
| ReviewReceived | Expert received Client review. |

---

## Authorization Rules

### Proposal Room

Only these users can join:

- Client who owns the job.
- Expert who owns the proposal.
- Admin in view-only/debug context if implemented.

### Project Room

Only these users can join:

- Project Client.
- Project Expert.
- Admin in view-only/debug context if implemented.

---

## Message Persistence Rules

Every chat message must be saved in `Messages` table.

Required fields:

- SenderId
- JobId or ProposalId or ProjectId
- MessageText
- MessageType
- IsAgreementMarked
- SentAt
- IsRead

Recommended order:

1. Validate permission.
2. Save message to database.
3. Broadcast saved message through SignalR.
4. Create notification if receiver offline.

---

## Flow 5 Agreement Rule

Create Contract button appears only when:

```text
Client has Marked as Agreed
AND
Expert has Marked as Agreed
AND
Proposal is still valid for negotiation
```

Do not create contract if only one side agrees.

---

## Frontend SignalR Notes

Use SignalR client package.

Pseudo-flow:

```ts
const connection = new HubConnectionBuilder()
  .withUrl(`${API_BASE_URL}/hubs/chat`, { accessTokenFactory: () => token })
  .withAutomaticReconnect()
  .build();
```

On page load:

1. Connect.
2. Join room.
3. Fetch message history via REST API.
4. Listen for `ReceiveMessage`.
5. Leave room on page unmount.

---

## Do Not Do

- Do not rely only on SignalR without saving messages.
- Do not let unauthorized users join rooms.
- Do not enable Create Contract before both sides agreed.
- Do not store AI/API secrets in SignalR payloads.
