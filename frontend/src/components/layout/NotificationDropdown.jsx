import { useState } from "react";

const notifications = [
  {
    id: 1,
    type: "proposal",
    icon: "assignment",
    title: "New proposal submitted",
    message: "Nguyen AI Expert submitted a proposal for your chatbot project.",
    time: "2 minutes ago",
    unread: true,
  },
  {
    id: 2,
    type: "message",
    icon: "chat_bubble",
    title: "New message from AI Expert",
    message: "Elena Kostic sent you a message about the project scope.",
    time: "15 minutes ago",
    unread: true,
  },
  {
    id: 3,
    type: "wallet",
    icon: "account_balance_wallet",
    title: "Wallet transaction updated",
    message: "Your deposit request of $500 has been processed successfully.",
    time: "1 hour ago",
    unread: false,
  },
  {
    id: 4,
    type: "withdraw",
    icon: "payments",
    title: "Withdrawal request",
    message: "Your withdrawal request is waiting for admin approval.",
    time: "3 hours ago",
    unread: false,
  },
];

export default function NotificationDropdown() {
  const [open, setOpen] = useState(false);

  const unreadCount = notifications.filter((n) => n.unread).length;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="relative rounded-lg border border-white/10 bg-white/5 p-2 text-gray-400 transition-all hover:border-cyan-400/40 hover:text-cyan-400 hover:shadow-[0_0_14px_rgba(0,240,255,0.25)]"
      >
        <span className="material-symbols-outlined">notifications</span>

        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-3 w-80 overflow-hidden rounded-2xl border border-white/10 bg-[#151922] shadow-2xl shadow-black/40">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <div>
              <h3 className="text-sm font-bold text-white">Notifications</h3>
              <p className="text-xs text-gray-400">{unreadCount} unread notifications</p>
            </div>

            <button className="text-xs font-medium text-cyan-400 hover:underline">
              Mark all read
            </button>
          </div>

          <div className=" max-h-96 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-cyan-400/30 hover:[&::-webkit-scrollbar-thumb]:bg-cyan-400/60  ">
            {notifications.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`flex w-full gap-3 border-b border-white/5 px-4 py-3 text-left transition-all hover:bg-white/[0.04] ${
                  item.unread ? "bg-cyan-400/[0.04]" : ""
                }`}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-400">
                  <span className="material-symbols-outlined text-[18px]">
                    {item.icon}
                  </span>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-white">{item.title}</p>
                    {item.unread && (
                      <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-cyan-400 shadow-[0_0_8px_#00F0FF]" />
                    )}
                  </div>

                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-gray-400">
                    {item.message}
                  </p>

                  <p className="mt-2 text-[11px] text-gray-500">{item.time}</p>
                </div>
              </button>
            ))}
          </div>

          <button className="w-full border-t border-white/10 px-4 py-3 text-center text-xs font-bold text-cyan-400 transition hover:bg-cyan-400/10">
            View all notifications
          </button>
        </div>
      )}
    </div>
  );
}