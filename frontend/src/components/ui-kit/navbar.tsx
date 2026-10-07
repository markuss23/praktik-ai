"use client"

import * as React from "react"
import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Hlavní navigační lišta. Barvy si drží v lokálních proměnných (`--nav-*`),
 * takže odkazy, ikony i CTA fungují stejně na světlém i tmavém podkladu
 * a nemusí se přebarvovat po jednotlivých prvcích.
 *
 * Podklad je neutrální `--muted` (nikdy čistě bílý) s lehkou průhledností,
 * aby se pod přilepenou lištou při scrollování rozostřil obsah.
 */
const navbarVariants = cva([
  "sticky top-0 z-[var(--z-header)] w-full backdrop-blur-md",
  "border-b border-[var(--nav-border)] bg-muted/90 text-[var(--nav-fg)]",
  "[--nav-fg:var(--foreground)]",
  "[--nav-dim:color-mix(in_oklch,var(--foreground)_58%,transparent)]",
  "[--nav-hover:color-mix(in_oklch,var(--foreground)_8%,transparent)]",
  // Aktivní položka: pilulka v --ring (#857AD2), lehce průhledná — pod
  // přilepenou lištou se tak prokreslí rozostřený obsah. Ve tmavém režimu je
  // token světlejší, takže se popisek překlápí na tmavý.
  "[--nav-active:color-mix(in_oklch,var(--ring)_88%,transparent)]",
  "[--nav-active-fg:oklch(0.985_0_0)] dark:[--nav-active-fg:oklch(0.205_0_0)]",
  "[--nav-border:var(--border)]",
  "[--nav-ring:color-mix(in_oklch,var(--foreground)_25%,transparent)]",
])

function Navbar({ className, ...props }: React.ComponentProps<"header">) {
  return (
    <header
      data-slot="navbar"
      className={cn(navbarVariants(), className)}
      {...props}
    />
  )
}

/** Samotná lišta. Sourozencem je typicky `<NavbarMobileNav>` pod ní. */
function NavbarBar({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="navbar-bar"
      className={cn(
        "mx-auto flex h-20 w-full max-w-[1600px] items-center justify-between gap-3 px-4 sm:h-24 sm:px-6 lg:px-8",
        className
      )}
      {...props}
    />
  )
}

/** Jen značka — název „PRAKTIK-AI“ nese logo samo, textem se neopakuje. */
function NavbarBrand({ className, render, ...props }: useRender.ComponentProps<"a">) {
  return useRender({
    defaultTagName: "a",
    props: mergeProps<"a">(
      {
        className: cn(
          "flex shrink-0 items-center rounded-full outline-none",
          "transition-transform duration-200 ease-out hover:scale-105 active:scale-100",
          "focus-visible:ring-3 focus-visible:ring-[var(--nav-ring)]",
          className
        ),
      },
      props
    ),
    render,
    state: { slot: "navbar-brand" },
  })
}

function NavbarNav({ className, ...props }: React.ComponentProps<"nav">) {
  return (
    <nav
      data-slot="navbar-nav"
      aria-label="Hlavní navigace"
      className={cn("hidden items-center gap-1 md:flex", className)}
      {...props}
    />
  )
}

/**
 * Hover: pod popisek se od středu roztáhne pilulka. Aktivní položka si ji
 * drží natrvalo, jen o odstín sytější — bez podtržení.
 */
const navbarLinkVariants = cva(
  [
    "group/navbar-link relative isolate inline-flex items-center justify-center",
    "rounded-full px-4 py-2.5 text-base whitespace-nowrap outline-none",
    "transition-colors duration-200 ease-out",
    "focus-visible:ring-3 focus-visible:ring-[var(--nav-ring)]",
    // pilulka na pozadí
    "before:absolute before:inset-0 before:-z-10 before:rounded-full",
    "before:bg-[var(--nav-hover)] before:scale-x-75 before:opacity-0",
    "before:transition before:duration-200 before:ease-out",
    "hover:before:scale-x-100 hover:before:opacity-100",
    "focus-visible:before:scale-x-100 focus-visible:before:opacity-100",
  ],
  {
    variants: {
      active: {
        true: [
          "font-semibold text-[var(--nav-active-fg)]",
          "before:scale-x-100 before:opacity-100",
          "before:bg-[var(--nav-active)]",
        ],
        false: "font-medium text-[var(--nav-dim)] hover:text-[var(--nav-fg)]",
      },
    },
    defaultVariants: {
      active: false,
    },
  }
)

