"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home, Calendar, CreditCard, User, Bell, ChevronRight,
  MessageCircle, MessagesSquare, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import { useInboxRealtime } from "@/lib/chat";
import type { Notification } from "@/lib/api-types";

const tabs = [
  { href: "/patient", label: "Home", icon: Home },
  { href: "/patient/appointments", label: "Appointments", icon: Calendar },
  { href: "/patient/chats", label: "Chat", icon: MessagesSquare },
  { href: "/patient/payments", label: "Payments", icon: CreditCard },
  { href: "/patient/profile", label: "Profile", icon: User },
];

const typeIcons: Record<string, string> = {
  appointment_reminder: "📅",
  payment_due: "💳",
  lab_result: "🔬",
  prescription_refill: "💊",
  chat_message: "💬",
  general: "✉️",
};

export default function PatientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [chatUnread, setChatUnread] = useState(0);
  const [chatToast, setChatToast] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const bellRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;
    const fetchNotifs = () => {
      fetch("/api/notifications?page_size=20")
        .then((r) => r.json())
        .then((json) => {
          if (!json.success || !mounted) return;
          const all = json.data || [];
          setNotifications(all.slice(0, 10));
          setUnreadCount(all.filter((n: Notification) => !n.is_read).length);
        })
        .catch(() => {});
    };
    fetchNotifs();
    const id = setInterval(fetchNotifs, 20_000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, []);

  // Chat unread badge — poll + realtime push
  const [chatData, setChatData] = useState<{ chats: { id: string; other_user: { first_name: string; last_name: string } | null }[] } | null>(null);
  useEffect(() => {
    let mounted = true;
    const poll = () => {
      fetch("/api/chats")
        .then((r) => r.json())
        .then((json) => {
          if (json.success && mounted) {
            const total = (json.data.chats ?? []).reduce((acc: number, c: any) => acc + (c.unread_count ?? 0), 0);
            setChatUnread(total);
            setChatData(json.data);
          }
        })
        .catch(() => {});
    };
    poll();
    const id = setInterval(poll, 30_000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, []);

  useInboxRealtime(!!user, (ev) => {
    if (!user) return;
    if (ev.sender_id === user.id) return;
    setChatUnread((n) => n + 1);
    const chat = chatData?.chats.find((c) => c.id === ev.chat_id);
    const name = chat?.other_user ? `${chat.other_user.first_name} ${chat.other_user.last_name}`.trim() : "your care team";
    setChatToast(`New message from ${name}`);
    window.setTimeout(() => setChatToast(null), 4000);
  });

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        bellRef.current &&
        !bellRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const markAllRead = async () => {
    const res = await fetch("/api/notifications", { method: "PUT" });
    if (res.ok) {
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    }
  };

  const notificationTime = (sentAt: string) => {
    const ts = sentAt ? new Date(sentAt).getTime() : Date.now();
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return new Date(sentAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0f1a] via-[#0d1322] to-[#0f1a2e] flex flex-col">
      <div className="fixed inset-0 bg-[url('/grid.svg')] opacity-[0.03] pointer-events-none" />

      <header className="sticky top-0 z-40 bg-[#0d1322]/80 backdrop-blur-xl border-b border-white/[0.06] px-4 py-3">
        <div className="flex items-center justify-between max-w-lg mx-auto w-full">
          <div>
            <p className="text-xs text-white/50">Hello,</p>
            <h1 className="text-lg font-semibold text-white flex items-center gap-1">
              {user?.first_name || "Patient"}! <ChevronRight className="w-4 h-4 text-white/30" />
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="https://wa.me/2349058038476"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-full hover:bg-white/[0.06] transition-all group"
              title="Chat on WhatsApp"
            >
              <MessageCircle className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
            </a>
            <div className="relative">
              <button
                ref={bellRef}
                onClick={() => setShowDropdown(!showDropdown)}
                className="relative p-2 rounded-full hover:bg-white/[0.06] transition-all"
              >
                <Bell className="w-5 h-5 text-white/70" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 min-w-[18px] h-[18px] flex items-center justify-center bg-gradient-to-br from-[#e0a84a] to-amber-500 text-[#0a0f1a] text-[10px] font-bold rounded-full px-1 leading-none shadow-lg shadow-[#e0a84a]/20">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              {showDropdown && (
                <div
                  ref={dropdownRef}
                  className="absolute right-0 top-full mt-2 w-80 bg-[#0d1322]/95 backdrop-blur-xl border border-white/[0.06] rounded-2xl shadow-2xl z-50 overflow-hidden"
                >
                  <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
                    <h3 className="text-sm font-semibold text-white">Notifications</h3>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllRead}
                        className="text-xs text-[#e0a84a] hover:underline"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="px-4 py-8 text-center text-sm text-white/40">
                        No notifications yet
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => { if (n.link) window.location.href = n.link; }}
                          className={cn(
                            "flex items-start gap-3 px-4 py-3 border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] transition-colors",
                            n.link ? "cursor-pointer" : "cursor-default",
                            !n.is_read && "bg-[#e0a84a]/[0.04]"
                          )}
                        >
                          <span className="text-lg leading-none mt-0.5 shrink-0">
                            {typeIcons[n.type] || "📋"}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white/80 leading-tight">{n.title}</p>
                            {n.message && (
                              <p className="text-xs text-white/50 mt-0.5 line-clamp-2">{n.message}</p>
                            )}
                            <p className="text-[10px] text-white/30 mt-1">{notificationTime(n.sent_at)}</p>
                          </div>
                          {!n.is_read && (
                            <span className="w-2 h-2 rounded-full bg-[#e0a84a] shrink-0 mt-1.5" />
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-lg mx-auto w-full px-4 pb-20 pt-4">
        {chatToast && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-[#1a2540] border border-[#e0a84a]/30 text-white text-sm px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            {chatToast}
          </div>
        )}
        {children}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#0d1322]/90 backdrop-blur-xl border-t border-white/[0.06]">
        <div className="max-w-lg mx-auto flex items-center justify-around h-16 px-2">
          {tabs.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href || (href !== "/patient" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-200 relative",
                  isActive ? "text-[#e0a84a]" : "text-white/40 hover:text-white/70"
                )}
              >
                {isActive && (
                  <span className="absolute inset-0 rounded-xl bg-[#e0a84a]/10 border border-[#e0a84a]/20" />
                )}
                <span className="relative z-10">
                  <Icon className={cn("w-5 h-5", isActive && "drop-shadow-[0_0_6px_rgba(224,168,74,0.3)]")} />
                  {href === "/patient/chats" && chatUnread > 0 && (
                    <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 flex items-center justify-center bg-red-500 text-white text-[9px] font-bold rounded-full px-1 leading-none">
                      {chatUnread > 9 ? "9+" : chatUnread}
                    </span>
                  )}
                </span>
                <span className="text-[10px] font-medium leading-tight relative z-10">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
