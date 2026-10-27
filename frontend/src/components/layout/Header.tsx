"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LayoutDashboard, LogIn, LogOut, Menu, MessageCircle, UserRound, X } from "lucide-react";
import { buttonVariants } from "@/components/ui-kit/button";
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

const container = "mx-auto w-[min(1240px,94vw)]";

/** Kruhové ikonové tlačítko na tmavé liště (tutor, profil, odhlášení, menu). */
const iconButton =
  "inline-flex size-10 shrink-0 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white";

/**
 * Oranžový „podpis" pod aktivním odkazem — stejný tah jako podtržení
 * „digitální éru" v Hero. U neaktivních odkazů se na hover dokreslí zleva.
 */
function Swoosh({ active, className }: { active: boolean; className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 300 18"
      preserveAspectRatio="none"
      className={cn(
        "pointer-events-none absolute left-0 h-[7px] w-full origin-left transition-all duration-300",
        active
          ? "scale-x-100 opacity-100"
          : "scale-x-0 opacity-0 group-hover:scale-x-100 group-hover:opacity-60",
        className,
      )}
    >
      <path d="M3 13 C70 4 170 2 297 9" stroke="#F87B1B" strokeWidth="5" strokeLinecap="round" fill="none" />
    </svg>
  );
}

/**
 * Hlavička webu — tmavý pás přes celou šířku v barvě hero karty (#0D2F31).
 * Obsah sedí na stejné mřížce jako hero (`w-[min(1240px,94vw)]`), aktivní
 * odkaz nese oranžový tah z Hero, spodní hranu tvoří značkový gradient
 * (zrcadlí 12px pruh nad Footerem). Dekorace = blob a kruhový obrys z hero.
 */
