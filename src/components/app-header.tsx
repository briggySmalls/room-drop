"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "@/components/sign-out-button";

export function AppHeader() {
  const pathname = usePathname();

  if (pathname.startsWith("/auth")) return null;

  return (
    <header className="border-b border-border">
      <div className="mx-auto flex h-14 max-w-screen-xl items-center justify-between px-4">
        <Link href="/" className="text-lg font-bold">
          <span className="text-primary">Room</span>
          <span className="text-accent">Drop</span>
        </Link>
        <SignOutButton />
      </div>
    </header>
  );
}
