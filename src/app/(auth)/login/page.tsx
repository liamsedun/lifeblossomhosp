"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, Mail, Lock, Phone, Stethoscope, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { useAuth } from "@/contexts/auth-context";

type LoginTab = "email" | "google" | "phone" | "patient_id";

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

export default function LoginPage() {
  const { login } = useAuth();
  const [activeTab, setActiveTab] = useState<LoginTab>("email");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [patientId, setPatientId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const payload: Record<string, any> = { loginType: activeTab, password };
      if (activeTab === "email") payload.email = email;
      else if (activeTab === "phone") payload.phone = phone;
      else if (activeTab === "patient_id") payload.patientId = patientId;
      await login(payload);
      window.location.href = "/patient";
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const redirectTo = `${window.location.origin}/api/auth/callback`;
    window.location.href =
      `${supabaseUrl}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirectTo)}`;
  };

  return (
    <Card className="w-full max-w-md" style={styles.card}>
      <CardHeader className="pb-4 text-center pt-8">
        <CardTitle className="text-[26px] font-semibold" style={{ color: "#eef1f5" }}>
          Welcome Back
        </CardTitle>
        <CardDescription style={styles.muted}>
          Sign in to your patient portal
        </CardDescription>
      </CardHeader>
      <CardContent className="px-8">
        <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as LoginTab); setError(""); }}>
          <TabsList className="grid w-full grid-cols-4 rounded-lg p-0.5" style={{ background: "#0a1420", border: "1px solid rgba(255,255,255,.06)" }}>
            <TabsTrigger value="email" className="text-xs rounded-md py-1.5 data-[state=active]:text-[#24160a] data-[state=active]:font-semibold" style={activeTab === "email" ? { background: "linear-gradient(180deg, #ffd98a, #e0a84a)", color: "#24160a" } : { color: "#8fa0b3" }}>
              Email
            </TabsTrigger>
            <TabsTrigger value="google" className="text-xs rounded-md py-1.5 data-[state=active]:text-[#24160a] data-[state=active]:font-semibold" style={activeTab === "google" ? { background: "linear-gradient(180deg, #ffd98a, #e0a84a)", color: "#24160a" } : { color: "#8fa0b3" }}>
              Google
            </TabsTrigger>
            <TabsTrigger value="phone" className="text-xs rounded-md py-1.5 data-[state=active]:text-[#24160a] data-[state=active]:font-semibold" style={activeTab === "phone" ? { background: "linear-gradient(180deg, #ffd98a, #e0a84a)", color: "#24160a" } : { color: "#8fa0b3" }}>
              Phone
            </TabsTrigger>
            <TabsTrigger value="patient_id" className="text-xs rounded-md py-1.5 data-[state=active]:text-[#24160a] data-[state=active]:font-semibold" style={activeTab === "patient_id" ? { background: "linear-gradient(180deg, #ffd98a, #e0a84a)", color: "#24160a" } : { color: "#8fa0b3" }}>
              Patient ID
            </TabsTrigger>
          </TabsList>

          <TabsContent value="email">
            <form onSubmit={handleSubmit} className="space-y-4 pt-5">
              <div>
                <label style={styles.label} className="block">Email Address</label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2" style={{ color: "#566173" }} />
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 border-0 w-full"
                    style={styles.input}
                    required
                  />
                </div>
              </div>
              <PasswordInput
                password={password}
                setPassword={setPassword}
                showPassword={showPassword}
                setShowPassword={setShowPassword}
              />
              <ErrorMsg error={error} />
              <button type="submit" disabled={loading} className="w-full py-[13px] cursor-pointer transition-transform duration-150 hover:translate-y-[-1px] disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]" style={{ ...styles.goldGradient, boxShadow: "0 4px 14px rgba(224,168,74,.25)" }}>
                {loading ? "Signing in..." : "Sign In"}
              </button>
            </form>
          </TabsContent>

          <TabsContent value="google">
            <div className="space-y-4 pt-5">
              <p className="text-center text-sm" style={styles.muted}>
                Sign in instantly with your Google account
              </p>
              <Button
                variant="outline"
                className="w-full gap-2 h-12 rounded-lg font-medium border"
                style={{ background: "#0a1420", border: "1px solid rgba(255,255,255,.08)", color: "#eef1f5" }}
                size="lg"
                onClick={handleGoogleLogin}
                disabled={loading}
              >
                <GoogleIcon />
                Continue with Google
              </Button>
              <ErrorMsg error={error} />
            </div>
          </TabsContent>

          <TabsContent value="phone">
            <form onSubmit={handleSubmit} className="space-y-4 pt-5">
              <div>
                <label style={styles.label} className="block">Phone Number</label>
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2" style={{ color: "#566173" }} />
                  <Input
                    type="tel"
                    placeholder="+234 800 000 0000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="pl-10 border-0 w-full"
                    style={styles.input}
                    required
                  />
                </div>
              </div>
              <PasswordInput
                password={password}
                setPassword={setPassword}
                showPassword={showPassword}
                setShowPassword={setShowPassword}
              />
              <ErrorMsg error={error} />
              <button type="submit" disabled={loading} className="w-full py-[13px] cursor-pointer transition-transform duration-150 hover:translate-y-[-1px] disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]" style={{ ...styles.goldGradient, boxShadow: "0 4px 14px rgba(224,168,74,.25)" }}>
                {loading ? "Signing in..." : "Sign In"}
              </button>
            </form>
          </TabsContent>

          <TabsContent value="patient_id">
            <form onSubmit={handleSubmit} className="space-y-4 pt-5">
              <div>
                <label style={styles.label} className="block">Patient ID</label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2" style={{ color: "#566173" }} />
                  <Input
                    placeholder="e.g. PT-0001"
                    value={patientId}
                    onChange={(e) => setPatientId(e.target.value)}
                    className="pl-10 border-0 w-full"
                    style={styles.input}
                    required
                  />
                </div>
              </div>
              <PasswordInput
                password={password}
                setPassword={setPassword}
                showPassword={showPassword}
                setShowPassword={setShowPassword}
              />
              <ErrorMsg error={error} />
              <button type="submit" disabled={loading} className="w-full py-[13px] cursor-pointer transition-transform duration-150 hover:translate-y-[-1px] disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]" style={{ ...styles.goldGradient, boxShadow: "0 4px 14px rgba(224,168,74,.25)" }}>
                {loading ? "Signing in..." : "Sign In"}
              </button>
            </form>
          </TabsContent>
        </Tabs>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full" style={{ borderTop: "1px solid rgba(255,255,255,.08)" }} />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="px-3 text-xs" style={{ background: "#0d1622", color: "#566173" }}>OR</span>
          </div>
        </div>

        <button
          onClick={() => window.location.href = "/register"}
          className="w-full py-[13px] rounded-lg font-semibold text-sm cursor-pointer transition-transform duration-150 hover:translate-y-[-1px] active:scale-[0.98]"
          style={{ background: "transparent", border: "1px solid rgba(224,168,74,.4)", color: "#e0a84a" }}
        >
          Create Account
        </button>
      </CardContent>
      <CardFooter className="flex-col gap-3 pt-4 pb-6" style={{ borderTop: "1px solid rgba(255,255,255,.06)" }}>
        <div className="flex items-center gap-2 text-sm" style={styles.muted}>
          <Stethoscope size={14} />
          <span>
            Staff?{" "}
            <Link
              href="/staff/login"
              style={styles.gold}
              className="font-medium underline-offset-4 hover:underline"
            >
              Login via Staff Portal
            </Link>
          </span>
        </div>
      </CardFooter>
    </Card>
  );
}

function PasswordInput({
  password, setPassword, showPassword, setShowPassword,
}: {
  password: string;
  setPassword: (v: string) => void;
  showPassword: boolean;
  setShowPassword: (v: boolean) => void;
}) {
  return (
    <div>
      <label style={styles.label} className="block">Password</label>
      <div className="relative">
        <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2" style={{ color: "#566173" }} />
        <Input
          type={showPassword ? "text" : "password"}
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="pl-10 pr-10 border-0 w-full"
          style={styles.input}
          required
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-1/2 -translate-y-1/2 hover:opacity-80"
          style={{ color: "#566173" }}
          tabIndex={-1}
        >
          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
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

function ErrorMsg({ error }: { error: string }) {
  if (!error) return null;
  return (
    <div className="rounded-lg p-3 text-sm" style={{ background: "rgba(239,68,68,.12)", color: "#f87171", border: "1px solid rgba(239,68,68,.2)" }}>
      {error}
    </div>
  );
}
