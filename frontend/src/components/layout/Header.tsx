"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LogIn, LogOut, Menu, UserRound, X } from "lucide-react";
import {
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
} from "@/components/ui-kit/navbar";
import { Logo } from "@/components/ui-kit/logo";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useRole } from "@/hooks/useRole";
import { ROUTES } from "@/lib/constants";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; auth?: boolean; lector?: boolean };

const NAV: NavItem[] = [
  { href: ROUTES.HOME, label: "Home" },
  { href: "/moje-kurzy", label: "Moje kurzy", auth: true },
  { href: ROUTES.PUBLIC_DATABASE, label: "Veřejná databáze" },
  { href: "/odmeny", label: "Odměny" },
  { href: "/tutor", label: "Tutor" },
  { href: "/admin", label: "Admin", lector: true },
];

/**
 * Lišta je buď průhledná (úvodní stránka úplně nahoře, nad hero), nebo plná
 * světlá jako ostatní plovoucí plochy aplikace. Rozostření ani sklo nikde —
 * jinde v aplikaci nejsou.
 */
const NAV_BASE = cn(
  "border-b-0 backdrop-blur-none transition-[background-color] duration-300 [--nav-border:rgba(13,47,49,0.08)]",
  // Spodní hrana: vlasová linka zelená → fialová, do stran mizí.
  "after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-[linear-gradient(90deg,transparent_0%,#5AAC78_30%,#857AD2_70%,transparent_100%)] after:transition-opacity after:duration-300",
);
const NAV_TRANSPARENT = "bg-transparent after:opacity-0";
const NAV_SOLID = "bg-card after:opacity-70";

/**
 * Položky bez pilulek: kitovou pilulku (`::before`) skrýváme a místo ní je
 * pod popiskem značková linka zelená → fialová (`::after`). Na hover se
 * napůl vykreslí od středu, aktivní položka ji má celou.
 */
const NAV_LINK = cn(
  "px-3.5 py-2 text-[17px] before:hidden",
  "after:pointer-events-none after:absolute after:inset-x-3.5 after:bottom-0.5 after:h-0.5 after:scale-x-0 after:rounded-full after:bg-[linear-gradient(90deg,#5AAC78,#857AD2)] after:transition-transform after:duration-300",
  "hover:after:scale-x-100 hover:after:opacity-50",
);
/** Aktivní popisek zůstává tmavý (kit ho jinak bělí pro pilulku). */
const ACTIVE_LINK = "text-[var(--nav-fg)] after:scale-x-100 hover:after:opacity-100";
/**
 * Přihlašovací CTA v hluboké petrolejové z hero místo kitového vínovo-
 * fialového přechodu (`bg-none` ho shodí). Drží kontrast na průhledné liště
 * nad zelenou plochou i na plné bílé.
 */
const LOGIN_CTA =
  "h-10 bg-none bg-[#0D2F31] px-5 shadow-[0_6px_16px_rgba(13,47,49,0.22)] hover:bg-[#164A46] hover:brightness-100";

/** Mobilní řádek: jen jemný zelený nádech, žádná výrazná výplň. */
const ACTIVE_ROW = "bg-[#5AAC78]/12 text-[var(--nav-fg)]";

/**
 * Hlavička webu — lišta z UI kitu (`components/ui-kit/navbar.tsx`), stejná
 * skladba jako `AppNavbar` na stránce /ui-kit, jen napojená na přihlášení,
 * role a skutečné routy.
 *
 * Položek je víc než v ukázce kitu, takže se desktopová navigace zapíná až
 * od `lg` (v kitu od `md`) — na tabletu by se do lišty nevešla.
 *
 * Oproti kitu je štíhlejší (64 px místo 80/96) a ladí s hero úvodní stránky:
 * - na úvodní stránce je úplně nahoře průhledná (hero pod ni podjíždí);
 *   jakmile se začne scrollovat, dostane plné světlé pozadí celá lišta;
 * - vodorovné logo z kitu (`Logo`) a hned vedle něj navigace — bez pilulek,
 *   aktivní položka má pod sebou značkovou linku;
 * - v plném stavu spodní hrana ve značkovém přechodu, do stran mizí;
 * - přihlašovací CTA je plná petrolejová pilulka z palety hero.
 */
