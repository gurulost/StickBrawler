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
    title: "Local Versus & Shared Runtime",
    description:
      "Solo and couch-versus matches run on the same deterministic MatchRuntime mirrored on the backend for validation.",
    accent: "CO-OP",
    icon: Users2,
    image: "/screens/local-coop.png",
  },
  {
    title: "Guest-Ready Loadouts",
    description:
      "Ink loadouts stay playable offline first, with optional profile sync layered in when account services are available.",
    accent: "ECONOMY",
    icon: WalletMinimal,
    image: "/screens/economy.png",
  },
  {
    title: "Combat Telemetry",
    description:
      "Guard breaks, combos, and hit data are buffered for leaderboard integrity and balance tuning during the local slice.",
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
