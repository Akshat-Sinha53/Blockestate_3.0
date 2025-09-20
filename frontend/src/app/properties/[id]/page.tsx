"use client"

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Copy, Download, MapPin, ShieldCheck, Timer } from "lucide-react";
import Image from "next/image";
import { apiClient } from "@/lib/api";

export default function PropertyDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const [property, setProperty] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  const progress = useMemo(() => 80, []);
  function copy(value: string) { navigator.clipboard.writeText(value); }

  useEffect(() => {
    (async () => {
      try {
        const res = await apiClient.getPropertyDetails(id);
        if (res.success && res.property) setProperty(res.property);
        else setError(res.message || "Not found");
      } catch (e: any) {
        console.error(e);
        setError("Failed to load property");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const locParts = [property?.Village, property?.District, property?.State].filter(Boolean).join(", ");
  const type = property?.type || property?.Category || property?.Current_use;
  const status = property?.status || "—";
  const totalArea = (
    property?.["total area"] ??
    property?.["Total Area"] ??
    property?.total_area ??
    property?.Total_area ??
    property?.TotalArea ??
    property?.Area ??
    property?.area ??
    null
  );
  const value = property?.value ?? totalArea ?? "--";
  const title = property?.title || property?.name || property?.plot_number || property?.property_id || id;

  return (
    <div className="min-h-screen container mx-auto px-6 py-10 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Property Details</h1>
          <p className="text-sm text-muted-foreground">ID: {id}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary">Start Transfer</Button>
          <Button variant="outline">Start Chat</Button>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading...</div>
      ) : error ? (
        <div className="text-sm text-red-500">{error}</div>
      ) : (
        <>
          {/* Banner */}
          <Card className="overflow-hidden border-border/60 bg-card/60 backdrop-blur">
            <div className="relative aspect-[16/9] w-full">
              <Image
                src={`/images/properties/${id}.svg`}
                alt={`Property ${id} image`}
                fill
                className="object-cover"
                sizes="100vw"
                priority={false}
              />
            </div>
          </Card>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="border-border/60 bg-card/60 backdrop-blur lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Overview</CardTitle>
                <CardDescription>Location, area/type, and verification status.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div>
                    <div className="text-xs text-muted-foreground">Location</div>
                    <div className="font-medium flex items-center gap-1"><MapPin className="h-4 w-4"/> {locParts || "--"}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Area / Value</div>
                    <div className="font-medium">{String(value)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Type</div>
                    <div className="font-medium">{type || "--"}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Status</div>
                    <Badge variant="secondary" className="align-middle">{status}</Badge>
                  </div>
                </div>
                <Separator />
                <div>
                  <div className="mb-2 text-sm flex items-center gap-2"><ShieldCheck className="h-4 w-4"/> Verification Progress</div>
                  <Progress value={progress} />
                  <div className="mt-2 text-xs text-muted-foreground">Surveyor Visit • Officer Verification • Reports Uploaded • Registrar Approval</div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-card/60 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-base">Key Details</CardTitle>
                <CardDescription>Complete registry attributes</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="text-muted-foreground">Plot No.</div><div className="font-medium">{property?.plot_number || "-"}</div>
                  <div className="text-muted-foreground">Property ID</div><div className="font-medium">{property?.property_id || "-"}</div>
                  <div className="text-muted-foreground">Wallet</div><div className="font-medium">{property?.wallet || "-"}</div>
                  <div className="text-muted-foreground">Block</div><div className="font-medium">{property?.block || property?.Block || "-"}</div>
                  <div className="text-muted-foreground">Village</div><div className="font-medium">{property?.Village || "-"}</div>
                  <div className="text-muted-foreground">District</div><div className="font-medium">{property?.District || "-"}</div>
                  <div className="text-muted-foreground">State</div><div className="font-medium">{property?.State || "-"}</div>
                  <div className="text-muted-foreground">Length</div><div className="font-medium">{property?.length || "-"}</div>
                  <div className="text-muted-foreground">Breadth</div><div className="font-medium">{property?.breadth || "-"}</div>
  <div className="text-muted-foreground">Total Area</div><div className="font-medium">{totalArea ?? "-"}</div>
                  <div className="text-muted-foreground">Frontage</div><div className="font-medium">{property?.Frontage || "-"}</div>
                  <div className="text-muted-foreground">Depth</div><div className="font-medium">{property?.Depth || "-"}</div>
                  <div className="text-muted-foreground">Current Use</div><div className="font-medium">{property?.Current_use || "-"}</div>
                  <div className="text-muted-foreground">Category</div><div className="font-medium">{property?.Category || "-"}</div>
                  <div className="text-muted-foreground">Khata No</div><div className="font-medium">{property?.Khata_no || "-"}</div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="border-border/60 bg-card/60 backdrop-blur lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Ownership History</CardTitle>
                <CardDescription>Chronological record of title transfers.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <div>No history available.</div>
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-card/60 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-base">Map</CardTitle>
                <CardDescription>Approximate location</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="aspect-[4/3] overflow-hidden rounded-lg border">
                  <iframe
                    title="map"
                    className="h-full w-full"
                    loading="lazy"
                    src={`https://www.google.com/maps?q=12.9716,77.5946&hl=en&z=14&output=embed`}
                  />
                </div>
                <div className="mt-2 text-xs text-muted-foreground flex items-center gap-1"><Timer className="h-3.5 w-3.5"/>Map is for reference only.</div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
