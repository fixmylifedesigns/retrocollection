import type { Metadata, Viewport } from "next";
import SiteHeader from "@/components/SiteHeader";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Retro Collection", template: "%s · Retro Collection" },
  description: "Play your Game Boy, Game Boy Advance and PS2 collection from anywhere.",
};

export const viewport: Viewport = { themeColor: "#eceef2" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wdth,wght@12..96,75..100,300..800&display=swap"
        />
      </head>
      <body className="min-h-dvh">
        <SiteHeader />
        <main className="mx-auto w-full max-w-6xl px-5 pb-24 sm:px-8">{children}</main>
      </body>
    </html>
  );
}