function NavbarLink({
  className,
  active = false,
  children,
  render,
  ...props
}: useRender.ComponentProps<"a"> & VariantProps<typeof navbarLinkVariants>) {
  return useRender({
    defaultTagName: "a",
    props: mergeProps<"a">(
      {
        "aria-current": active ? "page" : undefined,
        className: cn(navbarLinkVariants({ active }), className),
        children: (
          // Skrytá tučná kopie drží šířku, aby přepnutí do aktivního stavu
          // neposunulo zbytek navigace.
          <span className="grid place-items-center">
            <span
              aria-hidden="true"
              className="invisible col-start-1 row-start-1 font-semibold"
            >
              {children}
            </span>
            <span className="col-start-1 row-start-1">{children}</span>
          </span>
        ),
      },
      props
    ),
    render,
    state: { slot: "navbar-link", active: Boolean(active) },
  })
}

function NavbarActions({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="navbar-actions"
      className={cn("flex shrink-0 items-center gap-1 sm:gap-2", className)}
      {...props}
    />
  )
}

const navbarActionVariants = cva(
  [
    "inline-flex shrink-0 items-center justify-center gap-2 rounded-full",
    "text-sm font-medium text-[var(--nav-dim)] outline-none",
    "transition-colors duration-200 ease-out",
    "hover:bg-[var(--nav-hover)] hover:text-[var(--nav-fg)]",
    "focus-visible:ring-3 focus-visible:ring-[var(--nav-ring)]",
    "disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5",
  ],
  {
    variants: {
      size: {
        default: "h-9 px-3",
        icon: "size-9",
      },
    },
    defaultVariants: {
      size: "icon",
    },
  }
)

/** Akce vpravo — profil, odhlášení, hamburger. */
function NavbarAction({
  className,
  size = "icon",
  render,
  ...props
}: useRender.ComponentProps<"button"> &
  VariantProps<typeof navbarActionVariants>) {
  return useRender({
    defaultTagName: "button",
    props: mergeProps<"button">(
      {
        type: "button",
        className: cn(navbarActionVariants({ size }), className),
      },
      props
    ),
    render,
    state: { slot: "navbar-action" },
  })
}

/** Přihlašovací CTA v brandovém gradientu. */
function NavbarCta({
  className,
  render,
  ...props
}: useRender.ComponentProps<"button">) {
  return useRender({
    defaultTagName: "button",
    props: mergeProps<"button">(
      {
        type: "button",
        className: cn(
          "inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-full px-4",
          "bg-[linear-gradient(90deg,var(--gradient-l),var(--gradient-r))]",
          "text-sm font-semibold text-white shadow-sm outline-none",
          "transition-[filter,transform] duration-200 ease-out",
          "hover:brightness-110 active:translate-y-px",
          "focus-visible:ring-3 focus-visible:ring-[var(--nav-ring)]",
          "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
          className
        ),
      },
      props
    ),
    render,
    state: { slot: "navbar-cta" },
  })
}

/** Rozbalená navigace pod lištou pro mobil — od `md` výš se nezobrazuje. */
function NavbarMobileNav({
  open,
  className,
  ...props
}: React.ComponentProps<"nav"> & { open: boolean }) {
  return (
    <nav
      data-slot="navbar-mobile-nav"
      aria-label="Hlavní navigace"
      hidden={!open}
      className={cn(
        "flex flex-col gap-0.5 border-t border-[var(--nav-border)] px-3 py-2 md:hidden",
        className
      )}
      {...props}
    />
  )
}

function NavbarMobileLink({
  className,
  active = false,
  render,
  ...props
}: useRender.ComponentProps<"a"> & { active?: boolean }) {
  return useRender({
    defaultTagName: "a",
    props: mergeProps<"a">(
      {
        "aria-current": active ? "page" : undefined,
        className: cn(
          "flex items-center gap-2 rounded-lg px-3 py-2.5 text-base outline-none",
          "transition-colors duration-200 ease-out",
          "focus-visible:ring-3 focus-visible:ring-[var(--nav-ring)]",
          // Aktivní řádek nese jen výplň — stejně jako pilulka v desktopové
          // navigaci, žádný gradientový proužek u levé hrany.
          active
            ? "bg-[var(--nav-active)] font-semibold text-[var(--nav-active-fg)]"
            : "font-medium text-[var(--nav-dim)] hover:bg-[var(--nav-hover)] hover:text-[var(--nav-fg)]",
          className
        ),
      },
      props
    ),
    render,
    state: { slot: "navbar-mobile-link", active: Boolean(active) },
  })
}

export {
  Navbar,
  NavbarAction,
  NavbarActions,
  NavbarBar,
  NavbarBrand,
  NavbarCta,
  NavbarLink,
  NavbarMobileLink,
  NavbarMobileNav,
  NavbarNav,
  navbarLinkVariants,
  navbarVariants,
}
