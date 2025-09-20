"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

export const Navbar = () => {
  const { isAuthenticated, userEmail, logout } = useAuth();
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-6 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-md bg-gradient-to-br from-chart-2 to-chart-3 ring-1 ring-border" />
          <span className="text-sm font-semibold tracking-tight">Block Estate</span>
        </Link>
        <nav className="hidden sm:flex items-center gap-5 text-sm">
          <Link href="/marketplace" className="text-muted-foreground hover:text-foreground">Marketplace</Link>
          {isAuthenticated && (
            <Link href="/dashboard" className="text-muted-foreground hover:text-foreground">Dashboard</Link>
          )}
          <Link href="/registrar" className="text-muted-foreground hover:text-foreground">Authenticator</Link>
          <Link href="/surveyor" className="text-muted-foreground hover:text-foreground">Surveyor</Link>
        </nav>
        <div className="flex items-center gap-3">
          {isAuthenticated && userEmail ? (
            <>
              <span className="text-sm text-muted-foreground">Welcome, {userEmail.split('@')[0]}</span>
              <Button variant="outline" size="sm" onClick={logout}>
                Logout
              </Button>
            </>
          ) : (
            <span className="text-sm text-muted-foreground">Not logged in</span>
          )}
        </div>
      </div>
    </header>
  );
};