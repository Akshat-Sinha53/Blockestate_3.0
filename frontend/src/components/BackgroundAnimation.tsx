"use client";
import { usePathname } from "next/navigation";

export default function BackgroundAnimation() {
  const pathname = usePathname();
  if (pathname === "/marketplace") return null;

  return (
    <div className="fixed inset-0 -z-50 overflow-hidden pointer-events-none opacity-40">
      <div className="absolute top-[20%] left-[10%] w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] mix-blend-screen animate-blob" />
      <div className="absolute top-[40%] right-[10%] w-[400px] h-[400px] bg-blue-500/20 rounded-full blur-[100px] mix-blend-screen animate-blob animation-delay-2000" />
      <div className="absolute -bottom-[20%] left-[30%] w-[600px] h-[600px] bg-purple-500/20 rounded-full blur-[130px] mix-blend-screen animate-blob animation-delay-4000" />
    </div>
  );
}