export function Header() {
  const pathname = usePathname();
  const { isAuthenticated, user, loading, login, logout } = useAuth();
  const { can } = useRole();
  const { currentUser } = useCurrentUser();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  // Close mobile menu on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileMenuOpen(false);
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, []);

  return (
    <header className="sticky top-0 z-[1000] bg-[#0D2F31] text-white shadow-[0_10px_30px_rgba(13,47,49,0.18)]">
      {/* Dekorace z hero karty — jen pozadí, ořízne je pás. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 hidden overflow-hidden lg:block">
        <div className="blob-float-slow absolute -top-[150px] -left-[90px] size-[300px] rounded-[62%_38%_43%_57%/51%_47%_53%_49%] bg-[#5AAC78]/15" />
        <div className="absolute -top-[40px] right-[8%] size-[150px] rounded-full border-[1.5px] border-[#D1E7D9]/20" />
      </div>

      <div className={cn("relative flex h-[72px] items-center justify-between gap-4", container)}>
        <Link href={ROUTES.HOME} aria-label="PRAKTIK-AI — úvodní stránka" className="shrink-0">
          <Logo className="text-white" />
        </Link>

        {/* Navigace — aktivní odkaz podtržený oranžovým tahem z Hero */}
        <nav aria-label="Hlavní navigace" className="hidden lg:block">
          <ul className="flex items-center gap-7 xl:gap-9">
            {links.map(({ href, label }) => {
              const active = isActive(href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "group relative inline-flex py-2 text-[15px] font-semibold whitespace-nowrap transition-colors",
                      active ? "text-white" : "text-white/65 hover:text-white",
                    )}
                  >
                    {label}
                    <Swoosh active={active} className="-bottom-0.5" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Akce uživatele */}
        <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
          {isAuthenticated && (
            <Link
              href="/tutor"
              aria-label="AI tutor"
              title="AI tutor"
              className={cn(iconButton, "hidden sm:inline-flex", isActive("/tutor") && "bg-white/10 text-white")}
            >
              <MessageCircle className="size-5" strokeWidth={1.8} />
            </Link>
          )}

          {/* Zkratka do adminu na mobilu (jen lektor+) */}
          {isAuthenticated && can("lector") && (
            <Link
              href="/admin"
              aria-label="Admin dashboard"
              title="Admin dashboard"
              className={cn(iconButton, "lg:hidden", isActive("/admin") && "bg-white/10 text-white")}
            >
              <LayoutDashboard className="size-5" strokeWidth={1.8} />
            </Link>
          )}

          {loading ? (
            <div className="size-10 animate-pulse rounded-full bg-white/10" />
          ) : isAuthenticated ? (
            <>
              <Link
                href={ROUTES.PROFILE}
                title={displayName ?? "Můj profil"}
                className={cn(
                  "flex h-10 items-center gap-2 rounded-full pr-1 pl-1 transition-colors hover:bg-white/10 xl:pr-3.5",
                  isActive(ROUTES.PROFILE) && "bg-white/10",
                )}
              >
                <span className="flex size-8 items-center justify-center rounded-full bg-[#D1E7D9] text-[#0D2F31] ring-2 ring-[#5AAC78]/60">
                  <UserRound className="size-[18px]" strokeWidth={1.8} />
                </span>
                {displayName && (
                  <span className="hidden max-w-[120px] truncate text-sm font-semibold text-white xl:block">
                    {displayName}
                  </span>
                )}
              </Link>
              <button
                type="button"
                onClick={logout}
                aria-label="Odhlásit se"
                title="Odhlásit se"
                className={cn(iconButton, "hover:bg-red-500/15 hover:text-red-300")}
              >
                <LogOut className="size-5" strokeWidth={1.8} />
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={login}
              className={cn(
                buttonVariants({ size: "lg" }),
                "h-10 gap-2 rounded-full px-4 text-sm font-semibold hover:scale-105 active:scale-95 sm:px-5",
              )}
            >
              <LogIn aria-hidden className="size-4" strokeWidth={2} />
              <span className="hidden sm:inline">Přihlásit se</span>
              <span className="sm:hidden">Přihlásit</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Otevřít menu"
            className={cn(iconButton, "lg:hidden")}
          >
            <Menu className="size-6" strokeWidth={1.8} />
          </button>
        </div>
      </div>

      {/* Značkový gradient jako spodní hrana — zrcadlí pruh nad Footerem. */}
      <div aria-hidden className="h-1 bg-[linear-gradient(90deg,#B1475C_0%,#857AD2_100%)]" />

      {/* Mobilní menu — celá obrazovka v barvě lišty, velké odkazy s tahem */}
      {mobileMenuOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          className="fixed inset-0 z-[2000] flex flex-col overflow-hidden bg-[#0D2F31] text-white lg:hidden"
        >
          <div aria-hidden className="pointer-events-none absolute -right-[120px] -bottom-[120px] size-[340px] rounded-[58%_42%_47%_53%/43%_55%_45%_57%] bg-[#5AAC78]/15" />
          <div aria-hidden className="pointer-events-none absolute top-[38%] -left-[70px] size-[180px] rounded-full border-[1.5px] border-[#D1E7D9]/20" />

          <div className={cn("relative flex h-[72px] shrink-0 items-center justify-between", container)}>
            <Logo className="text-white" />
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Zavřít menu"
              className={iconButton}
            >
              <X className="size-6" strokeWidth={1.8} />
            </button>
          </div>
          <div aria-hidden className="h-1 shrink-0 bg-[linear-gradient(90deg,#B1475C_0%,#857AD2_100%)]" />

          <nav aria-label="Hlavní navigace" className={cn("relative flex-1 overflow-y-auto pt-10 pb-8", container)}>
            <ul className="space-y-5">
              {links.map(({ href, label }) => {
                const active = isActive(href);
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "group relative inline-flex items-center gap-3 pb-1 text-3xl font-bold tracking-[-0.02em] transition-colors",
                        active ? "text-white" : "text-white/55 hover:text-white",
                      )}
                    >
                      {href === "/admin" && <LayoutDashboard className="size-6" strokeWidth={1.8} />}
                      {label}
                      <Swoosh active={active} className="-bottom-1.5 h-[9px]" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {isAuthenticated && displayName && (
            <div className={cn("relative shrink-0 border-t border-white/10 py-5 text-sm text-white/60", container)}>
              Přihlášen/a jako <span className="font-semibold text-white">{displayName}</span>
            </div>
          )}

          {!loading && !isAuthenticated && (
            <div className={cn("relative shrink-0 pb-8", container)}>
              <button
                type="button"
                onClick={login}
                className={cn(buttonVariants({ size: "xl" }), "h-12 w-full gap-2 rounded-full text-base")}
              >
                <LogIn aria-hidden className="size-5" strokeWidth={2} />
                Přihlásit se
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
