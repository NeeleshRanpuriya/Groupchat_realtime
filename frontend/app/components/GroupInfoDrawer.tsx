'use client'

import { useEffect, useState } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import Avatar from './Avatar';

interface Member {
  username: string;
  isAdmin: boolean;
}

interface GroupInfoDrawerProps {
  roomId: string;
  isOpen: boolean;
  onClose: () => void;
  adminUsername: string;          // username of the room admin
  currentUsername: string;         // logged‑in user
  onKick: (target: string) => void;  // function to kick a member
  onLeave: () => void;              // function to leave room
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function GroupInfoDrawer({
  roomId,
  isOpen,
  onClose,
  adminUsername,
  currentUsername,
  onKick,
  onLeave,
}: GroupInfoDrawerProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);

  const isAdmin = currentUsername === adminUsername;

  useEffect(() => {
    if (!isOpen) return;
    fetchMembers();
  }, [isOpen, roomId]);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/rooms/${roomId}/members`);
      const data = await res.json();
      const memberNames = data.members || [];
      // we don't have admin info from this endpoint, so we'll mark admin separately
      const memberList = memberNames.map((name: string) => ({
        username: name,
        isAdmin: name === adminUsername,
      }));
      setMembers(memberList);
    } catch (error) {
      console.error('Failed to fetch members:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 w-80 bg-white dark:bg-gray-800 shadow-xl z-50 transform transition-transform duration-300 ease-in-out">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
            <h2 className="text-lg font-semibold dark:text-white">Group Info</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400"
            >
              ✕
            </button>
          </div>

          {/* Members list */}
          <div className="flex-1 overflow-y-auto p-4">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
              Members – {members.length}
            </h3>
            {loading ? (
              <p className="text-center text-gray-500">Loading...</p>
            ) : (
              <ul className="space-y-3">
                {members.map((member) => (
                  <li key={member.username} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar name={member.username} size="sm" />
                      <span className="text-sm dark:text-white">
                        {member.username}
                        {member.isAdmin && (
                          <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                            Admin
                          </span>
                        )}
                      </span>
                    </div>
                    {isAdmin && !member.isAdmin && member.username !== currentUsername && (
                      <button
                        onClick={() => {
                          if (confirm(`Kick ${member.username}?`)) {
                            onKick(member.username);
                          }
                        }}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Kick
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Leave group button */}
          <div className="p-4 border-t dark:border-gray-700">
            <button
              onClick={() => {
                if (confirm('Leave this group?')) {
                  onLeave();
                }
              }}
              className="w-full bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg"
            >
              Leave Group
            </button>
          </div>
        </div>
      </div>
    </>
  );
}