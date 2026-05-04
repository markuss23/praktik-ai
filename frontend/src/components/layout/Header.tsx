"use client";

import Link from "next/link";
import { ROUTES } from "@/lib/constants";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { MessageCircle, UserRound, LogIn, LogOut, Menu, X, LayoutDashboard } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";
import { useEffect, useState } from "react";

export function Header() {
  const pathname = usePathname();
  const { isAuthenticated, user, loading, login, logout } = useAuth();
  const { can } = useRole();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path: string) => pathname === path;

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Close mobile menu on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileMenuOpen(false);
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  return (
    <header className="bg-white sticky top-0 z-50" style={{ borderBottomLeftRadius: '8px', borderBottomRightRadius: '8px', borderBottom: '1px solid #e5e7eb' }}>
      <div className="mx-auto px-3 sm:px-6 lg:px-[100px] py-2 lg:py-[7px]" style={{ maxWidth: '1440px', width: '100%', minHeight: '56px', height: 'auto' }}>
        <nav className="flex items-center justify-between h-full gap-2">
          {/* Logo and Brand */}
          <Link href={ROUTES.HOME} className="flex items-center gap-1.5 sm:gap-3 min-w-0">
            <Image
              src="/logo.svg"
              alt="PRAKTIK-AI Logo"
              width={221}
              height={83}
              className="w-[64px] h-[24px] sm:w-[180px] sm:h-[68px] lg:w-[221px] lg:h-[83px] flex-shrink-0"
            />
            <span className="text-sm sm:text-lg lg:text-xl font-bold text-black truncate">PRAKTIK-AI</span>
          </Link>

          {/* Navigation Links */}
          <ul className="hidden md:flex items-center gap-4 lg:gap-8">
            <li>
              <Link
                href={ROUTES.HOME}
                data-text="Home"
                className={`nav-link relative pb-1 transition-colors ${
                  isActive(ROUTES.HOME)
                    ? 'text-black font-bold'
                    : 'text-gray-700 hover:text-black font-medium'
                }`}
              >
                Home
                {isActive(ROUTES.HOME) && (
                  <span
                    className="absolute bottom-0 left-0 right-0 h-0.5"
                    style={{
                      background: 'linear-gradient(90deg, #B1475C 0%, #857AD2 100%)'
                    }}
                  />
                )}
              </Link>
            </li>
            <li>
              <Link
                href="/moje-kurzy"
                data-text="Moje kurzy"
                className={`nav-link relative pb-1 transition-colors ${
                  isActive('/moje-kurzy')
                    ? 'text-black font-bold'
                    : 'text-gray-700 hover:text-black font-medium'
                }`}
              >
                Moje kurzy
                {isActive('/moje-kurzy') && (
                  <span
                    className="absolute bottom-0 left-0 right-0 h-0.5"
                    style={{
                      background: 'linear-gradient(90deg, #B1475C 0%, #857AD2 100%)'
                    }}
                  />
                )}
              </Link>
            </li>
            <li>
              <Link
                href="/odmeny"
                data-text="Odměny"
                className={`nav-link relative pb-1 transition-colors ${
                  isActive('/odmeny')
                    ? 'text-black font-bold'
                    : 'text-gray-700 hover:text-black font-medium'
                }`}
              >
                Odměny
                {isActive('/odmeny') && (
                  <span
                    className="absolute bottom-0 left-0 right-0 h-0.5"
                    style={{
                      background: 'linear-gradient(90deg, #B1475C 0%, #857AD2 100%)'
                    }}
                  />
                )}
              </Link>
            </li>
            <li>
              <Link
                href="/tutor"
                data-text="Tutor"
                className={`nav-link relative pb-1 transition-colors ${
                  isActive('/tutor')
                    ? 'text-black font-bold'
                    : 'text-gray-700 hover:text-black font-medium'
                }`}
              >
                Tutor
                {isActive('/tutor') && (
                  <span
                    className="absolute bottom-0 left-0 right-0 h-0.5"
                    style={{
                      background: 'linear-gradient(90deg, #B1475C 0%, #857AD2 100%)'
                    }}
                  />
                )}
              </Link>
            </li>
            {can('lector') && (
            <li>
              <Link
                href="/admin"
                data-text="Admin"
                className={`nav-link relative pb-1 transition-colors ${
                  isActive('/admin')
                    ? 'text-black font-bold'
                    : 'text-gray-700 hover:text-black font-medium'
                }`}
              >
                Admin
                {isActive('/admin') && (
                  <span
                    className="absolute bottom-0 left-0 right-0 h-0.5"
                    style={{
                      background: 'linear-gradient(90deg, #B1475C 0%, #857AD2 100%)'
                    }}
                  />
                )}
              </Link>
            </li>
            )}
          </ul>

          {/* User Actions */}
          <div className="flex items-center gap-1 sm:gap-4 flex-shrink-0">
            {isAuthenticated && (
              <button className="hidden sm:inline-flex p-1.5 sm:p-2 hover:bg-gray-100 rounded-full transition-colors">
                <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6 text-black" strokeWidth={1.5} />
              </button>
            )}

            {/* Admin shortcut on mobile (md:hidden, only for lectors+) */}
            {isAuthenticated && can('lector') && (
              <Link
                href="/admin"
                title="Admin dashboard"
                aria-label="Admin dashboard"
                className={`md:hidden p-1.5 hover:bg-gray-100 rounded-full transition-colors ${
                  isActive('/admin') ? 'bg-gray-100' : ''
                }`}
              >
                <LayoutDashboard className="w-5 h-5 text-black" strokeWidth={1.5} />
              </Link>
            )}

            {loading ? (
              <div className="w-8 h-8 rounded-full bg-gray-100 animate-pulse" />
            ) : isAuthenticated ? (
              <div className="flex items-center gap-1 sm:gap-3">
                <Link
                  href={ROUTES.PROFILE}
                  className={`flex items-center gap-1.5 p-1.5 sm:p-2 hover:bg-gray-100 rounded-full transition-colors ${
                    isActive(ROUTES.PROFILE) ? "bg-gray-100" : ""
                  }`}
                  title={user?.preferred_username ?? "Můj profil"}
                >
                  <UserRound className="w-5 h-5 sm:w-6 sm:h-6 text-black" strokeWidth={1.5} />
                  {user?.preferred_username && (
                    <span className="hidden lg:block text-sm font-medium text-gray-700 max-w-[120px] truncate">
                      {user.preferred_username}
                    </span>
                  )}
                </Link>
                <button
                  onClick={logout}
                  title="Odhlásit se"
                  aria-label="Odhlásit se"
                  className="flex items-center gap-1.5 p-1.5 sm:px-3 sm:py-1.5 text-sm font-medium text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-full sm:rounded-md transition-colors"
                >
                  <LogOut className="w-4 h-4" strokeWidth={1.5} />
                  <span className="hidden sm:block">Odhlásit</span>
                </button>
              </div>
            ) : (
              <button
                onClick={login}
                title="Přihlásit se"
                aria-label="Přihlásit se"
                className="flex items-center gap-1.5 sm:gap-2 px-2.5 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-semibold text-white rounded-md shadow-sm transition-colors"
                style={{ background: "linear-gradient(90deg, #B1475C 0%, #857AD2 100%)" }}
              >
                <LogIn className="w-4 h-4" strokeWidth={2} />
                <span className="hidden sm:inline">Přihlásit se</span>
                <span className="sm:hidden">Přihlásit</span>
              </button>
            )}

            {/* Mobile hamburger toggle */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-1.5 hover:bg-gray-100 rounded-md transition-colors flex-shrink-0"
              aria-label="Otevřít menu"
            >
              <Menu className="w-6 h-6 text-black" strokeWidth={1.5} />
            </button>
          </div>
        </nav>
      </div>

      {/* Mobile menu drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <div className="relative w-72 max-w-[85%] bg-white shadow-xl flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <span className="text-base font-bold text-black">Menu</span>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 hover:bg-gray-100 rounded-md transition-colors"
                aria-label="Zavřít menu"
              >
                <X className="w-5 h-5 text-black" strokeWidth={1.5} />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto py-2">
              <MobileNavLink href={ROUTES.HOME} active={isActive(ROUTES.HOME)}>Home</MobileNavLink>
              <MobileNavLink href="/moje-kurzy" active={isActive('/moje-kurzy')}>Moje kurzy</MobileNavLink>
              <MobileNavLink href="/odmeny" active={isActive('/odmeny')}>Odměny</MobileNavLink>
              <MobileNavLink href="/tutor" active={isActive('/tutor')}>Tutor</MobileNavLink>
              {can('lector') && (
                <MobileNavLink href="/admin" active={isActive('/admin')} icon={<LayoutDashboard className="w-4 h-4" strokeWidth={1.5} />}>
                  Admin
                </MobileNavLink>
              )}
            </nav>

            {isAuthenticated && user?.preferred_username && (
              <div className="px-4 py-3 border-t border-gray-200 text-xs text-gray-500 truncate">
                {user.preferred_username}
              </div>
            )}
          </div>
        </div>
      )}
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
      className={`flex items-center gap-2 px-4 py-3 text-sm transition-colors ${
        active
          ? 'text-black font-bold bg-gray-50 border-l-4 border-l-purple-600 pl-3'
          : 'text-gray-700 hover:bg-gray-50 hover:text-black font-medium border-l-4 border-l-transparent pl-3'
      }`}
    >
      {icon}
      <span>{children}</span>
    </Link>
  );
}
