'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, BookOpen, BarChart3, Menu, X, ClipboardCheck, Bot, BookText, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { useRole } from '@/hooks/useRole';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { getCourses, listResources } from '@/lib/api-client';
import { Status } from '@/api';
import { Button, Drawer, DrawerClose, DrawerContent } from '@/components/ui';
import { cn } from '@/lib/utils';
import { useAdminChrome } from './AdminChromeProvider';
import { SideTooltip } from './SideTooltip';

// Custom DOM event, kterým komponenty hlásí změnu stavu kurzu
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
  { href: '/admin/wiki', label: 'Wiki agent', icon: BookText },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const { can, isGuarantor } = useRole();
  const { currentUser } = useCurrentUser();
  const [reviewCount, setReviewCount] = useState(0);
  const { sidebarCollapsed, toggleSidebar, focusMode } = useAdminChrome();

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

  // Initial fetch + refetch on route change
  useEffect(() => {
    void loadReviewCount();
  }, [loadReviewCount, pathname]);

  // Refetch on cross-page status changes
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
  // Sbalit jde jen desktopový — v mobilním Draweru je vždy plný.
  const renderInner = (collapsed: boolean, showToggle: boolean) => (
    <>
      <div className={cn('flex items-center', collapsed ? 'justify-center px-3 py-6' : 'justify-between gap-2 p-6')}>
        {!collapsed && <h1 className="text-xl font-bold">PRAKTIK-AI</h1>}
        {showToggle && (
          <SideTooltip label="Rozbalit menu" enabled={collapsed}>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={toggleSidebar}
              aria-label={collapsed ? 'Rozbalit menu' : 'Sbalit menu'}
              aria-expanded={!collapsed}
              title={collapsed ? undefined : 'Sbalit menu'}
              className="shrink-0 text-primary-foreground/60 hover:bg-primary-foreground/10 hover:text-primary-foreground"
            >
              {collapsed ? <PanelLeftOpen className="size-5" /> : <PanelLeftClose className="size-5" />}
            </Button>
          </SideTooltip>
        )}
      </div>

      <nav className={cn('flex-1 overflow-y-auto', collapsed ? 'px-2' : 'px-4')}>
        {navItems.map((item) => {
          const Icon = item.icon;
          // /admin (Kurzy) is only active on exact /admin path (incl. query params)
          const active = item.href === '/admin'
            ? pathname === '/admin'
            : isActive(item.href);
          const badge = 'badge' in item ? (item as { badge?: number }).badge : undefined;

          return (
            <SideTooltip key={item.href} label={item.label} enabled={collapsed}>
              <Link
                href={item.href}
                aria-label={collapsed ? item.label : undefined}
                className={cn(
                  'relative mb-0.5 flex items-center gap-3 rounded-md py-3 transition-colors',
                  collapsed ? 'justify-center px-0' : 'px-4',
                  active
                    ? 'bg-gradient-r text-primary-foreground'
                    : 'text-primary-foreground/60 hover:bg-primary-foreground/10 hover:text-primary-foreground',
                )}
              >
                <Icon size={20} className="shrink-0" />
                {!collapsed && <span className="flex-1">{item.label}</span>}
                {badge !== undefined && (
                  <span
                    className={cn(
                      'flex items-center justify-center rounded-full bg-brand-accent font-bold text-primary-foreground',
                      collapsed
                        ? 'absolute top-1.5 right-2 h-4 min-w-4 px-1 text-[10px]'
                        : 'h-5 min-w-[20px] px-1 text-xs',
                    )}
                  >
                    {badge}
                  </span>
                )}
              </Link>
            </SideTooltip>
          );
        })}
      </nav>

      {/* User info at bottom */}
      {currentUser && (
        <div className={cn('border-t border-primary-foreground/20 pt-4 pb-6', collapsed ? 'px-2' : 'px-4')}>
          <div className={cn('flex items-center gap-3 py-2', collapsed ? 'justify-center' : 'px-2')}>
            <SideTooltip label={currentUser.displayName ?? currentUser.email ?? 'Uživatel'} enabled={collapsed}>
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-r text-sm font-semibold text-primary-foreground">
                {(currentUser.displayName ?? currentUser.email ?? 'U').charAt(0).toUpperCase()}
              </div>
            </SideTooltip>
            {!collapsed && (
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-primary-foreground">
                  {currentUser.displayName ?? 'Uživatel'}
                </p>
                <p className="truncate text-xs text-primary-foreground/60">{currentUser.email}</p>
              </div>
            )}
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
          {renderInner(false, false)}
        </DrawerContent>
      </Drawer>

      {/* Desktop sidebar — sbalitelný na úzký pruh s ikonami; ve fokus
          režimu („Celá obrazovka") se schová úplně */}
      {!focusMode && (
        <div
          className={cn(
            'sticky top-0 hidden h-screen shrink-0 flex-col overflow-hidden bg-black text-primary-foreground transition-[width] duration-200 lg:flex',
            sidebarCollapsed ? 'w-16' : 'w-64',
          )}
        >
          {renderInner(sidebarCollapsed, true)}
        </div>
      )}
    </>
  );
}
