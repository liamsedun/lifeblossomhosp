"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Mail, Lock, UserRound } from "lucide-react";
import { Input } from "@/components/ui/input";
import Logo from "@/components/ui/logo";
import { useAuth } from "@/contexts/auth-context";

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

export default function StaffLoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login({ loginType: "email", email, password });
      router.push("/admin");
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center px-4 py-12"
      style={{
        background: "radial-gradient(ellipse at 50% 40%, #12203050, transparent 60%), #0c1420",
      }}
    >
      <div className="mb-10 flex flex-col items-center gap-2">
        <Logo
          variant="full"
          iconSize={56}
          textClass="text-2xl font-bold !text-[#eef1f5]"
          subtitleClass="text-sm text-[#8fa0b3]"
        />
      </div>

      <div
        className="w-full max-w-md"
        style={styles.card}
      >
        <div className="pb-4 text-center pt-8 px-8">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full" style={{ background: "rgba(224,168,74,.15)" }}>
            <UserRound className="size-7" style={{ color: "#e0a84a" }} />
          </div>
          <h1 className="text-[26px] font-semibold" style={{ color: "#eef1f5" }}>
            Staff Portal
          </h1>
          <p className="mt-1.5 text-sm" style={styles.muted}>
            Sign in with your staff credentials
          </p>
        </div>

        <div className="px-8 pb-2">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label style={styles.label} className="block">Email Address</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2" style={{ color: "#566173" }} />
                <Input
                  type="email"
                  placeholder="staff@lifeblossom.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 border-0 w-full"
                  style={styles.input}
                  required
                />
              </div>
            </div>

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

            <div className="flex justify-end">
              <Link
                href="/forgot-password"
                className="text-sm font-medium underline-offset-4 hover:underline"
                style={styles.gold}
              >
                Forgot Password?
              </Link>
            </div>

            {error && (
              <div className="rounded-lg p-3 text-sm" style={{ background: "rgba(239,68,68,.12)", color: "#f87171", border: "1px solid rgba(239,68,68,.2)" }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-[13px] cursor-pointer transition-transform duration-150 hover:translate-y-[-1px] disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
              style={{ ...styles.goldGradient, boxShadow: "0 4px 14px rgba(224,168,74,.25)" }}
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>

        <div className="pt-4 pb-6 px-8 mt-4" style={{ borderTop: "1px solid rgba(255,255,255,.06)" }}>
          <p className="text-sm text-center" style={styles.muted}>
            Patient?{" "}
            <Link
              href="/login"
              className="font-medium underline-offset-4 hover:underline"
              style={styles.gold}
            >
              Go to Patient Portal
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
