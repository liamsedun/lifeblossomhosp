"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  invoiceId: string;
  patientId?: string;
  amount?: number; // in Naira
  email?: string;
  disabled?: boolean;
  className?: string;
  onSuccess?: (reference: string) => void;
  onError?: (error: string) => void;
}

/**
 * Pay Now button — routes the patient to the payment-method page
 * (/patient/payments/:invoiceId/pay) where they can choose Paystack,
 * Bank Transfer (with declaration) or POS at the counter.
 */
export default function PayNowButton({ invoiceId, disabled, className }: Props) {
  return (
    <Link
      href={`/patient/payments/${invoiceId}/pay`}
      aria-disabled={disabled}
      className={cn(
        "inline-flex items-center justify-center gap-2 text-sm font-semibold",
        disabled && "pointer-events-none opacity-50",
        className
      )}
    >
      Pay Now
      <ExternalLink className="h-4 w-4" />
    </Link>
  );
}
