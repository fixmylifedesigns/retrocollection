import type { Metadata } from "next";
import ControllerTester from "@/components/ControllerTester";

export const metadata: Metadata = { title: "Controller" };

const PAIRING = [
  {
    device: "Windows",
    steps: "Settings, Bluetooth & devices, Add device. Hold the controller’s pair button until its light flashes.",
  },
  {
    device: "Mac",
    steps: "System Settings, Bluetooth. Put the controller in pairing mode and click Connect when it appears.",
  },
  {
    device: "Android",
    steps: "Settings, Connected devices, Pair new device. Chrome picks the controller up automatically.",
  },
  {
    device: "iPhone and iPad",
    steps: "Settings, Bluetooth. Xbox, PlayStation and Switch Pro controllers are supported by Safari.",
  },
];

export default function ControllerPage() {
  return (
    <>
      <h1 className="display pt-10 text-6xl font-extrabold sm:pt-16 sm:text-8xl">Controller</h1>
      <p className="mt-4 max-w-xl text-lg text-muted">
        Press buttons and move the sticks to check everything registers before you play.
      </p>

      <ControllerTester />

      <section className="mt-16 max-w-3xl">
        <h2 className="text-2xl font-bold">Pair a Bluetooth controller</h2>
        <p className="mt-2 text-muted">
          Pair once with your device. After that, this site sees the controller whenever it’s on.
        </p>
        <dl className="mt-6 grid gap-5 sm:grid-cols-2">
          {PAIRING.map((p) => (
            <div key={p.device}>
              <dt className="font-semibold">{p.device}</dt>
              <dd className="mt-1 text-muted">{p.steps}</dd>
            </div>
          ))}
        </dl>
      </section>
    </>
  );
}
