"use client";

import { useState, useMemo } from "react";
import {
  Search,
  Plus,
  Eye,
  MoreHorizontal,
  Phone,
  Mail,
  Calendar,
  MapPin,
  Loader2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { cn, formatDate, formatCurrency } from "@/lib/utils";
import { usePatients } from "@/hooks/use-patients";

interface PatientDisplay {
  id: string;
  patientNumber: string;
  name: string;
  phone: string;
  email: string;
  lastVisit: string;
  status: "Active" | "Inactive" | "New";
  gender: string;
  age: number;
  bloodGroup: string;
  address: string;
  condition: string;
}

const statusVariant = {
  Active: "success" as const,
  Inactive: "secondary" as const,
  New: "default" as const,
};

function toDisplay(p: NonNullable<ReturnType<typeof usePatients>["data"]>[number]): PatientDisplay {
  return {
    id: p.patient_number || p.id,
    patientNumber: p.patient_number,
    name: p.user ? `${p.user.first_name} ${p.user.last_name}` : p.id,
    phone: p.user?.phone || "—",
    email: p.user?.email || "—",
    lastVisit: p.created_at ? formatDate(p.created_at) : "N/A",
    status: "Active" as const,
    gender: p.gender || "—",
    age: p.date_of_birth ? Math.floor((Date.now() - new Date(p.date_of_birth).getTime()) / (365.25 * 86400000)) : 0,
    bloodGroup: p.blood_group || "—",
    address: p.address || "—",
    condition: "—",
  };
}

export default function PatientsPage() {
  const [search, setSearch] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<PatientDisplay | null>(null);
  const [tab, setTab] = useState("all");
  const { data: patientsData, loading } = usePatients();

  const patients = useMemo(() => {
    if (!patientsData) return [];
    return patientsData.map(toDisplay);
  }, [patientsData]);

  const filtered = patients.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.id.toLowerCase().includes(search.toLowerCase());
    if (tab === "all") return matchesSearch;
    return matchesSearch && p.status.toLowerCase() === tab;
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Patients</h1>
          <p className="text-sm text-text-secondary mt-1">
            Manage all registered patients
          </p>
        </div>
        <Button>
          <Plus className="size-4" />
          Add Patient
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-secondary" />
              <Input
                placeholder="Search by name or ID..."
                className="h-9 pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="inactive">Inactive</TabsTrigger>
          <TabsTrigger value="new">New</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4">
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="size-6 animate-spin text-primary" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-xs text-text-secondary">
                        <th className="px-5 py-3.5 font-medium">Name</th>
                        <th className="px-5 py-3.5 font-medium">ID</th>
                        <th className="px-5 py-3.5 font-medium">Phone</th>
                        <th className="px-5 py-3.5 font-medium">Email</th>
                        <th className="px-5 py-3.5 font-medium">Last Visit</th>
                        <th className="px-5 py-3.5 font-medium">Status</th>
                        <th className="px-5 py-3.5 font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-5 py-12 text-center text-sm text-text-secondary">
                            No patients found.
                          </td>
                        </tr>
                      ) : (
                        filtered.map((p) => (
                          <tr
                            key={p.id}
                            className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors"
                          >
                            <td className="px-5 py-3.5 font-medium text-foreground">
                              {p.name}
                            </td>
                            <td className="px-5 py-3.5 text-text-secondary font-mono text-xs">
                              {p.id}
                            </td>
                            <td className="px-5 py-3.5 text-text-secondary">
                              {p.phone}
                            </td>
                            <td className="px-5 py-3.5 text-text-secondary">
                              {p.email}
                            </td>
                            <td className="px-5 py-3.5 text-text-secondary">
                              {p.lastVisit}
                            </td>
                            <td className="px-5 py-3.5">
                              <Badge
                                variant={statusVariant[p.status]}
                                className="text-[11px]"
                              >
                                {p.status}
                              </Badge>
                            </td>
                            <td className="px-5 py-3.5 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 text-xs text-primary"
                                      onClick={() => setSelectedPatient(p)}
                                    >
                                      <Eye className="size-3.5 mr-1" />
                                      View
                                    </Button>
                                  </DialogTrigger>
                                  {selectedPatient?.id === p.id && (
                                    <DialogContent className="max-w-md">
                                      <DialogHeader>
                                        <DialogTitle>{selectedPatient.name}</DialogTitle>
                                        <DialogDescription>
                                          Patient ID: {selectedPatient.id}
                                        </DialogDescription>
                                      </DialogHeader>
                                      <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                          <p className="text-text-secondary text-xs">Gender</p>
                                          <p className="font-medium">{selectedPatient.gender}</p>
                                        </div>
                                        <div>
                                          <p className="text-text-secondary text-xs">Age</p>
                                          <p className="font-medium">{selectedPatient.age}</p>
                                        </div>
                                        <div>
                                          <p className="text-text-secondary text-xs">Blood Group</p>
                                          <p className="font-medium">{selectedPatient.bloodGroup}</p>
                                        </div>
                                        <div>
                                          <p className="text-text-secondary text-xs">Status</p>
                                          <Badge variant={statusVariant[selectedPatient.status]} className="text-[11px]">
                                            {selectedPatient.status}
                                          </Badge>
                                        </div>
                                        <div className="col-span-2">
                                          <p className="text-text-secondary text-xs">Condition</p>
                                          <p className="font-medium">{selectedPatient.condition}</p>
                                        </div>
                                        <div className="col-span-2">
                                          <p className="text-text-secondary text-xs">Address</p>
                                          <p className="font-medium">{selectedPatient.address}</p>
                                        </div>
                                        <div className="col-span-2 flex items-center gap-4 pt-2 border-t border-border">
                                          <span className="flex items-center gap-1.5 text-xs text-text-secondary">
                                            <Phone className="size-3.5" />
                                            {selectedPatient.phone}
                                          </span>
                                          <span className="flex items-center gap-1.5 text-xs text-text-secondary">
                                            <Mail className="size-3.5" />
                                            {selectedPatient.email}
                                          </span>
                                        </div>
                                      </div>
                                    </DialogContent>
                                  )}
                                </Dialog>

                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="size-8">
                                      <MoreHorizontal className="size-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-36">
                                    <DropdownMenuItem>Edit</DropdownMenuItem>
                                    <DropdownMenuItem>Schedule</DropdownMenuItem>
                                    <DropdownMenuItem className="text-danger">
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
