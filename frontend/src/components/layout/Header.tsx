"use client";

import Link from "next/link";
import { ROUTES } from "@/lib/constants";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { MessageCircle, UserRound, LogIn, LogOut, Menu, X, LayoutDashboard } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useEffect, useState } from "react";

import {
  Button,
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  Skeleton,
} from "@/components/ui";
import { cn } from "@/lib/utils";

/** Aktivní podtržení navigace — značkový gradient z Figmy. */
const NAV_UNDERLINE = "absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-gradient-l to-gradient-r";

export function Header() {
  const pathname = usePathname();
  const { isAuthenticated, user, loading, login, logout } = useAuth();
  const { can } = useRole();
  const { currentUser } = useCurrentUser();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const displayName = currentUser?.displayName ?? user?.preferred_username ?? null;

  const isActive = (path: string) => pathname === path;

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const navLinkClass = (path: string) =>
    cn(
      "nav-link relative pb-1 transition-colors",
      isActive(path) ? "font-bold text-foreground" : "font-medium text-foreground/70 hover:text-foreground",
    );

  return (
    <header className="sticky top-0 z-[var(--z-header)] rounded-b-lg border-b border-border bg-background">
      <div className="mx-auto px-3 py-2 sm:px-6 lg:px-6 lg:py-[7px] xl:px-10" style={{ maxWidth: '1600px', width: '100%', minHeight: '56px', height: 'auto' }}>
        <nav className="flex h-full items-center justify-between gap-2">
          {/* Logo and Brand */}
          <Link href={ROUTES.HOME} className="flex min-w-0 shrink-0 items-center gap-1.5 sm:gap-3">
            <Image
              src="/logo.svg"
              alt="PRAKTIK-AI Logo"
              width={221}
              height={83}
              className="h-[24px] w-[64px] shrink-0 sm:h-[68px] sm:w-[180px] lg:h-[83px] lg:w-[221px]"
            />
            <span className="text-sm font-bold whitespace-nowrap text-foreground sm:text-lg lg:text-xl">PRAKTIK-AI</span>
          </Link>

          {/* Navigation Links */}
          <ul className="hidden items-center gap-4 whitespace-nowrap md:flex lg:gap-8">
            <li>
              <Link href={ROUTES.HOME} data-text="Home" className={navLinkClass(ROUTES.HOME)}>
                Home
                {isActive(ROUTES.HOME) && <span className={NAV_UNDERLINE} />}
              </Link>
            </li>
            {isAuthenticated && (
              <li>
                <Link href="/moje-kurzy" data-text="Moje kurzy" className={navLinkClass('/moje-kurzy')}>
                  Moje kurzy
                  {isActive('/moje-kurzy') && <span className={NAV_UNDERLINE} />}
                </Link>
              </li>
            )}
            <li>
              <Link
                href={ROUTES.PUBLIC_DATABASE}
                data-text="Veřejná databáze"
                className={navLinkClass(ROUTES.PUBLIC_DATABASE)}
              >
                Veřejná databáze
                {isActive(ROUTES.PUBLIC_DATABASE) && <span className={NAV_UNDERLINE} />}
              </Link>
            </li>
            <li>
              <Link href="/odmeny" data-text="Odměny" className={navLinkClass('/odmeny')}>
                Odměny
                {isActive('/odmeny') && <span className={NAV_UNDERLINE} />}
              </Link>
            </li>
            <li>
              <Link href="/tutor" data-text="Tutor" className={navLinkClass('/tutor')}>
                Tutor
                {isActive('/tutor') && <span className={NAV_UNDERLINE} />}
              </Link>
            </li>
            {can('lector') && (
              <li>
                <Link href="/admin" data-text="Admin" className={navLinkClass('/admin')}>
                  Admin
                  {isActive('/admin') && <span className={NAV_UNDERLINE} />}
                </Link>
              </li>
            )}
          </ul>

          {/* User Actions */}
          <div className="flex shrink-0 items-center gap-1 sm:gap-4">
            {isAuthenticated && (
              <Button
                render={<Link href="/tutor" />}
                nativeButton={false}
                variant="ghost"
                size="icon"
                aria-label="AI tutor"
                title="AI tutor"
                className={cn("hidden rounded-full sm:inline-flex", isActive('/tutor') && "bg-muted")}
              >
                <MessageCircle className="size-5 sm:size-6" strokeWidth={1.5} />
              </Button>
            )}

            {/* Admin shortcut on mobile (md:hidden, only for lectors+) */}
            {isAuthenticated && can('lector') && (
              <Button
                render={<Link href="/admin" />}
                nativeButton={false}
                variant="ghost"
                size="icon"
                title="Admin dashboard"
                aria-label="Admin dashboard"
                className={cn("rounded-full md:hidden", isActive('/admin') && "bg-muted")}
              >
                <LayoutDashboard className="size-5" strokeWidth={1.5} />
              </Button>
            )}

            {loading ? (
              <Skeleton className="size-8 rounded-full" />
            ) : isAuthenticated ? (
              <div className="flex items-center gap-1 sm:gap-3">
                <Button
                  render={<Link href={ROUTES.PROFILE} />}
                  nativeButton={false}
                  variant="ghost"
                  className={cn("rounded-full", isActive(ROUTES.PROFILE) && "bg-muted")}
                  title={displayName ?? "Můj profil"}
                >
                  <UserRound className="size-5 sm:size-6" strokeWidth={1.5} />
                  {displayName && (
                    <span className="hidden max-w-[120px] truncate text-sm font-medium lg:block">
                      {displayName}
                    </span>
                  )}
                </Button>
                <Button
                  variant="ghost"
                  onClick={logout}
                  title="Odhlásit se"
                  aria-label="Odhlásit se"
                  className="rounded-full text-muted-foreground hover:text-destructive sm:rounded-md"
                >
                  <LogOut data-icon="inline-start" strokeWidth={1.5} />
                  <span className="hidden sm:block">Odhlásit</span>
                </Button>
              </div>
            ) : (
              <Button
                variant="brand"
                size="lg"
                onClick={login}
                title="Přihlásit se"
                aria-label="Přihlásit se"
              >
                <LogIn data-icon="inline-start" strokeWidth={2} />
                <span className="hidden sm:inline">Přihlásit se</span>
                <span className="sm:hidden">Přihlásit</span>
              </Button>
            )}

            {/* Mobile hamburger toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen(true)}
              className="shrink-0 md:hidden"
              aria-label="Otevřít menu"
            >
              <Menu className="size-6" strokeWidth={1.5} />
            </Button>
          </div>
        </nav>
      </div>

      {/* Mobile menu — kitový Drawer, overlay i stacking řeší Base UI */}
      <Drawer open={mobileMenuOpen} onOpenChange={setMobileMenuOpen} swipeDirection="right">
        <DrawerContent className="md:hidden" aria-label="Menu">
          <DrawerHeader className="flex-row items-center justify-between border-b pb-4 text-left">
            <DrawerTitle>Menu</DrawerTitle>
            <DrawerClose render={<Button variant="ghost" size="icon-sm" aria-label="Zavřít menu" />}>
              <X strokeWidth={1.5} />
            </DrawerClose>
          </DrawerHeader>

          <nav className="flex-1 overflow-y-auto py-2">
            <MobileNavLink href={ROUTES.HOME} active={isActive(ROUTES.HOME)}>Home</MobileNavLink>
            {isAuthenticated && (
              <MobileNavLink href="/moje-kurzy" active={isActive('/moje-kurzy')}>Moje kurzy</MobileNavLink>
            )}
            <MobileNavLink href={ROUTES.PUBLIC_DATABASE} active={isActive(ROUTES.PUBLIC_DATABASE)}>Veřejná databáze</MobileNavLink>
            <MobileNavLink href="/odmeny" active={isActive('/odmeny')}>Odměny</MobileNavLink>
            <MobileNavLink href="/tutor" active={isActive('/tutor')}>Tutor</MobileNavLink>
            {can('lector') && (
              <MobileNavLink href="/admin" active={isActive('/admin')} icon={<LayoutDashboard className="size-4" strokeWidth={1.5} />}>
                Admin
              </MobileNavLink>
            )}
          </nav>

          {isAuthenticated && displayName && (
            <div className="truncate border-t px-4 py-3 text-xs text-muted-foreground">
              {displayName}
            </div>
          )}
        </DrawerContent>
      </Drawer>
    </header>
  );
}

function MobileNavLink({
  href,
  active,
  icon,
  children,
}: {
  href: string;
  active: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2 border-l-4 py-3 pl-3 pr-4 text-sm transition-colors",
        active
          ? "border-l-primary bg-muted/50 font-bold text-foreground"
          : "border-l-transparent font-medium text-foreground/70 hover:bg-muted/50 hover:text-foreground",
      )}
    >
      {icon}
      <span>{children}</span>
    </Link>
  );
}
