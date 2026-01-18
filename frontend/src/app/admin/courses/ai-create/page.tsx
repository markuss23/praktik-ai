'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function AICreateCoursePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    moduleCount: 1,
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // TODO: Implementovat AI generování kurzu
      console.log('AI Course generation:', formData, file);
      // Po úspěšném vytvoření přesměrovat na admin
      // router.push('/admin');
      alert('AI generování kurzu bude implementováno');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nepodařilo se vytvořit kurz');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // TODO: Implementovat ukládání kurzu
      console.log('Saving course:', formData, file);
      alert('Ukládání kurzu bude implementováno');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nepodařilo se uložit kurz');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-xs sm:text-sm text-gray-500 mb-1">
                Kurzy / Překlad kurzů / Popis kurzu
              </p>
              <h1 className="text-xl sm:text-2xl font-bold text-black">Popis kurzu</h1>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                type="button"
                className="text-xs sm:text-sm text-gray-600 hover:text-gray-800 transition-colors"
              >
                Živý náhled kurzu
              </button>
              <button
                onClick={handleSave}
                disabled={loading}
                className="flex items-center gap-2 px-4 sm:px-5 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm"
              >
                <ArrowRight size={16} />
                <span>Uložit</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 sm:p-6 lg:p-8">
        {error && (
          <div className="mb-4 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-md text-red-800 text-sm">
            {error}
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 lg:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Název kurzu */}
            <div>
              <label className="block text-sm font-semibold text-black mb-2">
                Název kurzu
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-black"
                placeholder="Výběr zrn kávy"
              />
            </div>

            {/* Popis kurzu */}
            <div>
              <label className="block text-sm font-semibold text-black mb-2">
                Popis kurzu
              </label>
              <textarea
                required
                rows={6}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-black resize-none"
                placeholder="V této kapitole se studenti seznámí s hlavními typy kávových zrn, konkrétně s Arabica a Robustou. Arabica je považována za kvalitnější a jemnější variantu, s komplexními chutovými profily, ovocnými a květinovými tóny, a s vysoce výraznou kyselostí. Naopak Robusta se vyznačuje silnější a hořkou chutí, nízká kyselostí, a vyšším obsahem kofeinu, což ji činí ideální pro espresso směsi. Důležitým aspektem je posouzení osobních preferencí spotřebitelů při výběru druhu kávových zrn."
              />
            </div>

            {/* Počet modulů */}
            <div>
              <label className="block text-sm font-semibold text-black mb-2">
                Počet modulů
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, moduleCount: Math.max(1, formData.moduleCount - 1) })}
                  className="w-10 h-10 flex items-center justify-center border border-gray-300 rounded-md hover:bg-gray-50 transition-colors text-xl text-black"
                >
                  -
                </button>
                  <input
                  type="number"
                  min="1"
                  max="20"
                  value={formData.moduleCount}
                  onChange={(e) => setFormData({ ...formData, moduleCount: parseInt(e.target.value) || 1 })}
                  className="w-16 px-2 py-2 border border-gray-300 rounded-md text-center focus:outline-none focus:ring-2 focus:ring-purple-500 text-black"
                />
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, moduleCount: Math.min(20, formData.moduleCount + 1) })}
                  className="w-10 h-10 flex items-center justify-center border border-gray-300 rounded-md hover:bg-gray-50 transition-colors text-xl text-black"
                >
                  +
                </button>
              </div>
            </div>

            {/* Nahrát podklady */}
            <div>
              <label className="block text-sm font-semibold text-black mb-2">
                Nahrát podklady
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 transition-colors text-sm"
                >
                  Nahrát podklady
                </button>
                <span className="text-sm text-gray-500">
                  {file ? file.name : 'No file selected'}
                </span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            </div>

            {/* Tlačítka */}
            <div className="flex justify-between items-center pt-4">
              <button
                type="button"
                onClick={() => router.push('/admin')}
                className="text-gray-600 hover:text-gray-800 transition-colors text-sm"
              >
                Zpět
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="flex items-center gap-2 px-5 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                <ArrowRight size={16} />
                <span>{loading ? 'Pokračuji...' : 'Pokračovat'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
