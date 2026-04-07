'use client';

import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { updateProfile } from '@/lib/api-client';

interface AiPreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialAiTone: string;
  initialAiExpressionLevel: string;
  onSaved: () => void;
}

export function AiPreferencesModal({
  isOpen,
  onClose,
  initialAiTone,
  initialAiExpressionLevel,
  onSaved,
}: AiPreferencesModalProps) {
  const [aiTone, setAiTone] = useState(initialAiTone);
  const [aiExpressionLevel, setAiExpressionLevel] = useState(initialAiExpressionLevel);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!aiTone.trim() || !aiExpressionLevel.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await updateProfile(aiTone.trim(), aiExpressionLevel.trim());
      onSaved();
      onClose();
    } catch {
      setError('Nepodařilo se uložit. Zkuste to znovu.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/40"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-2">
              <h2 className="text-xl font-bold text-gray-900">AI Nastavení</h2>
              <button
                onClick={onClose}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 pb-6 pt-4 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  AI Tón
                </label>
                <input
                  type="text"
                  value={aiTone}
                  onChange={(e) => setAiTone(e.target.value)}
                  maxLength={100}
                  placeholder="Profesionální a neutrální"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-purple-300"
                />
                <p className="text-xs text-gray-400 mt-1">Styl komunikace AI tutora</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  AI Vyjadřování
                </label>
                <input
                  type="text"
                  value={aiExpressionLevel}
                  onChange={(e) => setAiExpressionLevel(e.target.value)}
                  maxLength={100}
                  placeholder="Standardní srozumitelný jazyk"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-purple-300"
                />
                <p className="text-xs text-gray-400 mt-1">Jazyková úroveň odpovědí AI</p>
              </div>

              {error && (
                <p className="text-sm text-red-600">{error}</p>
              )}

              <button
                onClick={handleSave}
                disabled={saving || !aiTone.trim() || !aiExpressionLevel.trim()}
                className="w-full inline-flex items-center justify-center gap-2 text-white font-semibold py-2.5 rounded-lg transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: '#8B5BA8' }}
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Ukládám...
                  </>
                ) : (
                  'Uložit'
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
