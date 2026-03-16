'use client'

import React from 'react';

export default function PinnedMessagesList({ messages }: { messages: any[] }) {
  if (messages.length === 0) {
    return <p className="text-gray-500 dark:text-gray-400">No pinned messages.</p>;
  }
  return (
    <ul className="space-y-2">
      {messages.map(msg => (
        <li key={msg.id} className="p-2 bg-gray-100 dark:bg-gray-700 rounded">
          <span className="font-semibold">{msg.username}:</span> {msg.message}
        </li>
      ))}
    </ul>
  );
}