"use client"

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Copy, MessageCircle, PlusCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient } from "@/lib/api";
import type { PropertyDoc, UserProfile } from "@/lib/types";

const mockTxs = [
  { id: "0x9f3a...c21b", type: "Stamp Duty", amount: "₹ 1,20,000", status: "Success" },
  { id: "0x71be...42aa", type: "Ownership Transfer", amount: "-", status: "Pending" },
];

export default function DashboardPage() {
  const { userEmail } = useAuth();
  const router = useRouter();
  const [wallet, setWallet] = useState<string | null>(null);
  const [properties, setProperties] = useState<PropertyDoc[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    async function load() {
      if (!userEmail) return;
      setLoading(true);
      setError("");
      try {
        const prof = await apiClient.getUserProfile(userEmail);
        setProfile(prof.user || null);
        const w = prof.user?.wallet_address || null;
        setWallet(w);
        if (w) {
          const res = await apiClient.getUserProperties(w);
          setProperties(res.properties || []);
        } else {
          setProperties([]);
        }
      } catch (e: any) {
        console.error(e);
        setError("Failed to load your properties.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [userEmail]);

  const verifiedCount = useMemo(() => properties.filter(p => (p.status || "").toLowerCase() === "verified").length, [properties]);

  return (
    <div className="min-h-screen container mx-auto px-6 py-10">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My Dashboard</h1>
          <p className="text-sm text-muted-foreground">Manage your properties, transactions, chats, and settings.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/marketplace"><Button variant="secondary">Explore Marketplace</Button></Link>
          <Button asChild>
            <Link href="/marketplace?sell=1" className="gap-2"><PlusCircle className="h-4 w-4" /> Register for Selling</Link>
          </Button>
        </div>
      </div>

      <Tabs defaultValue="properties" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="properties">My Properties</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="chats">Chats</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="properties" className="mt-6">
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading your properties...</div>
          ) : error ? (
            <div className="text-sm text-red-500">{error}</div>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {properties.length === 0 ? (
                  <div className="text-sm text-muted-foreground">{wallet ? 'No properties found for your wallet.' : 'Wallet not linked for your profile.'}</div>
                ) : (
                  properties.map((p) => {
                    const id = p.property_id || p.propert_id || p._id || "unknown";
                    const locationParts = [p.Village, p.District, p.State].filter(Boolean) as string[];
                    const location = p.location || locationParts.join(", ") || "--";
                    const type = p.type || p.Category || p.Current_use || "--";
                    const status = p.status || "—";
                    const totalArea = (
                      (p as any)["total area"] ??
                      (p as any)["Total Area"] ??
                      (p as any).total_area ??
                      (p as any).Total_area ??
                      (p as any).TotalArea ??
                      (p as any).Area ??
                      (p as any).area ??
                      null
                    );
                    const value = (p as any).value ?? totalArea ?? "--";
                    const title = p.title || p.name || p.plot_number || `Property ${id}`;
                    return (
                      <Card
                        key={id}
                        className="group border-border/60 bg-card/60 backdrop-blur cursor-pointer hover:ring-1 hover:ring-border"
                        onClick={() => router.push(`/properties/${id}`)}
                      >
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-base">{title}</CardTitle>
                            <Badge variant="secondary">{status}</Badge>
                          </div>
                          <CardDescription>{location} • {type}</CardDescription>
                        </CardHeader>
                        <CardContent className="flex items-center justify-between">
                          <div className="text-sm text-muted-foreground">Area/Value<br/><span className="text-foreground font-medium">{String(value)}</span></div>
                          <div className="flex gap-2">
                            <Button asChild size="sm" variant="secondary"><Link href={`/properties/${id}`}>View</Link></Button>
                            <Button size="sm" variant="outline" onClick={async (e) => {
                              e.stopPropagation();
                              const input = window.prompt('Enter asking price (must be <= value shown):');
                              if (!input) return;
                              const price = parseFloat(input.replace(/[^0-9.]/g, ''));
                              if (isNaN(price)) { alert('Invalid price'); return; }
                              const pid = (p as any).property_id || (p as any).propert_id || (p as any)._id;
                              try {
                                await apiClient.listPropertyForSale(pid, price);
                                // Optimistically update UI
                                setProperties(prev => prev.map(pp => {
                                  const pid2 = (pp as any).property_id || (pp as any).propert_id || (pp as any)._id;
                                  if (pid2 === pid) return { ...pp, listed_for_sale: true, asking_price: price, status: 'FOR_SALE' } as any;
                                  return pp;
                                }));
                              } catch (err: any) {
                                alert('Failed to flag for sale: ' + (err?.message || 'unknown error'));
                              }
                            }}>Flag for Sale</Button>
                            <Button asChild size="sm" variant="outline"><Link href={`/chats/${id}`} className="gap-1"><MessageCircle className="h-4 w-4"/>Chat</Link></Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
              <div className="mt-4 text-sm text-muted-foreground">Verified: {verifiedCount} / {properties.length}</div>
            </>
          )}
        </TabsContent>

        <TabsContent value="transactions" className="mt-6">
          <div className="grid gap-4 sm:grid-cols-2">
            {mockTxs.map((t) => (
              <Card key={t.id} className="border-border/60 bg-card/60 backdrop-blur">
                <CardHeader>
                  <CardTitle className="text-base">{t.type}</CardTitle>
                  <CardDescription>Status: {t.status}</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-between gap-2">
                  <div className="text-sm">Amount: <span className="font-medium">{t.amount}</span></div>
                  <Button variant="outline" size="sm" className="gap-2" onClick={() => navigator.clipboard.writeText(t.id)}>
                    <Copy className="h-4 w-4"/> {t.id.slice(0,6)}...{t.id.slice(-4)}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="chats" className="mt-6">
          <Card className="border-border/60 bg-card/60 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-base">Recent Chats</CardTitle>
              <CardDescription>Conversations linked to your properties.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {properties.map((p) => {
                  const id = p.property_id || p.propert_id || p._id || "unknown";
                  const title = p.title || p.name || p.plot_number || `Property ${id}`;
                  const locationParts = [p.Village, p.District, p.State].filter(Boolean) as string[];
                  const location = p.location || locationParts.join(", ") || "--";
                  const type = p.type || p.Category || p.Current_use || "--";
                  return (
                    <div key={id} className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <div className="font-medium">{title}</div>
                        <div className="text-xs text-muted-foreground">{location} • {type}</div>
                      </div>
                      <Button asChild size="sm" variant="secondary"><Link href={`/chats/${id}`}>Open</Link></Button>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <Card className="border-border/60 bg-card/60 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-base">Profile</CardTitle>
              <CardDescription>Your verified details from the registry (read-only)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {profile ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input value={profile.Name || "-"} readOnly disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input value={profile.email || "-"} readOnly disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>Aadhaar</Label>
                    <Input value={profile.Aadhaar || "-"} readOnly disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>PAN</Label>
                    <Input value={profile.Pan || "-"} readOnly disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>Wallet</Label>
                    <Input value={profile.wallet_address || "-"} readOnly disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>Contact</Label>
                    <Input value={profile.ContactNo || "-"} readOnly disabled />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Address</Label>
                    <Input value={profile.Address || "-"} readOnly disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>Nationality</Label>
                    <Input value={profile.Nationality || "-"} readOnly disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>Date of Birth</Label>
                    <Input value={profile.DoB || "-"} readOnly disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>Gender</Label>
                    <Input value={profile.Gender || "-"} readOnly disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>Age</Label>
                    <Input value={String(profile.Age ?? "-")} readOnly disabled />
                  </div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">{loading ? "Loading profile..." : "Profile unavailable"}</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}