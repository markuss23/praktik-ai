import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-md border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/80",
        outline:
          "border-border bg-background hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)] aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
        ghost:
          "hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50",
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40",
        // Projektová varianta pro vratné, ale pozor-vyžadující akce (odpublikování,
        // vrácení k přepracování). Amber z Figma alert palety.
        warning:
          "bg-warning text-warning-foreground hover:bg-warning/80 focus-visible:border-warning focus-visible:ring-warning/40",
        link: "text-primary underline-offset-4 hover:underline",
        // Bez vlastních barev — layout, focus a disabled chování kitu si bere
        // komponenta, která má vlastní (značkovou) barevnost.
        plain: "",
        // Plná značková akce v adminu (uložit, generovat) — solidní gradient-r.
        "brand-solid":
          "bg-gradient-r text-primary-foreground hover:bg-gradient-r/80 focus-visible:ring-gradient-r/30",
        // Sekundární "tip" akce (editovat kurz, pokračovat).
        tip: "bg-tip text-primary-foreground hover:bg-tip/80 focus-visible:ring-tip/30",
        // Destruktivní akce bez výplně — jen barva textu a jemný hover.
        "ghost-destructive":
          "text-destructive hover:bg-destructive/10 focus-visible:ring-destructive/20",
        // "Přidat…" placeholder s přerušovaným rámečkem.
        dashed:
          "border-dashed border-border text-muted-foreground hover:border-gradient-r/30 hover:text-gradient-r hover:bg-gradient-r/10",
        // Projektové "soft" varianty — tónovaná výplň + barevný text. `destructive`
        // výše je už tato podoba; tohle jsou zbylé tóny z admin tabulek.
        "soft-accent":
          "bg-brand-accent/10 text-brand-accent hover:bg-brand-accent/20 focus-visible:ring-brand-accent/20",
        "soft-tip":
          "bg-tip/10 text-tip hover:bg-tip/20 focus-visible:ring-tip/20",
        "soft-success":
          "bg-success/10 text-success hover:bg-success/20 focus-visible:ring-success/20",
        "soft-warning":
          "bg-warning/10 text-warning hover:bg-warning/20 focus-visible:ring-warning/20",
        // Značkové CTA — gradient z Figmy (gradientL → gradientR).
        brand:
          "bg-gradient-to-r from-gradient-l to-gradient-r text-primary-foreground shadow-sm hover:opacity-90",
      },
      size: {
        default:
          "h-8 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        xs: "h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-9 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        // Hero CTA, matches the Figma "Buttons" component (2107:5983)
        xl: "h-10 gap-2 px-2 text-base font-bold [&_svg:not([class*='size-'])]:size-6",
        icon: "size-8",
        "icon-xs":
          "size-6 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-7 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg",
        "icon-lg": "size-9",
        // Drobná akční "pilulka" v hustých admin tabulkách (px-2.5 py-1 @ text-xs).
        pill: "h-6 gap-1 rounded-md px-2.5 text-xs",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
