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
  { label: "Deterministic Runtime", color: "from-[#b347ff]/30 to-[#00f0ff]/20" },
  { label: "Hand-Drawn VFX", color: "from-[#ff2d7b]/30 to-[#ff6a00]/20" },
  { label: "Ready for Local 2P", color: "from-[#39ff14]/30 to-[#00f0ff]/20" },
];
