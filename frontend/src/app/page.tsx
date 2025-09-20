"use client"

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient } from "@/lib/api";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, KeyRound, LogIn, Shield, Wallet } from "lucide-react";
import { motion } from "framer-motion";

export default function Home() {
  const [aadhaar, setAadhaar] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [connected, setConnected] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [userEmail, setUserEmail] = useState("");
  
  const { login } = useAuth();
  const router = useRouter();

  const masked = (val: string) => (val ? val.replace(/\d(?=\d{4})/g, "*") : "");

  const handleSendOtp = async () => {
    if (!aadhaar || aadhaar.length < 12) return;
    
    setLoading(true);
    setError("");
    
    try {
      const response = await apiClient.verifyAadhaarPan({ aadhaar });
      if (response.success) {
        setOtpSent(true);
        setUserEmail(response.email || "");
      } else {
        setError(response.message);
      }
    } catch (err) {
      setError("Failed to send OTP. Please try again.");
      console.error("OTP Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp || otp.length < 4) return;
    
    setLoading(true);
    setError("");
    
    try {
      const response = await apiClient.verifyOtp({ 
        email: userEmail, 
        otp 
      });
      
      if (response.success) {
        login(userEmail);
        router.push('/dashboard');
      } else {
        setError(response.message);
      }
    } catch (err) {
      setError("OTP verification failed. Please try again.");
      console.error("Verification Error:", err);
    } finally {
      setLoading(false);
    }
  };

  function simulateWalletConnect() {
    if (connected) {
      setConnected(false);
      setAddress(null);
      return;
    }
    const addr =
      "0x" + Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
    setConnected(true);
    setAddress(addr);
  }

  function copyToClipboard(value?: string | null) {
    if (!value) return;
    navigator.clipboard.writeText(value);
  }

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
      {/* neon gradient backdrop */}
      <div className="pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]">
        <div className="absolute -top-40 left-1/2 h-[40rem] w-[40rem] -translate-x-1/2 rounded-full blur-3xl opacity-30 bg-[conic-gradient(at_top_left,theme(colors.chart-3),theme(colors.primary),theme(colors.chart-2))]" />
      </div>

      <main className="relative z-10 container mx-auto px-6 py-16">
        <div className="flex items-center justify-between gap-6 mb-12">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-chart-2 to-chart-3 ring-1 ring-border" />
            <div>
              <h1 className="text-xl font-semibold tracking-tight">Block Estate</h1>
              <p className="text-sm text-muted-foreground">Institutional-grade, transparent, tamper-proof.</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            {connected && address ? (
              <Button variant="secondary" className="gap-2" onClick={() => copyToClipboard(address)}>
                <Wallet className="h-4 w-4" /> {address.slice(0, 6)}...{address.slice(-4)} <Copy className="h-3.5 w-3.5 opacity-70" />
              </Button>
            ) : (
              <Button variant="outline" className="gap-2" onClick={simulateWalletConnect}>
                <Wallet className="h-4 w-4" /> Connect Wallet
              </Button>
            )}
          </div>
        </div>

        {/* Hero section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mb-12 overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-b from-secondary/40 to-background p-8 md:p-12 backdrop-blur supports-[backdrop-filter]:bg-secondary/30"
        >
          <div className="grid items-center gap-8 md:grid-cols-2">
            <div className="space-y-4">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">A trusted platform for digital land ownership</h2>
              <p className="text-muted-foreground text-base md:text-lg">Seamless property registry, verification, and settlement—built with Web3 security and a bank-grade experience.</p>
              <div className="flex flex-wrap gap-3 pt-2">
                {/* User Login Dialog */}
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="lg" className="gap-2">Use as User</Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>User Login - Aadhaar</DialogTitle>
                      <DialogDescription>Authenticate using your Aadhaar number and OTP.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3">
                      <Label htmlFor="aadhaar">Aadhaar Number</Label>
                      <Input id="aadhaar" placeholder="xxxx-xxxx-xxxx" value={aadhaar} onChange={(e) => setAadhaar(e.target.value)} />
                      {!otpSent ? (
                        <div>
                          <Button 
                            onClick={handleSendOtp} 
                            disabled={!aadhaar || aadhaar.length < 12 || loading}
                          >
                            {loading ? "Sending..." : "Send OTP"}
                          </Button>
                          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="text-sm text-muted-foreground">
                            OTP sent to {userEmail}
                          </div>
                          <Input placeholder="Enter 6-digit OTP" value={otp} onChange={(e) => setOtp(e.target.value)} />
                          <Button 
                            className="w-full" 
                            onClick={handleVerifyOtp}
                            disabled={otp.length < 4 || loading}
                          >
                            <LogIn className="h-4 w-4 mr-2" /> 
                            {loading ? "Verifying..." : "Verify & Login"}
                          </Button>
                          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
                        </div>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>

                {/* Authenticator Login Dialog */}
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="lg" variant="secondary" className="gap-2">Use as Authenticator</Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Authenticator Login</DialogTitle>
                      <DialogDescription>Surveyor / Officer / Registrar login via Aadhaar + OTP.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3">
                      <Label htmlFor="aadhaar-auth">Aadhaar Number</Label>
                      <Input id="aadhaar-auth" placeholder="xxxx-xxxx-xxxx" />
                      <div className="flex gap-2">
                        <Link href="/registrar" className="w-full">
                          <Button className="w-full">Proceed</Button>
                        </Link>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                {/* Surveyor Login Dialog */}
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="lg" variant="outline" className="gap-2">Use as Surveyor</Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Surveyor Login</DialogTitle>
                      <DialogDescription>Login via Aadhaar + OTP to view assigned site verifications.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3">
                      <Label htmlFor="aadhaar-surveyor">Aadhaar Number</Label>
                      <Input id="aadhaar-surveyor" placeholder="xxxx-xxxx-xxxx" />
                      <div className="flex gap-2">
                        <Link href="/surveyor" className="w-full">
                          <Button className="w-full">Proceed</Button>
                        </Link>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
            <div className="relative">
              <div className="absolute -inset-6 rounded-2xl bg-[conic-gradient(at_top_left,theme(colors.chart-3)/20,transparent,theme(colors.chart-2)/20)] blur-xl" />
              <div className="relative rounded-xl border border-border/50 bg-card/50 p-6 shadow-sm">
                <div className="text-sm text-muted-foreground">Get started</div>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <Link href="#user">
                    <Button variant="secondary" className="w-full">Login with Aadhaar</Button>
                  </Link>
                  <Button variant="outline" className="w-full" onClick={simulateWalletConnect}>{connected ? "Disconnect Wallet" : "Connect Wallet"}</Button>
                </div>
                <div className="mt-4 text-xs text-muted-foreground">Two distinct portals ensure role-based access and workflows.</div>
              </div>
            </div>
          </div>
        </motion.section>
      </main>
    </div>
  );
}

function AuthCard({
  role,
  description,
  primaryCta,
  secondaryCta,
  footer,
  badge,
}: {
  role: string;
  description: string;
  primaryCta: React.ReactNode;
  secondaryCta?: React.ReactNode;
  footer?: React.ReactNode;
  badge?: string;
}) {
  return (
    <Card className="relative overflow-hidden border border-border/60 bg-card/60 backdrop-blur supports-[backdrop-filter]:bg-card/50">
      <div className="pointer-events-none absolute -inset-1 rounded-[inherit] bg-gradient-to-br from-chart-1/20 via-transparent to-chart-3/20" />
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{role}</CardTitle>
          {badge ? <Badge variant="secondary" className="text-foreground/80">{badge}</Badge> : null}
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {primaryCta}
        {secondaryCta ? (
          <>
            <Separator className="my-2" />
            {secondaryCta}
          </>
        ) : null}
        {footer ? <div className="pt-2 text-xs text-muted-foreground">{footer}</div> : null}
      </CardContent>
    </Card>
  );
}

function FeaturePill({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/40 px-4 py-3 backdrop-blur">
      <div className="font-medium">{title}</div>
      <div className=" text-sm text-muted-foreground">{desc}</div>
    </div>
  );
}

function LoginFooter() {
  return (
    <Tabs defaultValue="aadhar" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="aadhar">Aadhaar</TabsTrigger>
        <TabsTrigger value="wallet">Wallet</TabsTrigger>
      </TabsList>
      <TabsContent value="aadhar" className="text-sm text-muted-foreground">Use Aadhaar + OTP to verify your identity.</TabsContent>
      <TabsContent value="wallet" className="text-sm text-muted-foreground">Connect any EVM wallet to sign transactions.</TabsContent>
    </Tabs>
  );
}