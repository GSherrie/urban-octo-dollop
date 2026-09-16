import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { SherPayProvider } from "@/lib/store";
import { AppShell } from "@/components/AppShell";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "SherPay — Dashboard",
  description:
    "SherPay helps Ghanaian freelancers and SMEs invoice clients, track expenses, and get paid via MoMo or bank transfer.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SherPayProvider>
          <AppShell>{children}</AppShell>
        </SherPayProvider>
      </body>
    </html>
  );
}
