"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Search, Plus, Eye, MoreHorizontal, Phone, Mail,
  Calendar, MapPin, Loader2, PenLine, Trash2, Clock,
  User, FileText,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn, formatDate } from "@/lib/utils";
import { usePatients, useCreatePatient } from "@/hooks/use-patients";
import DoctorNotesSection from "@/components/DoctorNotesSection";
import type { Patient } from "@/lib/api-types";

interface PatientForm {
  email: string; password: string; first_name: string; last_name: string;
  phone: string; gender: string; date_of_birth: string; blood_group: string;
  genotype: string; marital_status: string;
  address: string; city: string; state: string;
  emergency_contact_name: string; emergency_contact_phone: string;
}

const emptyForm: PatientForm = {
  email: "", password: "", first_name: "", last_name: "", phone: "",
  gender: "", date_of_birth: "", blood_group: "", genotype: "", marital_status: "",
  address: "", city: "", state: "", emergency_contact_name: "", emergency_contact_phone: "",
};

function getInitials(name: string) {
  return name.split(/\s+/).filter(Boolean).map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const genotypes = ["AA", "AS", "SS", "AC", "SC", "CC"];
const maritalStatuses = ["single", "married", "divorced", "widowed"];

export default function PatientsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");
  const { data: patientsData, loading, refresh } = usePatients();
  const { mutate: createPatient, loading: creating } = useCreatePatient();

  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editPatient, setEditPatient] = useState<Patient | null>(null);
  const [deletePatient, setDeletePatient] = useState<Patient | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<PatientForm>(emptyForm);
  const [formError, setFormError] = useState("");

  function resetForm() { setForm(emptyForm); setFormError(""); }

  const filtered = useMemo(() => {
    if (!patientsData) return [];
    return patientsData.filter((p) => {
      const name = `${p.user?.first_name || ""} ${p.user?.last_name || ""}`.toLowerCase();
      const num = p.patient_number?.toLowerCase() || "";
      return name.includes(search.toLowerCase()) || num.includes(search.toLowerCase());
    });
  }, [patientsData, search]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    if (!form.email || !form.password || !form.first_name || !form.last_name) {
      setFormError("Email, password, first name, and last name are required");
      return;
    }
    try {
      await createPatient(form as any);
      setShowAdd(false); resetForm(); refresh();
    } catch (err: any) { setFormError(err.message); }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editPatient) return;
    setFormError("");
    setSaving(true);
    try {
      const res = await fetch(`/api/patients/${editPatient.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Update failed");
      setEditPatient(null); refresh();
    } catch (err: any) { setFormError(err.message); }
    finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!deletePatient) return;
    setDeleting(true);
    try {
      await fetch(`/api/patients/${deletePatient.id}`, { method: "DELETE" });
      setDeletePatient(null); refresh();
    } catch { /* ignore */ }
    finally { setDeleting(false); }
  }

  function openEdit(p: Patient) {
    setEditPatient(p);
    setForm({
      email: p.user?.email || "", password: "",
      first_name: p.user?.first_name || "", last_name: p.user?.last_name || "",
      phone: p.user?.phone || "", gender: p.gender || "",
      date_of_birth: p.date_of_birth?.split("T")[0] || "",
      blood_group: p.blood_group || "", genotype: p.genotype || "",
      marital_status: p.marital_status || "",
      address: p.address || "",
      city: p.city || "", state: p.state || "",
      emergency_contact_name: p.emergency_contact_name || "",
      emergency_contact_phone: p.emergency_contact_phone || "",
    });
    setFormError("");
  }

  const getAge = (dob: string | null | undefined) => {
    if (!dob) return "—";
    const birthDate = new Date(dob);
    if (isNaN(birthDate.getTime())) return "—";
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
  };

  const capitalize = (s: string | null | undefined) => s ? s.charAt(0).toUpperCase() + s.slice(1) : "—";

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Patients</h1>
          <p className="text-sm text-white/50 mt-1">Manage all registered patients</p>
        </div>
        <Button onClick={() => { resetForm(); setShowAdd(true); }}
          className="bg-gradient-to-r from-[#e0a84a] to-amber-500 text-[#0a0f1a] font-semibold border-0">
          <Plus className="size-4" />Add Patient
        </Button>
      </div>

      <Card className="border-white/[0.06] bg-white/[0.03] backdrop-blur-xl">
        <CardContent className="p-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/40" />
            <Input placeholder="Search by name or ID..."
              className="h-9 pl-9 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/30"
              value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-white/[0.04] border border-white/[0.06]">
          {["all", "active", "inactive"].map((t) => (
            <TabsTrigger key={t} value={t}
              className="capitalize data-[state=active]:bg-white/[0.08] data-[state=active]:text-white text-white/50">
              {t}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={tab} className="mt-4">
          <Card className="border-white/[0.06] bg-white/[0.03] backdrop-blur-xl">
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="size-6 animate-spin text-[#e0a84a]" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="px-5 py-12 text-center text-sm text-white/40">
                  {patientsData?.length === 0 ? "No patients registered yet." : "No patients match your search."}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/[0.06] text-left text-xs text-white/40">
                        <th className="px-5 py-3.5 font-medium">Patient</th>
                        <th className="px-5 py-3.5 font-medium">ID</th>
                        <th className="px-5 py-3.5 font-medium">Phone</th>
                        <th className="px-5 py-3.5 font-medium">Email</th>
                        <th className="px-5 py-3.5 font-medium">Registered</th>
                        <th className="px-5 py-3.5 font-medium">Status</th>
                        <th className="px-5 py-3.5 font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((p) => {
                        const name = p.user ? `${p.user.first_name} ${p.user.last_name}` : p.id;
                        const initials = p.user ? getInitials(`${p.user.first_name} ${p.user.last_name}`) : "PT";
                        return (
                          <tr key={p.id} className="border-b border-white/[0.06] last:border-0 hover:bg-white/[0.02] transition-colors">
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-3">
                                <Avatar className="size-8 ring-1 ring-[#e0a84a]/20">
                                  <AvatarImage src="" alt={name} />
                                  <AvatarFallback className="text-xs bg-[#1a2540] text-[#e0a84a]">{initials}</AvatarFallback>
                                </Avatar>
                                <span className="font-medium text-white">{name}</span>
                              </div>
                            </td>
                            <td className="px-5 py-3 text-white/50 font-mono text-xs">{p.patient_number}</td>
                            <td className="px-5 py-3 text-white/50">{p.user?.phone || "—"}</td>
                            <td className="px-5 py-3 text-white/50">{p.user?.email || "—"}</td>
                            <td className="px-5 py-3 text-white/50">{p.created_at ? formatDate(p.created_at) : "N/A"}</td>
                            <td className="px-5 py-3">
                              <Badge className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/20">Active</Badge>
                            </td>
                            <td className="px-5 py-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button variant="ghost" size="sm"
                                  className="h-8 text-xs text-[#e0a84a]/70 hover:text-[#e0a84a]"
                                  onClick={() => setSelectedPatient(p)}>
                                  <Eye className="size-3.5 mr-1" />View
                                </Button>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="size-8 text-white/40 hover:text-white">
                                      <MoreHorizontal className="size-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-36 border-white/[0.06] bg-[#0d1322]/95 backdrop-blur-xl text-white/80">
                                    <DropdownMenuItem onClick={() => openEdit(p)}
                                      className="hover:bg-white/[0.06] hover:text-white">
                                      <PenLine className="size-3.5 mr-2" />Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => router.push("/admin/appointments")}
                                      className="hover:bg-white/[0.06] hover:text-white">
                                      <Calendar className="size-3.5 mr-2" />Schedule
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setDeletePatient(p)}
                                      className="text-red-400 hover:bg-white/[0.06] hover:text-red-300">
                                      <Trash2 className="size-3.5 mr-2" />Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* View Patient Dialog */}
      <Dialog open={!!selectedPatient} onOpenChange={(o) => { if (!o) setSelectedPatient(null); }}>
        <DialogContent className="max-w-2xl border-white/[0.06] bg-[#0d1322]/95 backdrop-blur-xl text-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">
              {selectedPatient?.user ? `${selectedPatient.user.first_name} ${selectedPatient.user.last_name}` : "Patient"}
            </DialogTitle>
            <DialogDescription className="text-white/50">Patient ID: {selectedPatient?.patient_number}</DialogDescription>
          </DialogHeader>
          {selectedPatient && (
            <Tabs defaultValue="info" className="mt-2">
              <TabsList className="bg-white/[0.04] border border-white/[0.06]">
                <TabsTrigger value="info" className="text-xs data-[state=active]:bg-white/[0.08] data-[state=active]:text-white text-white/50">
                  <User className="size-3.5 mr-1" />Patient Info
                </TabsTrigger>
                <TabsTrigger value="clinical-notes" className="text-xs data-[state=active]:bg-white/[0.08] data-[state=active]:text-white text-white/50">
                  <FileText className="size-3.5 mr-1" />Clinical Notes
                </TabsTrigger>
              </TabsList>

              <TabsContent value="info" className="mt-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-white/40 text-xs">Gender</p>
                    <p className="font-medium text-white">{capitalize(selectedPatient.gender)}</p>
                  </div>
                  <div>
                    <p className="text-white/40 text-xs">Age</p>
                    <p className="font-medium text-white">{getAge(selectedPatient.date_of_birth)}</p>
                  </div>
                  <div>
                    <p className="text-white/40 text-xs">Blood Group</p>
                    <p className="font-medium text-white">{selectedPatient.blood_group || "—"}</p>
                  </div>
                  <div>
                    <p className="text-white/40 text-xs">Genotype</p>
                    <p className="font-medium text-white">{selectedPatient.genotype || "—"}</p>
                  </div>
                  <div>
                    <p className="text-white/40 text-xs">Marital Status</p>
                    <p className="font-medium text-white capitalize">{capitalize(selectedPatient.marital_status)}</p>
                  </div>
                  <div>
                    <p className="text-white/40 text-xs">Status</p>
                    <Badge className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/20">Active</Badge>
                  </div>
                  <div className="col-span-2">
                    <p className="text-white/40 text-xs">Address</p>
                    <p className="font-medium text-white">{[selectedPatient.address, selectedPatient.city, selectedPatient.state].filter(Boolean).join(", ") || "—"}</p>
                  </div>
                  <div className="col-span-2 flex items-center gap-4 pt-2 border-t border-white/[0.06]">
                    <span className="flex items-center gap-1.5 text-xs text-white/50">
                      <Phone className="size-3.5" />{selectedPatient.user?.phone ? <a href={`tel:${selectedPatient.user.phone}`} className="text-blue-400 hover:underline">{selectedPatient.user.phone}</a> : "—"}
                    </span>
                    <span className="flex items-center gap-1.5 text-xs text-white/50">
                      <Mail className="size-3.5" />{selectedPatient.user?.email ? <a href={`mailto:${selectedPatient.user.email}`} className="text-blue-400 hover:underline">{selectedPatient.user.email}</a> : "—"}
                    </span>
                  </div>
                </div>
                <DialogFooter className="mt-4 pt-4 border-t border-white/[0.06]">
                  <DialogClose asChild>
                    <Button variant="outline" className="border-white/[0.08] text-white/70 hover:bg-white/[0.06]">Close</Button>
                  </DialogClose>
                  <Button onClick={() => { if (selectedPatient) openEdit(selectedPatient); setSelectedPatient(null); }}
                    className="bg-gradient-to-r from-[#e0a84a] to-amber-500 text-[#0a0f1a] font-semibold border-0">
                    <PenLine className="size-4 mr-1" />Edit
                  </Button>
                </DialogFooter>
              </TabsContent>

              <TabsContent value="clinical-notes" className="mt-4">
                <DoctorNotesSection patientId={selectedPatient.id} />
                <DialogFooter className="mt-4 pt-4 border-t border-white/[0.06]">
                  <DialogClose asChild>
                    <Button variant="outline" className="border-white/[0.08] text-white/70 hover:bg-white/[0.06]">Close</Button>
                  </DialogClose>
                </DialogFooter>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Patient Modal */}
      <Dialog open={showAdd} onOpenChange={(o) => { if (!creating) { setShowAdd(o); if (!o) resetForm(); } }}>
        <DialogContent className="sm:max-w-lg border-white/[0.06] bg-[#0d1322]/95 backdrop-blur-xl text-white max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-white">Add Patient</DialogTitle></DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1">First Name *</label>
                <Input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                  className="bg-white/[0.04] border-white/[0.08] text-white" required />
              </div>
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1">Last Name *</label>
                <Input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                  className="bg-white/[0.04] border-white/[0.08] text-white" required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1">Email *</label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="bg-white/[0.04] border-white/[0.08] text-white" required />
              </div>
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1">Password *</label>
                <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Min 6 chars" className="bg-white/[0.04] border-white/[0.08] text-white" required minLength={6} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1">Phone</label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="bg-white/[0.04] border-white/[0.08] text-white" />
              </div>
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1">Gender</label>
                <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}
                  className="flex h-10 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white">
                  <option value="" className="bg-[#0d1322]">Select</option>
                  <option value="male" className="bg-[#0d1322]">Male</option>
                  <option value="female" className="bg-[#0d1322]">Female</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1">Date of Birth</label>
                <Input type="date" value={form.date_of_birth} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })}
                  className="bg-white/[0.04] border-white/[0.08] text-white [color-scheme:dark]" />
              </div>
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1">Blood Group</label>
                <select value={form.blood_group} onChange={(e) => setForm({ ...form, blood_group: e.target.value })}
                  className="flex h-10 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white">
                  <option value="" className="bg-[#0d1322]">Select</option>
                  {bloodGroups.map((bg) => (
                    <option key={bg} value={bg} className="bg-[#0d1322]">{bg}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1">Genotype</label>
                <select value={form.genotype} onChange={(e) => setForm({ ...form, genotype: e.target.value })}
                  className="flex h-10 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white">
                  <option value="" className="bg-[#0d1322]">Select</option>
                  {genotypes.map((g) => (
                    <option key={g} value={g} className="bg-[#0d1322]">{g}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1">Marital Status</label>
              <select value={form.marital_status} onChange={(e) => setForm({ ...form, marital_status: e.target.value })}
                className="flex h-10 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white">
                <option value="" className="bg-[#0d1322]">Select</option>
                {maritalStatuses.map((m) => (
                  <option key={m} value={m} className="bg-[#0d1322] capitalize">{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1">Address</label>
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="bg-white/[0.04] border-white/[0.08] text-white" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1">City</label>
                <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className="bg-white/[0.04] border-white/[0.08] text-white" />
              </div>
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1">State</label>
                <Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })}
                  className="bg-white/[0.04] border-white/[0.08] text-white" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1">Emergency Contact Name</label>
                <Input value={form.emergency_contact_name} onChange={(e) => setForm({ ...form, emergency_contact_name: e.target.value })}
                  className="bg-white/[0.04] border-white/[0.08] text-white" />
              </div>
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1">Emergency Contact Phone</label>
                <Input value={form.emergency_contact_phone} onChange={(e) => setForm({ ...form, emergency_contact_phone: e.target.value })}
                  className="bg-white/[0.04] border-white/[0.08] text-white" />
              </div>
            </div>
            {formError && <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 px-3 py-2 text-sm text-rose-400">{formError}</div>}
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" className="border-white/[0.08] text-white/70 hover:bg-white/[0.06]">Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={creating}
                className="bg-gradient-to-r from-[#e0a84a] to-amber-500 text-[#0a0f1a] font-semibold border-0">
                {creating ? "Creating..." : "Create Patient"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Patient Modal */}
      <Dialog open={!!editPatient} onOpenChange={(o) => { if (!saving) { setEditPatient(null); resetForm(); } }}>
        <DialogContent className="sm:max-w-lg border-white/[0.06] bg-[#0d1322]/95 backdrop-blur-xl text-white max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-white">Edit Patient</DialogTitle></DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1">First Name</label>
                <Input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                  className="bg-white/[0.04] border-white/[0.08] text-white" />
              </div>
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1">Last Name</label>
                <Input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                  className="bg-white/[0.04] border-white/[0.08] text-white" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1">Phone</label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="bg-white/[0.04] border-white/[0.08] text-white" />
              </div>
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1">Gender</label>
                <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}
                  className="flex h-10 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white">
                  <option value="" className="bg-[#0d1322]">Select</option>
                  <option value="male" className="bg-[#0d1322]">Male</option>
                  <option value="female" className="bg-[#0d1322]">Female</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1">Date of Birth</label>
              <Input type="date" value={form.date_of_birth} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })}
                className="bg-white/[0.04] border-white/[0.08] text-white [color-scheme:dark]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1">Blood Group</label>
              <select value={form.blood_group} onChange={(e) => setForm({ ...form, blood_group: e.target.value })}
                className="flex h-10 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white">
                <option value="" className="bg-[#0d1322]">Select</option>
                {bloodGroups.map((bg) => (
                  <option key={bg} value={bg} className="bg-[#0d1322]">{bg}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1">Genotype</label>
                <select value={form.genotype} onChange={(e) => setForm({ ...form, genotype: e.target.value })}
                  className="flex h-10 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white">
                  <option value="" className="bg-[#0d1322]">Select</option>
                  {genotypes.map((g) => (
                    <option key={g} value={g} className="bg-[#0d1322]">{g}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1">Marital Status</label>
                <select value={form.marital_status} onChange={(e) => setForm({ ...form, marital_status: e.target.value })}
                  className="flex h-10 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white">
                  <option value="" className="bg-[#0d1322]">Select</option>
                  {maritalStatuses.map((m) => (
                    <option key={m} value={m} className="bg-[#0d1322] capitalize">{m}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1">Address</label>
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="bg-white/[0.04] border-white/[0.08] text-white" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1">City</label>
                <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className="bg-white/[0.04] border-white/[0.08] text-white" />
              </div>
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1">State</label>
                <Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })}
                  className="bg-white/[0.04] border-white/[0.08] text-white" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1">Emergency Contact Name</label>
                <Input value={form.emergency_contact_name} onChange={(e) => setForm({ ...form, emergency_contact_name: e.target.value })}
                  className="bg-white/[0.04] border-white/[0.08] text-white" />
              </div>
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1">Emergency Contact Phone</label>
                <Input value={form.emergency_contact_phone} onChange={(e) => setForm({ ...form, emergency_contact_phone: e.target.value })}
                  className="bg-white/[0.04] border-white/[0.08] text-white" />
              </div>
            </div>
            {formError && <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 px-3 py-2 text-sm text-rose-400">{formError}</div>}
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" className="border-white/[0.08] text-white/70 hover:bg-white/[0.06]">Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={saving}
                className="bg-gradient-to-r from-[#e0a84a] to-amber-500 text-[#0a0f1a] font-semibold border-0">
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deletePatient} onOpenChange={(o) => { if (!o) setDeletePatient(null); }}>
        <DialogContent className="sm:max-w-sm border-white/[0.06] bg-[#0d1322]/95 backdrop-blur-xl text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Deactivate Patient</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-white/60">
            Are you sure you want to deactivate <strong className="text-white">
              {deletePatient?.user ? `${deletePatient.user.first_name} ${deletePatient.user.last_name}` : "this patient"}
            </strong>? They will be unable to log in.
          </p>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" className="border-white/[0.08] text-white/70 hover:bg-white/[0.06]">Cancel</Button>
            </DialogClose>
            <Button type="button" variant="destructive" onClick={handleDelete} disabled={deleting}
              className="bg-gradient-to-r from-rose-500 to-pink-500 text-white border-0">
              {deleting ? "Deactivating..." : "Deactivate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
