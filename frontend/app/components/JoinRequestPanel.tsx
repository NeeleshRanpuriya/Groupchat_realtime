'use client'

import React, { useState, useEffect, useCallback } from 'react';

interface JoinRequestPanelProps {
  roomId: string;
  isAdmin: boolean;
  adminUsername: string;
  currentUsername: string;
  onApprove: (username: string) => void;
  onReject: (username: string) => void;
}

const API_URL = process.env.NODE_ENV === 'production'
  ? '/api/proxy'
  : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000');

export default function JoinRequestPanel({
  roomId,
  isAdmin,
  adminUsername,
  currentUsername,
  onApprove,
  onReject,
}: JoinRequestPanelProps) {
  const [requests, setRequests] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchRequests = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    setError('');

    const tryFetch = async (admin: string): Promise<boolean> => {
      if (!admin) return false;
      const url = `${API_URL}/api/rooms/${roomId}/pending-requests?admin=${encodeURIComponent(admin)}`;
      console.log('Fetching pending requests with admin:', admin, 'URL:', url);
      try {
        const res = await fetch(url);
        if (!res.ok) {
          if (res.status === 403) {
            console.warn('Admin name rejected:', admin);
            return false;
          }
          throw new Error(`Failed (status ${res.status})`);
        }
        const data = await res.json();
        setRequests(data.pending || []);
        return true;
      } catch (err) {
        throw err;
      }
    };

    try {
      let success = await tryFetch(adminUsername);
      if (!success && adminUsername !== currentUsername) {
        console.log('Retrying with currentUsername:', currentUsername);
        success = await tryFetch(currentUsername);
      }
      if (!success) {
        setError('Unable to fetch requests – you may not be admin.');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [roomId, isAdmin, adminUsername, currentUsername]);

  useEffect(() => {
    fetchRequests();
    const interval = setInterval(fetchRequests, 10000); // 10 seconds polling
    return () => clearInterval(interval);
  }, [fetchRequests]);

  if (!isAdmin) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm uppercase tracking-wider text-gray-600 dark:text-gray-400">
          Join Requests
        </h3>
        <button
          onClick={fetchRequests}
          disabled={loading}
          className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 disabled:opacity-50"
        >
          {loading ? 'Refreshing...' : '↻ Refresh'}
        </button>
      </div>

      {error && <p className="text-red-500 text-xs">{error}</p>}

      {requests.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">No pending requests</p>
      ) : (
        <ul className="space-y-2">
          {requests.map(user => (
            <li key={user} className="flex items-center justify-between bg-white dark:bg-gray-700 p-2 rounded-lg shadow-sm">
              <span className="text-sm font-medium">{user}</span>
              <div className="flex gap-1">
                <button
                  onClick={() => onApprove(user)}
                  className="bg-green-500 hover:bg-green-600 text-white text-xs px-3 py-1 rounded-full"
                  title="Approve"
                >
                  ✓
                </button>
                <button
                  onClick={() => onReject(user)}
                  className="bg-red-500 hover:bg-red-600 text-white text-xs px-3 py-1 rounded-full"
                  title="Reject"
                >
                  ✕
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}