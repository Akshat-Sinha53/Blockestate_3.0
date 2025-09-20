"use client"

import Link from "next/link";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, Clock, MapPin, Search, Shield, Upload } from "lucide-react";

const assignments = [
  {
    id: "prop-201",
    title: "Lot 9, Neo Heights",
    location: "Mumbai",
    type: "Residential",
    status: "Pending Visit",
    scheduledFor: "2025-09-22",
  },
  {
    id: "prop-202",
    title: "Shop 12, Orion Mall",
    location: "Delhi",
    type: "Commercial",
    status: "In Review",
    scheduledFor: "2025-09-19",
  },
  {
    id: "prop-203",
    title: "Farm 2, Sunrise",
    location: "Jaipur",
    type: "Agricultural",
    status: "Completed",
    scheduledFor: "2025-09-15",
  },
];

export default function SurveyorPage() {
  const [query, setQuery] = useState("");

  const filtered = assignments.filter((a) =>
    `${a.title} ${a.location} ${a.id}`.toLowerCase().includes(query.toLowerCase())
  );

  const statusBadge = (s: string) => {
    if (s === "Completed") return <Badge className="bg-emerald-600 text-white">Completed</Badge>;
    if (s === "In Review") return <Badge className="bg-amber-600 text-white">In Review</Badge>;
    return <Badge variant="secondary">Pending Visit</Badge>;
  };

  return (
    <div className="min-h-screen container mx-auto px-6 py-10 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Surveyor Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            View assigned site verifications, upload reports, and update statuses.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/marketplace">Explore Marketplace</Link>
        </Button>
      </div>

      <Card className="border-border/60 bg-card/60 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-base">Assignments</CardTitle>
          <CardDescription>Search and manage your current assignments</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative max-w-md">
            <Input
              placeholder="Search by title, location or ID"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-8"
            />
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          </div>

          <Separator />

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((a) => (
              <Card key={a.id} className="border-border/60 bg-card/60 backdrop-blur">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{a.title}</CardTitle>
                    {statusBadge(a.status)}
                  </div>
                  <CardDescription>
                    <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{a.location}</span>
                    {" • "}
                    {a.type}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-xs text-muted-foreground">ID: {a.id} • Scheduled: {a.scheduledFor}</div>
                  <div className="flex gap-2">
                    <Button asChild size="sm" variant="secondary">
                      <Link href={`/properties/${a.id}`}>View Property</Link>
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1">
                      <Upload className="h-4 w-4" /> Upload Report
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" className="gap-1">
                      <Shield className="h-4 w-4" /> Mark Verified
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1">
                      <Clock className="h-4 w-4" /> Reschedule
                    </Button>
                    <Button size="sm" variant="ghost" className="gap-1">
                      <CheckCircle2 className="h-4 w-4" /> Complete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}