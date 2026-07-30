"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, ExternalLink } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";

interface Props {
  invoiceId: string;
  patientId: string;
  amount: number; // in Naira
  email?: string;
  disabled?: boolean;
  className?: string;
  onSuccess?: (reference: string) => void;
  onError?: (error: string) => void;
}

/**
 * Pay Now button — initializes a Paystack transaction and redirects
 * the user to the Paystack checkout page.
 */
export default function PayNowButton({
  invoiceId,
  patientId,
  amount,
  email,
  disabled,
  className,
  onSuccess,
  onError,
}: Props) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const handlePay = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/payments/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoice_id: invoiceId,
          patient_id: patientId,
          email: email || user?.email,
          amount,
        }),
      });

      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to initialize payment");

      // Redirect to Paystack checkout
      window.location.href = json.data.authorization_url;
    } catch (err: any) {
      onError?.(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handlePay}
      disabled={disabled || loading}
      className={className}
    >
      {loading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Redirecting...
        </>
      ) : (
        <>
          Pay Now
          <ExternalLink className="ml-2 h-4 w-4" />
        </>
      )}
    </Button>
  );
}
