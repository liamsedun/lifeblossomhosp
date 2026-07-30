"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, ArrowLeft, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) setSent(true);
  };

  if (sent) {
    return (
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="pb-4 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-accent-light">
            <CheckCircle className="size-7 text-accent" />
          </div>
          <CardTitle className="text-xl text-primary">Check Your Email</CardTitle>
          <CardDescription className="mx-auto max-w-xs">
            We&apos;ve sent a password reset link to{" "}
            <span className="font-medium text-foreground">{email}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-sm text-text-secondary">
            Didn&apos;t receive the email? Check your spam folder or try again.
          </p>
        </CardContent>
        <CardFooter className="justify-center border-t border-border pt-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/login" className="gap-2">
              <ArrowLeft size={14} />
              Back to Login
            </Link>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md shadow-lg">
      <CardHeader className="pb-4 text-center">
        <CardTitle className="text-xl text-primary">Forgot Password</CardTitle>
        <CardDescription>
          Enter your email and we&apos;ll send you a reset link
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Email Address</label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-secondary" />
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
                required
              />
            </div>
          </div>

          <Button type="submit" className="w-full" size="lg">
            Send Reset Link
          </Button>
        </form>
      </CardContent>
      <CardFooter className="justify-center border-t border-border pt-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/login" className="gap-2">
            <ArrowLeft size={14} />
            Back to Login
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
