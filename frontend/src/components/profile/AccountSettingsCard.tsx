'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { Camera } from 'lucide-react';

interface AccountFormValues {
  firstName: string;
  lastName: string;
}

interface AccountSettingsCardProps {
  initialFirstName?: string;
  initialLastName?: string;
  avatarSrc?: string;
  saving?: boolean;
  onSave?: (values: AccountFormValues) => void;
  onChangePassword?: () => void;
  onAvatarChange?: (url: string) => void;
}

export function AccountSettingsCard({
  initialFirstName = '',
  initialLastName = '',
  avatarSrc,
  saving = false,
  onSave,
  onChangePassword,
  onAvatarChange,
}: AccountSettingsCardProps) {
  const [values, setValues] = useState<AccountFormValues>({
    firstName: initialFirstName,
    lastName: initialLastName,
  });
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(avatarSrc);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleChange(field: keyof AccountFormValues, value: string) {
    setValues((prev) => ({ ...prev, [field]: value }));
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preview immediately
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      formData.append('userId', 'user');

      const res = await fetch('/api/avatar', { method: 'POST', body: formData });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Upload failed');
      }
      const data = await res.json();
      setPreviewUrl(data.url);
      onAvatarChange?.(data.url);
    } catch (err) {
      console.error('Avatar upload failed:', err);
    } finally {
      setUploading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave?.(values);
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 sm:p-8">
      <h2 className="text-xl font-bold text-gray-900 mb-6">Nastavení účtu</h2>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {/* Avatar upload */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-gray-100 overflow-hidden border-2 border-gray-200 flex-shrink-0">
              {previewUrl ? (
                <Image
                  src={previewUrl}
                  alt="Avatar"
                  width={80}
                  height={80}
                  className="object-cover w-full h-full"
                />
              ) : (
                <Image
                  src="/logo.svg"
                  alt="Avatar"
                  width={60}
                  height={60}
                  className="object-contain w-full h-full p-2"
                />
              )}
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute -bottom-1 -right-1 w-7 h-7 bg-green-500 hover:bg-green-600 text-white rounded-full flex items-center justify-center shadow-sm transition-colors disabled:opacity-50"
            >
              <Camera size={14} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleAvatarUpload}
              className="hidden"
            />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">Profilový obrázek</p>
            <p className="text-xs text-gray-500">
              {uploading ? 'Nahrávání...' : 'JPG, PNG, WebP nebo GIF. Max 5MB.'}
            </p>
          </div>
        </div>

        {/* Row: Jméno + Příjmení */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-gray-500 font-medium">Jméno</label>
            <input
              type="text"
              value={values.firstName}
              onChange={(e) => handleChange('firstName', e.target.value)}
              className="h-11 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-gray-400 transition"
              placeholder="Zadejte jméno"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-gray-500 font-medium">Příjmení</label>
            <input
              type="text"
              value={values.lastName}
              onChange={(e) => handleChange('lastName', e.target.value)}
              className="h-11 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-gray-400 transition"
              placeholder="Zadejte příjmení"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 mt-1">
          <button
            type="button"
            onClick={onChangePassword}
            className="px-4 py-2 text-sm font-semibold text-gray-800 bg-transparent hover:bg-gray-50 rounded-lg transition"
          >
            Změnit heslo
          </button>
          <button
            type="submit"
            disabled={saving || uploading}
            className="px-5 py-2 text-sm font-semibold text-white bg-green-500 hover:bg-green-600 rounded-lg transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Ukládání...' : 'Uložit změny'}
          </button>
        </div>
      </form>
    </div>
  );
}
