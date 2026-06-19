import { useEffect, useMemo, useRef, useState } from "react";
import ExpertLayout from "../../../components/layout/ExpertLayout";
import conversationService from "../../../services/conversation.service";

export default function MessagesPage() {
  const messagesEndRef = useRef(null);

  const [conversations, setConversations] = useState([]);
  const [selectedConversationId, setSelectedConversationId] = useState("");
  const [messages, setMessages] = useState([]);

  const [keyword, setKeyword] = useState("");
  const [messageText, setMessageText] = useState("");

  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const currentUserId = getCurrentUserId();

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (selectedConversationId) {
      loadMessages(selectedConversationId);
    }
  }, [selectedConversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const selectedConversation = useMemo(() => {
    return conversations.find(
      (item) => String(item.conversationId) === String(selectedConversationId)
    );
  }, [conversations, selectedConversationId]);

  const filteredConversations = useMemo(() => {
    const q = keyword.trim().toLowerCase();

    if (!q) return conversations;

    return conversations.filter((item) => {
      return (
        item.title?.toLowerCase().includes(q) ||
        item.otherUserName?.toLowerCase().includes(q) ||
        item.lastMessage?.toLowerCase().includes(q)
      );
    });
  }, [conversations, keyword]);

  const loadConversations = async () => {
    try {
      setLoadingConversations(true);
      setError("");

      const data = await conversationService.getMyConversations();

      setConversations(data);

      if (!selectedConversationId && data.length > 0) {
        setSelectedConversationId(data[0].conversationId);
      }
    } catch (err) {
      console.error("LOAD CONVERSATIONS ERROR:", err?.response?.data || err);

      setError(getFriendlyError(err, "Cannot load conversations."));
      setConversations([]);
    } finally {
      setLoadingConversations(false);
    }
  };

  const loadMessages = async (conversationId) => {
    try {
      setLoadingMessages(true);
      setError("");

      const data = await conversationService.getConversationMessages(
        conversationId
      );

      setMessages(data);
    } catch (err) {
      console.error("LOAD MESSAGES ERROR:", err?.response?.data || err);

      setError(getFriendlyError(err, "Cannot load messages."));
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSendMessage = async (event) => {
    event?.preventDefault();

    const content = messageText.trim();

    if (!content || !selectedConversationId || sending) return;

    try {
      setSending(true);
      setError("");

      const sentMessage = await conversationService.sendMessage(
        selectedConversationId,
        {
          content,
          messageText: content,
        }
      );

      setMessageText("");

      if (sentMessage) {
        setMessages((prev) => [
          ...prev,
          {
            ...sentMessage,
            isMine: true,
          },
        ]);
      } else {
        await loadMessages(selectedConversationId);
      }

      await loadConversations();
    } catch (err) {
      console.error("SEND MESSAGE ERROR:", err?.response?.data || err);

      setError(getFriendlyError(err, "Cannot send message."));
    } finally {
      setSending(false);
    }
  };

  const handleEnterToSend = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage(event);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  };

  return (
    <ExpertLayout>
      <div className="px-5 py-10 md:px-8">
        <div className="mx-auto max-w-7xl">
          <section className="mb-6 overflow-hidden rounded-3xl border border-white/10 bg-[#151a22] shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
            <div className="relative p-6 md:p-8">
              <div className="absolute right-0 top-0 h-52 w-52 rounded-full bg-cyan-400/10 blur-3xl" />
              <div className="absolute bottom-0 left-0 h-48 w-48 rounded-full bg-purple-400/10 blur-3xl" />

              <div className="relative flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-[#00F0FF]">
                    Messages
                  </p>

                  <h1 className="text-3xl font-extrabold text-white md:text-5xl">
                    Client conversations
                  </h1>

                  <p className="mt-4 max-w-3xl text-sm leading-7 text-gray-400">
                    Keep project communication organized with your active
                    clients and project contacts.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={loadConversations}
                  disabled={loadingConversations}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    refresh
                  </span>
                  {loadingConversations ? "Refreshing..." : "Refresh"}
                </button>
              </div>
            </div>
          </section>

          {error && (
            <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-300">
              {error}
            </div>
          )}

          <section className="grid min-h-[650px] grid-cols-1 overflow-hidden rounded-3xl border border-white/10 bg-[#151a22] shadow-[0_20px_70px_rgba(0,0,0,0.3)] lg:grid-cols-[360px_1fr]">
            <aside className="border-b border-white/10 bg-[#111720] lg:border-b-0 lg:border-r">
              <div className="border-b border-white/10 p-5">
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-lg text-gray-500">
                    search
                  </span>

                  <input
                    value={keyword}
                    onChange={(event) => setKeyword(event.target.value)}
                    placeholder="Search conversations..."
                    className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] pl-10 pr-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-[#00F0FF] focus:bg-white/[0.07]"
                  />
                </div>
              </div>

              <div className="max-h-[570px] overflow-y-auto p-3">
                {loadingConversations ? (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center text-sm text-gray-400">
                    Loading conversations...
                  </div>
                ) : filteredConversations.length === 0 ? (
                  <EmptyConversationList />
                ) : (
                  <div className="space-y-2">
                    {filteredConversations.map((conversation) => (
                      <ConversationItem
                        key={conversation.conversationId}
                        conversation={conversation}
                        active={
                          String(selectedConversationId) ===
                          String(conversation.conversationId)
                        }
                        onClick={() =>
                          setSelectedConversationId(
                            conversation.conversationId
                          )
                        }
                      />
                    ))}
                  </div>
                )}
              </div>
            </aside>

            <main className="flex min-h-[650px] flex-col">
              {!selectedConversation ? (
                <EmptyChat />
              ) : (
                <>
                  <div className="flex items-center justify-between gap-4 border-b border-white/10 bg-[#111720] px-5 py-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar
                        name={selectedConversation.otherUserName}
                        url={selectedConversation.otherUserAvatarUrl}
                      />

                      <div className="min-w-0">
                        <h2 className="truncate text-base font-extrabold text-white">
                          {selectedConversation.otherUserName || "User"}
                        </h2>

                        <p className="truncate text-xs text-gray-500">
                          {selectedConversation.title || "Conversation"}
                        </p>
                      </div>
                    </div>

                    <span className="hidden rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-gray-400 md:inline-flex">
                      {messages.length} message(s)
                    </span>
                  </div>

                  <div className="flex-1 overflow-y-auto px-5 py-6">
                    {loadingMessages ? (
                      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-10 text-center text-sm text-gray-400">
                        Loading messages...
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="flex min-h-[420px] items-center justify-center">
                        <div className="max-w-sm text-center">
                          <span className="material-symbols-outlined mb-3 block text-5xl text-gray-500">
                            forum
                          </span>

                          <h3 className="text-lg font-bold text-white">
                            No messages yet
                          </h3>

                          <p className="mt-2 text-sm leading-6 text-gray-500">
                            Start the conversation by sending your first
                            message.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {messages.map((message, index) => (
                          <MessageBubble
                            key={message.messageId || index}
                            message={message}
                            currentUserId={currentUserId}
                          />
                        ))}

                        <div ref={messagesEndRef} />
                      </div>
                    )}
                  </div>

                  <form
                    onSubmit={handleSendMessage}
                    className="border-t border-white/10 bg-[#111720] p-4"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-end">
                      <textarea
                        value={messageText}
                        onChange={(event) => setMessageText(event.target.value)}
                        onKeyDown={handleEnterToSend}
                        placeholder="Type your message..."
                        rows={2}
                        className="min-h-[52px] flex-1 resize-none rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-gray-600 focus:border-[#00F0FF] focus:bg-white/[0.07]"
                      />

                      <button
                        type="submit"
                        disabled={
                          sending ||
                          !messageText.trim() ||
                          !selectedConversationId
                        }
                        className="inline-flex h-[52px] items-center justify-center gap-2 rounded-2xl border border-cyan-400/50 bg-cyan-400/10 px-6 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          send
                        </span>
                        {sending ? "Sending..." : "Send"}
                      </button>
                    </div>

                    <p className="mt-2 text-xs text-gray-600">
                      Press Enter to send, Shift + Enter for a new line.
                    </p>
                  </form>
                </>
              )}
            </main>
          </section>
        </div>
      </div>
    </ExpertLayout>
  );
}

function ConversationItem({ conversation, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-2xl border p-4 text-left transition ${
        active
          ? "border-cyan-400/50 bg-cyan-400/10"
          : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]"
      }`}
    >
      <div className="flex gap-3">
        <Avatar
          name={conversation.otherUserName}
          url={conversation.otherUserAvatarUrl}
        />

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="truncate text-sm font-bold text-white">
              {conversation.otherUserName || "User"}
            </h3>

            <span className="shrink-0 text-[11px] text-gray-500">
              {formatShortDate(conversation.lastMessageAt)}
            </span>
          </div>

          <p className="mt-1 truncate text-xs font-semibold text-cyan-300">
            {conversation.title || "Conversation"}
          </p>

          <p className="mt-2 line-clamp-2 text-xs leading-5 text-gray-500">
            {conversation.lastMessage || "No messages yet."}
          </p>
        </div>
      </div>
    </button>
  );
}

function MessageBubble({ message, currentUserId }) {
  const mine =
    Boolean(message.isMine) ||
    (currentUserId &&
      String(message.senderUserId || "") === String(currentUserId || ""));

  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[82%] rounded-2xl border px-4 py-3 md:max-w-[68%] ${
          mine
            ? "border-cyan-400/30 bg-cyan-400/10 text-cyan-50"
            : "border-white/10 bg-white/[0.04] text-gray-100"
        }`}
      >
        {!mine && (
          <p className="mb-1 text-xs font-bold text-cyan-300">
            {message.senderName || "User"}
          </p>
        )}

        <p className="whitespace-pre-wrap text-sm leading-6">
          {message.content || ""}
        </p>

        {message.attachmentUrl && (
          <a
            href={message.attachmentUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs font-bold text-cyan-300 transition hover:text-cyan-200"
          >
            <span className="material-symbols-outlined text-[16px]">
              attach_file
            </span>
            Attachment
          </a>
        )}

        <p
          className={`mt-2 text-right text-[11px] ${
            mine ? "text-cyan-100/60" : "text-gray-500"
          }`}
        >
          {formatTime(message.createdAt)}
        </p>
      </div>
    </div>
  );
}

