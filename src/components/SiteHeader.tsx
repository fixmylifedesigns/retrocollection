"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import ControllerPill from "@/components/ControllerPill";

const NAV = [
  { href: "/", label: "Library" },
  { href: "/emulators", label: "Emulators" },
  { href: "/controller", label: "Controller" },
];

export default function SiteHeader() {
  const path = usePathname();
  return (
    <header className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-8 gap-y-3 px-5 py-5 sm:px-8">
      <Link href="/" className="display text-2xl font-extrabold">
        Retro Collection
      </Link>
      <nav className="flex gap-1 text-[0.95rem]">
        {NAV.map((item) => {
          const active = item.href === "/" ? path === "/" : path.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`rounded-full px-3 py-1.5 transition-colors ${
                active ? "bg-ink text-paper" : "text-muted hover:bg-plastic hover:text-ink"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="ml-auto">
        <ControllerPill />
      </div>
    </header>
  );
}
