'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, BookOpen, BarChart3, Menu, X, ClipboardCheck, Bot } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { useRole } from '@/hooks/useRole';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { getCourses, listResources } from '@/lib/api-client';
import { Status } from '@/api';
import { Button, Drawer, DrawerClose, DrawerContent } from '@/components/ui';
import { cn } from '@/lib/utils';

// Custom DOM event, kterým komponenty hlásí změnu stavu kurzu (schválení,
// zamítnutí, odeslání ke kontrole apod.). Sidebar si na něj sedne, aby badge
// počtu kurzů ke schválení reflektoval realitu okamžitě, bez čekání na refresh.
export const REVIEW_COUNT_EVENT = 'praktik-ai:review-count-changed';

const BASE_NAV_ITEMS = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/admin', label: 'Kurzy', icon: BookOpen },
  // { href: '/admin/users', label: 'Uživatelé', icon: Users },
  // { href: '/admin/settings', label: 'Nastavení', icon: Settings },
];

const LECTOR_ITEMS = [
  { href: '/admin/stats', label: 'Statistiky', icon: BarChart3 },
];

const SUPERADMIN_ITEMS = [
  { href: '/admin/ai-mentor', label: 'AI Mentor', icon: Bot },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const { can, isGuarantor } = useRole();
  const { currentUser } = useCurrentUser();
  const [reviewCount, setReviewCount] = useState(0);

  // Fetch pending count for badge (guarantors and superadmins only).
  // Kurzy: reviewer nemůže schvalovat vlastní kurz → vlastní vyloučíme.
  // Materiály: garant smí recenzovat libovolný (i vlastní) → počítáme všechny pending_review.
  const loadReviewCount = useCallback(async () => {
    if (!isGuarantor) return;
    try {
      const [courses, materials] = await Promise.all([
        getCourses({ includeInactive: false }),
        listResources({ status: 'pending_review' }).catch(() => []),
      ]);
      const inReviewCourses = courses.filter(c =>
        c.status === Status.InReview && c.ownerId !== currentUser?.userId
      );
      setReviewCount(inReviewCourses.length + materials.length);
    } catch {
      // ignore
    }
  }, [isGuarantor, currentUser?.userId]);

  // Initial fetch + refetch on route change (po schválení/zamítnutí se naviguje
  // zpět na /admin/review, takže pathname change badge spolehlivě obnoví).
  useEffect(() => {
    void loadReviewCount();
  }, [loadReviewCount, pathname]);

  // Refetch on cross-page status changes (např. odeslání kurzu ke schválení
  // z přehledu kurzů — uživatel zůstává na stejné cestě, ale badge se musí
  // překreslit).
  useEffect(() => {
    if (!isGuarantor) return;
    const handler = () => { void loadReviewCount(); };
    window.addEventListener(REVIEW_COUNT_EVENT, handler);
    return () => window.removeEventListener(REVIEW_COUNT_EVENT, handler);
  }, [isGuarantor, loadReviewCount]);

  // Build nav items
  const navItems = [
    BASE_NAV_ITEMS[0],
    BASE_NAV_ITEMS[1],
    ...LECTOR_ITEMS,
    ...(can('superadmin') ? SUPERADMIN_ITEMS : []),
    ...(isGuarantor ? [
      { href: '/admin/review', label: 'Ke schválení', icon: ClipboardCheck, badge: reviewCount > 0 ? reviewCount : undefined },
    ] : []),
    ...BASE_NAV_ITEMS.slice(2),
  ];

  // Close sidebar when route changes (mobile)
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Close sidebar on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname === href || pathname.startsWith(href + '/');
  };

  // Obsah je stejný pro desktopový sticky sidebar i pro mobilní Drawer.
  const sidebarInner = (
    <>
      <div className="p-6">
        <h1 className="text-xl font-bold">PRAKTIK-AI</h1>
      </div>

      <nav className="flex-1 overflow-y-auto px-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          // /admin (Kurzy) is only active on exact /admin path (incl. query params)
          const active = item.href === '/admin'
            ? pathname === '/admin'
            : isActive(item.href);
          const badge = 'badge' in item ? (item as { badge?: number }).badge : undefined;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'mb-0.5 flex items-center gap-3 rounded-md px-4 py-3 transition-colors',
                active
                  ? 'bg-gradient-r text-primary-foreground'
                  : 'text-primary-foreground/60 hover:bg-primary-foreground/10 hover:text-primary-foreground',
              )}
            >
              <Icon size={20} />
              <span className="flex-1">{item.label}</span>
              {badge !== undefined && (
                <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-brand-accent px-1 text-xs font-bold text-primary-foreground">
                  {badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User info at bottom */}
      {currentUser && (
        <div className="border-t border-primary-foreground/20 px-4 pt-4 pb-6">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-r text-sm font-semibold text-primary-foreground">
              {(currentUser.displayName ?? currentUser.email ?? 'U').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-primary-foreground">
                {currentUser.displayName ?? 'Uživatel'}
              </p>
              <p className="truncate text-xs text-primary-foreground/60">{currentUser.email}</p>
            </div>
          </div>
        </div>
      )}
    </>
  );

  return (
    <>
      {/* Mobile header with hamburger */}
      <div className="fixed top-0 right-0 left-0 z-[var(--z-header)] flex items-center justify-between bg-black px-4 py-3 text-primary-foreground lg:hidden">
        <h1 className="text-lg font-bold">PRAKTIK-AI</h1>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsOpen(true)}
          aria-label="Otevřít menu"
          className="text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
        >
          <Menu />
        </Button>
      </div>

      {/* Mobile sidebar — kitový Drawer (overlay, stacking i gesta řeší Base UI) */}
      <Drawer open={isOpen} onOpenChange={setIsOpen} swipeDirection="left">
        <DrawerContent
          className="bg-black text-primary-foreground lg:hidden"
          aria-label="Administrace — navigace"
        >
          <DrawerClose
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Zavřít menu"
                className="absolute top-4 right-3 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
              />
            }
          >
            <X />
          </DrawerClose>
          {sidebarInner}
        </DrawerContent>
      </Drawer>

      {/* Desktop sidebar */}
      <div className="sticky top-0 hidden h-screen w-64 flex-col bg-black text-primary-foreground lg:flex">
        {sidebarInner}
      </div>
    </>
  );
}
