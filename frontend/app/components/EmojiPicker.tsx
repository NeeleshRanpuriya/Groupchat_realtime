'use client'

import React, { useState } from 'react';
import EmojiPicker from 'emoji-picker-react';

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
}

export default function MessageEmojiPicker({ onEmojiSelect }: EmojiPickerProps) {
  const [showPicker, setShowPicker] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setShowPicker(!showPicker)}
        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-xl"
        type="button"
      >
        😊
      </button>
      {showPicker && (
        <div className="absolute bottom-10 left-0 z-50">
          <EmojiPicker
            onEmojiClick={(emojiData) => {
              onEmojiSelect(emojiData.emoji);
              setShowPicker(false);
            }}
          />
        </div>
      )}
    </div>
  );
}