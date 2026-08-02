"use client";

import { useEffect, useState } from "react";
import { AdminChatList } from "@/components/chat/admin-chat-list";
import { AdminChatWindow } from "@/components/chat/admin-chat-window";
import { MessageSquare } from "lucide-react";
import type { ChatListResponse } from "@/lib/api-types";
import { Card } from "@/components/ui/card";

export default function AdminChatsPage() {
  const [data, setData] = useState<ChatListResponse | null>(null);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);

  const load = async () => {
    try {
      const res = await fetch("/api/chats");
      const json = await res.json();
      if (json.success) setData(json.data);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="flex items-stretch gap-4 h-[calc(100dvh-170px)] lg:h-[calc(100dvh-120px)]">
      {/* Conversation list */}
      <Card className={`w-full lg:w-80 shrink-0 overflow-hidden border-white/[0.06] bg-[#0d1322]/60 ${activeChatId ? "hidden lg:flex" : "flex"}`}>
        <div className="w-full">
          <AdminChatList
            activeChatId={activeChatId}
            onSelect={(id) => setActiveChatId(id)}
            data={data}
            load={load}
          />
        </div>
      </Card>

      {/* Window */}
      <Card className={`flex-1 overflow-hidden border-white/[0.06] bg-[#0d1322]/60 ${activeChatId ? "flex" : "hidden lg:flex"}`}>
        {activeChatId ? (
          <AdminChatWindow chatId={activeChatId} />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="w-16 h-16 rounded-2xl bg-[#e0a84a]/10 border border-[#e0a84a]/20 flex items-center justify-center mb-4">
              <MessageSquare className="w-7 h-7 text-[#e0a84a]" />
            </div>
            <h3 className="text-white font-semibold">Select a conversation</h3>
            <p className="text-sm text-white/40 mt-1 max-w-xs">
              Choose a patient conversation on the left to start chatting in real time.
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
