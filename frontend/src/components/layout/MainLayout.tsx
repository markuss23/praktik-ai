import { ReactNode } from "react";
import { Header } from "./Header";
import { Footer } from "./Footer";

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="flex flex-col min-h-screen" style={{ backgroundColor: '#F0F0F0' }}>
      <Header />
      <main className="flex-1" style={{ maxWidth: '1440px', width: '100%', margin: '0 auto' }}>
        {children}
      </main>
      <Footer />
    </div>
  );
}
