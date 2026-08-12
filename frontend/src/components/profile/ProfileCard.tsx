'use client';

import Image from 'next/image';
import { SquarePen } from 'lucide-react';

interface ProfileCardProps {
  name: string;
  role: string;
  avatarSrc?: string;
  level?: number;
  onEditClick?: () => void;
}

const ROLE_BADGE: Record<string, string> = {
  'Super Admin': 'bg-gradient-r/20 text-gradient-r',
  'Garant':      'bg-tip/20 text-tip',
  'Lektor':      'bg-success/20 text-success',
  'Uživatel':    'bg-muted text-muted-foreground',
  'Student':     'bg-muted text-muted-foreground',
};

export function ProfileCard({ name, role, avatarSrc, level, onEditClick }: ProfileCardProps) {
  const badgeClass = ROLE_BADGE[role] ?? 'bg-muted text-muted-foreground';

  return (
    <div className="bg-card rounded-xl shadow-sm p-6 flex flex-col items-center gap-3 relative">
      {/* 3-dot edit button */}
      <button
        onClick={onEditClick}
        className="absolute top-4 right-4 p-1.5 hover:bg-muted rounded-lg transition-colors"
        aria-label="Upravit profil"
      >
        <SquarePen size={18} className="text-muted-foreground" />
      </button>

      {/* Avatar circle with level badge */}
      <div className="relative">
        <div className="size-28 rounded-full bg-muted flex items-center justify-center overflow-hidden border-3 border-success/30 shadow-md">
          {avatarSrc ? (
            <Image
              src={avatarSrc}
              alt={name}
              width={112}
              height={112}
              className="object-cover w-full h-full"
            />
          ) : (
            <Image
              src="/logo.svg"
              alt="avatar"
              width={80}
              height={80}
              className="object-contain"
            />
          )}
        </div>
        {level !== undefined && (
          <span className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground text-xs font-bold rounded-full size-8 flex items-center justify-center border-2 border-white shadow-sm">
            {level}
          </span>
        )}
      </div>

      {/* Name & role */}
      <div className="text-center">
        <p className="text-lg font-bold text-foreground">{name}</p>
        <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${badgeClass}`}>
          {role}
        </span>
      </div>
    </div>
  );
}
