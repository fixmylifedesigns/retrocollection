import type { Metadata, Viewport } from "next";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Retro Collection", template: "%s · Retro Collection" },
  description: "Play your Game Boy, Game Boy Advance and PS2 collection from anywhere.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#050505" },
  ],
};

// Runs before paint so the saved theme never flashes. Same key as the fixmylife site.
const THEME_SCRIPT = `try{var t=localStorage.getItem("fixmylife-theme");if(t!=="light"&&t!=="dark")t=matchMedia("(prefers-color-scheme: light)").matches?"light":"dark";document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300..600&display=swap"
        />
      </head>
      <body className="min-h-dvh">
        <SiteHeader />
        <main className="mx-auto w-full max-w-6xl px-5 pb-24 sm:px-8">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
