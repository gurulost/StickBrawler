import { PenLine, Users2, WalletMinimal, Activity, type LucideIcon } from "lucide-react";

export const landingFeatureCards: Array<{
  title: string;
  description: string;
  accent: string;
  icon: LucideIcon;
  image?: string;
}> = [
  {
    title: "Procedural Ink Fighters",
    description:
      "Blend silhouettes, attach accessories, and see the ink shader render every stroke in realtime.",
    accent: "INK",
    icon: PenLine,
    image: "/screens/customizer.png",
  },
  {
    title: "Local Co‑Op & Shared Runtime",
    description:
      "Two players share the same deterministic MatchRuntime mirrored on the backend for validation.",
    accent: "CO-OP",
    icon: Users2,
    image: "/screens/local-coop.png",
  },
  {
    title: "Economy & Loadouts",
    description:
      "Hashed loadouts sync with the economy API so every ink tweak persists securely between sessions.",
    accent: "ECONOMY",
    icon: WalletMinimal,
    image: "/screens/economy.png",
  },
  {
    title: "Telemetry + Anti‑Cheat",
    description:
      "Guard breaks, combos, and hit data stream into dashboards for score signing and live tuning.",
    accent: "TELEMETRY",
    icon: Activity,
    image: "/screens/telemetry.png",
  },
];

export const heroBadges = [
  { label: "Deterministic Runtime", color: "from-purple-500/30 to-indigo-500/30" },
  { label: "Hand-Drawn VFX", color: "from-amber-500/30 to-rose-500/30" },
  { label: "Ready for Local 2P", color: "from-emerald-500/30 to-cyan-500/30" },
];
