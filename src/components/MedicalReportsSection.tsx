"use client";

import { useState, useEffect } from "react";
import { FileText, Plus, Loader2, Printer, Trash2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { formatDate } from "@/lib/utils";

export interface MedicalReport {
  id: string;
  reference_number: string;
  report_date: string;
  content: string;
  author_name: string;
  author_title: string | null;
  created_at: string;
}

export interface ReportPatient {
  name: string;
  address?: string;
  phone?: string;
}

interface OrgHeader {
  name: string;
  logo_url: string | null;
  address: string;
  phone: string;
  email: string;
  website: string;
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function printReport(org: OrgHeader, report: MedicalReport, patient: ReportPatient) {
  const win = window.open("", "_blank", "width=820,height=1050");
  if (!win) {
    alert("Please allow pop-ups to print the medical report.");
    return;
  }
  const orgName = esc(org.name || "Life Blossom Hospital");
  const contact = [org.phone && `Tel: ${esc(org.phone)}`, org.email && `Email: ${esc(org.email)}`, org.website && esc(org.website)].filter(Boolean).join(" &nbsp;•&nbsp; ");
  const html = `<!doctype html><html><head><meta charset="utf-8" /><title>Medical Report ${esc(report.reference_number)}</title>
<style>
  body { font-family: Georgia, 'Times New Roman', serif; color: #111; margin: 32px; font-size: 13px; }
  .org-header { text-align: center; border-bottom: 2px solid #111; padding-bottom: 12px; margin-bottom: 18px; }
  .org-header img { max-height: 56px; object-fit: contain; }
  .org-name { font-size: 18px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; margin-top: 6px; }
  .org-meta { font-size: 11px; color: #333; margin-top: 4px; }
  .title { text-align: center; font-size: 16px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; margin: 10px 0 2px; }
  .stamp { position: absolute; top: 150px; right: 60px; transform: rotate(-18deg); border: 3px solid #b91c1c; color: #b91c1c; font-weight: 900; font-size: 22px; letter-spacing: 3px; padding: 4px 14px; opacity: 0.75; }
  .ref { display: flex; justify-content: space-between; font-size: 12px; margin: 16px 0; font-weight: 600; }
  .patient-block { border: 1px solid #555; padding: 10px 14px; margin: 10px 0 16px; font-size: 12px; }
  .patient-block p { margin: 3px 0; }
  .content { white-space: pre-wrap; line-height: 1.65; font-size: 13px; min-height: 220px; }
  .sign { margin-top: 40px; }
  .sign .sig-line { border-top: 1px solid #111; width: 240px; margin-top: 46px; }
  .sign p { margin: 2px 0; }
  .footer { margin-top: 34px; font-size: 10px; color: #444; border-top: 1px solid #999; padding-top: 8px; text-align: center; }
  @media print { .stamp { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style></head><body>
  <div class="stamp">CONFIDENTIAL</div>
  <div class="org-header">
    ${org.logo_url ? `<img src="${esc(org.logo_url)}" alt="logo" />` : ""}
    <div class="org-name">${orgName}</div>
    ${org.address ? `<div class="org-meta">${esc(org.address)}</div>` : ""}
    ${contact ? `<div class="org-meta">${contact}</div>` : ""}
  </div>
  <div class="title">Medical Report</div>
  <div class="ref">
    <span>Ref No: ${esc(report.reference_number)}</span>
    <span>Date: ${esc(formatDate(report.report_date))}</span>
  </div>
  <div class="patient-block">
    <p><strong>Patient Name:</strong> ${esc(patient.name)}</p>
    ${patient.address ? `<p><strong>Address:</strong> ${esc(patient.address)}</p>` : ""}
    ${patient.phone ? `<p><strong>Phone:</strong> ${esc(patient.phone)}</p>` : ""}
  </div>
  <div class="content">${esc(report.content)}</div>
  <div class="sign">
    <div class="sig-line"></div>
    <p><strong>${esc(report.author_name)}</strong></p>
    ${report.author_title ? `<p>${esc(report.author_title)}</p>` : ""}
    <p>Signature</p>
  </div>
  <div class="footer">This document is issued by ${orgName}. It is confidential and intended solely for the recipient named.</div>
  <script>window.onload = function(){ window.focus(); setTimeout(function(){ window.print(); }, 250); };</script>
</body></html>`;
  win.document.write(html);
  win.document.close();
}

export default function MedicalReportsSection({
  patientId, patient, canWrite,
}: {
  patientId: string;
  patient: ReportPatient;
  canWrite: boolean;
}) {
  const [reports, setReports] = useState<MedicalReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [org, setOrg] = useState<OrgHeader>({ name: "", logo_url: null, address: "", phone: "", email: "", website: "" });
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ report_date: new Date().toISOString().split("T")[0], author_title: "", content: "" });

  useEffect(() => {
    loadReports();
    fetch("/api/org")
      .then((r) => r.json())
      .then((json) => { if (json.success) setOrg(json.data); })
      .catch(() => {});
  }, [patientId]);

  async function loadReports() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/medical-reports?patient_id=${patientId}`);
      const json = await res.json();
      if (json.success) setReports(json.data || []);
      else setError(json.error || "Failed to load reports");
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.content.trim()) { setError("Report content is required."); return; }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/medical-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_id: patientId,
          content: form.content.trim(),
          report_date: form.report_date || undefined,
          author_title: form.author_title.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Save failed");
      setShowForm(false);
      setForm({ report_date: new Date().toISOString().split("T")[0], author_title: "", content: "" });
      loadReports();
    } catch (err: any) { setError(err.message); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this medical report? This cannot be undone.")) return;
    try {
      const res = await fetch(`/api/medical-reports/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Delete failed");
      loadReports();
    } catch (err: any) { setError(err.message); }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-white/50">
          {reports.length} medical report{reports.length !== 1 ? "s" : ""} on record
        </p>
        {canWrite && (
          <Button onClick={() => setShowForm(true)} size="sm"
            className="h-7 text-xs bg-gradient-to-r from-[#e0a84a] to-amber-500 text-[#0a0f1a] font-semibold border-0">
            <Plus className="size-3 mr-1" />New Report
          </Button>
        )}
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="size-5 animate-spin text-[#e0a84a]" />
        </div>
      ) : reports.length === 0 ? (
        <p className="text-sm text-white/30 text-center py-8">
          No medical reports issued yet. {canWrite ? 'Use "New Report" to issue one.' : ""}
        </p>
      ) : (
        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
          {reports.map((r) => (
            <Card key={r.id} className="border-white/[0.06] bg-white/[0.03] backdrop-blur-xl">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <ShieldCheck className="size-4 text-[#e0a84a] shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {r.reference_number} — {formatDate(r.report_date)}
                      </p>
                      <p className="text-xs text-white/40 truncate">
                        {r.author_name}{r.author_title ? `, ${r.author_title}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge className="text-[10px] bg-[#e0a84a]/10 text-[#e0a84a] border-[#e0a84a]/20">Official</Badge>
                    <Button size="sm" variant="ghost" onClick={() => printReport(org, r, patient)}
                      className="h-7 text-xs text-[#e0a84a]/70 hover:text-[#e0a84a] px-2">
                      <Printer className="size-3.5 mr-1" />Print
                    </Button>
                    {canWrite && (
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(r.id)}
                        className="h-7 text-xs text-red-400 hover:text-red-300 px-2">
                        <Trash2 className="size-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
                <p className="mt-2 text-xs text-white/50 line-clamp-3 whitespace-pre-wrap">{r.content}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* New Report Form */}
      <Dialog open={showForm} onOpenChange={(o) => { if (!o) setShowForm(o); }}>
        <DialogContent className="sm:max-w-xl border-white/[0.06] bg-[#0d1322]/95 backdrop-blur-xl text-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">New Medical Report</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-white/50 mb-1">Report Date</p>
                <Input type="date" value={form.report_date}
                  onChange={(e) => setForm({ ...form, report_date: e.target.value })}
                  className="bg-white/[0.04] border-white/[0.08] text-white [color-scheme:dark]" />
              </div>
              <div>
                <p className="text-xs text-white/50 mb-1">Your Title (e.g. Consultant Physician)</p>
                <Input value={form.author_title}
                  onChange={(e) => setForm({ ...form, author_title: e.target.value })}
                  className="bg-white/[0.04] border-white/[0.08] text-white" />
              </div>
            </div>
            <div>
              <p className="text-xs text-white/50 mb-1">Report Content *</p>
              <Textarea value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                className="min-h-[220px] bg-white/[0.04] border-white/[0.08] text-white text-sm"
                placeholder="Write the medical report — medical history, diagnosis, treatment, fitness status, recommendations, etc. This appears on the official letterhead with a CONFIDENTIAL stamp." />
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" className="bg-white text-black border-border hover:bg-gray-100">Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={saving}
                className="bg-gradient-to-r from-[#e0a84a] to-amber-500 text-[#0a0f1a] font-semibold border-0">
                {saving ? <Loader2 className="size-4 animate-spin mr-1" /> : null}
                Issue Report
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
