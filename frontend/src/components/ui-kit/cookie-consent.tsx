"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Cookie } from "lucide-react"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui-kit/badge"
import { Button } from "@/components/ui-kit/button"
import { Switch } from "@/components/ui-kit/switch"

/**
 * Souhlas s cookies — zatím jen vzhled. Uložení volby ani blokování skriptů
 * neřeší, to přijde s implementací.
 *
 * - `bar`   — lišta přes celou šířku u spodního okraje
 * - `card`  — plovoucí karta v rohu, méně zakrývá obsah
 * - `panel` — druhá vrstva s kategoriemi, nahradí lištu/kartu po kliknutí
 *   na „Nastavení"
 *
 * Komponenta se sama nepozicuje, `fixed` se přidává až v místě použití — díky
 * tomu jde stejný kus ukázat i staticky v UI kitu. Doporučené umístění:
 * lišta `fixed inset-x-0 bottom-0 z-40`, karta a panel
 * `fixed bottom-4 left-4 z-40 w-[calc(100%-2rem)]`.
 *
 * „Odmítnout vše" patří na první vrstvu vedle „Přijmout vše" a ve stejné
 * velikosti — odmítnout musí jít stejně snadno jako souhlasit (ÚOOÚ / EDPB).
 */
const cookieConsentVariants = cva(
  "group/cookie-consent @container/cookie-consent bg-popover text-sm text-popover-foreground",
  {
    variants: {
      variant: {
        bar: "w-full border-t border-foreground/15 shadow-[0_-4px_16px_0_rgba(0,0,0,0.08)]",
        card: "w-full max-w-sm rounded-xl shadow-lg ring-1 ring-foreground/10",
        panel:
          "max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-xl shadow-lg ring-1 ring-foreground/10",
      },
    },
    defaultVariants: {
      variant: "card",
    },
  }
)

// Lišta se skládá podle vlastní šířky (container query), ne podle viewportu —
// v úzkém sloupci se tak zalomí stejně jako na mobilu.
const cookieConsentInnerVariants = cva(
  "grid items-start gap-x-3 gap-y-4 has-[>[data-slot=cookie-consent-icon]]:grid-cols-[auto_1fr]",
  {
    variants: {
      variant: {
        bar: "mx-auto max-w-6xl px-6 py-4 @2xl/cookie-consent:grid-cols-[1fr_auto] @2xl/cookie-consent:items-center @2xl/cookie-consent:gap-x-6 @2xl/cookie-consent:has-[>[data-slot=cookie-consent-icon]]:grid-cols-[auto_1fr_auto]",
        card: "p-4",
        panel: "p-5",
      },
    },
    defaultVariants: {
      variant: "card",
    },
  }
)

type CookieConsentVariant = NonNullable<
  VariantProps<typeof cookieConsentVariants>["variant"]
>

const CookieConsentContext = React.createContext<{
  variant: CookieConsentVariant
}>({ variant: "card" })

function CookieConsent({
  className,
  variant = "card",
  children,
  ...props
}: React.ComponentProps<"section"> &
  VariantProps<typeof cookieConsentVariants>) {
  const resolved = variant ?? "card"
  const contextValue = React.useMemo(() => ({ variant: resolved }), [resolved])

  return (
    <CookieConsentContext.Provider value={contextValue}>
      <section
        data-slot="cookie-consent"
        data-variant={resolved}
        aria-label="Souhlas s cookies"
        className={cn(cookieConsentVariants({ variant: resolved }), className)}
        {...props}
      >
        <div className={cookieConsentInnerVariants({ variant: resolved })}>
          {children}
        </div>
      </section>
    </CookieConsentContext.Provider>
  )
}

/** Dlaždice s ikonou — výchozí je sušenka v tintu --brand-accent. */
function CookieConsentIcon({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="cookie-consent-icon"
      aria-hidden
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-accent/15 text-brand-accent [&_svg:not([class*='size-'])]:size-5",
        className
      )}
      {...props}
    >
      {children ?? <Cookie />}
    </div>
  )
}

function CookieConsentHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="cookie-consent-header"
      className={cn("grid min-w-0 gap-1", className)}
      {...props}
    />
  )
}

function CookieConsentTitle({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="cookie-consent-title"
      className={cn(
        "font-heading text-base leading-snug font-semibold",
        className
      )}
      {...props}
    />
  )
}

function CookieConsentDescription({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="cookie-consent-description"
      className={cn(
        "text-pretty text-muted-foreground [&_a]:text-foreground [&_a]:underline [&_a]:underline-offset-3 [&_a]:hover:text-primary",
        className
      )}
      {...props}
    />
  )
}

/**
 * Tlačítka se dělí o šířku rovným dílem, ať „Odmítnout" nevyjde menší než
 * „Přijmout". V široké liště se odsunou doprava a drží vlastní šířku.
 */
function CookieConsentActions({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const { variant } = React.useContext(CookieConsentContext)

  return (
    <div
      data-slot="cookie-consent-actions"
      className={cn(
        "col-span-full flex flex-wrap gap-2 *:flex-1",
        variant === "bar" &&
          "@2xl/cookie-consent:col-span-1 @2xl/cookie-consent:*:flex-none",
        className
      )}
      {...props}
    />
  )
}

function CookieConsentCategories({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="cookie-consent-categories"
      className={cn(
        "col-span-full grid divide-y divide-foreground/10 overflow-hidden rounded-lg border border-foreground/15",
        className
      )}
      {...props}
    />
  )
}

/**
 * Jedna kategorie s přepínačem. Celý řádek je <label>, takže se dá přepnout
 * klikem kamkoli. `required` = nezbytné cookies: zapnuté a nejdou vypnout.
 */
function CookieConsentCategory({
  title,
  description,
  required = false,
  className,
  ...props
}: Omit<React.ComponentProps<typeof Switch>, "title"> & {
  title: React.ReactNode
  description?: React.ReactNode
  required?: boolean
}) {
  const id = React.useId()

  return (
    <label
      data-slot="cookie-consent-category"
      className={cn(
        "flex items-center justify-between gap-4 p-3 transition-colors",
        !required && "cursor-pointer hover:bg-muted/60",
        className
      )}
    >
      <span className="grid min-w-0 gap-0.5">
        <span
          id={`${id}-title`}
          className="flex flex-wrap items-center gap-2 font-medium"
        >
          {title}
          {required && <Badge variant="meta">Vždy aktivní</Badge>}
        </span>
        {description && (
          <span
            id={`${id}-description`}
            className="text-xs leading-relaxed text-muted-foreground"
          >
            {description}
          </span>
        )}
      </span>
      <Switch
        aria-labelledby={`${id}-title`}
        aria-describedby={description ? `${id}-description` : undefined}
        {...props}
        {...(required ? { checked: true, disabled: true } : {})}
      />
    </label>
  )
}

/**
 * Plovoucí ikona pro znovuotevření nastavení — souhlas musí jít kdykoli
 * změnit nebo odvolat. Zobrazuje se po uložení volby, typicky
 * `fixed bottom-4 left-4 z-40`.
 */
function CookieConsentTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof Button>) {
  return (
    <Button
      variant="outline"
      size="icon-lg"
      aria-label="Nastavení cookies"
      title="Nastavení cookies"
      className={cn("rounded-full shadow-md", className)}
      {...props}
    >
      {children ?? <Cookie />}
    </Button>
  )
}

export {
  CookieConsent,
  CookieConsentActions,
  CookieConsentCategories,
  CookieConsentCategory,
  CookieConsentDescription,
  CookieConsentHeader,
  CookieConsentIcon,
  CookieConsentTitle,
  CookieConsentTrigger,
  cookieConsentVariants,
}
export type { CookieConsentVariant }
