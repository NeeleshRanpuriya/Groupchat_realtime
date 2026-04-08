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
import PinnedMessagesList from '@/app/components/PinnedMessagesList'
import { Info, Share2, Pin, Search, Sun, Moon } from 'lucide-react'

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
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [darkMode, setDarkMode] = useState(false)
  const [loading, setLoading] = useState(true)
  const [isMember, setIsMember] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [requestSent, setRequestSent] = useState(false)
  const [connectionFailed, setConnectionFailed] = useState(false)
  const [showGroupInfo, setShowGroupInfo] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [showPinned, setShowPinned] = useState(false)
  const [pinnedMessages, setPinnedMessages] = useState<Message[]>([])
  const [announcement, setAnnouncement] = useState('')
  const [verifying, setVerifying] = useState(true)

  const socketRef = useRef<WebSocket | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000'
  const API_URL = process.env.NEXT_PUBLIC_API_URL || '/backend'

  // Helper to safely get token
  const getToken = () => localStorage.getItem('token')

  // --- Message actions (edit, pin, react) ---
  const editMessage = useCallback(async (messageId: number, newText: string) => {
    const token = getToken();
    try {
      await fetch(`${API_URL}/api/messages/${messageId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ new_text: newText })
      });
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, message: newText, edited: true } : m));
    } catch (err) {
      console.error('Edit message failed:', err);
    }
  }, [API_URL]);

  const pinMessage = useCallback(async (messageId: number) => {
    const token = getToken();
    try {
      const res = await fetch(`${API_URL}/api/rooms/${encodeURIComponent(room_id)}/pin/${messageId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setMessages(prev => prev.map(m => m.id === messageId ? { ...m, is_pinned: !m.is_pinned } : m));
        fetch(`${API_URL}/api/rooms/${encodeURIComponent(room_id)}/pinned`)
          .then(r => r.json())
          .then(setPinnedMessages)
          .catch(err => console.error('Failed to fetch pinned messages:', err));
      }
    } catch (err) {
      console.error('Pin message failed:', err);
    }
  }, [room_id, API_URL]);

  const reactToMessage = useCallback(async (messageId: number, reaction: string) => {
    const token = getToken();
    try {
      await fetch(`${API_URL}/api/messages/${messageId}/react`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reaction })
      });
    } catch (err) {
      console.error('React to message failed:', err);
    }
  }, [API_URL]);

  // --- Clear all messages (admin only) ---
  const clearMessages = useCallback(async () => {
    const token = getToken();
    try {
      const res = await fetch(`${API_URL}/api/rooms/${encodeURIComponent(room_id)}/messages`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setMessages([]);
      } else {
        alert('Failed to clear messages');
      }
    } catch (err) {
      console.error('Clear messages failed:', err);
      alert('Network error while clearing messages');
    }
  }, [room_id, API_URL]);

  // --- Dark mode ---
  useEffect(() => {
    const saved = localStorage.getItem('darkMode') === 'true'
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const initialDark = saved ? true : systemPrefersDark

    setDarkMode(initialDark)
    if (initialDark) document.documentElement.classList.add('dark')
    else document.documentElement.classList.remove('dark')
  }, [])

  const toggleDarkMode = useCallback(() => {
    setDarkMode(prev => {
      const newMode = !prev
      localStorage.setItem('darkMode', newMode.toString())
      if (newMode) document.documentElement.classList.add('dark')
      else document.documentElement.classList.remove('dark')
      return newMode
    })
  }, [])

  // --- Make admin function ---
  const makeAdmin = useCallback(async (target: string) => {
    const token = getToken();
    try {
      const base = API_URL.startsWith('http') ? API_URL : `${window.location.origin}${API_URL}`;
      const url = new URL(`${base}/api/rooms/${encodeURIComponent(room_id)}/make-admin`);
      url.searchParams.append('target', target);
      const res = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        alert(`${target} is now an admin`);
        setShowGroupInfo(false);
        setTimeout(() => setShowGroupInfo(true), 100);
      } else {
        alert('Failed to make admin');
      }
    } catch (err) {
      console.error('Make admin failed:', err);
      alert('Network error');
    }
  }, [room_id, API_URL]);

  // --- Initial membership verification ---
  useEffect(() => {
    if (!room_id || !username) return

    const checkMembership = async () => {
      try {
        // First, check if room exists
        const adminRes = await fetch(`${API_URL}/api/rooms/${encodeURIComponent(room_id)}/admin`).catch(err => {
          console.error('Room admin fetch failed:', err);
          throw err;
        });
        if (adminRes.status === 404) {
          // Room does not exist – user can create it (become first member)
          setIsMember(true)
          setConnectionFailed(false)
          setLoading(false)
          setVerifying(false)
          return
        }

        // Room exists – now check membership
        const membersRes = await fetch(`${API_URL}/api/rooms/${encodeURIComponent(room_id)}/members`).catch(err => {
          console.error('Members fetch failed:', err);
          throw err;
        });
        const data = await membersRes.json()
        const members = data.members || []
        const member = members.includes(username)
        setIsMember(member)
        setConnectionFailed(!member)
        setLoading(false)
      } catch (err) {
        console.error('Failed to verify membership:', err)
        setConnectionFailed(true)
        setLoading(false)
      } finally {
        setVerifying(false)
      }
    }

    checkMembership()
  }, [room_id, username, API_URL])

  // --- WebSocket connection (only if member) ---
  useEffect(() => {
    if (!room_id || !username || !isMember || verifying) return

    // Encode room_id and username for WebSocket URL
    const wsUrl = `${WS_URL}/ws/${encodeURIComponent(room_id)}/${encodeURIComponent(username)}`;
    const ws = new WebSocket(wsUrl)

    ws.onopen = () => {
      setConnectionFailed(false)
      setLoading(false)

      // Fetch messages
      fetch(`${API_URL}/api/messages?room_id=${encodeURIComponent(room_id)}&limit=50`)
        .then(res => res.json())
        .then(data => setMessages(data.messages))
        .catch(err => console.error('Failed to fetch messages:', err))

      // Fetch members
      fetch(`${API_URL}/api/rooms/${encodeURIComponent(room_id)}/members`)
        .then(res => res.json())
        .then(data => setUsers((data.members || []).map((name: string) => ({ username: name, online: true }))))
        .catch(err => console.error('Failed to fetch members:', err))

      // Check admin status
      const token = getToken();
      if (!token) {
        setIsAdmin(false)
        return
      }

      const base = API_URL.startsWith('http') ? API_URL : `${window.location.origin}${API_URL}`;
      const url = new URL(`${base}/api/rooms/${encodeURIComponent(room_id)}/pending-requests`);
      url.searchParams.append('admin', username);
      fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => {
          if (res.ok) {
            setIsAdmin(true)
            return
          }
          if (res.status === 403) {
            setIsAdmin(false)
            return
          }
          setIsAdmin(false)
        })
        .catch((err) => {
          console.warn('Admin capability check failed:', err)
          setIsAdmin(false)
        })
    }

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      switch (data.type) {
        case 'system':
          setMessages(prev => [...prev, { ...data, type: 'system' }])
          break
        case 'message':
          setMessages(prev => [...prev, data])
          // Add user to list if not present
          setUsers(prev => {
            if (!prev.find(u => u.username === data.username)) {
              return [...prev, { username: data.username, online: true }]
            }
            return prev
          })
          break
        case 'analysis':
          setCurrentAnalysis(data.analysis)
          setCurrentCoaching(data.coaching)
          break
        case 'typing':
          setUsers(prev => prev.map(u => u.username === data.username ? { ...u, typing: data.is_typing } : u))
          break
        case 'kicked':
          if (data.username === username) {
            alert('Kicked')
            router.push('/')
          }
          break
        case 'request_approved':
          if (data.username === username) {
            alert('Your request to join has been approved! Reloading...')
            window.location.reload()
          }
          break
        case 'request_rejected':
          if (data.username === username) {
            alert('Your join request was rejected.')
            router.push('/')
          }
          break
      }
    }

    ws.onclose = (e) => {
      if (e.reason === 'Not a member of this room' || e.code === 4003) {
        setConnectionFailed(true)
        setIsMember(false)
        setLoading(false)
      }
    }

    socketRef.current = ws
    return () => ws.close()
  }, [room_id, username, API_URL, WS_URL, router, isMember, verifying])

  // --- Fetch pinned messages ---
  useEffect(() => {
    if (!room_id) return
    fetch(`${API_URL}/api/rooms/${encodeURIComponent(room_id)}/pinned`)
      .then(res => res.json())
      .then(setPinnedMessages)
      .catch(err => console.error('Failed to fetch pinned messages:', err))
  }, [room_id, API_URL])

  // --- Handlers for sending, typing, joining, admin actions ---
  const sendMessage = useCallback((text: string, fileUrl?: string) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ message: text, file_url: fileUrl }))
    }
  }, [])

  const requestJoin = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/rooms/${encodeURIComponent(room_id)}/request-join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
      })
      if (res.ok) setRequestSent(true)
    } catch (err) {
      console.error('Request join failed:', err)
      alert('Network error while sending join request')
    }
  }, [room_id, username, API_URL])

  const approveRequest = useCallback(async (target: string) => {
    const token = getToken();
    try {
      const base = API_URL.startsWith('http') ? API_URL : `${window.location.origin}${API_URL}`;
      const url = new URL(`${base}/api/rooms/${encodeURIComponent(room_id)}/approve-request`);
      url.searchParams.append('admin', username);
      url.searchParams.append('username', target);
      await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      })
    } catch (err) {
      console.error('Approve request failed:', err)
    }
  }, [room_id, username, API_URL])

  const rejectRequest = useCallback(async (target: string) => {
    const token = getToken();
    try {
      const base = API_URL.startsWith('http') ? API_URL : `${window.location.origin}${API_URL}`;
      const url = new URL(`${base}/api/rooms/${encodeURIComponent(room_id)}/reject-request`);
      url.searchParams.append('admin', username);
      url.searchParams.append('username', target);
      await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      })
    } catch (err) {
      console.error('Reject request failed:', err)
    }
  }, [room_id, username, API_URL])

  const deleteMessage = useCallback(async (id: number) => {
    const token = getToken()
    try {
      const res = await fetch(`${API_URL}/api/messages/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        setMessages(prev => prev.filter(m => m.id !== id))
      }
    } catch (err) {
      console.error('Delete message failed:', err)
    }
  }, [API_URL])

  const leaveRoom = useCallback(() => {
    socketRef.current?.close();
    router.push('/')
  }, [router])

  const kickUser = useCallback((target: string) => {
    socketRef.current?.send(JSON.stringify({ type: 'kick', target }))
  }, [])

  const sendAnnouncement = useCallback(async () => {
    if (!announcement.trim()) return
    const token = getToken()
    try {
      await fetch(`${API_URL}/api/rooms/${encodeURIComponent(room_id)}/announcement`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: announcement })
      })
      setAnnouncement('')
    } catch (err) {
      console.error('Send announcement failed:', err)
    }
  }, [room_id, announcement, API_URL])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // --- Polling for membership when waiting for approval ---
  useEffect(() => {
    if (!connectionFailed || isMember || !requestSent) return

    const checkMembership = async () => {
      try {
        const res = await fetch(`${API_URL}/api/rooms/${encodeURIComponent(room_id)}/members`)
        const data = await res.json()
        if (data.members && data.members.includes(username)) {
          console.log('User is now a member! Reconnecting...')
          setIsMember(true)
          setConnectionFailed(false)
          // Close current socket to force reconnect (or it will auto-reconnect via effect)
          if (socketRef.current) {
            socketRef.current.close()
          }
        }
      } catch (err) {
        console.error('Error checking membership:', err)
      }
    }

    const interval = setInterval(checkMembership, 3000)
    return () => clearInterval(interval)
  }, [connectionFailed, isMember, requestSent, room_id, username, API_URL])

  // --- Loading state ---
  if (loading || verifying) return (
    <div className="h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-muted-foreground font-medium animate-pulse">INSTA-CHAT</p>
      </div>
    </div>
  )

  // --- Not a member (join request screen) ---
  if (connectionFailed && !isMember) {
    return (
      <div className="h-screen flex items-center justify-center bg-background p-4">
        <div className="bg-card border border-border p-10 rounded-[32px] shadow-2xl max-w-sm w-full text-center">
          <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-6 text-muted-foreground">
            <Info size={40} />
          </div>
          <h2 className="text-2xl font-bold mb-2 text-foreground">Private Group</h2>
          <p className="text-muted-foreground mb-8 text-sm">Aap is group ke member nahi hain. Pehle request bhejein.</p>
          {requestSent ? (
            <div className="text-primary font-bold py-3 bg-primary/10 rounded-2xl border border-primary/20 animate-pulse">✓ Request Pending...</div>
          ) : (
            <button onClick={requestJoin} className="w-full bg-primary text-primary-foreground py-4 rounded-2xl font-bold transition-all active:scale-95 shadow-lg shadow-primary/20">
              Request to Join
            </button>
          )}
        </div>
      </div>
    )
  }

  // --- Member view ---
  return (
    <div className="h-screen bg-background text-foreground flex overflow-hidden">
      
      {/* 1. Left Sidebar (User List) */}
      <aside className="w-[350px] hidden lg:flex flex-col border-r border-border bg-card">
        <div className="p-6 flex justify-between items-center">
          <h1 className="text-xl font-bold text-foreground">{username}</h1>
          <button onClick={toggleDarkMode} className="p-2 hover:bg-muted rounded-full transition">
            {darkMode ? <Sun size={20}/> : <Moon size={20}/>}
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-2">
          <UserList users={users} currentUser={username} />
        </div>
      </aside>

      {/* 2. Main Chat Area */}
      <main className="flex-1 flex flex-col bg-background relative">
        <header className="h-[75px] border-b border-border px-6 flex items-center justify-between bg-background/80 backdrop-blur-md z-20">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-500 via-pink-500 to-orange-500 p-[2px] cursor-pointer" onClick={() => setShowGroupInfo(true)}>
              <div className="w-full h-full bg-card rounded-full flex items-center justify-center border-2 border-background overflow-hidden">
                <span className="font-bold text-sm text-foreground">{room_id.charAt(0).toUpperCase()}</span>
              </div>
            </div>
            <div>
              <h1 className="font-bold text-md leading-tight cursor-pointer text-foreground" onClick={() => setShowGroupInfo(true)}>{room_id}</h1>
              <p className="text-[11px] text-green-500">Active now</p>
            </div>
          </div>
          <div className="flex items-center gap-5">
            <button onClick={() => setShowSearch(!showSearch)} className={`p-2 rounded-full transition-colors ${showSearch ? 'bg-muted text-primary' : 'hover:bg-muted'}`}>
              <Search size={22}/>
            </button>
            {/* 🔻 Share button ab sabhi members ke liye visible hai */}
            <button onClick={() => setShowInviteModal(true)} className="hover:text-muted-foreground">
              <Share2 size={24}/>
            </button>
            <button onClick={() => setShowGroupInfo(true)} className="hover:text-muted-foreground"><Info size={24}/></button>
          </div>
        </header>

        {/* Messages Window */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-2 flex flex-col custom-scrollbar">
          <div className="flex-1" /> {/* Spacer */}
          {messages.map((msg, i) => (
            <ChatMessage
              key={i}
              message={msg}
              currentUser={username}
              isAdmin={isAdmin}
              onUnsend={deleteMessage}
              onEdit={editMessage}
              onPin={pinMessage}
              onReact={reactToMessage}
            />
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Bottom Input – only if member */}
        {isMember && (
          <div className="p-4 bg-card border-t border-border">
            <MessageInput onSend={sendMessage} />
          </div>
        )}
      </main>

      {/* 3. Right Sidebar (Analysis & Admin) */}
      <aside className="w-[320px] hidden xl:flex flex-col border-l border-border bg-card p-4 space-y-6 overflow-y-auto custom-scrollbar">
        <AnalysisPanel analysis={currentAnalysis} coaching={currentCoaching} />
        <StatsPanel apiUrl={API_URL} />

        {isAdmin && (
          <>
            <div className="bg-primary/5 border border-primary/20 rounded-[24px] p-4">
              <h3 className="text-xs font-bold text-primary mb-4 tracking-widest uppercase">Member Requests</h3>
              <JoinRequestPanel
                roomId={room_id}
                isAdmin={isAdmin}
                adminUsername={username}
                currentUsername={username}
                onApprove={approveRequest}
                onReject={rejectRequest}
              />
            </div>

            <div className="bg-primary/5 border border-primary/20 rounded-[24px] p-4">
              <h4 className="text-xs font-bold text-primary mb-3 flex items-center gap-2"><Share2 size={14}/> BROADCAST</h4>
              <textarea 
                value={announcement}
                onChange={(e) => setAnnouncement(e.target.value)}
                placeholder="Global announcement..."
                className="w-full bg-transparent border-none focus:ring-0 text-sm p-0 mb-3 h-20 resize-none text-foreground"
              />
              <button onClick={sendAnnouncement} className="w-full bg-primary text-primary-foreground text-xs font-bold py-2 rounded-lg hover:bg-primary/90 transition">
                Post Update
              </button>
            </div>
          </>
        )}
      </aside>

      {/* Drawers and Modals */}
      <GroupInfoDrawer
        roomId={room_id}
        isOpen={showGroupInfo}
        onClose={() => setShowGroupInfo(false)}
        currentUsername={username}
        onKick={kickUser}
        onLeave={leaveRoom}
        onMakeAdmin={makeAdmin}
        onClearMessages={clearMessages}
      />

      {showPinned && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowPinned(false)} />
          <div className="relative w-full max-w-sm bg-card border-l border-border h-full shadow-2xl animate-in slide-in-from-right">
            <div className="p-6 border-b border-border flex justify-between items-center bg-muted">
              <h2 className="text-lg font-bold flex items-center gap-2 text-primary"><Pin size={20}/> Pinned</h2>
              <button onClick={() => setShowPinned(false)} className="p-2 hover:bg-muted rounded-full">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4"><PinnedMessagesList messages={pinnedMessages} /></div>
          </div>
        </div>
      )}

      {showInviteModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-md flex items-center justify-center p-4 z-[110]">
          <div className="bg-card border border-border rounded-3xl p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-2xl font-bold mb-2 text-foreground">Share Room</h3>
            <p className="text-muted-foreground mb-6 text-sm">Copy the link below to invite members.</p>
            <div className="flex gap-2 p-1.5 bg-muted rounded-xl border border-border">
              <input readOnly value={`${window.location.origin}/?room=${room_id}`} className="flex-1 bg-transparent px-3 text-sm outline-none text-foreground" />
              <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/?room=${room_id}`); alert('Link Copied!'); }} className="bg-primary text-primary-foreground px-4 py-2 rounded-lg font-bold text-sm hover:bg-primary/90">Copy</button>
            </div>
            <button onClick={() => setShowInviteModal(false)} className="mt-6 w-full py-3 text-muted-foreground hover:text-foreground transition font-medium">Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ChatRoomPage() {
  return <ProtectedRoute><ChatRoomContent /></ProtectedRoute>
}