'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState, useRef, useCallback } from 'react'
import { useAuth } from '@/app/context/AuthContext'
import ProtectedRoute from '@/app/components/ProtectedRoute'
import ChatMessage from '@/app/components/ChatMessage'
import MessageInput from '@/app/components/MessageInput'
import AnalysisPanel from '@/app/components/AnalysisPanel'
import StatsPanel from '@/app/components/StatsPanel'
import UserList from '@/app/components/UserList'
import JoinRequestPanel from '@/app/components/JoinRequestPanel'
import GroupInfoDrawer from '@/app/components/GroupInfoDrawer'
import SearchBar from '@/app/components/SearchBar'
import PinnedMessagesList from '@/app/components/PinnedMessagesList'
import { LogOut, Info, Pin, Search, Sun, Moon, Video, Phone } from 'lucide-react'

interface Message {
  id: number;
  username: string;
  message: string;
  type?: string;
  edited?: boolean;
  is_pinned?: boolean;
  file_url?: string;
  [key: string]: any;
}

interface User {
  username: string;
  online: boolean;
  typing?: boolean;
}

function ChatRoomContent() {
  const params = useParams()
  const room_id = params?.room_id as string
  const router = useRouter()
  const { user } = useAuth()
  const username = user?.username || ''

  const [messages, setMessages] = useState<Message[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [currentAnalysis, setCurrentAnalysis] = useState<any>(null)
  const [currentCoaching, setCurrentCoaching] = useState<any>(null)
  const [darkMode, setDarkMode] = useState(false)
  const [loading, setLoading] = useState(true)
  const [isMember, setIsMember] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [requestSent, setRequestSent] = useState(false)
  const [connectionFailed, setConnectionFailed] = useState(false)
  const [showGroupInfo, setShowGroupInfo] = useState(false)
  const [adminName, setAdminName] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [searchResults, setSearchResults] = useState<Message[]>([])
  const [showPinned, setShowPinned] = useState(false)
  const [pinnedMessages, setPinnedMessages] = useState<Message[]>([])
  const [announcement, setAnnouncement] = useState('')

  const socketRef = useRef<WebSocket | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000'
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

  // --- DARK MODE FIX ---
  useEffect(() => {
    const saved = localStorage.getItem('darkMode') === 'true'
    setDarkMode(saved)
    if (saved) document.documentElement.classList.add('dark')
    else document.documentElement.classList.remove('dark')
  }, [])

  const toggleDarkMode = useCallback(() => {
    setDarkMode(prev => {
      const newMode = !prev
      localStorage.setItem('darkMode', String(newMode))
      if (newMode) document.documentElement.classList.add('dark')
      else document.documentElement.classList.remove('dark')
      return newMode
    })
  }, [])

  // --- WEBSOCKET & LOGIC ---
  useEffect(() => {
    if (!room_id || !username) return
    const ws = new WebSocket(`${WS_URL}/ws/${room_id}/${username}`)
    
    ws.onopen = () => {
      setIsMember(true); setConnectionFailed(false); setLoading(false)
      fetch(`${API_URL}/api/messages?room_id=${encodeURIComponent(room_id)}&limit=50`).then(res => res.json()).then(data => setMessages(data.messages))
      fetch(`${API_URL}/api/rooms/${room_id}/members`).then(res => res.json()).then(data => setUsers((data.members || []).map((name: string) => ({ username: name, online: true }))))
      
      const token = localStorage.getItem('token');
      fetch(`${API_URL}/api/rooms/${room_id}/pending-requests?admin=${username}`, {
        headers: { Authorization: `Bearer ${token}` }
      }).then(res => { if (res.status !== 403) setIsAdmin(true) })
    }

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      if (data.type === 'message') setMessages(prev => [...prev, data])
      if (data.type === 'typing') setUsers(prev => prev.map(u => u.username === data.username ? { ...u, typing: data.is_typing } : u))
    }

    ws.onclose = (e) => {
      if (e.reason === 'Not a member of this room' || e.code === 4003) {
        setConnectionFailed(true); setIsMember(false); setLoading(false)
      }
    }
    socketRef.current = ws; return () => ws.close()
  }, [room_id, username, API_URL, WS_URL])

  const sendMessage = (text: string) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) socketRef.current.send(JSON.stringify({ message: text }))
  }

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  if (loading) return <div className="h-screen bg-background flex items-center justify-center text-foreground font-bold">CONNECTING...</div>

  // --- JOIN REQUEST HANDLER ---
  const requestJoin = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/rooms/${room_id}/request-join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ username }),
      });
      if (response.ok) {
        setRequestSent(true);
      } else {
        // Optionally handle error
      }
    } catch (error) {
      // Optionally handle error
    }
  };

  // --- JOIN REQUEST SCREEN ---
  if (connectionFailed && !isMember) {
    return (
      <div className="h-screen flex items-center justify-center bg-background text-foreground p-4">
        <div className="bg-card border border-border p-10 rounded-[40px] shadow-2xl max-w-sm w-full text-center">
          <Info size={40} className="mx-auto mb-6 text-muted-foreground" />
          <h2 className="text-2xl font-bold mb-2">Private Room</h2>
          <p className="text-muted-foreground mb-8 text-sm">Please request access to join.</p>
          {requestSent ? (
            <div className="text-primary font-bold py-3 bg-primary/10 rounded-2xl border border-primary/20">Request Sent</div>
          ) : (
            <button onClick={requestJoin} className="w-full bg-primary text-primary-foreground py-4 rounded-2xl font-bold transition-all active:scale-95">
              Request to Join
            </button>
          )}
        </div>
      </div>
    )
  }

    function leaveRoom(): void {
      // Remove token if needed, notify backend, and redirect to home
      const token = localStorage.getItem('token');
      fetch(`${API_URL}/api/rooms/${room_id}/leave`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ username }),
      }).finally(() => {
        router.push('/');
      });
    }

  return (
    <div className="h-screen bg-background text-foreground flex overflow-hidden transition-colors duration-300">
      
      {/* 1. Sidebar */}
      <aside className="w-[350px] hidden lg:flex flex-col border-r border-border bg-card">
        <div className="p-6 flex justify-between items-center">
          <h1 className="text-xl font-black tracking-tighter">{username}</h1>
          <button onClick={toggleDarkMode} className="p-2.5 hover:bg-muted rounded-full transition-all">
            {darkMode ? <Sun size={20} className="text-yellow-400" /> : <Moon size={20} />}
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-2 custom-scrollbar"><UserList users={users} currentUser={username} /></div>
      </aside>

      {/* 2. Chat Area */}
      <main className="flex-1 flex flex-col relative bg-background">
        <header className="h-[75px] border-b border-border px-6 flex items-center justify-between bg-background/80 backdrop-blur-xl z-20">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-black">{room_id.charAt(0).toUpperCase()}</div>
            <div>
              <h1 className="font-bold text-md leading-tight">{room_id}</h1>
              <p className="text-[11px] text-green-500 font-bold">ACTIVE</p>
            </div>
          </div>
          <div className="flex items-center gap-5">
            <button onClick={() => setShowSearch(!showSearch)} className="hover:text-primary"><Search size={22}/></button>
            <button onClick={() => setShowGroupInfo(true)}><Info size={24}/></button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 lg:p-8 space-y-4 custom-scrollbar">
            <div className="flex-1" />
            {messages.map((msg, i) => (
                <ChatMessage key={i} message={msg} currentUser={username} isAdmin={isAdmin} />
            ))}
            <div ref={messagesEndRef} />
        </div>

        {/* FOOTER: Hides for non-members */}
        {isMember && (
          <div className="p-4 bg-background border-t border-border">
            <MessageInput onSend={sendMessage} onTyping={(t: boolean) => socketRef.current?.send(JSON.stringify({ type: 'typing', is_typing: t }))} />
          </div>
        )}
      </main>

      {/* 3. Right Panel (Requests) */}
      <aside className="w-[320px] hidden xl:flex flex-col border-l border-border bg-card p-4 space-y-6">
          {isAdmin && (
            <div className="bg-primary/5 border border-primary/20 rounded-[30px] p-5">
               <h3 className="text-[10px] font-black text-primary mb-4 tracking-widest uppercase">Requests</h3>
               <JoinRequestPanel roomId={room_id} isAdmin={isAdmin} adminUsername={username} currentUsername={username} onApprove={()=>{}} onReject={()=>{}} />
            </div>
          )}
          <AnalysisPanel analysis={currentAnalysis} coaching={currentCoaching} />
      </aside>

      <GroupInfoDrawer roomId={room_id} isOpen={showGroupInfo} onClose={() => setShowGroupInfo(false)} currentUsername={username} onKick={()=>{}} onLeave={leaveRoom} />
    </div>
  )
}

export default function ChatRoomPage() {
  return <ProtectedRoute><ChatRoomContent /></ProtectedRoute>
}