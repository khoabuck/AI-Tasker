import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import ExpertLayout from "../../../components/layout/ExpertLayout";
import chatService from "../../../services/chat.service";
import authService from "../../../services/auth.service";

export default function MessagesPage() {
  const user = authService.getCurrentUser?.();
  const [searchParams, setSearchParams] = useSearchParams();

  const requestedConversationId = searchParams.get("conversationId");

  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);

  const [messageInput, setMessageInput] = useState("");
  const [searchText, setSearchText] = useState("");

  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);

  const [error, setError] = useState("");

  const filteredConversations = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();

    if (!keyword) return conversations;

    return conversations.filter((conversation) => {
      return (
        getConversationName(conversation).toLowerCase().includes(keyword) ||
        getConversationEmail(conversation).toLowerCase().includes(keyword) ||
        getLastMessage(conversation).toLowerCase().includes(keyword) ||
        String(conversation.projectTitle || "").toLowerCase().includes(keyword)
      );
    });
  }, [conversations, searchText]);

  useEffect(() => {
    loadConversations(requestedConversationId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestedConversationId]);

  const loadConversations = async (preferredConversationId = "") => {
    try {
      setLoadingConversations(true);
      setError("");

      const data = await chatService.getConversations();
      setConversations(data);

      if (data.length === 0) {
        setSelectedConversation(null);
        setMessages([]);
        return;
      }

      const conversationToSelect =
        data.find(
          (item) =>
            String(getConversationId(item)) === String(preferredConversationId)
        ) || data[0];

      setSelectedConversation(conversationToSelect);
      await loadMessages(getConversationId(conversationToSelect));
    } catch (err) {
      console.error("LOAD CONVERSATIONS ERROR:", err?.response?.data || err);
      setError(getFriendlyError(err, "Cannot load conversations."));
      setConversations([]);
      setSelectedConversation(null);
      setMessages([]);
    } finally {
      setLoadingConversations(false);
    }
  };

  const loadMessages = async (conversationId) => {
    if (!conversationId) return;

    try {
      setLoadingMessages(true);
      setError("");

      const data = await chatService.getMessages(conversationId);
      setMessages(data);
    } catch (err) {
      console.error("LOAD MESSAGES ERROR:", err?.response?.data || err);
      setError(getFriendlyError(err, "Cannot load messages."));
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSelectConversation = async (conversation) => {
    const conversationId = getConversationId(conversation);

    setSelectedConversation(conversation);
    setSearchParams({ conversationId: String(conversationId) });

    await loadMessages(conversationId);
  };

  const handleSendMessage = async (event) => {
    event.preventDefault();

    const content = messageInput.trim();

    if (!content) return;

    if (!selectedConversation) {
      setError("Please select a conversation first.");
      return;
    }

    try {
      setSending(true);
      setError("");

      const conversationId = getConversationId(selectedConversation);

      await chatService.sendMessage(conversationId, content);

      setMessageInput("");
      await loadMessages(conversationId);

      const latestConversations = await chatService.getConversations();
      setConversations(latestConversations);

      const updatedSelected =
        latestConversations.find(
          (item) => String(getConversationId(item)) === String(conversationId)
        ) || selectedConversation;

      setSelectedConversation(updatedSelected);
    } catch (err) {
      console.error("SEND MESSAGE ERROR:", err?.response?.data || err);
      setError(getFriendlyError(err, "Cannot send message."));
    } finally {
      setSending(false);
    }
  };

  const selectedConversationId = getConversationId(selectedConversation || {});

  const cardStyle =
    "rounded-2xl border border-white/10 bg-[#151a22]/95 shadow-[0_18px_50px_rgba(0,0,0,0.3)]";

  return (
    <ExpertLayout>
      <div className="px-5 py-10 md:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-[#00F0FF]">
              Expert Messages
            </p>

            <h1 className="text-3xl font-bold text-white md:text-4xl">
              Messages
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
              Chat with clients about jobs, proposals, projects and
              deliverables.
            </p>
          </div>

          {error && (
            <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-300">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[360px_1fr]">
            <section className={`${cardStyle} overflow-hidden`}>
              <div className="border-b border-white/10 p-5">
                <h2 className="text-lg font-bold text-white">
                  Conversations
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Select a client to start chatting.
                </p>

                <div className="relative mt-4">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-xl text-gray-500">
                    search
                  </span>

                  <input
                    type="text"
                    value={searchText}
                    onChange={(event) => setSearchText(event.target.value)}
                    placeholder="Search conversations..."
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-3 pl-12 pr-4 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-[#00F0FF] focus:bg-white/[0.07]"
                  />
                </div>
              </div>

              <div className="max-h-[650px] overflow-y-auto">
                {loadingConversations && (
                  <div className="p-8 text-center text-sm text-gray-400">
                    Loading conversations...
                  </div>
                )}

                {!loadingConversations && filteredConversations.length === 0 && (
                  <div className="p-8 text-center">
                    <span className="material-symbols-outlined mb-3 block text-5xl text-gray-500">
                      forum
                    </span>

                    <h3 className="font-bold text-white">No conversations</h3>

                    <p className="mt-2 text-sm text-gray-500">
                      Your conversations will appear here.
                    </p>
                  </div>
                )}

                {!loadingConversations &&
                  filteredConversations.map((conversation) => {
                    const conversationId = getConversationId(conversation);
                    const isActive =
                      String(selectedConversationId) === String(conversationId);

                    return (
                      <button
                        key={conversationId}
                        type="button"
                        onClick={() => handleSelectConversation(conversation)}
                        className={`flex w-full items-start gap-4 border-b border-white/10 p-5 text-left transition ${
                          isActive ? "bg-cyan-400/10" : "hover:bg-white/[0.04]"
                        }`}
                      >
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-cyan-400/30 bg-cyan-400/10 text-sm font-bold text-cyan-300">
                          {getInitials(getConversationName(conversation))}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-3">
                            <h3 className="truncate text-sm font-bold text-white">
                              {getConversationName(conversation)}
                            </h3>

                            <span className="shrink-0 text-xs text-gray-500">
                              {formatTime(getConversationUpdatedAt(conversation))}
                            </span>
                          </div>

                          {getConversationEmail(conversation) && (
                            <p className="mt-1 truncate text-xs text-gray-500">
                              {getConversationEmail(conversation)}
                            </p>
                          )}

                          {conversation.projectTitle && (
                            <p className="mt-1 truncate text-xs text-cyan-300">
                              {conversation.projectTitle}
                            </p>
                          )}

                          <p className="mt-2 line-clamp-2 text-sm text-gray-400">
                            {getLastMessage(conversation)}
                          </p>
                        </div>
                      </button>
                    );
                  })}
              </div>
            </section>

            <section className={`${cardStyle} flex min-h-[650px] flex-col`}>
              {!selectedConversation && (
                <div className="flex flex-1 items-center justify-center p-8 text-center">
                  <div>
                    <span className="material-symbols-outlined mb-3 block text-6xl text-gray-600">
                      chat
                    </span>

                    <h2 className="text-xl font-bold text-white">
                      Select a conversation
                    </h2>

                    <p className="mt-2 text-sm text-gray-500">
                      Choose a conversation on the left to view messages.
                    </p>
                  </div>
                </div>
              )}

              {selectedConversation && (
                <>
                  <div className="flex items-center gap-4 border-b border-white/10 p-5">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full border border-cyan-400/30 bg-cyan-400/10 text-sm font-bold text-cyan-300">
                      {getInitials(getConversationName(selectedConversation))}
                    </div>

                    <div className="min-w-0">
                      <h2 className="truncate font-bold text-white">
                        {getConversationName(selectedConversation)}
                      </h2>

                      <p className="truncate text-sm text-gray-500">
                        {getConversationEmail(selectedConversation) ||
                          "Client conversation"}
                      </p>
                    </div>
                  </div>

                  <div className="flex-1 space-y-4 overflow-y-auto p-5">
                    {loadingMessages && (
                      <div className="p-8 text-center text-sm text-gray-400">
                        Loading messages...
                      </div>
                    )}

                    {!loadingMessages && messages.length === 0 && (
                      <div className="p-8 text-center">
                        <span className="material-symbols-outlined mb-3 block text-5xl text-gray-500">
                          chat_bubble
                        </span>

                        <h3 className="font-bold text-white">
                          No messages yet
                        </h3>

                        <p className="mt-2 text-sm text-gray-500">
                          Send the first message to start the conversation.
                        </p>
                      </div>
                    )}

                    {!loadingMessages &&
                      messages.map((message) => {
                        const mine = isMyMessage(message, user);

                        return (
                          <div
                            key={getMessageId(message)}
                            className={`flex ${
                              mine ? "justify-end" : "justify-start"
                            }`}
                          >
                            <div
                              className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                                mine
                                  ? "bg-cyan-400 text-black"
                                  : "border border-white/10 bg-white/[0.05] text-gray-200"
                              }`}
                            >
                              {!mine && message.senderName && (
                                <p className="mb-1 text-xs font-bold text-cyan-300">
                                  {message.senderName}
                                </p>
                              )}

                              <p className="whitespace-pre-line text-sm leading-6">
                                {getMessageContent(message)}
                              </p>

                              <p
                                className={`mt-2 text-right text-[11px] ${
                                  mine ? "text-black/60" : "text-gray-500"
                                }`}
                              >
                                {formatTime(getMessageCreatedAt(message))}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                  </div>

                  <form
                    onSubmit={handleSendMessage}
                    className="border-t border-white/10 p-5"
                  >
                    <div className="flex gap-3">
                      <input
                        type="text"
                        value={messageInput}
                        onChange={(event) => setMessageInput(event.target.value)}
                        placeholder="Type your message..."
                        className="flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-[#00F0FF] focus:bg-white/[0.07]"
                      />

                      <button
                        type="submit"
                        disabled={sending || !messageInput.trim()}
                        className="rounded-xl border border-cyan-400/60 bg-cyan-400/10 px-6 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {sending ? "Sending..." : "Send"}
                      </button>
                    </div>
                  </form>
                </>
              )}
            </section>
          </div>
        </div>
      </div>
    </ExpertLayout>
  );
}

function getConversationId(conversation) {
  return (
    conversation?.conversationId ||
    conversation?.ConversationId ||
    conversation?.id ||
    conversation?.Id ||
    conversation?.conversationID ||
    conversation?.ConversationID
  );
}

function getConversationName(conversation) {
  return (
    conversation?.otherUserName ||
    conversation?.OtherUserName ||
    conversation?.clientName ||
    conversation?.ClientName ||
    conversation?.expertName ||
    conversation?.ExpertName ||
    conversation?.receiverName ||
    conversation?.ReceiverName ||
    conversation?.userName ||
    conversation?.UserName ||
    conversation?.otherUser?.fullName ||
    conversation?.OtherUser?.FullName ||
    conversation?.otherUser?.name ||
    conversation?.OtherUser?.Name ||
    "Conversation"
  );
}

function getConversationEmail(conversation) {
  return (
    conversation?.otherUserEmail ||
    conversation?.OtherUserEmail ||
    conversation?.clientEmail ||
    conversation?.ClientEmail ||
    conversation?.expertEmail ||
    conversation?.ExpertEmail ||
    conversation?.receiverEmail ||
    conversation?.ReceiverEmail ||
    conversation?.otherUser?.email ||
    conversation?.OtherUser?.Email ||
    ""
  );
}

function getLastMessage(conversation) {
  return (
    conversation?.lastMessage ||
    conversation?.LastMessage ||
    conversation?.latestMessage ||
    conversation?.LatestMessage ||
    conversation?.messagePreview ||
    conversation?.MessagePreview ||
    "No message yet"
  );
}

function getConversationUpdatedAt(conversation) {
  return (
    conversation?.updatedAt ||
    conversation?.UpdatedAt ||
    conversation?.lastMessageAt ||
    conversation?.LastMessageAt ||
    conversation?.createdAt ||
    conversation?.CreatedAt ||
    ""
  );
}

function getMessageId(message) {
  return (
    message?.messageId ||
    message?.MessageId ||
    message?.id ||
    message?.Id ||
    `${message?.senderId || "sender"}-${message?.createdAt || Math.random()}`
  );
}

function getMessageContent(message) {
  return (
    message?.content ||
    message?.Content ||
    message?.message ||
    message?.Message ||
    message?.text ||
    message?.Text ||
    ""
  );
}

function getMessageSenderId(message) {
  return (
    message?.senderId ||
    message?.SenderId ||
    message?.userId ||
    message?.UserId ||
    message?.createdBy ||
    message?.CreatedBy
  );
}

function getMessageCreatedAt(message) {
  return (
    message?.createdAt ||
    message?.CreatedAt ||
    message?.sentAt ||
    message?.SentAt ||
    message?.createdDate ||
    message?.CreatedDate ||
    ""
  );
}

function isMyMessage(message, user) {
  const senderId = getMessageSenderId(message);

  if (message?.isMine === true || message?.IsMine === true) {
    return true;
  }

  if (senderId && user?.id) {
    return String(senderId) === String(user.id);
  }

  const senderRole = String(message?.senderRole || message?.SenderRole || "")
    .trim()
    .toUpperCase();

  return senderRole === "EXPERT";
}

function formatTime(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getInitials(name) {
  if (!name) return "U";

  return name
    .split(" ")
    .map((item) => item[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function getFriendlyError(err, fallback) {
  const status = err?.response?.status;

  if (status === 401) {
    return "Your session has expired. Please login again.";
  }

  if (status === 403) {
    return "Backend blocked this request. Please check Expert permission.";
  }

  const data = err?.response?.data;

  if (typeof data === "string") return data;

  if (data?.message) return data.message;

  if (data?.title) return data.title;

  if (data?.errors) {
    const allErrors = Object.values(data.errors).flat();

    if (allErrors.length > 0) {
      return allErrors.join(" ");
    }
  }

  return err?.message || fallback || "Something went wrong.";
}