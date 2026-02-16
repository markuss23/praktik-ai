'use client';

import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { MainLayout } from "./MainLayout";

interface ConditionalLayoutProps {
  children: ReactNode;
}

export function ConditionalLayout({ children }: ConditionalLayoutProps) {
  const pathname = usePathname();
  
  // Don't use MainLayout for admin routes
  if (pathname?.startsWith('/admin')) {
    return <>{children}</>;
  }
  
  // Use MainLayout for all other routes
  return <MainLayout>{children}</MainLayout>;
}
