"use client"

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, Clock, MapPin, Search, Shield, Upload } from "lucide-react";
import { apiClient } from "@/lib/api";

interface TxItem {
  id: string;
  property_id: string;
  seller_email: string;
  buyer_email: string;
  status: string;
  updated_at?: string;
  docs_link?: string;
}

export default function SurveyorPage() {
  const [query, setQuery] = useState("");
  const [email, setEmail] = useState<string>("");
  const [profile, setProfile] = useState<any | null>(null);
  const [items, setItems] = useState<TxItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    // Auto-fill saved surveyor email
    try {
      const saved = localStorage.getItem('surveyorEmail');
      if (saved) setEmail(saved);
    } catch {}
  }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return items.filter((a) =>
      `${a.property_id} ${a.buyer_email} ${a.seller_email}`.toLowerCase().includes(q)
    );
  }, [items, query]);

  const statusBadge = (s: string) => {
    if (s === "PENDING_SURVEYOR_APPROVAL") return <Badge variant="secondary">Pending Approval</Badge>;
    return <Badge>{s}</Badge>;
  };

  async function login() {
    setError("");
    try {
      const res = await apiClient.loginSurveyor(email.trim());
      if (!res.success) { setError(res.message || 'Not a surveyor'); return; }
      setProfile(res.profile || { email });
      try { localStorage.setItem('surveyorEmail', email.trim()); } catch {}
      await loadPending(email.trim());
    } catch (e: any) {
      setError(e?.message || 'Login failed');
    }
  }

  async function loadPending(em: string) {
    setLoading(true); setError("");
    try {
      const res = await apiClient.listSurveyorPending(em);
      if (res.success) setItems(res.transactions || []);
      else setError(res.message || 'Failed to load');
    } catch (e: any) { setError(e?.message || 'Failed to load'); }
    finally { setLoading(false); }
  }

  async function approve(txId: string) {
    if (!profile?.email) return;
    setBusy(txId);
    try {
      const resp = await apiClient.surveyorApprove(txId, profile.email);
      if (resp.success) {
        setItems(prev => prev.filter(i => i.id !== txId));
      } else {
        setError(resp.message || 'Failed to approve');
      }
    } catch (e: any) { setError(e?.message || 'Failed to approve'); }
    finally { setBusy(null); }
  }

  return (
    <div className="min-h-screen container mx-auto px-6 py-10 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Surveyor Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Login as a surveyor to view assignments pending your approval.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/">Home</Link>
        </Button>
      </div>

      {!profile ? (
        <Card className="border-border/60 bg-card/60 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-base">Login as Surveyor</CardTitle>
            <CardDescription>Only users with role SURVEYOR in govt-citizen can login here.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 max-w-md">
            <Label>Email</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="surveyor@example.com" />
            <div className="flex gap-2">
              <Button onClick={login} disabled={!email.trim()}>Login</Button>
              <Button variant="outline" onClick={() => { setEmail(''); setProfile(null); }}>Clear</Button>
            </div>
            {error && <div className="text-sm text-red-500">{error}</div>}
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border/60 bg-card/60 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-base">Assignments</CardTitle>
            <CardDescription>Transactions pending your approval</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative max-w-md">
              <Input
                placeholder="Search by property ID, buyer or seller"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-8"
              />
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            </div>

            <Separator />

            {loading ? (
              <div className="text-sm text-muted-foreground">Loading...</div>
            ) : filtered.length === 0 ? (
              <div className="text-sm text-muted-foreground">No assignments pending.</div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((a) => (
                  <Card key={a.id} className="border-border/60 bg-card/60 backdrop-blur">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">Property {a.property_id}</CardTitle>
                        {statusBadge(a.status)}
                      </div>
                      <CardDescription>
                        <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />Pending field verification</span>
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="text-xs text-muted-foreground">Buyer: {a.buyer_email} • Seller: {a.seller_email}</div>
                      <div className="flex gap-2">
                        <Button asChild size="sm" variant="secondary">
                          <Link href={`/properties/${a.property_id}`}>View Property</Link>
                        </Button>
                        {a.docs_link && (
                          <Button asChild size="sm" variant="outline">
                            <a href={a.docs_link} target="_blank" rel="noreferrer">Docs</a>
                          </Button>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" className="gap-1" disabled={busy===a.id} onClick={() => approve(a.id)}>
                          <Shield className="h-4 w-4" /> Approve
                        </Button>
                        <Button size="sm" variant="outline" className="gap-1" disabled>
                          <Clock className="h-4 w-4" /> Request Changes
                        </Button>
                        <Button size="sm" variant="ghost" className="gap-1" disabled>
                          <CheckCircle2 className="h-4 w-4" /> Complete
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
