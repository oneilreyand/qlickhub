import React from 'react';

export interface AvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  status?: 'online' | 'offline' | 'busy';
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  name,
  size = 'md',
  status,
  className = '',
}) => {
  const getInitials = (str: string) => {
    const parts = str.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return str.substring(0, 2).toUpperCase();
  };

  const sizeStyles = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-12 w-12 text-base',
  };

  const statusColor = {
    online: 'bg-[#B1E743]',
    offline: 'bg-stone-400',
    busy: 'bg-rose-500',
  };

  return (
    <div className="relative inline-block">
      <div
        className={`grid place-items-center rounded-xl bg-[#B1E743] font-bold text-[#141413] shadow-xs dark:bg-[#B1E743] dark:text-[#141413] ${sizeStyles[size]} ${className}`}
      >
        {getInitials(name)}
      </div>
      {status && (
        <span
          className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white dark:border-stone-900 ${statusColor[status]}`}
        />
      )}
    </div>
  );
};
