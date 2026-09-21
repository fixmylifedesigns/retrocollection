import type { Metadata } from "next";
import LocalPlayer from "@/components/LocalPlayer";

export const metadata: Metadata = { title: "Play a file" };

export default function LocalPlayPage() {
  return (
    <div className="pt-10 sm:pt-16">
      <LocalPlayer />
    </div>
  );
}
