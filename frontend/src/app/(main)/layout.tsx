import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

export default function MainLayout({ children }: { children: React.ReactNode }) {
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
