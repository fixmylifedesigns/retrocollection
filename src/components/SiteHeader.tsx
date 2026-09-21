"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import ControllerPill from "@/components/ControllerPill";
import ThemeToggle from "@/components/ThemeToggle";

const NAV = [
  { href: "/", label: "Library" },
  { href: "/emulators", label: "Emulators" },
  { href: "/controller", label: "Controller" },
];

export default function SiteHeader() {
  const path = usePathname();
  return (
    <header className="relative z-10 mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-8 gap-y-3 px-5 py-6 sm:px-8">
      <Link href="/" className="text-sm">
        <span className="text-muted">fixmylife</span> <span className="font-medium">Retro Collection</span>
      </Link>
      <nav className="flex gap-5 text-sm">
        {NAV.map((item) => {
          const active = item.href === "/" ? path === "/" : path.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`transition-colors ${active ? "text-ink" : "text-muted hover:text-ink"}`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="ml-auto flex items-center gap-2">
        <ControllerPill />
        <ThemeToggle />
      </div>
    </header>
  );
}
