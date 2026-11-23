"use client";

import type { ReactElement, ReactNode } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui-kit/tooltip";

interface HintProps {
  label: ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  // Prvek, ktery hint dostane (musi predat ref a props dal, napr. button, span, NavbarAction)
  children: ReactElement;
}

// Maly tooltip pri hoveru pro prvky mimo Button (ten ho umi sam pres title / tooltip)
export function Hint({ label, side = "top", children }: HintProps) {
  return (
    <Tooltip>
      <TooltipTrigger render={children} />
      <TooltipContent side={side}>{label}</TooltipContent>
    </Tooltip>
  );
}
