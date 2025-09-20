"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, FileText, ShieldCheck, UserCheck } from "lucide-react";

const events = [
  { time: "2025-09-10 10:34", label: "User registered property", actor: "0x9f3a...c21b", type: "register" },
  { time: "2025-09-12 14:18", label: "Surveyor verification completed", actor: "surveyor: S. Verma", type: "verify" },
  { time: "2025-09-14 09:02", label: "Officer verification approved", actor: "officer: P. Rao", type: "verify" },
  { time: "2025-09-17 16:25", label: "Stamp duty paid", actor: "tx: 0x71be...42aa", type: "payment" },
  { time: "2025-09-18 11:47", label: "Registrar finalized transfer", actor: "registrar: A. Nair", type: "final" },
];

export default function AuditLogPage() {
  function copy(v: string) { navigator.clipboard.writeText(v); }
  return (
    <div className="min-h-screen container mx-auto px-6 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Audit Log</h1>
          <p className="text-sm text-muted-foreground">Timeline of key actions across the system.</p>
        </div>
        <Button asChild variant="secondary"><a href="/api/export-audit" onClick={(e) => e.preventDefault()}>Export</a></Button>
      </div>

      <Card className="border-border/60 bg-card/60 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-base">System Events</CardTitle>
          <CardDescription>Immutable records with actors and timestamps</CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="relative border-l pl-4">
            {events.map((e, i) => (
              <li key={i} className="mb-6 ml-2">
                <span className="absolute -left-[9px] h-4 w-4 rounded-full bg-chart-2" />
                <div className="flex items-center justify-between">
                  <div className="font-medium text-sm">{e.label}</div>
                  <Badge variant="outline">{e.time}</Badge>
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
                  {e.type === "verify" ? <UserCheck className="h-3.5 w-3.5"/> : e.type === "final" ? <ShieldCheck className="h-3.5 w-3.5"/> : <FileText className="h-3.5 w-3.5"/>}
                  {e.actor}
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => copy(e.actor)}><Copy className="h-3.5 w-3.5"/></Button>
                </div>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}