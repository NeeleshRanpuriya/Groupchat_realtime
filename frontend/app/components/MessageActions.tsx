'use client'

import React, { useEffect, useRef } from 'react';

interface MessageActionsProps {
  isOwn: boolean;
  isAdmin?: boolean;
  onCopy?: () => void;
  onUnsend?: () => void;
  onPin?: () => void;
  onEdit?: () => void;
  onReact?: () => void;
  onClose: () => void;
}

export default function MessageActions({
  isOwn,
  isAdmin,
  onCopy,
  onUnsend,
  onPin,
  onEdit,
  onReact,
  onClose,
}: MessageActionsProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      className="absolute right-0 top-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50 min-w-[150px]"
    >
      <button
        onClick={() => { if (onCopy) onCopy(); onClose(); }}
        className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
      >
        Copy
      </button>
      {onReact && (
        <button
          onClick={() => { onReact(); onClose(); }}
          className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          React
        </button>
      )}
      {isAdmin && onPin && (
        <button
          onClick={() => { onPin(); onClose(); }}
          className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          Pin / Unpin
        </button>
      )}
      {isOwn && onEdit && (
        <button
          onClick={() => { onEdit(); onClose(); }}
          className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          Edit
        </button>
      )}
      {(isOwn || isAdmin) && (
        <button
          onClick={() => { if (onUnsend) onUnsend(); onClose(); }}
          className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-red-600 dark:text-red-400"
        >
          Unsend
        </button>
      )}
    </div>
  );
}