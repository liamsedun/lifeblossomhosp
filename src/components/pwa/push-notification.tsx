"use client";

import { useState, useEffect } from "react";
import { X, Calendar, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";

type Notification = {
  id: number;
  type: "appointment" | "payment";
  title: string;
  message: string;
  time: string;
};

const notifications: Notification[] = [
  {
    id: 1,
    type: "appointment",
    title: "Appointment Reminder",
    message: "You have a checkup with Dr. Adebayo tomorrow at 10:00 AM.",
    time: "1 hour ago",
  },
  {
    id: 2,
    type: "payment",
    title: "Payment Due",
    message: "Your outstanding balance of ₦45,000 is due in 3 days.",
    time: "3 hours ago",
  },
];

const typeStyles: Record<string, string> = {
  appointment: "bg-primary-lighter text-primary",
  payment: "bg-warning-light text-warning",
};

const typeIcons: Record<string, React.ElementType> = {
  appointment: Calendar,
  payment: CreditCard,
};

export default function PushNotificationUI() {
  const [visible, setVisible] = useState<Record<number, boolean>>({});

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible({ 1: true });
    }, 5000);
    const timer2 = setTimeout(() => {
      setVisible((prev) => ({ ...prev, 2: true }));
    }, 10000);
    return () => {
      clearTimeout(timer);
      clearTimeout(timer2);
    };
  }, []);

  const dismiss = (id: number) => {
    setVisible((prev) => ({ ...prev, [id]: false }));
  };

  return (
    <div className="fixed right-4 top-4 z-50 flex w-80 flex-col gap-2">
      {notifications.map(
        (n) =>
          visible[n.id] && (
            <div
              key={n.id}
              className="animate-in slide-in-from-right-4 fade-in rounded-xl border border-border bg-card p-4 shadow-xl card-shadow"
            >
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                    typeStyles[n.type]
                  )}
                >
                  {(() => {
                    const Icon = typeIcons[n.type];
                    return <Icon size={16} />;
                  })()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-foreground">
                      {n.title}
                    </p>
                    <button
                      onClick={() => dismiss(n.id)}
                      className="mt-0.5 shrink-0 text-text-secondary hover:text-foreground"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <p className="mt-0.5 text-xs text-text-secondary leading-relaxed">
                    {n.message}
                  </p>
                  <p className="mt-1 text-[10px] text-text-secondary">
                    {n.time}
                  </p>
                </div>
              </div>
            </div>
          )
      )}
    </div>
  );
}
