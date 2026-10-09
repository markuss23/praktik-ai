import * as React from "react"
import { BookMarked } from "lucide-react"

import { cn, czechPlural } from "@/lib/utils"

function Card({
  className,
  size = "default",
  ...props
}: React.ComponentProps<"div"> & { size?: "default" | "sm" }) {
  return (
    <div
      data-slot="card"
      data-size={size}
      className={cn(
        // Shell is shared by the Figma "Course cards" (2120:3141) and
        // "VerejnaDB card" (1874:4585): white bg, 1px rgba(0,0,0,0.2) border,
        // 8px radius, 0 4px 4px rgba(0,0,0,.25), 12px horizontal / 24px
        // vertical padding, 24px gap between slots.
        "group/card flex flex-col gap-6 overflow-hidden rounded-md border border-foreground/20 bg-card py-6 text-sm text-card-foreground shadow-[0_4px_4px_0_rgba(0,0,0,0.25)] [--card-spacing:--spacing(3)] has-data-[slot=card-image]:pt-0 has-[>img:first-child]:pt-0 data-[size=sm]:gap-4 data-[size=sm]:py-4 *:[img:first-child]:rounded-t-md *:[img:last-child]:rounded-b-md",
        className
      )}
      {...props}
    />
  )
}

/**
 * Cover slot (2120:3142). The 590×226 box from Figma is kept as an aspect
 * ratio so the card can shrink; the child image fills it and is cropped.
 * Accepts a plain <img> or a next/image with `fill`.
 */
function CardImage({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-image"
      className={cn(
        "relative aspect-[590/226] w-full shrink-0 overflow-hidden rounded-t-md bg-muted *:h-full *:w-full *:object-cover",
        className
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "group/card-header @container/card-header grid auto-rows-min items-start gap-1.5 rounded-t-md px-(--card-spacing) has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto] [.border-b]:pb-(--card-spacing)",
        className
      )}
      {...props}
    />
  )
}

/**
 * `gradient` paints the title with the brand gradient (gradientL → gradientR)
 * the way the course card does it in Figma; plain cards keep a solid title.
 */
function CardTitle({
  className,
  gradient = false,
  ...props
}: React.ComponentProps<"div"> & { gradient?: boolean }) {
  return (
    <div
      data-slot="card-title"
      data-gradient={gradient || undefined}
      className={cn(
        "font-heading text-base leading-snug font-medium group-data-[size=sm]/card:text-sm",
        gradient &&
          "w-fit bg-linear-to-r from-gradient-l to-gradient-r bg-clip-text font-bold text-transparent",
        className
      )}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-(--card-spacing)", className)}
      {...props}
    />
  )
}

/** Pills row (2120:3147) — the gray meta badges under the description. */
function CardMeta({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-meta"
      className={cn(
        "flex flex-wrap items-center gap-2 px-(--card-spacing)",
        className
      )}
      {...props}
    />
  )
}

/** Icon + label pair used inside the footer (2120:3152). */
function CardStat({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-stat"
      className={cn(
        "flex min-w-0 items-center gap-2 text-xs [&_svg]:size-4 [&_svg]:shrink-0",
        className
      )}
      {...props}
    />
  )
}

/**
 * Course progress: module count on the left, completion on the right and the
 * track underneath. `label` / `hint` default to the Czech copy used in the app
 * (`0/3 moduly` + `0%`).
 */
function CardProgress({
  className,
  value,
  max,
  label,
  hint,
  icon,
  ...props
}: Omit<React.ComponentProps<"div">, "children"> & {
  value: number
  max: number
  label?: React.ReactNode
  hint?: React.ReactNode
  icon?: React.ReactNode
}) {
  const done = Math.max(0, Math.min(value, max))
  const percent = max > 0 ? Math.round((done / max) * 100) : 0

  return (
    <div
      data-slot="card-progress"
      className={cn("flex min-w-0 flex-1 flex-col gap-1.5", className)}
      {...props}
    >
      <div className="flex items-center justify-between gap-2">
        <CardStat>
          {icon ?? <BookMarked aria-hidden />}
          <span className="truncate">
            {label ??
              `${done}/${max} ${czechPlural(max, "modul", "moduly", "modulů")}`}
          </span>
        </CardStat>
        <span className="shrink-0 text-xs font-medium text-primary">
          {hint ?? `${percent}%`}
        </span>
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={done}
        aria-valuetext={`${percent}%`}
        className="h-1.5 w-full overflow-hidden rounded-full bg-foreground/10"
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}

/**
 * Footer row (2120:3151) — hairline above it, then content laid out edge to
 * edge inside the card padding. Not a filled bar like stock shadcn.
 */
function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "flex items-center justify-between gap-3 border-t px-(--card-spacing) pt-6 group-data-[size=sm]/card:pt-4",
        className
      )}
      {...props}
    />
  )
}

export {
  Card,
  CardImage,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
  CardMeta,
  CardStat,
  CardProgress,
}
