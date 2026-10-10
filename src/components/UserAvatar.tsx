import React from 'react';
import { User } from 'lucide-react';

interface UserAvatarProps {
  name: string;
  avatarUrl?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function UserAvatar({ name, avatarUrl, size = 'md' }: UserAvatarProps) {
  const [imgError, setImgError] = React.useState(false);

  const dimensions =
    size === 'sm'
      ? 'w-8 h-8 text-xs'
      : size === 'lg'
      ? 'w-14 h-14 text-lg'
      : 'w-10 h-10 text-sm';

  const initials = (name || 'Peer Student')
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  if (avatarUrl && !imgError) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        referrerPolicy="no-referrer"
        onError={() => setImgError(true)}
        className={`${dimensions} rounded-lg object-cover border border-slate-200 shrink-0`}
      />
    );
  }

  return (
    <div
      className={`${dimensions} rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-semibold flex items-center justify-center shrink-0 select-none`}
      aria-label={name}
    >
      {initials || <User className="w-4 h-4" />}
    </div>
  );
}
