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
  'Super Admin': 'bg-purple-100 text-purple-700',
  'Garant':      'bg-blue-100 text-blue-700',
  'Lektor':      'bg-green-100 text-green-700',
  'Uživatel':    'bg-gray-100 text-gray-600',
  'Student':     'bg-gray-100 text-gray-600',
};

export function ProfileCard({ name, role, avatarSrc, level, onEditClick }: ProfileCardProps) {
  const badgeClass = ROLE_BADGE[role] ?? 'bg-gray-100 text-gray-600';

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 flex flex-col items-center gap-3 relative">
      {/* 3-dot edit button */}
      <button
        onClick={onEditClick}
        className="absolute top-4 right-4 p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
        aria-label="Upravit profil"
      >
        <SquarePen size={18} className="text-gray-500" />
      </button>

      {/* Avatar circle with level badge */}
      <div className="relative">
        <div className="w-28 h-28 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border-3 border-green-500 shadow-md">
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
          <span className="absolute -bottom-1 -right-1 bg-green-500 text-white text-xs font-bold rounded-full w-8 h-8 flex items-center justify-center border-2 border-white shadow-sm">
            {level}
          </span>
        )}
      </div>

      {/* Name & role */}
      <div className="text-center">
        <p className="text-lg font-bold text-gray-900">{name}</p>
        <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${badgeClass}`}>
          {role}
        </span>
      </div>
    </div>
  );
}
