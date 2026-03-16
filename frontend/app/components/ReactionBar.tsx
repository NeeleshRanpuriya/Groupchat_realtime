'use client'

import React from 'react';

interface ReactionBarProps {
  messageId: number;
  onReact: (messageId: number, reaction: string) => void;
}

const reactions = ['👍', '❤️', '😂', '😮', '😢', '👎'];

export default function ReactionBar({ messageId, onReact }: ReactionBarProps) {
  return (
    <div className="flex gap-1 mt-1">
      {reactions.map((reaction) => (
        <button
          key={reaction}
          onClick={() => onReact(messageId, reaction)}
          className="text-sm hover:bg-gray-100 dark:hover:bg-gray-700 p-1 rounded transition"
          type="button"
        >
          {reaction}
        </button>
      ))}
    </div>
  );
}