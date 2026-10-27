"use client"

import * as React from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { ArrowLeft, ArrowRight, XIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui-kit/button"
import { Dialog, DialogOverlay, DialogPortal } from "@/components/ui-kit/dialog"

/**
 * Jednoduchý onboarding — pár kroků v okně, každý s ikonou, titulkem a
 * popisem, tečky postupu a Zpět / Další.
 *
 * - `Onboarding`       — samotný panel s krokováním, vykreslí se kdekoli
 *   (v UI kitu staticky)
 * - `OnboardingDialog` — panel v modálním okně nad celou aplikací
 *
 * Horní plocha je slot: krok s `media` místo ikony vykreslí vlastní obsah —
 * tudy přijde verze s maskotem. `tone` kroku nastaví `--onboarding-tone`,
 * ze kterého berou barvu plocha, dlaždice i aktivní tečka; mezi kroky se
 * barva plynule přelije.
 *
 * Jestli už uživatel onboarding viděl, si pamatuje aplikace, ne komponenta.
 */

type OnboardingTone = "purple" | "rose" | "green" | "blue" | "orange"

type OnboardingStep = {
  title: React.ReactNode
  description: React.ReactNode
  /** Ikona do dlaždice v horní ploše. */
  icon?: React.ReactNode
  /** Vlastní obsah horní plochy místo dlaždice s ikonou (např. maskot). */
  media?: React.ReactNode
  tone?: OnboardingTone
}

/** Stejné tokeny jako tóny coverů modulů. */
const ONBOARDING_TONES: Record<OnboardingTone, string> = {
  purple: "[--onboarding-tone:var(--gradient-r)]",
  rose: "[--onboarding-tone:var(--gradient-l)]",
  green: "[--onboarding-tone:var(--primary)]",
  blue: "[--onboarding-tone:var(--tip)]",
  orange: "[--onboarding-tone:var(--brand-accent)]",
}

/**
 * Tónovaná horní plocha s dekorativními kruhy. Bez `tone` dědí barvu
 * z panelu kolem.
 */
function OnboardingMedia({
  tone,
  className,
  children,
  ...props
}: React.ComponentProps<"div"> & { tone?: OnboardingTone }) {
  return (
    <div
      data-slot="onboarding-media"
      aria-hidden
      className={cn(
        "relative flex h-40 items-center justify-center overflow-hidden bg-(--onboarding-tone)/12 transition-colors duration-300",
        tone && ONBOARDING_TONES[tone],
        className
      )}
      {...props}
    >
      <span className="absolute -top-12 -right-10 size-40 rounded-full border-2 border-(--onboarding-tone)/25 transition-colors duration-300" />
      <span className="absolute -bottom-14 -left-8 size-36 rounded-full bg-(--onboarding-tone)/12 transition-colors duration-300" />
      <div className="relative">{children}</div>
    </div>
  )
}

/** Dlaždice s ikonou — blob jako u zastávek v onboardingu s maskotem. */
function OnboardingIcon({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="onboarding-icon"
      className={cn(
        "flex size-20 items-center justify-center rounded-[62%_38%_51%_49%/44%_58%_42%_56%] bg-(--onboarding-tone) text-white shadow-md transition-colors duration-300 [&_svg:not([class*='size-'])]:size-9",
        className
      )}
      {...props}
    />
  )
}

/** Tečky postupu — aktivní se protáhne do pilulky v barvě kroku. */
function OnboardingProgress({
  step,
  count,
  className,
  ...props
}: React.ComponentProps<"div"> & { step: number; count: number }) {
  return (
    <div
      data-slot="onboarding-progress"
      aria-hidden
      className={cn("flex items-center gap-1.5", className)}
      {...props}
    >
      {Array.from({ length: count }, (_, i) => (
        <span
          key={i}
          className={cn(
            "h-1.5 rounded-full transition-all duration-300",
            i === step ? "w-5 bg-(--onboarding-tone)" : "w-1.5 bg-foreground/20"
          )}
        />
      ))}
    </div>
  )
}

/**
 * Panel s krokováním. `onClose` přidá zavírací X a „Přeskočit" a volá se
 * i po posledním kroku, hned po `onFinish`.
 */
function Onboarding({
  steps,
  onClose,
  onFinish,
  finishLabel = "Jdeme na to",
  id: idProp,
  className,
  ...props
}: Omit<React.ComponentProps<"section">, "children"> & {
  steps: OnboardingStep[]
  onClose?: () => void
  onFinish?: () => void
  finishLabel?: React.ReactNode
}) {
  const generatedId = React.useId()
  const id = idProp ?? generatedId
  const [step, setStep] = React.useState(0)
  // Směr posledního kroku pro animaci; null = první vykreslení, bez animace.
  const [direction, setDirection] = React.useState<"forward" | "back" | null>(
    null
  )

  const current = steps[step]
  if (!current) return null
  const isLast = step === steps.length - 1

  function go(next: number) {
    setDirection(next > step ? "forward" : "back")
    setStep(next)
  }

  const enter = direction && [
    "animate-in fade-in-0 duration-300 motion-reduce:animate-none",
    direction === "forward" ? "slide-in-from-right-4" : "slide-in-from-left-4",
  ]

  return (
    <section
      data-slot="onboarding"
      id={id}
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-description`}
      className={cn(
        "relative w-full max-w-md overflow-hidden rounded-xl bg-popover text-sm text-popover-foreground shadow-lg ring-1 ring-foreground/10",
        ONBOARDING_TONES[current.tone ?? "green"],
        className
      )}
      {...props}
    >
      {onClose && (
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Zavřít"
          className="absolute top-2 right-2 z-10"
          onClick={onClose}
        >
          <XIcon />
        </Button>
      )}

      <OnboardingMedia>
        <div key={step} className={cn(enter)}>
          {current.media ?? <OnboardingIcon>{current.icon}</OnboardingIcon>}
        </div>
      </OnboardingMedia>

      {/* min-h drží patičku na místě, i když má krok kratší popis. */}
      <div key={step} className={cn("grid min-h-32 content-start gap-2 px-6 pt-5", enter)}>
        <p className="text-xs font-medium text-muted-foreground">
          Krok {step + 1}/{steps.length}
        </p>
        <h2
          id={`${id}-title`}
          className="font-heading text-xl leading-tight font-semibold text-pretty"
        >
          {current.title}
        </h2>
        <p
          id={`${id}-description`}
          className="leading-relaxed text-pretty text-muted-foreground"
        >
          {current.description}
        </p>
      </div>

      <div className="flex items-center justify-between gap-4 p-6">
        <OnboardingProgress step={step} count={steps.length} />
        <div className="flex gap-2">
          {step > 0 ? (
            <Button variant="outline" onClick={() => go(step - 1)}>
              <ArrowLeft data-icon="inline-start" />
              Zpět
            </Button>
          ) : (
            onClose && (
              <Button variant="ghost" onClick={onClose}>
                Přeskočit
              </Button>
            )
          )}
          {isLast ? (
            <Button
              onClick={() => {
                onFinish?.()
                onClose?.()
              }}
            >
              {finishLabel}
              <ArrowRight data-icon="inline-end" />
            </Button>
          ) : (
            <Button onClick={() => go(step + 1)}>
              Další
              <ArrowRight data-icon="inline-end" />
            </Button>
          )}
        </div>
      </div>
    </section>
  )
}

/**
 * Onboarding v modálním okně. Vrstvy jsou na `--z-overlay` / `--z-modal`,
 * aby šlo nad sticky Header. Spouštěč jde do `children`, např.
 * `<DialogTrigger render={<Button />}>…</DialogTrigger>`; jinak se řídí
 * přes `open` / `defaultOpen`. Po zavření se krokování vrátí na začátek.
 */
function OnboardingDialog({
  steps,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  onFinish,
  finishLabel,
  children,
}: {
  steps: OnboardingStep[]
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  onFinish?: () => void
  finishLabel?: React.ReactNode
  children?: React.ReactNode
}) {
  const id = React.useId()
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen)
  const open = openProp ?? uncontrolledOpen

  function setOpen(next: boolean) {
    setUncontrolledOpen(next)
    onOpenChange?.(next)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {children}
      <DialogPortal>
        <DialogOverlay className="z-[var(--z-overlay)]" />
        <DialogPrimitive.Popup
          data-slot="onboarding-dialog"
          aria-labelledby={`${id}-title`}
          aria-describedby={`${id}-description`}
          className="fixed top-1/2 left-1/2 z-[var(--z-modal)] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 outline-none duration-200 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95"
        >
          <Onboarding
            id={id}
            steps={steps}
            onFinish={onFinish}
            finishLabel={finishLabel}
            onClose={() => setOpen(false)}
          />
        </DialogPrimitive.Popup>
      </DialogPortal>
    </Dialog>
  )
}

export {
  Onboarding,
  OnboardingDialog,
  OnboardingIcon,
  OnboardingMedia,
  OnboardingProgress,
}
export type { OnboardingStep, OnboardingTone }
