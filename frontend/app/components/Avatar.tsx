'use client'

import React from 'react';

interface AvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function Avatar({ name, size = 'md', className = '' }: AvatarProps) {
  const initials = name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
  };

  // Generate a consistent pastel color based on username
  const hue = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 360;
  const bgColor = `hsl(${hue}, 70%, 80%)`;
  const textColor = `hsl(${hue}, 70%, 20%)`;

  return (
    <div
      className={`${sizeClasses[size]} rounded-full flex items-center justify-center font-semibold shadow-sm ring-1 ring-border/50 ${className}`}
      style={{ backgroundColor: bgColor, color: textColor }}
    >
      {initials}
    </div>
  );
}