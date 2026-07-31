"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AdminChatList } from "@/components/chat/admin-chat-list";
import { AdminChatWindow } from "@/components/chat/admin-chat-window";
import type { ChatListResponse } from "@/lib/api-types";
import { Card } from "@/components/ui/card";

export default function AdminChatDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<ChatListResponse | null>(null);

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
    <div className="flex items-stretch gap-4 h-[calc(100dvh-120px)]">
      <Card className="hidden lg:flex w-80 shrink-0 overflow-hidden border-white/[0.06] bg-[#0d1322]/60">
        <div className="w-full">
          <AdminChatList activeChatId={params.id} onSelect={(id) => router.push(`/admin/chats/${id}`)} data={data} load={load} />
        </div>
      </Card>

      <Card className="flex-1 overflow-hidden border-white/[0.06] bg-[#0d1322]/60">
        <AdminChatWindow chatId={params.id} />
      </Card>
    </div>
  );
}