export function Header() {
  const pathname = usePathname();
  const { isAuthenticated, user, loading, login, logout } = useAuth();
  const { can } = useRole();
  const { currentUser } = useCurrentUser();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  // Úvodní stránka se načítá nahoře, takže výchozí stav = průhledná.
  const isHome = pathname === ROUTES.HOME;
  const [atTop, setAtTop] = useState(isHome);

  const displayName = currentUser?.displayName ?? user?.preferred_username ?? null;

  // Home jen přesně, ostatní i s podstránkami (detail materiálu apod.).
  const isActive = (path: string) =>
    path === ROUTES.HOME ? pathname === path : pathname === path || pathname.startsWith(`${path}/`);

  const links = NAV.filter(
    (item) => (!item.auth || isAuthenticated) && (!item.lector || can("lector")),
  );

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Průhledná jen na úvodní stránce úplně nahoře — po prvním scrollu by pod
  // průhlednou lištou podjížděl text hero.
  useEffect(() => {
    if (!isHome) {
      setAtTop(false);
      return;
    }
    const update = () => setAtTop(window.scrollY <= 4);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, [isHome]);

  // Rozbalené mobilní menu potřebuje pod sebou plnou plochu.
  const transparent = atTop && !mobileMenuOpen;

  // Close mobile menu on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileMenuOpen(false);
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, []);

  return (
    <Navbar className={cn(NAV_BASE, transparent ? NAV_TRANSPARENT : NAV_SOLID)}>
      <NavbarBar className="h-16 sm:h-16">
        {/* Logo a navigace vlevo u sebe, akce vpravo. */}
        <div className="flex min-w-0 items-center gap-6 xl:gap-10">
          <NavbarBrand render={<Link href={ROUTES.HOME} />} aria-label="PRAKTIK-AI — úvodní stránka">
            <Logo />
          </NavbarBrand>

          <NavbarNav className="gap-0.5 md:hidden lg:flex">
            {links.map(({ href, label }) => (
              <NavbarLink
                key={href}
                render={<Link href={href} />}
                active={isActive(href)}
                className={cn(NAV_LINK, isActive(href) && ACTIVE_LINK)}
              >
                {label}
              </NavbarLink>
            ))}
          </NavbarNav>
        </div>

        <NavbarActions>
          {loading ? (
            <div aria-hidden className="size-9 animate-pulse rounded-full bg-[var(--nav-hover)]" />
          ) : isAuthenticated ? (
            <>
              <NavbarAction
                size="default"
                render={<Link href={ROUTES.PROFILE} />}
                title={displayName ?? "Můj profil"}
                aria-label={displayName ? undefined : "Můj profil"}
                className={cn(isActive(ROUTES.PROFILE) && "bg-[var(--nav-hover)] text-[var(--nav-fg)]")}
              >
                <UserRound />
                {displayName && (
                  // Až od xl — mezi lg a xl by se s šesti odkazy lišta nevešla.
                  <span className="hidden max-w-[140px] truncate xl:inline">{displayName}</span>
                )}
              </NavbarAction>
              <NavbarAction onClick={logout} aria-label="Odhlásit se" title="Odhlásit se">
                <LogOut />
              </NavbarAction>
            </>
          ) : (
            <NavbarCta onClick={login} className={LOGIN_CTA}>
              <LogIn className="text-[#5AAC78]" />
              Přihlásit se
            </NavbarCta>
          )}

          <NavbarAction
            className="lg:hidden"
            aria-label={mobileMenuOpen ? "Zavřít menu" : "Otevřít menu"}
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((open) => !open)}
          >
            {mobileMenuOpen ? <X /> : <Menu />}
          </NavbarAction>
        </NavbarActions>
      </NavbarBar>

      <NavbarMobileNav open={mobileMenuOpen} className="md:flex lg:hidden">
        {links.map(({ href, label }) => (
          <NavbarMobileLink
            key={href}
            render={<Link href={href} />}
            active={isActive(href)}
            className={cn(isActive(href) && ACTIVE_ROW)}
          >
            {label}
          </NavbarMobileLink>
        ))}
      </NavbarMobileNav>
    </Navbar>
  );
}
