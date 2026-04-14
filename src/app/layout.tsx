import type { Metadata } from "next";
import "./globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";
import { SignOutButton } from "@/components/sign-out-button";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "RoomDrop",
  description: "Monitor hotel prices after booking and catch price drops",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable)}>
      <body className="antialiased">
        <header className="flex items-center justify-end px-4 py-2">
          <SignOutButton />
        </header>
        {children}
      </body>
    </html>
  );
}
