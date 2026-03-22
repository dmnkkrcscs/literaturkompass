import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";

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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-light-bg dark:bg-dark-bg">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
