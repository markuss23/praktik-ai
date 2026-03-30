'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, BookOpen, Users, BarChart3, Settings, Menu, X, Boxes, ClipboardCheck, Bot } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useRole } from '@/hooks/useRole';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { getCourses } from '@/lib/api-client';
import { Status } from '@/api';

const BASE_NAV_ITEMS = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/admin', label: 'Kurzy', icon: BookOpen },
  { href: '/admin/users', label: 'Uživatelé', icon: Users },
  { href: '/admin/settings', label: 'Nastavení', icon: Settings },
];

const SUPERADMIN_ITEMS = [
  // { href: '/admin/categories', label: 'Kategorie', icon: Boxes },
  { href: '/admin/ai-mentor', label: 'AI Mentor', icon: Bot },
  { href: '/admin/stats', label: 'Statistiky', icon: BarChart3 },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const { can, isLector, isGuarantor } = useRole();
  const { currentUser } = useCurrentUser();
  const [reviewCount, setReviewCount] = useState(0);

  // Fetch in_review count for badge
  useEffect(() => {
    if (!isLector) return;
    let cancelled = false;
    async function loadCount() {
      try {
        const courses = await getCourses({ includeInactive: false });
        const inReview = courses.filter(c => c.status === Status.InReview);
        if (cancelled) return;
        if (isGuarantor) {
          setReviewCount(inReview.length);
        } else {
          // Lector: only own courses
          const own = inReview.filter(c => c.ownerId === currentUser?.userId);
          setReviewCount(own.length);
        }
      } catch {
        // ignore
      }
    }
    loadCount();
    return () => { cancelled = true; };
  }, [isLector, isGuarantor, currentUser?.userId]);

  // Build nav items
  const navItems = [
    BASE_NAV_ITEMS[0],
    BASE_NAV_ITEMS[1],
    ...(can('superadmin') ? SUPERADMIN_ITEMS : []),
    ...(isLector ? [
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

  return (
    <>
      {/* Mobile header with hamburger */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-black text-white px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-bold">PRAKTIK-AI</h1>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 hover:bg-gray-800 rounded-md transition-colors"
          aria-label={isOpen ? 'Zavřít menu' : 'Otevřít menu'}
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          w-64 bg-black text-white flex flex-col min-h-screen
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <div className="p-6">
          <h1 className="text-xl font-bold">PRAKTIK-AI</h1>
        </div>

        <nav className="flex-1 px-4 overflow-y-auto">
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
                className={`flex items-center gap-3 px-4 py-3 rounded-md transition-colors mb-0.5 ${
                  active
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <Icon size={20} />
                <span className="flex-1">{item.label}</span>
                {badge !== undefined && (
                  <span className="bg-orange-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1">
                    {badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User info at bottom */}
        {currentUser && (
          <div className="px-4 pb-6 pt-4 border-t border-gray-800">
            <div className="flex items-center gap-3 px-2 py-2">
              <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                {(currentUser.displayName ?? currentUser.email ?? 'U').charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-white text-sm font-medium truncate">
                  {currentUser.displayName ?? 'Uživatel'}
                </p>
                <p className="text-gray-400 text-xs truncate">{currentUser.email}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
