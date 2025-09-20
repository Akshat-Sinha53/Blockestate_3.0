"use client"

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download, FileSignature, Shield, ThumbsDown, ThumbsUp } from "lucide-react";

const mockDeals = [
  { id: "deal-301", property: "Plot 24, Green Valley", buyer: "R. Singh", seller: "J. Doe", status: "Pending" },
  { id: "deal-302", property: "Shop 7, Tech Park", buyer: "K. Patel", seller: "A. Sharma", status: "Pending" },
];

export default function RegistrarPage() {
  const [deals, setDeals] = useState(mockDeals);

  function updateStatus(id: string, status: "Approved" | "Rejected") {
    setDeals((d) => d.map((x) => (x.id === id ? { ...x, status } : x)));
  }

  return (
    <div className="min-h-screen container mx-auto px-6 py-10 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Registrar Dashboard</h1>
          <p className="text-sm text-muted-foreground">Approve or reject deals, trigger NFT transfer, and generate deeds.</p>
        </div>
        <Badge variant="secondary" className="gap-1"><Shield className="h-3.5 w-3.5"/> Official Access</Badge>
      </div>

      <Card className="border-border/60 bg-card/60 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-base">Pending Deals</CardTitle>
          <CardDescription>Verify details and finalize registration</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableCaption>Actions are recorded on-chain.</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Deal ID</TableHead>
                <TableHead>Property</TableHead>
                <TableHead>Buyer</TableHead>
                <TableHead>Seller</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deals.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">{d.id}</TableCell>
                  <TableCell>{d.property}</TableCell>
                  <TableCell>{d.buyer}</TableCell>
                  <TableCell>{d.seller}</TableCell>
                  <TableCell><Badge variant={d.status === "Approved" ? "secondary" : d.status === "Rejected" ? "destructive" : "outline"}>{d.status}</Badge></TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button size="sm" variant="outline" className="gap-1" onClick={() => updateStatus(d.id, "Approved")}><ThumbsUp className="h-4 w-4"/>Approve</Button>
                    <Button size="sm" variant="outline" className="gap-1" onClick={() => updateStatus(d.id, "Rejected")}><ThumbsDown className="h-4 w-4"/>Reject</Button>
                    <Button size="sm" className="gap-1"><FileSignature className="h-4 w-4"/> NFT Transfer</Button>
                    <Button asChild size="sm" variant="secondary" className="gap-1"><a href="https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf" target="_blank" rel="noreferrer"><Download className="h-4 w-4"/> Deed</a></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}