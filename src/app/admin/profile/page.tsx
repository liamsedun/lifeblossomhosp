"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2, Save, ArrowLeft, Mail, Phone, User } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import { fileToSquareUpload } from "@/lib/avatar-resize";

export default function AdminProfilePage() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (user) {
      setFirstName(user.first_name || "");
      setLastName(user.last_name || "");
      setPhone(user.phone || "");
      setAvatarUrl(user.avatar_url || "");
    }
  }, [user]);

  const initials = user
    ? `${(user.first_name || "")[0] || ""}${(user.last_name || "")[0] || ""}`.toUpperCase() || "U"
    : "U";

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setMessage({ type: "error", text: "Image must be under 2MB" });
      return;
    }

    setUploading(true);
    setMessage(null);
    try {
      const resized = await fileToSquareUpload(file);
      const formData = new FormData();
      formData.append("avatar", resized);
      const res = await fetch("/api/upload/avatar", { method: "POST", body: formData });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Upload failed");
      setAvatarUrl(json.data.avatar_url);
      setMessage({ type: "success", text: "Photo updated" });
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSave = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      setMessage({ type: "error", text: "First name and last name are required" });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone: phone.trim() || null,
          avatar_url: avatarUrl || null,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Save failed");
      setMessage({ type: "success", text: "Profile saved successfully" });
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Profile</h1>
          <p className="text-sm text-white/50 mt-1">Manage your personal information</p>
        </div>
      </div>

      {/* Photo card */}
      <Card className="border-white/[0.06] bg-white/[0.03] backdrop-blur-xl">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="relative group">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#e0a84a]/40 to-[#e0a84a]/10 blur-md" />
              <Avatar className="size-24 ring-2 ring-[#e0a84a]/30 relative">
                <AvatarImage src={avatarUrl || ""} alt={firstName} />
                <AvatarFallback className="text-2xl bg-[#1a2540] text-[#e0a84a] font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute bottom-0 right-0 flex size-8 items-center justify-center rounded-full bg-[#e0a84a] text-[#0a0f1a] shadow-lg hover:bg-[#e0a84a]/90 transition-all disabled:opacity-50"
              >
                {uploading ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
              />
            </div>
            <div className="text-center sm:text-left">
              <h2 className="text-lg font-semibold text-white">{firstName} {lastName}</h2>
              <p className="text-sm text-white/50 capitalize">
                {user?.role?.replace("_", " ") || "Staff"}
              </p>
              <p className="text-xs text-white/30 mt-0.5">{user?.email || ""}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit form */}
      <Card className="border-white/[0.06] bg-white/[0.03] backdrop-blur-xl">
        <CardContent className="p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5">First Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/40" />
                <Input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="h-10 pl-10 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/30 focus-visible:border-[#e0a84a]/40 focus-visible:ring-[#e0a84a]/20"
                  placeholder="John"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5">Last Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/40" />
                <Input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="h-10 pl-10 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/30 focus-visible:border-[#e0a84a]/40 focus-visible:ring-[#e0a84a]/20"
                  placeholder="Doe"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-white/50 mb-1.5">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/40" />
              <Input
                value={user?.email || ""}
                disabled
                className="h-10 pl-10 bg-white/[0.02] border-white/[0.06] text-white/50 cursor-not-allowed"
              />
            </div>
            <p className="text-[11px] text-white/30 mt-1">Email cannot be changed. Contact admin for email changes.</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-white/50 mb-1.5">Phone</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/40" />
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="h-10 pl-10 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/30 focus-visible:border-[#e0a84a]/40 focus-visible:ring-[#e0a84a]/20"
                placeholder="+234 XXX XXX XXXX"
              />
            </div>
          </div>

          {message && (
            <div className={cn(
              "px-4 py-2.5 rounded-xl text-sm border",
              message.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                : "bg-red-500/10 border-red-500/20 text-red-400"
            )}>
              {message.text}
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-gradient-to-r from-[#e0a84a] to-amber-500 text-[#0a0f1a] font-semibold border-0 shadow-lg shadow-[#e0a84a]/20 h-10"
            >
              {saving ? <Loader2 className="size-4 animate-spin mr-1.5" /> : <Save className="size-4 mr-1.5" />}
              {saving ? "Saving..." : "Save Changes"}
            </Button>
            <Button
              variant="outline"
              onClick={() => router.back()}
              className="bg-white text-black border-border hover:bg-gray-100 h-10"
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Account info */}
      <Card className="border-white/[0.06] bg-white/[0.03] backdrop-blur-xl">
        <CardContent className="p-6">
          <h3 className="text-sm font-semibold text-white mb-3">Account Details</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-white/50">Role</p>
              <p className="text-sm text-white/80 capitalize mt-0.5">{user?.role?.replace("_", " ") || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-white/50">Member Since</p>
              <p className="text-sm text-white/80 mt-0.5">
                {user?.created_at ? new Date(user.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "—"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
