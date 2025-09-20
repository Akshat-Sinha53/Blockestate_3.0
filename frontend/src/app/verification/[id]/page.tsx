"use client"

import { useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Clock, FileUp, ShieldCheck, XCircle } from "lucide-react";

export default function VerificationFlowPage() {
  const { id } = useParams<{ id: string }>();

  const [surveyorVisited, setSurveyorVisited] = useState(false);
  const [officerVerified, setOfficerVerified] = useState(false);
  const [reportsUploaded, setReportsUploaded] = useState(false);
  const [finalStatus, setFinalStatus] = useState<"Pending" | "Approved" | "Rejected">("Pending");

  const steps = [
    { key: "surveyor", label: "Surveyor Visit", done: surveyorVisited },
    { key: "officer", label: "Officer Verification", done: officerVerified },
    { key: "reports", label: "Reports Uploaded", done: reportsUploaded },
    { key: "final", label: "Final Status", done: finalStatus !== "Pending" },
  ];

  const progress = (steps.filter((s) => s.done).length / steps.length) * 100;

  return (
    <div className="min-h-screen container mx-auto px-6 py-10 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Verification Flow</h1>
          <p className="text-sm text-muted-foreground">Property ID: {id}</p>
        </div>
        <Badge variant={finalStatus === "Approved" ? "secondary" : finalStatus === "Rejected" ? "destructive" : "outline"} className="gap-1">
          {finalStatus === "Pending" ? <Clock className="h-3.5 w-3.5"/> : finalStatus === "Approved" ? <ShieldCheck className="h-3.5 w-3.5"/> : <XCircle className="h-3.5 w-3.5"/>}
          {finalStatus}
        </Badge>
      </div>

      <Card className="border-border/60 bg-card/60 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-base">Progress Tracker</CardTitle>
          <CardDescription>Track the verification lifecycle stages</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Progress value={progress} />
            <div className="mt-2 text-xs text-muted-foreground">Surveyor Visit • Officer Verification • Reports Uploaded • Final Status</div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s) => (
              <div key={s.key} className="rounded-xl border p-4 bg-background/60">
                <div className="flex items-center justify-between">
                  <div className="font-medium text-sm">{s.label}</div>
                  {s.done ? (
                    <Badge variant="secondary" className="gap-1"><CheckCircle2 className="h-3.5 w-3.5"/> Done</Badge>
                  ) : (
                    <Badge variant="outline">Pending</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>

          <Separator />

          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="border-border/60 bg-card/60 backdrop-blur lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Actions</CardTitle>
                <CardDescription>Perform role-based verification steps</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Button variant={surveyorVisited ? "secondary" : "outline"} onClick={() => setSurveyorVisited((v) => !v)}>
                    {surveyorVisited ? "Undo Surveyor Visit" : "Mark Surveyor Visited"}
                  </Button>
                  <Button variant={officerVerified ? "secondary" : "outline"} onClick={() => setOfficerVerified((v) => !v)}>
                    {officerVerified ? "Undo Officer Verification" : "Mark Officer Verified"}
                  </Button>
                  <Button variant={reportsUploaded ? "secondary" : "outline"} onClick={() => setReportsUploaded((v) => !v)} className="gap-2">
                    <FileUp className="h-4 w-4"/>
                    {reportsUploaded ? "Mark Reports Pending" : "Mark Reports Uploaded"}
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => setFinalStatus("Approved")} disabled={!surveyorVisited || !officerVerified || !reportsUploaded}>
                    Approve
                  </Button>
                  <Button variant="outline" onClick={() => setFinalStatus("Rejected")}>Reject</Button>
                  <Button variant="ghost" onClick={() => setFinalStatus("Pending")}>Reset</Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-card/60 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-base">Upload Reports</CardTitle>
                <CardDescription>Survey map, encumbrance, and IDs</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="report1">Survey Report</Label>
                  <Input id="report1" type="file" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="report2">Encumbrance Certificate</Label>
                  <Input id="report2" type="file" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="report3">ID Proofs</Label>
                  <Input id="report3" type="file" />
                </div>
                <div className="flex gap-2">
                  <Button className="gap-2"><FileUp className="h-4 w-4"/> Upload All</Button>
                  <Button variant="outline" onClick={() => setReportsUploaded(true)}>Mark as Uploaded</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}