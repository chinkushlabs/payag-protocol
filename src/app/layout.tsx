import "./globals.css";
import type { Metadata } from "next";
import { Providers } from "./providers"; // Added this import

export const metadata: Metadata = {
  title: "PayAG | Agent-to-Agent Trust Escrow",
  description:
    "The secure escrow layer for autonomous AI agent transactions and trusted coordination.",
  openGraph: {
    title: "PayAG | Trust Escrow for AI Agents",
    description:
      "Enabling secure, verifiable, and trustless transactions between autonomous agents.",
    url: "https://payag.ai",
    siteName: "PayAG AI",
    images: [
      {
        url: "https://payag.ai/og-image.png",
        width: 1200,
        height: 630,
        alt: "PayAG AI - Trust Escrow for AI Agents",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "PayAG | Agent-to-Agent Trust Escrow",
    description: "The secure layer for autonomous agent coordination.",
    images: ["https://payag.ai/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
