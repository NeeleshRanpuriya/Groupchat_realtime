'use client'

import React, { useState, useRef } from 'react';
import { Smile, Image as ImageIcon, Mic, Heart } from 'lucide-react';

export default function MessageInput({ onSend, onTyping }: { onSend: any; onTyping?: any }) {
  const [message, setMessage] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    if (message.trim()) {
      onSend(message);
      setMessage('');
    }
  };

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-2 px-4 mb-4">
      {file && (
        <div className="p-2 bg-card border border-border rounded-xl text-xs flex gap-2 w-fit items-center text-foreground">
          {file.name} 
          <button onClick={() => setFile(null)} className="text-destructive hover:text-destructive/80 font-bold">✕</button>
        </div>
      )}
      
      <div className="flex items-center bg-card border border-border rounded-full px-4 py-2 focus-within:border-ring transition-all">
        {/* Left Icon */}
        <button className="text-muted-foreground hover:text-foreground transition p-1">
          <Smile size={24} />
        </button>

        {/* Input Field */}
        <input
          type="text"
          value={message}
          onChange={(e) => {
            setMessage(e.target.value);
            onTyping?.(true);
          }}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Message..."
          className="flex-1 bg-transparent border-none focus:ring-0 text-sm py-2 px-3 outline-none text-foreground placeholder-muted-foreground"
        />

        {/* Dynamic Icons */}
        <div className="flex items-center gap-3 text-muted-foreground">
          {message.trim() ? (
            <button 
                onClick={handleSend}
                className="text-primary font-bold text-sm px-2 hover:text-primary/80 transition"
            >
              Send
            </button>
          ) : (
            <>
              <button className="hover:text-foreground transition"><Mic size={22} /></button>
              <button onClick={() => fileInputRef.current?.click()} className="hover:text-foreground transition">
                <ImageIcon size={22} />
              </button>
              <button className="hover:text-foreground transition"><Heart size={22} /></button>
            </>
          )}
        </div>

        <input 
            type="file" 
            ref={fileInputRef} 
            onChange={(e) => setFile(e.target.files?.[0] || null)} 
            className="hidden" 
            accept="image/*"
        />
      </div>
    </div>
  );
}