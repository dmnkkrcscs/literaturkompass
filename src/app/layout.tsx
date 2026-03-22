import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Literaturkompass 2.0",
  description:
    "AI-powered literature recommendation and analysis platform. Discover, analyze, and explore literary works with intelligent recommendations.",
  keywords: [
    "literature",
    "AI",
    "recommendations",
    "analysis",
    "books",
    "reading",
  ],
  authors: [{ name: "Literaturkompass Team" }],
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 5,
  },
  openGraph: {
    title: "Literaturkompass 2.0",
    description:
      "AI-powered literature recommendation and analysis platform",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="theme-color" content="#0a0a0f" media="(prefers-color-scheme: dark)" />
        <meta name="theme-color" content="#f5f5f7" media="(prefers-color-scheme: light)" />
      </head>
      <body className={`${inter.variable} bg-light-bg dark:bg-dark-bg`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
