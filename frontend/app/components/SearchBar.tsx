'use client'

import React, { useState } from 'react';

export default function SearchBar({ onSearch, onClose }: { onSearch: (query: string) => void; onClose: () => void }) {
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(query);
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 bg-white dark:bg-gray-800 p-2 rounded-lg shadow">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search messages..."
        className="flex-1 p-2 border rounded dark:bg-gray-700 dark:text-white"
        autoFocus
      />
      <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Search</button>
      <button type="button" onClick={onClose} className="px-2 py-2 bg-gray-500 text-white rounded hover:bg-gray-600">✕</button>
    </form>
  );
}