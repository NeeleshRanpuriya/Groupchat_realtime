'use client'

import React from 'react';
import Avatar from './Avatar';
import { Users } from 'lucide-react';

interface User {
  username: string;
  online: boolean;
  typing?: boolean;
}

interface UserListProps {
  users: User[];
  currentUser: string;
}

export default function UserList({ users, currentUser }: UserListProps) {
  return (
    <div className="h-full bg-card rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/30">
        <Users size={16} className="text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground">
          Online — <span className="text-primary">{users.length}</span>
        </h3>
      </div>

      {/* User list */}
      <ul className="py-1 max-h-full overflow-y-auto custom-scrollbar">
        {users.map((user) => {
          const isCurrent = user.username === currentUser;
          return (
            <li
              key={user.username}
              className={`group relative flex items-center gap-3 px-4 py-2.5 transition-all ${
                isCurrent
                  ? 'bg-primary/5 hover:bg-primary/10'
                  : 'hover:bg-muted/30'
              }`}
            >
              {/* Avatar with online indicator */}
              <div className="relative flex-shrink-0">
                <Avatar name={user.username} size="sm" />
                {user.online && (
                  <span className="absolute bottom-0 right-0 block w-2.5 h-2.5 bg-green-500 rounded-full ring-2 ring-card" />
                )}
              </div>

              {/* User info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p
                    className={`text-sm font-medium truncate ${
                      isCurrent ? 'text-primary' : 'text-foreground'
                    }`}
                  >
                    {user.username}
                  </p>
                  {isCurrent && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded-full border border-primary/20">
                      you
                    </span>
                  )}
                </div>
                {user.typing && (
                  <p className="text-xs text-muted-foreground animate-pulse">
                    typing<span className="dots">...</span>
                  </p>
                )}
              </div>

              {/* Optional subtle divider */}
              <div className="absolute bottom-0 left-12 right-4 h-px bg-border/50 group-last:hidden" />
            </li>
          );
        })}
      </ul>
    </div>
  );
}