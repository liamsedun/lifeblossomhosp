"use client";

import dynamic from "next/dynamic";

const BillingContent = dynamic(() => import("./page-content"), { ssr: false });

export default function BillingPage() {
  return <BillingContent />;
}
