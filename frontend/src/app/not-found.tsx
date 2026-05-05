import Link from 'next/link';
import { Compass, Home, Search } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
      <div className="max-w-md w-full bg-white border border-gray-200 rounded-2xl shadow-sm p-8 text-center">
        <div className="mx-auto w-14 h-14 rounded-full bg-purple-50 flex items-center justify-center mb-5">
          <Compass className="w-7 h-7 text-purple-500" />
        </div>
        <p className="text-xs font-semibold tracking-[0.15em] text-purple-600 mb-2">CHYBA 404</p>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
          Stránka nebyla nalezena
        </h1>
        <p className="text-sm text-gray-600 mb-6">
          Adresa, kterou jste zadali, neexistuje nebo již byla přesunuta. Zkuste se vrátit na
          hlavní stránku nebo si vyhledat kurz.
        </p>
        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-md bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 transition-colors"
          >
            <Home className="w-4 h-4" />
            Hlavní stránka
          </Link>
          <Link
            href="/?focus=search"
            className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-md border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Search className="w-4 h-4" />
            Vyhledat kurz
          </Link>
        </div>
      </div>
    </div>
  );
}
