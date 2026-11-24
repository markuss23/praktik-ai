"use client";

import { Children, Fragment, isValidElement, type ComponentProps, type ReactNode } from "react";
import { Button as KitButton } from "../ui-kit/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui-kit/tooltip";

// Atribut, ktery Base UI TooltipTrigger preda renderovanemu elementu
const TOOLTIP_TRIGGER_ATTR = "data-base-ui-tooltip-trigger";

type TooltipSide = "top" | "bottom" | "left" | "right";

export type ButtonProps = ComponentProps<typeof KitButton> & {
  // Kratka vysvetlivka pri hoveru. Ikonova tlacitka ji berou sama z title nebo aria-label, false ji vypne
  tooltip?: ReactNode | false;
  tooltipSide?: TooltipSide;
};

// Viditelny text i ve vnorenych span apod., ikony (komponenty) a sr-only se nepocitaji
function hasVisibleText(children: ReactNode): boolean {
  return Children.toArray(children).some((child) => {
    if (typeof child === "string") return child.trim() !== "";
    if (typeof child === "number") return true;
    if (!isValidElement<{ className?: string; children?: ReactNode }>(child)) return false;
    if (child.type !== Fragment && typeof child.type !== "string") return false;
    if (child.props.className?.includes("sr-only")) return false;
    return hasVisibleText(child.props.children);
  });
}

// Kitovy Button + maly tooltip z kitu misto nativniho title u ikonovych tlacitek
export function Button({ tooltip, tooltipSide = "top", title, ...rest }: ButtonProps) {
  const iconOnly =
    (typeof rest.size === "string" && rest.size.startsWith("icon")) || !hasVisibleText(rest.children);
  const ariaLabel = rest["aria-label"];

  let label: ReactNode = null;
  if (tooltip === false) label = null;
  else if (tooltip != null) label = tooltip;
  else if (iconOnly) label = title ?? ariaLabel ?? null;

  // Uz je trigger jineho tooltipu, disabled tlacitko hover nedostane (pointer-events-none)
  if (!label || TOOLTIP_TRIGGER_ATTR in rest || rest.disabled) {
    return <KitButton {...rest} title={title} />;
  }

  // title byl u ikonoveho tlacitka jediny popis -> prechazi do aria-label
  const name = ariaLabel ?? (iconOnly && typeof label === "string" ? label : undefined);

  return (
    <Tooltip>
      <TooltipTrigger render={<KitButton {...rest} aria-label={name} />} />
      <TooltipContent side={tooltipSide}>{label}</TooltipContent>
    </Tooltip>
  );
}
