'use client';

import { useState } from 'react';
import { AccountSettingsCard } from './AccountSettingsCard';
import { updateProfileName } from '@/lib/api-client';
import { Alert, AlertDescription, Modal } from '@/components/ui';

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
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!saving) onClose();
      }}
      title="Upravit profil"
      maxWidth="max-w-lg"
    >
      <div className="flex flex-col gap-3">
        {error && (
          <Alert variant="error">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

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
    </Modal>
  );
}
