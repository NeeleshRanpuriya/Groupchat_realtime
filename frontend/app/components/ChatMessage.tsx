'use client'

import React, { useState, memo } from 'react';
import Avatar from './Avatar';
import MessageActions from './MessageActions';

interface ChatMessageProps {
  message: any;
  currentUser: string;
  isAdmin?: boolean;
  onCopy?: (text: string) => void;
  onUnsend?: (messageId: number) => void;
  onPin?: (messageId: number) => void;
  onEdit?: (messageId: number, newText: string) => void;
  onReact?: (messageId: number, reaction: string) => void;
}

const ChatMessage = memo(({
  message,
  currentUser,
  isAdmin,
  onCopy,
  onUnsend,
  onPin,
  onEdit,
  onReact,
}: ChatMessageProps) => {
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.message);
  const isOwn = message.username === currentUser;

  const handleCopy = () => {
    if (onCopy) onCopy(message.message);
    else navigator.clipboard.writeText(message.message);
  };

  const handleUnsend = () => {
    if (onUnsend) onUnsend(message.id);
  };

  const handlePin = () => {
    if (onPin) onPin(message.id);
  };

  const handleEditSubmit = () => {
    if (onEdit && editText.trim() && editText !== message.message) {
      onEdit(message.id, editText);
    }
    setIsEditing(false);
  };

  const handleReact = () => {
    if (onReact) {
      const reaction = prompt('Enter reaction (e.g., 👍, ❤️)');
      if (reaction) onReact(message.id, reaction);
    }
  };

  if (message.type === 'system') {
    return (
      <div className="flex justify-center my-4">
        <span className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs px-3 py-1 rounded-full">
          {message.message}
        </span>
      </div>
    );
  }

  return (
    <div className={`flex mb-4 ${isOwn ? 'justify-end' : 'justify-start'}`}>
      {!isOwn && (
        <div className="flex-shrink-0 mr-2">
          <Avatar name={message.username} size="sm" />
        </div>
      )}
      <div className={`max-w-xs lg:max-w-md ${isOwn ? 'order-1' : 'order-2'}`}>
        <div className="flex items-end gap-1">
          {!isOwn && (
            <span className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              {message.username}
            </span>
          )}
          <div
            className={`px-4 py-2 rounded-2xl shadow-sm break-words ${
              isOwn
                ? 'bg-blue-500 text-white rounded-br-none'
                : message.is_toxic
                ? 'bg-red-100 dark:bg-red-900/30 text-gray-800 dark:text-gray-200 rounded-bl-none border border-red-200 dark:border-red-800'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-bl-none'
            }`}
          >
            {isEditing ? (
              <input
                type="text"
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                onBlur={handleEditSubmit}
                onKeyPress={(e) => e.key === 'Enter' && handleEditSubmit()}
                autoFocus
                className="bg-transparent border-b border-white outline-none w-full text-white"
              />
            ) : (
              <>
                <p className="text-sm">{message.message}</p>
                {message.file_url && (
                  <div className="mt-2">
                    {message.file_url.match(/\.(mp4|webm|ogg)$/i) ? (
                      <video src={message.file_url} controls className="max-w-xs rounded" />
                    ) : (
                      <img src={message.file_url} alt="attachment" className="max-w-xs rounded" />
                    )}
                  </div>
                )}
                {message.edited && (
                  <span className="text-xs opacity-60 ml-1">(edited)</span>
                )}
                {message.is_pinned && (
                  <span className="text-xs text-yellow-600 dark:text-yellow-400 block mt-1">📌 Pinned</span>
                )}
                {message.is_toxic && (
                  <span className="text-xs text-red-600 dark:text-red-300 block mt-1">
                    ⚠️ Toxic ({message.toxicity_score})
                  </span>
                )}
              </>
            )}
          </div>
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1"
            >
              <svg aria-label="Message options" className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="1.5"></circle>
                <circle cx="12" cy="6" r="1.5"></circle>
                <circle cx="12" cy="18" r="1.5"></circle>
              </svg>
            </button>
            {showMenu && (
              <MessageActions
                isOwn={isOwn}
                isAdmin={!!isAdmin}
                onCopy={handleCopy}
                onUnsend={handleUnsend}
                onPin={onPin ? handlePin : undefined}
                onEdit={onEdit ? () => setIsEditing(true) : undefined}
                onReact={onReact ? handleReact : undefined}
                onClose={() => setShowMenu(false)}
              />
            )}
          </div>
        </div>
        <div className={`text-xs text-gray-400 mt-1 ${isOwn ? 'text-right' : 'text-left'}`}>
          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
});

ChatMessage.displayName = 'ChatMessage';
export default ChatMessage;