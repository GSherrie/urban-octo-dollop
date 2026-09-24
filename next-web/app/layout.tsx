import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "SherPay — Income, Expenses & Reports",
  description: "Track income and expenses, see your balance, and export simple reports. GHS first, with Cash, Bank and mobile money.",
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}

