import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center clip-angular-sm border px-2.5 py-0.5 text-xs font-tech font-bold uppercase tracking-wider transition-colors focus:outline-none focus:ring-1 focus:ring-[#00f0ff]/50",
  {
    variants: {
      variant: {
        default:
          "border-[#00f0ff]/30 bg-[#00f0ff]/10 text-[#00f0ff] shadow-none",
        secondary:
          "border-white/10 bg-white/5 text-white/60",
        destructive:
          "border-[#ff2d7b]/30 bg-[#ff2d7b]/10 text-[#ff2d7b] shadow-none",
        outline: "text-white/70 border-white/15",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