function Avatar({ name, url }) {
  if (url) {
    return (
      <img
        src={url}
        alt={name || "User"}
        className="h-11 w-11 shrink-0 rounded-2xl border border-white/10 object-cover"
      />
    );
  }

  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-cyan-400/30 bg-cyan-400/10 text-sm font-black text-cyan-300">
      {getInitials(name)}
    </div>
  );
}

function EmptyConversationList() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center">
      <span className="material-symbols-outlined mb-3 block text-5xl text-gray-500">
        forum
      </span>

      <h3 className="font-bold text-white">No conversations</h3>

      <p className="mt-2 text-sm leading-6 text-gray-500">
        Conversations with clients will appear here.
      </p>
    </div>
  );
}

function EmptyChat() {
  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <div className="max-w-md text-center">
        <span className="material-symbols-outlined mb-4 block text-6xl text-gray-500">
          chat
        </span>

        <h2 className="text-2xl font-extrabold text-white">
          Select a conversation
        </h2>

        <p className="mt-3 text-sm leading-6 text-gray-500">
          Choose a conversation from the left to view messages and continue your
          project discussion.
        </p>
      </div>
    </div>
  );
}

function getInitials(name) {
  return String(name || "U")
    .split(" ")
    .map((item) => item[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function getCurrentUserId() {
  const keys = ["user", "currentUser", "authUser"];

  for (const key of keys) {
    const value = localStorage.getItem(key);

    if (!value) continue;

    try {
      const user = JSON.parse(value);

      return (
        user?.userId ||
        user?.UserId ||
        user?.id ||
        user?.Id ||
        user?.accountId ||
        user?.AccountId ||
        ""
      );
    } catch {
      continue;
    }
  }

  return localStorage.getItem("userId") || "";
}

function formatShortDate(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString("vi-VN", {
    month: "2-digit",
    day: "2-digit",
  });
}

function formatTime(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getFriendlyError(err, fallback) {
  const data = err?.response?.data;

  if (typeof data === "string") return data;

  return data?.message || data?.title || err?.message || fallback;
}