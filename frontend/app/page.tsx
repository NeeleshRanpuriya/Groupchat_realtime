'use client'

import { Suspense } from 'react'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/app/context/AuthContext'

// Separate component that uses useSearchParams (must be wrapped in Suspense)
function HomeContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user } = useAuth()

  const roomParam = searchParams.get('room') || ''
  const [roomId, setRoomId] = useState(roomParam || 'general')
  const [popularRooms] = useState(['general', 'gaming', 'tech', 'music'])

  useEffect(() => {
    if (user && roomParam) {
      router.push(`/chat/${encodeURIComponent(roomParam)}?user=${encodeURIComponent(user.username)}`)
    }
  }, [user, roomParam, router])

  const connect = () => {
    if (!roomId.trim()) {
      alert('Please enter a room ID')
      return
    }
    router.push(`/chat/${encodeURIComponent(roomId)}?user=${encodeURIComponent(user!.username)}`)
  }

  // Logged-out view
  if (!user) {
    return (
      <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-950 dark:to-gray-900">
        {/* Hero Section */}
        <section className="pt-24 pb-16 px-4 text-center">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
              ChatMod AI
            </h1>
            <p className="text-xl md:text-2xl text-gray-700 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
              Real‑time chat with AI‑powered moderation – automatically detect toxicity, analyze tone, and keep conversations healthy.
            </p>
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

        {/* Features Grid */}
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

  // Logged-in user view
  return (
    <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-950 dark:to-gray-900">
      <div className="max-w-4xl mx-auto py-16 px-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-200 dark:border-gray-700">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent mb-2">
              Welcome back, {user.username}!
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Join a room to start chatting with AI moderation.
            </p>
          </div>

          {/* Room input */}
          <div className="max-w-md mx-auto">
            <input
              type="text"
              placeholder="Room ID (e.g., general, gaming, tech)"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && connect()}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl mb-4 focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
            />
            <button
              onClick={connect}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-xl transition duration-200"
            >
              Connect
            </button>
          </div>

          {/* Popular rooms */}
          <div className="mt-8">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3 text-center">
              Popular Rooms
            </h3>
            <div className="flex flex-wrap justify-center gap-3">
              {popularRooms.map((room) => (
                <button
                  key={room}
                  onClick={() => {
                    setRoomId(room)
                    router.push(`/chat/${encodeURIComponent(room)}?user=${encodeURIComponent(user.username)}`)
                  }}
                  className="px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full hover:bg-blue-200 dark:hover:bg-blue-800/50 transition"
                >
                  #{room}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
            <p>Rooms are created on the fly – just type any name and start chatting!</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// Main export with Suspense boundary
export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <HomeContent />
    </Suspense>
  )
}