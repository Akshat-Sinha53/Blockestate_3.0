"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { apiClient } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function TransactionPublicPage() {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [info, setInfo] = useState<any | null>(null);
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string>("");

  useEffect(() => {
    (async () => {
      try {
        const res = await apiClient.getTransactionInfo(String(id));
        if (res.success) {
          setInfo(res.transaction);
        } else {
          setError(res.message || "Failed to load transaction");
        }
      } catch (e: any) {
        setError(e?.message || "Failed to load transaction");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const canBuyerVerify = info?.status === "PENDING_BUYER_OTP" && info?.buyer_email;
  const buyerEmail = info?.buyer_email || "";
  const txStatus = info?.status || "";

  const txTitle = useMemo(() => {
    if (!info) return "Transaction";
    return `Transaction ${info.id || String(id)}`;
  }, [info, id]);

  const submit = async () => {
    setMsg("");
    setBusy(true);
    try {
      const resp = await apiClient.verifyBuyerOtp(String(id), String(buyerEmail).trim().toLowerCase(), otp.trim());
      if (resp.success) {
        setMsg("OTP verified. Surveyor has been assigned or will be assigned shortly.");
        // Refresh info
        try {
          const res2 = await apiClient.getTransactionInfo(String(id));
          if (res2.success) setInfo(res2.transaction);
        } catch {}
      } else {
        setMsg(resp.message || "Failed to verify OTP");
      }
    } catch (e: any) {
      setMsg(e?.message || "Failed to verify OTP");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen container mx-auto px-6 py-10">
        <div className="text-sm text-muted-foreground">Loading transaction...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen container mx-auto px-6 py-10">
        <div className="text-sm text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen container mx-auto px-6 py-10 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{txTitle}</h1>
          <p className="text-sm text-muted-foreground">ID: {String(id)}</p>
        </div>
        <Badge variant="secondary">{txStatus || "—"}</Badge>
      </div>

      <Card className="border-border/60 bg-card/60 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-base">Buyer Verification</CardTitle>
          <CardDescription>
            {canBuyerVerify ? "Enter the OTP sent to the buyer email to continue the transfer." : "No buyer action pending for this transaction."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {canBuyerVerify ? (
            <div className="space-y-3 max-w-md">
              <div className="text-xs text-muted-foreground">Buyer Email</div>
              <Input value={buyerEmail} readOnly disabled />
              <div className="space-y-2">
                <div className="text-xs text-muted-foreground">Enter OTP</div>
                <Input placeholder="Enter OTP" value={otp} onChange={(e) => setOtp(e.target.value)} />
              </div>
              <div className="flex gap-2">
                <Button onClick={submit} disabled={!otp.trim() || busy}>Verify OTP</Button>
              </div>
              {msg && <div className="text-sm">{msg}</div>}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">Current status: {txStatus}. Check back later for updates.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
