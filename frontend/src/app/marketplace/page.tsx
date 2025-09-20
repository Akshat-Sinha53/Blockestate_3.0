"use client"

import Link from "next/link";
import { useMemo, useState, useEffect } from "react";
import Image from "next/image";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Search } from "lucide-react";
import { apiClient } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import type { MarketplaceProperty } from "@/lib/types";
import { useRouter } from "next/navigation";

export default function MarketplacePage() {
  const [location, setLocation] = useState("");
  const [type, setType] = useState<string | undefined>(undefined);
  const [budget, setBudget] = useState<number[]>([0, 20000000]);
  const [listings, setListings] = useState<MarketplaceProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    async function fetchMarketplaceProperties() {
      try {
        setLoading(true);
        const response = await apiClient.getMarketplaceProperties();
        if (response.success) {
          setListings(response.properties);
        } else {
          setError(response.message || "Failed to fetch properties");
        }
      } catch (err: any) {
        console.error("Error fetching marketplace properties:", err);
        setError("Failed to load marketplace properties");
      } finally {
        setLoading(false);
      }
    }

    fetchMarketplaceProperties();
  }, []);

  const filtered = useMemo(() => {
    return listings.filter((l) => {
      // Build location string from property data
      const locationParts = [l.Village, l.District, l.State].filter(Boolean);
      const propertyLocation = l.location || locationParts.join(", ") || "";
      
      const matchLoc = location ? propertyLocation.toLowerCase().includes(location.toLowerCase()) : true;
      const matchType = type ? (l.type === type || l.Category === type || l.Current_use === type) : true;
      const askingPrice = l.asking_price || 0;
      const matchBudget = askingPrice >= budget[0] && askingPrice <= budget[1];
      return matchLoc && matchType && matchBudget;
    });
  }, [listings, location, type, budget]);

  const { isAuthenticated, userEmail } = useAuth();
  const router = useRouter();

  async function handleChat(propertyId: string) {
    if (!isAuthenticated || !userEmail) {
      alert('Please log in to start a chat.');
      router.push('/');
      return;
    }
    try {
      const resp = await apiClient.initiateChat(propertyId, userEmail);
      if (resp.success && resp.chat?.chat_id) {
        router.push(`/chats/${resp.chat.chat_id}`);
      } else {
        alert(resp.message || 'Failed to initiate chat');
      }
    } catch (e: any) {
      alert(e?.message || 'Failed to initiate chat');
    }
  }

  return (
    <div className="min-h-screen container mx-auto px-6 py-10 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Marketplace</h1>
          <p className="text-sm text-muted-foreground">Explore properties for sale and start negotiations.</p>
        </div>
        <Button asChild>
          <Link href="/dashboard?sell=1" className="gap-2">Register for Selling</Link>
        </Button>
      </div>

      <Card className="border-border/60 bg-card/60 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
          <CardDescription>Refine your property search</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="loc">Location</Label>
            <div className="relative">
              <Input id="loc" placeholder="City or area" value={location} onChange={(e) => setLocation(e.target.value)} className="pl-8"/>
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={type} onValueChange={(v) => setType(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Residential">Residential</SelectItem>
                <SelectItem value="Commercial">Commercial</SelectItem>
                <SelectItem value="Agricultural">Agricultural</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Budget (₹)</Label>
            <div className="px-2">
              <Slider value={budget} onValueChange={(v) => setBudget(v as number[])} min={0} max={30000000} step={500000} />
              <div className="mt-1 text-xs text-muted-foreground">{budget[0].toLocaleString()} - {budget[1].toLocaleString()}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="text-center py-12">
          <div className="text-lg text-muted-foreground">Loading marketplace properties...</div>
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <div className="text-lg text-red-500">{error}</div>
          <Button 
            variant="outline" 
            className="mt-4"
            onClick={() => window.location.reload()}
          >
            Retry
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-lg text-muted-foreground">No properties found matching your criteria</div>
          <p className="text-sm text-muted-foreground mt-2">Try adjusting your filters or check back later</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((l) => {
            const propertyId = l.property_id || l.propert_id || l._id || "unknown";
            const locationParts = [l.Village, l.District, l.State].filter(Boolean);
            const propertyLocation = l.location || locationParts.join(", ") || "Location not specified";
            const propertyType = l.type || l.Category || l.Current_use || "Type not specified";
            const propertyTitle = l.title || l.name || l.plot_number || `Property ${propertyId}`;
            const askingPrice = l.asking_price || 0;
            const status = l.sale_status || l.status || "For Sale";
            
            return (
              <Card key={propertyId} className="group border-border/60 bg-card/60 backdrop-blur overflow-hidden">
                <div className="relative aspect-[16/9] w-full bg-muted">
                  {/* Placeholder for property image */}
                  <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <div className="text-sm font-medium">{propertyTitle}</div>
                      <div className="text-xs">{propertyType}</div>
                    </div>
                  </div>
                </div>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{propertyTitle}</CardTitle>
                    <Badge variant={status === "active" ? "default" : "secondary"}>
                      {status === "active" ? "For Sale" : status}
                    </Badge>
                  </div>
                  <CardDescription>{propertyLocation} • {propertyType}</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-between">
                  <div className="text-sm">
                    Asking Price<br/>
                    <span className="font-medium text-lg">₹ {askingPrice.toLocaleString()}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button asChild size="sm" variant="secondary">
                      <Link href={`/properties/${propertyId}`}>Details</Link>
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleChat(propertyId)} className="gap-1">
                      <MessageCircle className="h-4 w-4"/>Chat
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}