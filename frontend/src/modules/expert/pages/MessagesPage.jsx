import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import ExpertLayout from "../../../components/layout/ExpertLayout";
import conversationService from "../../../services/conversation.service";
import authService from "../../../services/auth.service";
import { formatTime } from "../../../utils/dateTime.utils";

const MESSAGE_POLL_INTERVAL_MS = 2000;
const CONVERSATION_POLL_INTERVAL_MS = 6000;

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

  const messagesEndRef = useRef(null);
  const pollingMessagesRef = useRef(false);
  const pollingConversationsRef = useRef(false);

  const selectedConversationId = getConversationId(selectedConversation || {});

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

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!selectedConversationId) return;

    const intervalId = setInterval(() => {
      refreshSelectedMessages(selectedConversationId);
    }, MESSAGE_POLL_INTERVAL_MS);

    return () => clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConversationId]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      refreshConversationsOnly();
    }, CONVERSATION_POLL_INTERVAL_MS);

    return () => clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConversationId]);

  const loadConversations = async (preferredConversationId = "") => {
    try {
      setLoadingConversations(true);
      setError("");

      const data = await conversationService.getConversations();

      let nextConversations = Array.isArray(data) ? data : [];

      let conversationToSelect =
        nextConversations.find(
          (item) =>
            String(getConversationId(item)) === String(preferredConversationId)
        ) || null;

      if (!conversationToSelect && preferredConversationId) {
        try {
          const conversation = await conversationService.getConversationById(
            preferredConversationId
          );

          if (conversation) {
            conversationToSelect = conversation;

            const existed = nextConversations.some(
              (item) =>
                String(getConversationId(item)) ===
                String(getConversationId(conversation))
            );

            if (!existed) {
              nextConversations = [conversation, ...nextConversations];
            }
          }
        } catch (err) {
          console.error(
            "LOAD PREFERRED CONVERSATION ERROR:",
            err?.response?.data || err
          );
        }
      }

      if (!conversationToSelect && nextConversations.length > 0) {
        conversationToSelect = nextConversations[0];
      }

      setConversations(nextConversations);

      if (!conversationToSelect) {
        setSelectedConversation(null);
        setMessages([]);
        return;
      }

      setSelectedConversation(conversationToSelect);

      const conversationId = getConversationId(conversationToSelect);

      if (conversationId) {
        await loadMessages(conversationId, { silent: false });
      }
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

  const loadMessages = async (conversationId, options = {}) => {
    if (!conversationId) return;

    const silent = Boolean(options.silent);

    try {
      if (!silent) {
        setLoadingMessages(true);
      }

      const data = await conversationService.getMessages(conversationId);
      const nextMessages = Array.isArray(data) ? data : [];

      setMessages((prevMessages) => {
        if (isSameMessageList(prevMessages, nextMessages)) {
          return prevMessages;
        }

        return nextMessages;
      });
    } catch (err) {
      console.error("LOAD MESSAGES ERROR:", err?.response?.data || err);

      if (!silent) {
        setError(getFriendlyError(err, "Cannot load messages."));
        setMessages([]);
      }
    } finally {
      if (!silent) {
        setLoadingMessages(false);
      }
    }
  };

  const refreshSelectedMessages = async (conversationId) => {
    if (!conversationId) return;

    if (pollingMessagesRef.current) return;

    try {
      pollingMessagesRef.current = true;

      const data = await conversationService.getMessages(conversationId);
      const nextMessages = Array.isArray(data) ? data : [];

      setMessages((prevMessages) => {
        if (isSameMessageList(prevMessages, nextMessages)) {
          return prevMessages;
        }

        return nextMessages;
      });
    } catch (err) {
      console.error("POLL MESSAGES ERROR:", err?.response?.data || err);
    } finally {
      pollingMessagesRef.current = false;
    }
  };

  const refreshConversationsOnly = async () => {
    if (pollingConversationsRef.current) return;

    try {
      pollingConversationsRef.current = true;

      const latestConversations = await conversationService.getConversations();
      const nextConversations = Array.isArray(latestConversations)
        ? latestConversations
        : [];

      setConversations(nextConversations);

      if (selectedConversationId) {
        const updatedSelected = nextConversations.find(
          (item) =>
            String(getConversationId(item)) === String(selectedConversationId)
        );

        if (updatedSelected) {
          setSelectedConversation(updatedSelected);
        }
      }
    } catch (err) {
      console.error("POLL CONVERSATIONS ERROR:", err?.response?.data || err);
    } finally {
      pollingConversationsRef.current = false;
    }
  };

  const handleSelectConversation = async (conversation) => {
    const conversationId = getConversationId(conversation);

    setSelectedConversation(conversation);

    if (conversationId) {
      setSearchParams({ conversationId: String(conversationId) });
      await loadMessages(conversationId, { silent: false });
    }
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

      await conversationService.sendMessage(conversationId, content);

      setMessageInput("");

      await loadMessages(conversationId, { silent: true });
      await refreshConversationsOnly();
    } catch (err) {
      console.error("SEND MESSAGE ERROR:", err?.response?.data || err);
      setError(getFriendlyError(err, "Cannot send message."));
    } finally {
      setSending(false);
    }
  };

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "end",
      });
    });
  };

  const cardStyle =
    "rounded-2xl border border-white/10 bg-[#151a22]/95 shadow-[0_14px_42px_rgba(0,0,0,0.24)]";

  return (
    <ExpertLayout>
      <style>{`
        .messages-hidden-scrollbar {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }

        .messages-hidden-scrollbar::-webkit-scrollbar {
          display: none;
          width: 0;
          height: 0;
        }
      `}</style>

      <div className="px-4 py-6 md:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-[#00F0FF]">
              Messages
            </p>
          </div>

          {error && (
            <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-300">
              {error}
            </div>
          )}

          <div
            className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]"
            style={{
              height: "clamp(560px, calc(100vh - 210px), 720px)",
            }}
          >
            <section
              className={`${cardStyle} flex min-h-0 flex-col overflow-hidden`}
            >
              <div className="shrink-0 border-b border-white/10 p-5">
                <h2 className="text-lg font-bold text-white">
                  Conversations
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Choose a conversation.
                </p>

                <div className="relative mt-4">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-xl text-gray-500">
                    search
                  </span>

                  <input
                    type="text"
                    value={searchText}
                    onChange={(event) => setSearchText(event.target.value)}
                    placeholder="Search messages..."
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-3 pl-12 pr-4 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-[#00F0FF] focus:bg-white/[0.07]"
                  />
                </div>
              </div>

              <div className="messages-hidden-scrollbar min-h-0 flex-1 overflow-y-auto">
                {loadingConversations && (
                  <div className="p-4">
                    <ConversationListSkeleton />
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
                  filteredConversations.map((conversation, index) => {
                    const conversationId = getConversationId(conversation);
                    const isActive =
                      String(selectedConversationId) === String(conversationId);

                    return (
                      <button
                        key={conversationId || index}
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
                              {formatTime(
                                getConversationUpdatedAt(conversation)
                              )}
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

            <section
              className={`${cardStyle} flex min-h-0 flex-col overflow-hidden`}
            >
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
                      Select a conversation to view messages.
                    </p>
                  </div>
                </div>
              )}

              {selectedConversation && (
                <>
                  <div className="shrink-0 flex items-center gap-4 border-b border-white/10 p-5">
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

                  <div className="messages-hidden-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
                    {loadingMessages && <MessageThreadSkeleton />}

                    {!loadingMessages && messages.length === 0 && (
                      <div className="p-8 text-center">
                        <span className="material-symbols-outlined mb-3 block text-5xl text-gray-500">
                          chat_bubble
                        </span>

                        <h3 className="font-bold text-white">
                          No messages yet
                        </h3>

                        <p className="mt-2 text-sm text-gray-500">
                          Start the conversation with a message.
                        </p>
                      </div>
                    )}

                    {!loadingMessages &&
                      messages.map((message, index) => {
                        const mine = isMyMessage(message, user);

                        return (
                          <div
                            key={getMessageId(message) || index}
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

                    <div ref={messagesEndRef} />
                  </div>

                  <form
                    onSubmit={handleSendMessage}
                    className="shrink-0 border-t border-white/10 p-5"
                  >
                    <div className="flex gap-3">
                      <input
                        type="text"
                        value={messageInput}
                        onChange={(event) =>
                          setMessageInput(event.target.value)
                        }
                        placeholder="Write a message..."
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
  return message?.messageId || message?.MessageId || message?.id || message?.Id;
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

  if (senderId && user?.userId) {
    return String(senderId) === String(user.userId);
  }

  const senderRole = String(message?.senderRole || message?.SenderRole || "")
    .trim()
    .toUpperCase();

  return senderRole === "EXPERT";
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

function isSameMessageList(currentMessages, nextMessages) {
  if (!Array.isArray(currentMessages) || !Array.isArray(nextMessages)) {
    return false;
  }

  if (currentMessages.length !== nextMessages.length) {
    return false;
  }

  const currentLast = currentMessages[currentMessages.length - 1];
  const nextLast = nextMessages[nextMessages.length - 1];

  return (
    String(getMessageId(currentLast)) === String(getMessageId(nextLast)) &&
    String(getMessageContent(currentLast)) === String(getMessageContent(nextLast)) &&
    String(getMessageCreatedAt(currentLast)) ===
      String(getMessageCreatedAt(nextLast))
  );
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

function ConversationListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="flex animate-pulse gap-3 rounded-xl p-2">
          <div className="h-11 w-11 shrink-0 rounded-full bg-white/10" />
          <div className="min-w-0 flex-1">
            <div className="h-4 w-2/3 rounded bg-white/10" />
            <div className="mt-2 h-3 w-full rounded bg-white/[0.06]" />
          </div>
        </div>
      ))}
    </div>
  );
}

function MessageThreadSkeleton() {
  return (
    <div className="space-y-4 py-4">
      {[false, true, false, true, false].map((mine, index) => (
        <div
          key={index}
          className={`flex animate-pulse ${mine ? "justify-end" : "justify-start"}`}
        >
          <div className="h-16 w-[55%] rounded-2xl bg-white/[0.06]" />
        </div>
      ))}
    </div>
  );
}