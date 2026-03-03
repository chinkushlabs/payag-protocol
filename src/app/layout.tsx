import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Payag Protocol",
  description: "The Trust & Settlement Layer for Autonomous AI Agents",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
