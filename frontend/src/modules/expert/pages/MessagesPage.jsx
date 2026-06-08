import { useEffect, useState } from "react";
import ExpertLayout from "../../../components/layout/ExpertLayout";
import chatService from "../../../services/chat.service";
import authService from "../../../services/auth.service";

export default function MessagesPage() {
    const user = authService.getCurrentUser?.();

    const [conversations, setConversations] = useState([]);
    const [selectedConversation, setSelectedConversation] = useState(null);
    const [messages, setMessages] = useState([]);

    const [messageInput, setMessageInput] = useState("");

    const [loadingConversations, setLoadingConversations] = useState(true);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [sending, setSending] = useState(false);

    const [error, setError] = useState("");

    useEffect(() => {
        loadConversations();
    }, []);

    const loadConversations = async () => {
        try {
            setLoadingConversations(true);
            setError("");

            const data = await chatService.getConversations();
            setConversations(data);

            if (data.length > 0) {
                setSelectedConversation(data[0]);
                await loadMessages(getConversationId(data[0]));
            }
        } catch (err) {
            console.error(err);
            setError("Cannot load conversations. Please check backend API.");
            setConversations([]);
        } finally {
            setLoadingConversations(false);
        }
    };

    const loadMessages = async (conversationId) => {
        try {
            setLoadingMessages(true);
            setError("");

            const data = await chatService.getMessages(conversationId);
            setMessages(data);
        } catch (err) {
            console.error(err);
            setError("Cannot load messages. Please check backend API.");
            setMessages([]);
        } finally {
            setLoadingMessages(false);
        }
    };

    const handleSelectConversation = async (conversation) => {
        setSelectedConversation(conversation);
        await loadMessages(getConversationId(conversation));
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

            await chatService.sendMessage(
                getConversationId(selectedConversation),
                content
            );

            setMessageInput("");
            await loadMessages(getConversationId(selectedConversation));
            await loadConversations();
        } catch (err) {
            console.error(err);
            setError("Cannot send message. Please check backend API.");
        } finally {
            setSending(false);
        }
    };

    const getConversationId = (conversation) => {
        return (
            conversation.id ||
            conversation.conversationId ||
            conversation.conversationID
        );
    };

    const getConversationName = (conversation) => {
        return (
            conversation.clientName ||
            conversation.expertName ||
            conversation.receiverName ||
            conversation.userName ||
            conversation.otherUser?.fullName ||
            conversation.otherUser?.name ||
            "Conversation"
        );
    };

    const getConversationEmail = (conversation) => {
        return (
            conversation.clientEmail ||
            conversation.expertEmail ||
            conversation.receiverEmail ||
            conversation.otherUser?.email ||
            ""
        );
    };

    const getLastMessage = (conversation) => {
        return (
            conversation.lastMessage ||
            conversation.latestMessage ||
            conversation.messagePreview ||
            "No message yet"
        );
    };

    const getMessageId = (message) => {
        return message.id || message.messageId || message.messageID;
    };

    const getMessageContent = (message) => {
        return message.content || message.message || message.text || "";
    };

    const getMessageSenderId = (message) => {
        return message.senderId || message.userId || message.createdBy;
    };

    const isMyMessage = (message) => {
        const senderId = getMessageSenderId(message);

        if (!senderId || !user?.id) {
            return message.senderRole === "EXPERT" || message.isMine === true;
        }

        return String(senderId) === String(user.id);
    };

    const getCreatedAt = (item) => {
        return item.createdAt || item.sentAt || item.createdDate;
    };

    const formatTime = (value) => {
        if (!value) return "";

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) return "";

        return date.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const getInitials = (name) => {
        if (!name) return "U";

        return name
            .split(" ")
            .map((item) => item[0])
            .join("")
            .slice(0, 2)
            .toUpperCase();
    };

    const cardStyle =
        "rounded-2xl border border-white/10 bg-[#151a22]/95 shadow-[0_18px_50px_rgba(0,0,0,0.3)]";

    return (
        <ExpertLayout>
            <div className="px-5 py-10 md:px-8">
                <div className="mx-auto max-w-7xl">
                    {/* Header */}
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
                        {/* Conversation list */}
                        <section className={`${cardStyle} overflow-hidden`}>
                            <div className="border-b border-white/10 p-5">
                                <h2 className="text-lg font-bold text-white">
                                    Conversations
                                </h2>

                                <p className="mt-1 text-sm text-gray-500">
                                    Select a client to start chatting.
                                </p>
                            </div>

                            <div className="max-h-[650px] overflow-y-auto">
                                {loadingConversations && (
                                    <div className="p-8 text-center text-sm text-gray-400">
                                        Loading conversations...
                                    </div>
                                )}

                                {!loadingConversations && conversations.length === 0 && (
                                    <div className="p-8 text-center">
                                        <span className="material-symbols-outlined mb-3 block text-5xl text-gray-500">
                                            forum
                                        </span>

                                        <h3 className="font-bold text-white">
                                            No conversations
                                        </h3>

                                        <p className="mt-2 text-sm text-gray-500">
                                            Your conversations will appear here.
                                        </p>
                                    </div>
                                )}

                                {!loadingConversations &&
                                    conversations.map((conversation) => {
                                        const conversationId = getConversationId(conversation);
                                        const isActive =
                                            getConversationId(selectedConversation || {}) ===
                                            conversationId;

                                        return (
                                            <button
                                                key={conversationId}
                                                type="button"
                                                onClick={() => handleSelectConversation(conversation)}
                                                className={`flex w-full items-start gap-4 border-b border-white/10 p-5 text-left transition ${isActive
                                                        ? "bg-cyan-400/10"
                                                        : "hover:bg-white/[0.04]"
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
                                                            {formatTime(getCreatedAt(conversation))}
                                                        </span>
                                                    </div>

                                                    {getConversationEmail(conversation) && (
                                                        <p className="mt-1 truncate text-xs text-gray-500">
                                                            {getConversationEmail(conversation)}
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

                        {/* Chat box */}
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
                                    {/* Chat header */}
                                    <div className="flex items-center gap-4 border-b border-white/10 p-5">
                                        <div className="flex h-11 w-11 items-center justify-center rounded-full border border-cyan-400/30 bg-cyan-400/10 text-sm font-bold text-cyan-300">
                                            {getInitials(getConversationName(selectedConversation))}
                                        </div>

                                        <div>
                                            <h2 className="font-bold text-white">
                                                {getConversationName(selectedConversation)}
                                            </h2>

                                            <p className="text-sm text-gray-500">
                                                {getConversationEmail(selectedConversation) ||
                                                    "Client conversation"}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Messages */}
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
                                                const mine = isMyMessage(message);

                                                return (
                                                    <div
                                                        key={getMessageId(message)}
                                                        className={`flex ${mine ? "justify-end" : "justify-start"
                                                            }`}
                                                    >
                                                        <div
                                                            className={`max-w-[75%] rounded-2xl px-4 py-3 ${mine
                                                                    ? "bg-cyan-400 text-black"
                                                                    : "border border-white/10 bg-white/[0.05] text-gray-200"
                                                                }`}
                                                        >
                                                            <p className="whitespace-pre-line text-sm leading-6">
                                                                {getMessageContent(message)}
                                                            </p>

                                                            <p
                                                                className={`mt-2 text-right text-[11px] ${mine ? "text-black/60" : "text-gray-500"
                                                                    }`}
                                                            >
                                                                {formatTime(getCreatedAt(message))}
                                                            </p>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                    </div>

                                    {/* Input */}
                                    <form
                                        onSubmit={handleSendMessage}
                                        className="border-t border-white/10 p-5"
                                    >
                                        <div className="flex gap-3">
                                            <input
                                                type="text"
                                                value={messageInput}
                                                onChange={(event) =>
                                                    setMessageInput(event.target.value)
                                                }
                                                placeholder="Type your message..."
                                                className="flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-[#00F0FF] focus:bg-white/[0.07]"
                                            />

                                            <button
                                                type="submit"
                                                disabled={sending}
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