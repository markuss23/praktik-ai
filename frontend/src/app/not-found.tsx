import Link from 'next/link';
import { Compass, Home, Search } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/50 px-4 py-12">
      <div className="max-w-md w-full bg-card border border-border rounded-2xl shadow-sm p-8 text-center">
        <div className="mx-auto size-14 rounded-full bg-gradient-r/10 flex items-center justify-center mb-5">
          <Compass className="size-7 text-gradient-r" />
        </div>
        <p className="text-xs font-semibold tracking-[0.15em] text-gradient-r mb-2">CHYBA 404</p>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
          Stránka nebyla nalezena
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          Adresa, kterou jste zadali, neexistuje nebo již byla přesunuta. Zkuste se vrátit na
          hlavní stránku nebo si vyhledat kurz.
        </p>
        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-md bg-gradient-r text-primary-foreground text-sm font-medium hover:bg-gradient-r/80 transition-colors"
          >
            <Home className="size-4" />
            Hlavní stránka
          </Link>
          <Link
            href="/?focus=search"
            className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-md border border-border text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
          >
            <Search className="size-4" />
            Vyhledat kurz
          </Link>
        </div>
      </div>
    </div>
  );
}
