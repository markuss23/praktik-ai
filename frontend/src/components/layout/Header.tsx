"use client";

import Link from "next/link";
import { ROUTES } from "@/lib/constants";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { MessageCircle, UserRound, LogIn, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";

export function Header() {
  const pathname = usePathname();
  const { isAuthenticated, user, loading, login, logout } = useAuth();
  const { can } = useRole();
  
  const isActive = (path: string) => pathname === path;
  
  return (
    <header className="bg-white" style={{ borderBottomLeftRadius: '8px', borderBottomRightRadius: '8px', borderBottom: '1px solid #e5e7eb' }}>
      <div className="mx-auto px-4 sm:px-6 lg:px-[100px] py-2 lg:py-[7px]" style={{ maxWidth: '1440px', width: '100%', minHeight: '70px', height: 'auto' }}>
        <nav className="flex items-center justify-between h-full">
          {/* Logo and Brand */}
          <Link href={ROUTES.HOME} className="flex items-center gap-2 sm:gap-3">
            <Image 
              src="/logo.svg" 
              alt="PRAKTIK-AI Logo" 
              width={221} 
              height={83}
              className="w-[120px] h-[45px] sm:w-[180px] sm:h-[68px] lg:w-[221px] lg:h-[83px]"
            />
            <span className="text-base sm:text-lg lg:text-xl font-bold text-black">PRAKTIK-AI</span>
          </Link>

          {/* Navigation Links */}
          <ul className="hidden md:flex items-center gap-4 lg:gap-8">
            <li>
              <Link
                href={ROUTES.HOME}
                className={`relative pb-1 transition-colors ${
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
                className={`relative pb-1 transition-colors ${
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
                className={`relative pb-1 transition-colors ${
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
                className={`relative pb-1 transition-colors ${
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
                className={`relative pb-1 transition-colors ${
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
          <div className="flex items-center gap-2 sm:gap-4">
            {isAuthenticated && (
              <button className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-full transition-colors">
                <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6 text-black" strokeWidth={1.5} />
              </button>
            )}

            {loading ? (
              <div className="w-8 h-8 rounded-full bg-gray-100 animate-pulse" />
            ) : isAuthenticated ? (
              <div className="flex items-center gap-2 sm:gap-3">
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
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                >
                  <LogOut className="w-4 h-4" strokeWidth={1.5} />
                  <span className="hidden sm:block">Odhlásit</span>
                </button>
              </div>
            ) : (
              <button
                onClick={login}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-md shadow-sm transition-colors"
                style={{ background: "linear-gradient(90deg, #B1475C 0%, #857AD2 100%)" }}
              >
                <LogIn className="w-4 h-4" strokeWidth={2} />
                Přihlásit se
              </button>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
