import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { SupportChatProvider } from "@/components/tickets/SupportChatWidget";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    // AI chat — na všech veřejných stránkách.
    <SupportChatProvider>
      <div className="flex flex-col min-h-screen" style={{ backgroundColor: 'var(--muted)' }}>
        <Header />
        <main className="flex-1" style={{ maxWidth: '1440px', width: '100%', margin: '0 auto' }}>
          {children}
        </main>
        <Footer />
      </div>
    </SupportChatProvider>
  );
}
