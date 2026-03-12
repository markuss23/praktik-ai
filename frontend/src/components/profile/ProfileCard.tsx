import Image from 'next/image';

interface ProfileCardProps {
  name: string;
  role: string;
  avatarSrc?: string;
}

const ROLE_BADGE: Record<string, string> = {
  'Super Admin': 'bg-purple-100 text-purple-700',
  'Garant':      'bg-blue-100 text-blue-700',
  'Lektor':      'bg-green-100 text-green-700',
  'Uživatel':    'bg-gray-100 text-gray-600',
};

export function ProfileCard({ name, role, avatarSrc }: ProfileCardProps) {
  const badgeClass = ROLE_BADGE[role] ?? 'bg-gray-100 text-gray-600';

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 flex flex-col items-center gap-3">
      {/* Avatar circle */}
      <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border border-gray-200 shadow-inner">
        {avatarSrc ? (
          <Image
            src={avatarSrc}
            alt={name}
            width={96}
            height={96}
            className="object-cover w-full h-full"
          />
        ) : (
          <Image
            src="/logo.svg"
            alt="avatar"
            width={64}
            height={64}
            className="object-contain"
          />
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
