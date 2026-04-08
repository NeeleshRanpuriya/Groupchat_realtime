'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/app/context/AuthContext'
import { MessageCircle, RotateCw, PlusCircle, Search, MoreVertical, Sun, Moon } from 'lucide-react'

function HomeContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user } = useAuth()
  const [userRooms, setUserRooms] = useState<any[]>([])
  const [loadingRooms, setLoadingRooms] = useState(false)
  const [pendingRequests, setPendingRequests] = useState<{ room: string; username: string }[]>([])
  const [loadingRequests, setLoadingRequests] = useState(false)
  const [showRequestsDropdown, setShowRequestsDropdown] = useState(false)
  const [roomId, setRoomId] = useState('')
  const [popularRooms] = useState(['general', 'gaming', 'tech', 'music'])
  const [darkMode, setDarkMode] = useState(false)

  const API_URL = process.env.NEXT_PUBLIC_API_URL || '/backend'

  // Initialize dark mode
  useEffect(() => {
    const saved = localStorage.getItem('darkMode') === 'true'
    setDarkMode(saved)
    if (saved) document.documentElement.classList.add('dark')
    else document.documentElement.classList.remove('dark')
  }, [])

  const toggleDarkMode = () => {
    const newMode = !darkMode
    setDarkMode(newMode)
    localStorage.setItem('darkMode', newMode.toString())
    if (newMode) document.documentElement.classList.add('dark')
    else document.documentElement.classList.remove('dark')
  }

  // Handle room parameter
  const roomParam = searchParams.get('room')
  useEffect(() => {
    if (roomParam) {
      if (user) {
        router.push(`/chat/${encodeURIComponent(roomParam)}?user=${encodeURIComponent(user.username)}`)
      } else {
        localStorage.setItem('pendingRoom', roomParam)
      }
    }
  }, [roomParam, user, router])

  useEffect(() => {
    if (user) {
      const pending = localStorage.getItem('pendingRoom')
      if (pending) {
        localStorage.removeItem('pendingRoom')
        router.push(`/chat/${encodeURIComponent(pending)}?user=${encodeURIComponent(user.username)}`)
      }
    }
  }, [user, router])

  // Fetch user's rooms
  const fetchUserRooms = async () => {
    setLoadingRooms(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${API_URL}/api/user/rooms`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setUserRooms(data.rooms)
        await fetchPendingRequests(data.rooms)
      }
    } catch (error) {
      console.error('Failed to fetch rooms:', error)
    } finally {
      setLoadingRooms(false)
    }
  }

  // Fetch pending requests
  const fetchPendingRequests = async (rooms: any[]) => {
    const adminRooms = rooms.filter((r: any) => r.is_admin).map((r: any) => r.room)
    if (adminRooms.length === 0) {
      setPendingRequests([])
      return
    }

    setLoadingRequests(true)
    const token = localStorage.getItem('token')
    const requests: { room: string; username: string }[] = []

    try {
      for (const room of adminRooms) {
        const res = await fetch(`${API_URL}/api/rooms/${room}/pending-requests?admin=${user?.username}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (res.ok) {
          const data = await res.json()
          const pending = data.pending || []
          pending.forEach((username: string) => {
            requests.push({ room, username })
          })
        }
      }
      setPendingRequests(requests)
    } catch (error) {
      console.error('Failed to fetch pending requests:', error)
    } finally {
      setLoadingRequests(false)
    }
  }

  const handleApprove = async (room: string, username: string) => {
    const token = localStorage.getItem('token')
    try {
      const res = await fetch(`${API_URL}/api/rooms/${room}/approve-request?admin=${user?.username}&username=${username}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        setPendingRequests(prev => prev.filter(r => !(r.room === room && r.username === username)))
      } else {
        alert('Failed to approve request')
      }
    } catch (error) {
      alert('Error approving request')
    }
  }

  const handleReject = async (room: string, username: string) => {
    const token = localStorage.getItem('token')
    try {
      const res = await fetch(`${API_URL}/api/rooms/${room}/reject-request?admin=${user?.username}&username=${username}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        setPendingRequests(prev => prev.filter(r => !(r.room === room && r.username === username)))
      } else {
        alert('Failed to reject request')
      }
    } catch (error) {
      alert('Error rejecting request')
    }
  }

  useEffect(() => {
    if (user) fetchUserRooms()
  }, [user])

  const connect = () => {
    if (!roomId.trim()) return alert('Please enter a room ID')
    router.push(`/chat/${encodeURIComponent(roomId)}?user=${encodeURIComponent(user!.username)}`)
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (showRequestsDropdown && !(e.target as Element).closest('#requests-dropdown')) {
        setShowRequestsDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showRequestsDropdown])

  if (!user) {
    return (
      <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-950 dark:to-gray-900 min-h-screen">
        {/* Hero Section (same as before) */}
        <section className="pt-24 pb-16 px-4 text-center">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
              ChatMod AI
            </h1>
            <p className="text-xl md:text-2xl text-gray-700 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
              Real‑time chat with AI‑powered moderation – automatically detect toxicity, analyze tone, and keep conversations healthy.
            </p>
            {roomParam && (
              <p className="text-indigo-600 dark:text-indigo-400 mb-4">
                You were invited to room <strong>#{roomParam}</strong>. Please log in or register to join.
              </p>
            )}
            <div className="flex flex-wrap justify-center gap-4 mb-12">
              <button
                onClick={() => router.push('/login')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl text-lg font-semibold transition shadow-lg shadow-blue-500/20"
              >
                Login
              </button>
              <button
                onClick={() => router.push('/register')}
                className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 rounded-xl text-lg font-semibold transition shadow-lg shadow-purple-500/20"
              >
                Create Account
              </button>
            </div>
          </div>
        </section>

        {/* Features Grid (unchanged) */}
        <section className="py-16 px-4 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12 text-gray-800 dark:text-gray-200">
              Why Choose ChatMod AI?
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700">
                <div className="text-blue-600 dark:text-blue-400 text-4xl mb-4">🤖</div>
                <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-gray-100">AI Moderation</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Automatically detect toxic language, spam, and harassment in real time.
                </p>
              </div>
              <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700">
                <div className="text-purple-600 dark:text-purple-400 text-4xl mb-4">⚡</div>
                <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-gray-100">Real‑time Chat</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Instant messaging with low latency – perfect for communities, gaming, and teams.
                </p>
              </div>
              <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700">
                <div className="text-pink-600 dark:text-pink-400 text-4xl mb-4">🔒</div>
                <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-gray-100">Safe & Private</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Your conversations are encrypted. We only analyse messages for moderation.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    )
  }

  // Logged‑in user view
  return (
    <div className="flex h-screen w-full overflow-hidden bg-white dark:bg-gray-950">
      
      {/* LEFT SIDEBAR – Chats List */}
      <div className="w-[30%] min-w-[320px] max-w-[450px] border-r border-gray-200 dark:border-gray-800 flex flex-col h-full bg-gray-50 dark:bg-gray-900">
        
        {/* Sidebar Header with Notification Bell */}
     <div className="h-[60px] flex items-center justify-between px-4 border-b border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-800">
  <h2 className="text-xl font-bold text-gray-800 dark:text-white">Chats</h2>
  <div className="flex gap-4 text-gray-500">
    <button onClick={fetchUserRooms} title="Refresh">
      <RotateCw className={loadingRooms ? 'animate-spin' : ''} />
    </button>
    {/* <button onClick={toggleDarkMode} title="Toggle theme">
      {darkMode ? <Sun className="text-yellow-500" /> : <Moon className="text-gray-700" />}
    </button> */}
    <PlusCircle className="cursor-pointer" />
    <MoreVertical className="cursor-pointer" />
  </div>
</div>

        {/* Search Bar */}
        <div className="p-2 border-b border-gray-100 dark:border-gray-800">
          <div className="relative flex items-center bg-white dark:bg-gray-800 rounded-lg px-3 py-2 shadow-sm">
            <Search className="text-gray-400 mr-3" />
            <input 
              type="text" 
              placeholder="Search or start a new chat" 
              className="bg-transparent border-none outline-none w-full text-sm text-gray-700 dark:text-gray-200"
            />
          </div>
        </div>

        {/* Scrollable Chat List */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-gray-300">
          {loadingRooms ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : userRooms.length === 0 ? (
            <div className="text-center mt-10 text-gray-400 text-sm">No chats found. Join a room!</div>
          ) : (
            userRooms.map((item) => (
              <div 
                key={item.room}
                onClick={() => router.push(`/chat/${encodeURIComponent(item.room)}?user=${encodeURIComponent(user.username)}`)}
                className="flex items-center p-3 hover:bg-gray-200 dark:hover:bg-gray-800 cursor-pointer border-b border-gray-100 dark:border-gray-800 transition-colors"
              >
                <div className="w-12 h-12 rounded-full bg-indigo-500 flex flex-shrink-0 items-center justify-center text-white font-bold text-lg mr-4">
                  {item.room[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-gray-800 dark:text-gray-100 truncate">#{item.room}</span>
                    <span className="text-[11px] text-gray-400 flex-shrink-0">Just now</span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {item.is_admin ? "You are an admin" : "Click to join conversation"}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* RIGHT MAIN AREA (unchanged) */}
      <div className="flex-1 flex flex-col bg-gray-100 dark:bg-gray-950 items-center justify-center p-6 text-center relative">
        <div className="max-w-md">
          <div className="w-20 h-20 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <MessageCircle size={40} className="text-indigo-600 dark:text-indigo-400" />
          </div>
          <h1 className="text-3xl font-light text-gray-700 dark:text-gray-200 mb-4">ChatMod AI</h1>
          <p className="text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
            Select a chat from the left or create a new room to start moderating conversations in real-time.
          </p>
          <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800">
            <input
              type="text"
              placeholder="Enter Room ID"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && connect()}
              className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl mb-4 focus:ring-2 focus:ring-indigo-500 outline-none bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white"
            />
            <button
              onClick={connect}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl transition-all active:scale-[0.98]"
            >
              Start Chatting
            </button>
          </div>
        </div>
        <div className="absolute bottom-6 text-xs text-gray-400 flex items-center gap-2">
          Encryption Active • AI Safety Enabled
        </div>
      </div>
    </div>
  )
}

export default function Home() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center">Loading Application...</div>}>
      <HomeContent />
    </Suspense>
  )
}