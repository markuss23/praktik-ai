'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { Camera } from 'lucide-react';

import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from '@/components/ui';

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
    <Card>
      <CardHeader>
        <CardTitle>Nastavení účtu</CardTitle>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Avatar upload */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="size-20 shrink-0 overflow-hidden rounded-full border-2 border-border bg-muted">
                {previewUrl ? (
                  <Image
                    src={previewUrl}
                    alt="Avatar"
                    width={80}
                    height={80}
                    className="size-full object-cover"
                  />
                ) : (
                  <Image
                    src="/logo.svg"
                    alt="Avatar"
                    width={60}
                    height={60}
                    className="size-full object-contain p-2"
                  />
                )}
              </div>
              <Button
                type="button"
                size="icon-sm"
                className="absolute -right-1 -bottom-1 rounded-full"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                aria-label="Nahrát profilový obrázek"
              >
                <Camera />
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Profilový obrázek</p>
              <p className="text-xs text-muted-foreground">
                {uploading ? 'Nahrávání…' : 'JPG, PNG, WebP nebo GIF. Max 5MB.'}
              </p>
            </div>
          </div>

          {/* Row: Jméno + Příjmení */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="account-first-name">Jméno</Label>
              <Input
                id="account-first-name"
                type="text"
                value={values.firstName}
                onChange={(e) => handleChange('firstName', e.target.value)}
                placeholder="Zadejte jméno"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="account-last-name">Příjmení</Label>
              <Input
                id="account-last-name"
                type="text"
                value={values.lastName}
                onChange={(e) => handleChange('lastName', e.target.value)}
                placeholder="Zadejte příjmení"
              />
            </div>
          </div>

          <div className="flex items-center justify-end">
            <Button type="submit" size="lg" disabled={saving || uploading}>
              {saving ? 'Ukládání…' : 'Uložit změny'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
