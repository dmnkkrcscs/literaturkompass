import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: "Literaturkompass 2.0",
  description:
    "Dein persönlicher Kompass durch die Welt der Literaturwettbewerbe, Anthologien und Zeitschriften.",
  keywords: [
    "Literatur",
    "Wettbewerb",
    "Anthologie",
    "Zeitschrift",
    "Schreiben",
    "Einreichung",
  ],
  authors: [{ name: "Literaturkompass" }],
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 5,
  },
  openGraph: {
    title: "Literaturkompass 2.0",
    description:
      "Dein persönlicher Kompass durch die Welt der Literaturwettbewerbe",
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
        <meta name="theme-color" content="#0f0f1a" media="(prefers-color-scheme: dark)" />
        <meta name="theme-color" content="#f8f9fa" media="(prefers-color-scheme: light)" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Albert+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&family=JetBrains+Mono:wght@400;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-light-bg dark:bg-dark-bg">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
