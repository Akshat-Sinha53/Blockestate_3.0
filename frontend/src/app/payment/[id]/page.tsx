"use client"

import { useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Copy, CreditCard, IndianRupee, Receipt, ShieldCheck } from "lucide-react";

export default function PaymentPage() {
  const { id } = useParams<{ id: string }>();
  const tx = "0x7ab3c91d2e9f4f0d0fb9f9c2a8be21c5a3d4e1f6";

  function copy(val: string) { navigator.clipboard.writeText(val); }

  return (
    <div className="min-h-screen container mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Stamp Duty Payment</h1>
        <p className="text-sm text-muted-foreground">Transaction for Property: {id}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="border-border/60 bg-card/60 backdrop-blur lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Payment Summary</CardTitle>
              <Badge variant="secondary" className="gap-1"><ShieldCheck className="h-3.5 w-3.5"/> Secured</Badge>
            </div>
            <CardDescription>Complete bank-grade payment for stamp duty.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <div className="text-xs text-muted-foreground">Payable</div>
                <div className="font-medium flex items-center gap-1"><IndianRupee className="h-4 w-4"/>1,20,000</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Purpose</div>
                <div className="font-medium">Stamp Duty</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Status</div>
                <Badge className="align-middle">Pending</Badge>
              </div>
            </div>
            <Separator />
            <div>
              <div className="mb-2 text-sm">Progress</div>
              <Progress value={35} />
              <div className="mt-2 text-xs text-muted-foreground">Initiated • Bank Authorization • Payment Success • On-chain Receipt</div>
            </div>
            <div className="rounded-xl border p-4 bg-background/60">
              <div className="mb-3 flex items-center gap-2 text-sm font-medium"><CreditCard className="h-4 w-4"/> Pay with Card</div>
              <div className="grid gap-3 sm:grid-cols-2">
                <input className="h-10 rounded-md border bg-transparent px-3 text-sm" placeholder="Card Number" />
                <input className="h-10 rounded-md border bg-transparent px-3 text-sm" placeholder="Name on Card" />
                <input className="h-10 rounded-md border bg-transparent px-3 text-sm" placeholder="MM/YY" />
                <input className="h-10 rounded-md border bg-transparent px-3 text-sm" placeholder="CVV" />
              </div>
              <div className="mt-4 flex gap-2">
                <Button className="gap-2"><CreditCard className="h-4 w-4"/> Pay ₹ 1,20,000</Button>
                <Button variant="outline">Use NetBanking</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-base">Receipt</CardTitle>
            <CardDescription>Blockchain transaction details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm">TX Hash</div>
            <div className="flex items-center justify-between rounded-lg border p-2">
              <code className="text-xs">{tx.slice(0, 10)}...{tx.slice(-6)}</code>
              <Button size="sm" variant="ghost" className="gap-1" onClick={() => copy(tx)}><Copy className="h-4 w-4"/>Copy</Button>
            </div>
            <Button asChild variant="secondary" className="w-full gap-2"><a href="https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf" target="_blank" rel="noreferrer"><Receipt className="h-4 w-4"/> Download Receipt</a></Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}