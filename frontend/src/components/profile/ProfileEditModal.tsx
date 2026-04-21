'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { AccountSettingsCard } from './AccountSettingsCard';
import { motion, AnimatePresence } from 'motion/react';
import { updateProfileName } from '@/lib/api-client';

interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  avatarSrc?: string;
  onAvatarChange?: (url: string) => void;
  initialFirstName?: string;
  initialLastName?: string;
  onNameSaved?: (displayName: string) => void;
}

export function ProfileEditModal({ isOpen, onClose, avatarSrc, onAvatarChange, initialFirstName, initialLastName, onNameSaved }: ProfileEditModalProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async (values: { firstName: string; lastName: string }) => {
    const displayName = `${values.firstName} ${values.lastName}`.trim();
    if (!displayName) {
      setError('Jméno nesmí být prázdné.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await updateProfileName(displayName);
      onNameSaved?.(displayName);
      onClose();
    } catch {
      setError('Nepodařilo se uložit změny.');
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

          {/* Modal content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-2">
              <h2 className="text-xl font-bold text-gray-900">Upravit profil</h2>
              <button
                onClick={onClose}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            {error && (
              <div className="mx-6 mt-2 p-3 bg-red-50 border border-red-200 rounded-md text-red-800 text-sm">
                {error}
              </div>
            )}

            {/* Body */}
            <div className="px-2 pb-2">
              <AccountSettingsCard
                initialFirstName={initialFirstName}
                initialLastName={initialLastName}
                avatarSrc={avatarSrc}
                onAvatarChange={onAvatarChange}
                saving={saving}
                onSave={handleSave}
                onChangePassword={() => {
                  // Keycloak manages passwords
                }}
              />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
