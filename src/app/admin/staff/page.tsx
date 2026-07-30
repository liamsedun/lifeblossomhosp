"use client";

import { useState } from "react";
import {
  Stethoscope,
  Clock,
  CalendarDays,
  Phone,
  Mail,
  MoreHorizontal,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface Staff {
  id: string;
  name: string;
  role: string;
  department: string;
  status: "On Duty" | "Off Duty" | "On Leave";
  schedule: string;
  phone: string;
  email: string;
  initials: string;
}

const staffMembers: Staff[] = [
  { id: "ST-001", name: "Dr. Ade Kolawole", role: "Doctor", department: "Cardiology", status: "On Duty", schedule: "08:00 - 16:00", phone: "+234 802 111 2222", email: "ade.kolawole@lbch.ng", initials: "AK" },
  { id: "ST-002", name: "Dr. Ngozi Okonkwo", role: "Doctor", department: "General Medicine", status: "On Duty", schedule: "14:00 - 22:00", phone: "+234 803 222 3333", email: "ngozi.okonkwo@lbch.ng", initials: "NO" },
  { id: "ST-003", name: "Dr. Fatima Bello", role: "Doctor", department: "Pediatrics", status: "Off Duty", schedule: "08:00 - 16:00", phone: "+234 804 333 4444", email: "fatima.bello@lbch.ng", initials: "FB" },
  { id: "ST-004", name: "Nurse Chinedu Okafor", role: "Nurse", department: "Emergency", status: "On Duty", schedule: "22:00 - 06:00", phone: "+234 805 444 5555", email: "chinedu.okafor@lbch.ng", initials: "CO" },
  { id: "ST-005", name: "Nurse Esther Adeyemi", role: "Nurse", department: "Maternity", status: "On Leave", schedule: "08:00 - 16:00", phone: "+234 806 555 6666", email: "esther.adeyemi@lbch.ng", initials: "EA" },
  { id: "ST-006", name: "Mr. Segun Ogunlade", role: "Admin", department: "Administration", status: "On Duty", schedule: "09:00 - 17:00", phone: "+234 807 666 7777", email: "segun.ogunlade@lbch.ng", initials: "SO" },
];

const statusStyles: Record<Staff["status"], "success" | "secondary" | "warning"> = {
  "On Duty": "success",
  "Off Duty": "secondary",
  "On Leave": "warning",
};

const departments = ["All", "Cardiology", "General Medicine", "Pediatrics", "Emergency", "Maternity", "Administration"];

export default function StaffPage() {
  const [dept, setDept] = useState("All");

  const filtered = staffMembers.filter(
    (s) => dept === "All" || s.department === dept
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Staff</h1>
          <p className="text-sm text-text-secondary mt-1">
            Manage hospital staff and schedules
          </p>
        </div>
        <Button>Add Staff Member</Button>
      </div>

      <div className="flex items-center gap-3">
        <Select
          options={departments.map((d) => ({ value: d, label: d }))}
          value={dept}
          onChange={(e) => setDept(e.target.value)}
          className="w-52"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((staff) => (
          <Card
            key={staff.id}
            className="hover:shadow-md transition-shadow group"
          >
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Avatar size="lg">
                    <AvatarImage src="" alt={staff.name} />
                    <AvatarFallback className="text-sm bg-primary-lighter text-primary font-semibold">
                      {staff.initials}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {staff.name}
                    </p>
                    <p className="text-xs text-text-secondary">{staff.role}</p>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="size-8 opacity-0 group-hover:opacity-100 transition-opacity">
                      <MoreHorizontal className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-36">
                    <DropdownMenuItem>Edit</DropdownMenuItem>
                    <DropdownMenuItem>View Schedule</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="mt-4 space-y-2 text-xs text-text-secondary">
                <div className="flex items-center gap-2">
                  <Stethoscope className="size-3.5 shrink-0" />
                  <span>{staff.department}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="size-3.5 shrink-0" />
                  <span>{staff.schedule}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="size-3.5 shrink-0" />
                  <span>{staff.phone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="size-3.5 shrink-0" />
                  <span className="truncate">{staff.email}</span>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <Badge
                  variant={statusStyles[staff.status]}
                  className={cn(
                    "text-[10px]",
                    staff.status === "On Duty" && "bg-accent text-white"
                  )}
                >
                  {staff.status}
                </Badge>
                <Button variant="ghost" size="sm" className="h-7 text-xs text-primary">
                  <CalendarDays className="size-3.5 mr-1" />
                  Schedule
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
