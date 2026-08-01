"use client";

import { useEffect, useState } from "react";
import { Stethoscope, PenLine, Trash2, Plus, KeyRound, Shield, ShieldOff, Landmark, Power } from "lucide-react";
import { useRoleGuard } from "@/hooks/use-role-guard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface Doctor {
  id: string;
  name: string;
  specialty: string;
  available: boolean;
  availability: string;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function SettingsPage() {
  const { authorized } = useRoleGuard(["super_admin", "accountant"]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [editDoctor, setEditDoctor] = useState<Doctor | null>(null);

  async function loadDoctors() {
    try {
      const res = await fetch("/api/landing/doctors");
      const json = await res.json();
      if (json.success) setDoctors(json.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDoctors();
  }, []);

  if (!authorized) return null;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-text-secondary mt-1">
          Manage site content and preferences
        </p>
      </div>

      <Tabs defaultValue="doctors">
        <TabsList>
          <TabsTrigger value="doctors">Doctors</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="bank-accounts">Bank Accounts</TabsTrigger>
          <TabsTrigger value="general">General</TabsTrigger>
        </TabsList>

        <TabsContent value="doctors">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Landing Page Doctors</CardTitle>
              <AddDoctorDialog onSaved={loadDoctors} />
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-16 animate-pulse rounded-lg bg-muted"
                    />
                  ))}
                </div>
              ) : doctors.length === 0 ? (
                <p className="text-sm text-text-secondary text-center py-8">
                  No doctors yet. Click "Add Doctor" to create one.
                </p>
              ) : (
                <div className="divide-y divide-border">
                  {doctors.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center gap-4 py-3"
                    >
                      <Avatar className="size-10 shrink-0">
                        <AvatarImage
                          src={
                            doc.image_url ||
                            `/images/doctors/doctor-${((doctors.indexOf(doc) % 4) + 1)}.svg`
                          }
                          alt={doc.name}
                        />
                        <AvatarFallback className="text-xs bg-primary-lighter text-primary font-semibold">
                          {getInitials(doc.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {doc.name}
                        </p>
                        <p className="text-xs text-text-secondary truncate">
                          {doc.specialty}
                        </p>
                      </div>
                      <Badge
                        variant={doc.available ? "success" : "warning"}
                        className="hidden sm:inline-flex text-[10px]"
                      >
                        {doc.available ? "Available" : "Limited"}
                      </Badge>
                      <div className="flex items-center gap-1 shrink-0">
                        <EditDoctorDialog
                          doctor={doc}
                          onSaved={loadDoctors}
                        />
                        <DeleteDoctorButton
                          doctorId={doc.id}
                          doctorName={doc.name}
                          onDeleted={loadDoctors}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <UsersTab />
        </TabsContent>

        <TabsContent value="bank-accounts">
          <BankAccountsTab />
        </TabsContent>

        <TabsContent value="general">
          <HospitalInfoTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface HospitalInfo {
  name: string;
  logo_url: string;
  address: string;
  phone: string;
  email: string;
  website: string;
}

function HospitalInfoTab() {
  const [form, setForm] = useState<HospitalInfo>({
    name: "",
    logo_url: "",
    address: "",
    phone: "",
    email: "",
    website: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/org")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          setForm({
            name: json.data.name || "",
            logo_url: json.data.logo_url || "/images/hosp-logo/life-blossom-logo.png",
            address: json.data.address || "",
            phone: json.data.phone || "",
            email: json.data.email || "",
            website: json.data.website || "",
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setSaving(true);
    try {
      const res = await fetch("/api/org", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          logo_url: form.logo_url.trim() || null,
          address: form.address.trim(),
          phone: form.phone.trim(),
          email: form.email.trim(),
          website: form.website.trim(),
        }),
      });
      const json = await res.json();
      if (json.success) {
        setMessage({ type: "success", text: "Hospital information saved. It will appear on new invoice printouts." });
      } else {
        setMessage({ type: "error", text: json.error || "Failed to save" });
      }
    } catch {
      setMessage({ type: "error", text: "Network error" });
    } finally {
      setSaving(false);
    }
  }

  const inputClass = "flex h-10 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Hospital Information</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-sm text-text-secondary">
              This information appears on the invoice header and footer when printing medical invoices.
            </p>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Hospital / Clinic Name</label>
              <Input
                placeholder="e.g. Life Blossom Hospital"
                className={inputClass}
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Logo URL</label>
              <Input
                placeholder="/images/hosp-logo/life-blossom-logo.png"
                className={inputClass}
                value={form.logo_url}
                onChange={(e) => setForm((f) => ({ ...f, logo_url: e.target.value }))}
              />
              {form.logo_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={form.logo_url} alt="Logo preview" className="mt-2 h-12 w-12 rounded-md bg-white border border-border object-contain p-1" />
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Address</label>
              <Input
                placeholder="e.g. 12 Adeola Odeku Street, Victoria Island, Lagos"
                className={inputClass}
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Phone</label>
                <Input
                  placeholder="e.g. +234 800 000 0000"
                  className={inputClass}
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Email</label>
                <Input
                  type="email"
                  placeholder="e.g. hello@lifeblossomcares.com.ng"
                  className={inputClass}
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Website</label>
              <Input
                placeholder="e.g. https://www.lifeblossomcares.com.ng"
                className={inputClass}
                value={form.website}
                onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
              />
            </div>
            {message && (
              <div className={`rounded-md p-3 text-sm ${message.type === "success" ? "bg-accent-light text-accent" : "bg-destructive/10 text-destructive"}`}>
                {message.text}
              </div>
            )}
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save Hospital Information"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

interface BankAccount {
  id: string;
  bank_name: string;
  account_name: string;
  account_number: string;
  is_active: boolean;
}

function BankAccountsTab() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [max, setMax] = useState(5);
  const [loading, setLoading] = useState(true);

  async function loadAccounts() {
    setLoading(true);
    try {
      const res = await fetch("/api/settings/bank-accounts");
      const json = await res.json();
      if (json.success) {
        setAccounts(json.data.accounts || []);
        setMax(json.data.max || 5);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAccounts();
  }, []);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg">Hospital Bank Accounts</CardTitle>
          <p className="text-sm text-text-secondary mt-1">
            Shown to patients when they choose Bank Transfer. Up to {max} accounts.
          </p>
        </div>
        <AddBankAccountDialog
          disabled={accounts.length >= max}
          onSaved={loadAccounts}
        />
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : accounts.length === 0 ? (
          <div className="text-center py-10">
            <Landmark className="size-10 text-text-secondary mx-auto mb-3" />
            <p className="text-sm text-text-secondary">
              No bank accounts yet. Patients need at least one to pay by Bank Transfer.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {accounts.map((acc) => (
              <div key={acc.id} className="flex items-center gap-4 py-3">
                <div className="size-10 rounded-xl bg-primary-lighter/60 flex items-center justify-center shrink-0">
                  <Landmark className="size-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{acc.bank_name}</p>
                  <p className="text-xs text-text-secondary truncate">
                    {acc.account_name} · <span className="font-mono">{acc.account_number}</span>
                  </p>
                </div>
                <Badge variant={acc.is_active ? "success" : "secondary"} className="text-[10px]">
                  {acc.is_active ? "Active" : "Hidden"}
                </Badge>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={async () => {
                      await fetch(`/api/settings/bank-accounts/${acc.id}`, {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ is_active: !acc.is_active }),
                      });
                      loadAccounts();
                    }}
                    className="rounded-lg p-2 text-text-secondary hover:text-foreground hover:bg-muted transition-colors"
                    title={acc.is_active ? "Hide from patients" : "Show to patients"}
                  >
                    <Power className="size-4" />
                  </button>
                  <EditBankAccountDialog account={acc} onSaved={loadAccounts} />
                  <DeleteBankAccountButton
                    accountId={acc.id}
                    accountLabel={`${acc.bank_name} ${acc.account_number}`}
                    onDeleted={loadAccounts}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function BankAccountDialogBody({
  form,
  setForm,
  error,
}: {
  form: { bank_name: string; account_name: string; account_number: string };
  setForm: (f: { bank_name: string; account_name: string; account_number: string }) => void;
  error: string;
}) {
  const inputClass = "flex h-10 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50";
  return (
    <>
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">Bank Name</label>
        <Input
          placeholder="e.g. Access Bank"
          className={inputClass}
          value={form.bank_name}
          onChange={(e) => setForm({ ...form, bank_name: e.target.value })}
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">Account Name</label>
        <Input
          placeholder="e.g. Life Blossom Hospital Ltd"
          className={inputClass}
          value={form.account_name}
          onChange={(e) => setForm({ ...form, account_name: e.target.value })}
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">Account Number</label>
        <Input
          placeholder="10-digit NUBAN account number"
          className={inputClass}
          value={form.account_number}
          onChange={(e) => setForm({ ...form, account_number: e.target.value.replace(/\D/g, "").slice(0, 10) })}
          required
        />
      </div>
      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      )}
    </>
  );
}

function AddBankAccountDialog({ disabled, onSaved }: { disabled: boolean; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ bank_name: "", account_name: "", account_number: "" });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (form.account_number.length !== 10) {
      setError("Account number must be exactly 10 digits");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/settings/bank-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bank_name: form.bank_name.trim(),
          account_name: form.account_name.trim(),
          account_number: form.account_number.trim(),
        }),
      });
      const json = await res.json();
      if (json.success) {
        setOpen(false);
        setForm({ bank_name: "", account_name: "", account_number: "" });
        onSaved();
      } else {
        setError(json.error || "Failed to save account");
      }
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" disabled={disabled} title={disabled ? `Maximum of 5 accounts reached` : "Add a bank account"}>
          <Plus className="size-4" />
          Add Account
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Add Bank Account</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <BankAccountDialogBody form={form} setForm={setForm} error={error} />
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" className="border-white/[0.08] text-white/70 hover:bg-white/[0.06]">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditBankAccountDialog({ account, onSaved }: { account: BankAccount; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    bank_name: account.bank_name,
    account_name: account.account_name,
    account_number: account.account_number,
  });

  useEffect(() => {
    setForm({
      bank_name: account.bank_name,
      account_name: account.account_name,
      account_number: account.account_number,
    });
  }, [account]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (form.account_number.length !== 10) {
      setError("Account number must be exactly 10 digits");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/settings/bank-accounts/${account.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bank_name: form.bank_name.trim(),
          account_name: form.account_name.trim(),
          account_number: form.account_number.trim(),
        }),
      });
      const json = await res.json();
      if (json.success) {
        setOpen(false);
        onSaved();
      } else {
        setError(json.error || "Failed to save account");
      }
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8">
          <PenLine className="size-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit Bank Account</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <BankAccountDialogBody form={form} setForm={setForm} error={error} />
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" className="border-white/[0.08] text-white/70 hover:bg-white/[0.06]">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteBankAccountButton({
  accountId,
  accountLabel,
  onDeleted,
}: {
  accountId: string;
  accountLabel: string;
  onDeleted: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      await fetch(`/api/settings/bank-accounts/${accountId}`, { method: "DELETE" });
      setOpen(false);
      onDeleted();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8 text-danger hover:text-danger hover:bg-danger/10">
          <Trash2 className="size-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete Bank Account</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-text-secondary">
          Remove <strong>{accountLabel}</strong>? Patients will no longer see it for Bank Transfer payments.
        </p>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" className="border-white/[0.08] text-white/70 hover:bg-white/[0.06]">
              Cancel
            </Button>
          </DialogClose>
          <Button type="button" variant="destructive" onClick={handleDelete} disabled={deleting}>
            {deleting ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface UserRecord {
  id: string;
  email: string;
  role: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  is_active: boolean;
  created_at: string;
}

function UsersTab() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState("");

  async function loadUsers() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (roleFilter) params.set("role", roleFilter);
      const res = await fetch(`/api/admin/users?${params}`);
      const json = await res.json();
      if (json.success) setUsers(json.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, [roleFilter]);

  async function toggleActive(userId: string, current: boolean) {
    try {
      await fetch(`/api/admin/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !current }),
      });
      loadUsers();
    } catch (e) {
      console.error(e);
    }
  }

  const roleOptions = ["", "super_admin", "admin", "doctor", "nurse", "accountant", "patient"];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">User Management</CardTitle>
        <div className="flex items-center gap-2">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="h-9 rounded-lg border border-border bg-card px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            <option value="">All Roles</option>
            {roleOptions.slice(1).map((r) => (
              <option key={r} value={r}>{r.replace("_", " ")}</option>
            ))}
          </select>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : users.length === 0 ? (
          <p className="text-sm text-text-secondary text-center py-8">No users found.</p>
        ) : (
          <div className="divide-y divide-border">
            {users.map((u) => (
              <div key={u.id} className="flex items-center gap-4 py-3">
                <Avatar className="size-9 shrink-0">
                  <AvatarFallback className="text-xs bg-primary-lighter text-primary font-semibold">
                    {u.first_name?.[0]}{u.last_name?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {u.first_name} {u.last_name}
                  </p>
                  <p className="text-xs text-text-secondary truncate">{u.email}</p>
                </div>
                <Badge
                  variant={
                    u.role === "super_admin" ? "default" :
                    u.role === "admin" ? "default" :
                    u.role === "doctor" ? "success" :
                    u.role === "nurse" ? "secondary" :
                    u.role === "accountant" ? "secondary" :
                    "outline"
                  }
                  className="hidden sm:inline-flex text-[10px] capitalize"
                >
                  {u.role.replace("_", " ")}
                </Badge>
                <Badge
                  variant={u.is_active ? "success" : "destructive"}
                  className="text-[10px]"
                >
                  {u.is_active ? "Active" : "Inactive"}
                </Badge>
                <div className="flex items-center gap-1 shrink-0">
                  <ResetPasswordDialog userId={u.id} userName={`${u.first_name} ${u.last_name}`} />
                  <button
                    onClick={() => toggleActive(u.id, u.is_active)}
                    className="rounded-lg p-2 text-text-secondary hover:text-foreground hover:bg-muted transition-colors"
                    title={u.is_active ? "Deactivate" : "Activate"}
                  >
                    {u.is_active ? <ShieldOff className="size-4" /> : <Shield className="size-4" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ResetPasswordDialog({ userId, userName }: { userId: string; userName: string }) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    if (password.length < 6) { setMessage("Password must be at least 6 characters"); return; }
    if (password !== confirm) { setMessage("Passwords do not match"); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const json = await res.json();
      if (json.success) {
        setMessage("Password reset successfully");
        setPassword("");
        setConfirm("");
      } else {
        setMessage(json.error || "Failed to reset password");
      }
    } catch {
      setMessage("Network error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className="rounded-lg p-2 text-text-secondary hover:text-foreground hover:bg-muted transition-colors"
          title="Reset Password"
        >
          <KeyRound className="size-4" />
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Reset Password</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-text-secondary mb-4">
          Set a new password for <strong>{userName}</strong>.
        </p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              New Password
            </label>
            <Input
              type="password"
              placeholder="Min 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Confirm Password
            </label>
            <Input
              type="password"
              placeholder="Repeat password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
          </div>
          {message && (
            <div
              className={`rounded-md p-3 text-sm ${
                message.includes("success")
                  ? "bg-accent-light text-accent"
                  : "bg-destructive/10 text-destructive"
              }`}
            >
              {message}
            </div>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" className="border-white/[0.08] text-white/70 hover:bg-white/[0.06]">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={saving}>
              {saving ? "Resetting..." : "Reset Password"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AddDoctorDialog({ onSaved }: { onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    specialty: "",
    available: "true",
    availability: "",
    image_url: "",
  });

  async function handleImageUpload(file: File) {
    setUploading(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await fetch("/api/upload/doctor-image", { method: "POST", body: fd });
      const json = await res.json();
      if (json.success) {
        setForm((f) => ({ ...f, image_url: json.data.image_url }));
      } else {
        setError(json.error || "Upload failed");
      }
    } catch {
      setError("Image upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.name.trim() || !form.specialty.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/landing/doctors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          specialty: form.specialty.trim(),
          available: form.available === "true",
          availability: form.availability.trim(),
          image_url: form.image_url || null,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setOpen(false);
        setForm({ name: "", specialty: "", available: "true", availability: "", image_url: "" });
        onSaved();
      } else {
        setError(json.error || "Failed to save doctor");
      }
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-4" />
          Add Doctor
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Doctor</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Photo
            </label>
            <div className="flex items-center gap-3">
              {form.image_url ? (
                <img src={form.image_url} alt="Preview" className="size-14 rounded-full object-cover border border-border" />
              ) : (
                <div className="size-14 rounded-full bg-muted flex items-center justify-center text-xs text-text-secondary border border-border">
                  No photo
                </div>
              )}
              <label className="cursor-pointer">
                <span className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg border border-border bg-card text-sm font-medium text-foreground hover:bg-muted transition-colors">
                  {uploading ? "Uploading..." : "Choose File"}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageUpload(file);
                  }}
                />
              </label>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Name
            </label>
            <Input
              placeholder="e.g. Dr. Sarah Johnson"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Specialty
            </label>
            <Input
              placeholder="e.g. Cardiologist"
              value={form.specialty}
              onChange={(e) =>
                setForm((f) => ({ ...f, specialty: e.target.value }))
              }
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Availability Text
            </label>
            <Input
              placeholder="e.g. Available Mon–Fri, 9 AM – 4 PM"
              value={form.availability}
              onChange={(e) =>
                setForm((f) => ({ ...f, availability: e.target.value }))
              }
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Status
            </label>
            <select
              value={form.available}
              onChange={(e) =>
                setForm((f) => ({ ...f, available: e.target.value }))
              }
              className="flex h-10 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              <option value="true">Available</option>
              <option value="false">Limited Availability</option>
            </select>
          </div>
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" className="border-white/[0.08] text-white/70 hover:bg-white/[0.06]">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={saving || uploading}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditDoctorDialog({
  doctor,
  onSaved,
}: {
  doctor: Doctor;
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: doctor.name,
    specialty: doctor.specialty,
    available: doctor.available ? "true" : "false",
    availability: doctor.availability,
    image_url: doctor.image_url || "",
  });

  useEffect(() => {
    setForm({
      name: doctor.name,
      specialty: doctor.specialty,
      available: doctor.available ? "true" : "false",
      availability: doctor.availability,
      image_url: doctor.image_url || "",
    });
  }, [doctor]);

  async function handleImageUpload(file: File) {
    setUploading(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await fetch("/api/upload/doctor-image", { method: "POST", body: fd });
      const json = await res.json();
      if (json.success) {
        setForm((f) => ({ ...f, image_url: json.data.image_url }));
      } else {
        setError(json.error || "Upload failed");
      }
    } catch {
      setError("Image upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.name.trim() || !form.specialty.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/landing/doctors/${doctor.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          specialty: form.specialty.trim(),
          available: form.available === "true",
          availability: form.availability.trim(),
          image_url: form.image_url || null,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setOpen(false);
        onSaved();
      } else {
        setError(json.error || "Failed to save doctor");
      }
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8">
          <PenLine className="size-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Doctor</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Photo
            </label>
            <div className="flex items-center gap-3">
              {form.image_url ? (
                <img src={form.image_url} alt="Preview" className="size-14 rounded-full object-cover border border-border" />
              ) : (
                <div className="size-14 rounded-full bg-muted flex items-center justify-center text-xs text-text-secondary border border-border">
                  No photo
                </div>
              )}
              <label className="cursor-pointer">
                <span className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg border border-border bg-card text-sm font-medium text-foreground hover:bg-muted transition-colors">
                  {uploading ? "Uploading..." : "Change Photo"}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageUpload(file);
                  }}
                />
              </label>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Name
            </label>
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Specialty
            </label>
            <Input
              value={form.specialty}
              onChange={(e) =>
                setForm((f) => ({ ...f, specialty: e.target.value }))
              }
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Availability Text
            </label>
            <Input
              value={form.availability}
              onChange={(e) =>
                setForm((f) => ({ ...f, availability: e.target.value }))
              }
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Status
            </label>
            <select
              value={form.available}
              onChange={(e) =>
                setForm((f) => ({ ...f, available: e.target.value }))
              }
              className="flex h-10 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              <option value="true">Available</option>
              <option value="false">Limited Availability</option>
            </select>
          </div>
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" className="border-white/[0.08] text-white/70 hover:bg-white/[0.06]">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={saving || uploading}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteDoctorButton({
  doctorId,
  doctorName,
  onDeleted,
}: {
  doctorId: string;
  doctorName: string;
  onDeleted: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      await fetch(`/api/landing/doctors/${doctorId}`, { method: "DELETE" });
      setOpen(false);
      onDeleted();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 text-danger hover:text-danger hover:bg-danger/10"
        >
          <Trash2 className="size-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete Doctor</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-text-secondary">
          Are you sure you want to delete <strong>{doctorName}</strong>? This
          action cannot be undone.
        </p>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" className="border-white/[0.08] text-white/70 hover:bg-white/[0.06]">
              Cancel
            </Button>
          </DialogClose>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
