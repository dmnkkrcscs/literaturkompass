import type { Metadata } from "next";
import { Albert_Sans } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Navbar } from "@/components/layout/Navbar";

// Self-hosted via next/font: no render-blocking external request, no FOUT.
// Only the latin subset is shipped and the font swaps in immediately.
const albertSans = Albert_Sans({
    subsets: ["latin"],
    display: "swap",
    variable: "--font-sans",
});

export const metadata: Metadata = {
    title: "Literaturkompass",
    description: "Dein Assistent für Literaturwettbewerbe und Ausschreibungen im deutschsprachigen Raum.",
    keywords: ["Literaturwettbewerb", "Schreibwettbewerb", "Ausschreibung", "Anthologie", "Zeitschrift", "Literatur"],
    authors: [{ name: "Literaturkompass" }],
    manifest: "/manifest.json",
    appleWebApp: {
          capable: true,
          statusBarStyle: "default",
          title: "Literaturkompass",
    },
    openGraph: {
          title: "Literaturkompass",
          description: "Dein Assistent für Literaturwettbewerbe und Ausschreibungen",
          type: "website",
    },
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
          <html lang="de" className={albertSans.variable} suppressHydrationWarning>
                <head>
                        <meta charSet="utf-8" />
                        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
                        <meta name="theme-color" content="#0a0a0f" media="(prefers-color-scheme: dark)" />
                        <meta name="theme-color" content="#f5f5f7" media="(prefers-color-scheme: light)" />
                        <link rel="icon" href="/favicon.ico" />
                        <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png" />
                        <link rel="icon" type="image/png" sizes="512x512" href="/icon-512.png" />
                        <link rel="apple-touch-icon" sizes="192x192" href="/icon-192.png" />
                        <link rel="apple-touch-icon" sizes="512x512" href="/icon-512.png" />
                </head>
                <body className={`font-sans bg-light-bg dark:bg-dark-bg`}>
                        <Providers>
                                  <Navbar />
                                  <main>{children}</main>
                        </Providers>
                        <script
                                    dangerouslySetInnerHTML={{
                        __html: `if('serviceWorker' in navigator){window.addEventListener('load',()=>{navigator.serviceWorker.register('/sw.js')})}`,
                                    }}
                                  />
                </body>
          </html>
        );
}
