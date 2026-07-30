"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, Lock, User, Phone, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

const roles = [
  { value: "patient", label: "Patient" },
  { value: "doctor", label: "Doctor" },
  { value: "nurse", label: "Nurse" },
  { value: "staff", label: "Staff" },
];

const styles = {
  card: {
    background: "linear-gradient(180deg, #101a28, #0d1622)",
    border: "1px solid rgba(224,168,74,.25)",
    boxShadow: "0 0 20px rgba(224,168,74,.25), 0 0 60px rgba(224,168,74,.12)",
    borderRadius: "18px",
  },
  input: {
    background: "#0a1420",
    border: "1px solid rgba(255,255,255,.08)",
    color: "#eef1f5",
    borderRadius: "8px",
    fontSize: "14px",
    padding: "12px 14px",
  },
  label: {
    color: "#8fa0b3",
    fontSize: "13px",
    fontWeight: 500,
    marginBottom: "8px",
  },
  goldGradient: {
    background: "linear-gradient(180deg, #ffd98a, #e0a84a)",
    color: "#24160a",
    fontWeight: 700,
    fontSize: "15px",
    border: "none",
    borderRadius: "8px",
  },
  muted: { color: "#8fa0b3" },
  gold: { color: "#e0a84a" },
};

export default function RegisterPage() {
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    role: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const update = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      const nameParts = form.fullName.trim().split(" ");
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || firstName;
      const payload: Record<string, any> = {
        first_name: firstName,
        last_name: lastName,
        password: form.password,
        role: form.role || "patient",
      };
      if (form.email) payload.email = form.email;
      if (form.phone) payload.phone = form.phone;

      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Registration failed");
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const redirectTo = `${window.location.origin}/api/auth/callback?next=/patient`;
    window.location.href =
      `${supabaseUrl}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirectTo)}`;
  };

  if (success) {
    return (
      <Card className="w-full max-w-md" style={styles.card}>
        <CardHeader className="pb-4 text-center pt-10">
          <div className="flex justify-center mb-4">
            <div className="rounded-full p-3" style={{ background: "rgba(224,168,74,.15)" }}>
              <CheckCircle size={40} style={{ color: "#e0a84a" }} />
            </div>
          </div>
          <CardTitle className="text-[22px] font-semibold" style={{ color: "#eef1f5" }}>
            Check Your Email
          </CardTitle>
          <CardDescription className="mt-2 leading-relaxed" style={styles.muted}>
            We sent a confirmation link to your email. Please verify to complete registration.
          </CardDescription>
        </CardHeader>
        <CardFooter className="justify-center pt-4 pb-8" style={{ borderTop: "1px solid rgba(255,255,255,.06)" }}>
          <Link
            href="/login"
            className="text-sm font-medium underline-offset-4 hover:underline"
            style={styles.gold}
          >
            Go to Login
          </Link>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md" style={styles.card}>
      <CardHeader className="pb-4 text-center pt-8">
        <CardTitle className="text-[26px] font-semibold" style={{ color: "#eef1f5" }}>
          Create Account
        </CardTitle>
        <CardDescription style={styles.muted}>
          Join Life Blossom Hospital today
        </CardDescription>
      </CardHeader>
      <CardContent className="px-8">
        <Button
          variant="outline"
          className="w-full gap-2 h-12 rounded-lg font-medium border mb-4"
          style={{ background: "#0a1420", border: "1px solid rgba(255,255,255,.08)", color: "#eef1f5" }}
          size="lg"
          onClick={handleGoogleSignUp}
        >
          <GoogleIcon />
          Sign up with Google
        </Button>

        <div className="relative my-5">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full" style={{ borderTop: "1px solid rgba(255,255,255,.08)" }} />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="px-3 text-xs" style={{ background: "#0d1622", color: "#566173" }}>OR</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label style={styles.label} className="block">Full Name</label>
            <div className="relative">
              <User className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2" style={{ color: "#566173" }} />
              <Input
                placeholder="John Doe"
                value={form.fullName}
                onChange={update("fullName")}
                className="pl-10 border-0 w-full"
                style={styles.input}
                required
              />
            </div>
          </div>

          <div>
            <label style={styles.label} className="block">Email Address</label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2" style={{ color: "#566173" }} />
              <Input
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={update("email")}
                className="pl-10 border-0 w-full"
                style={styles.input}
                required
              />
            </div>
          </div>

          <div>
            <label style={styles.label} className="block">Phone Number</label>
            <div className="relative">
              <Phone className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2" style={{ color: "#566173" }} />
              <Input
                type="tel"
                placeholder="+234 800 000 0000"
                value={form.phone}
                onChange={update("phone")}
                className="pl-10 border-0 w-full"
                style={styles.input}
              />
            </div>
          </div>

          <div>
            <label style={styles.label} className="block">Password</label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2" style={{ color: "#566173" }} />
              <Input
                type="password"
                placeholder="Create a password"
                value={form.password}
                onChange={update("password")}
                className="pl-10 border-0 w-full"
                style={styles.input}
                required
              />
            </div>
          </div>

          <div>
            <label style={styles.label} className="block">Confirm Password</label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2" style={{ color: "#566173" }} />
              <Input
                type="password"
                placeholder="Confirm your password"
                value={form.confirmPassword}
                onChange={update("confirmPassword")}
                className="pl-10 border-0 w-full"
                style={styles.input}
                required
              />
            </div>
          </div>

          <div>
            <label style={styles.label} className="block">I am a</label>
            <Select
              options={roles}
              placeholder="Select your role"
              value={form.role}
              onChange={update("role")}
              style={{ background: "#0a1420", border: "1px solid rgba(255,255,255,.08)", color: "#eef1f5", borderRadius: "8px", fontSize: "14px" }}
            />
          </div>

          {error && (
            <div className="rounded-lg p-3 text-sm" style={{ background: "rgba(239,68,68,.12)", color: "#f87171", border: "1px solid rgba(239,68,68,.2)" }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} className="w-full py-[13px] cursor-pointer transition-transform duration-150 hover:translate-y-[-1px] disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]" style={{ ...styles.goldGradient, boxShadow: "0 4px 14px rgba(224,168,74,.25)" }}>
            {loading ? "Creating Account..." : "Create Account"}
          </button>
        </form>
      </CardContent>
      <CardFooter className="justify-center pt-4 pb-6" style={{ borderTop: "1px solid rgba(255,255,255,.06)" }}>
        <p className="text-sm" style={styles.muted}>
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium underline-offset-4 hover:underline"
            style={styles.gold}
          >
            Login
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}
