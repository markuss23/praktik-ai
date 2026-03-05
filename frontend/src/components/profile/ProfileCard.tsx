import Image from 'next/image';

interface ProfileCardProps {
  name: string;
  role: string;
  avatarSrc?: string;
}

export function ProfileCard({ name, role, avatarSrc }: ProfileCardProps) {
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
        <p className="text-sm text-gray-500 mt-0.5">{role}</p>
      </div>
    </div>
  );
}
