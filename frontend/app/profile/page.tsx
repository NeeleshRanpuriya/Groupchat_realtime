'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/context/AuthContext'
import ProtectedRoute from '@/app/components/ProtectedRoute'
import Avatar from '@/app/components/Avatar'
import { FiRefreshCw, FiMessageSquare, FiTrash2, FiLogOut, FiUser, FiMail, FiCalendar } from 'react-icons/fi'
import { HiOutlineLogout } from 'react-icons/hi'

interface UserProfile {
  id: number
  username: string
  email: string
  bio: string | null
  is_active: boolean
  created_at: string
  message_count: number
  toxic_message_count: number
  rooms_joined: number
}

interface UserRoom {
  room: string
  is_admin: boolean
}

function ProfileContent() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [rooms, setRooms] = useState<UserRoom[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingRooms, setLoadingRooms] = useState(false)
  const [error, setError] = useState('')
  const [roomsError, setRoomsError] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [bio, setBio] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const API_URL = process.env.NODE_ENV === 'production'
    ? '/backend'
    : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000')

  // Initialize dark mode from localStorage (without toggle)
  useEffect(() => {
    const saved = localStorage.getItem('darkMode') === 'true'
    if (saved) document.documentElement.classList.add('dark')
    else document.documentElement.classList.remove('dark')
  }, [])

  // Fetch profile
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/login')
      return
    }

    fetch(`${API_URL}/api/user/profile`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to load profile')
        return res.json()
      })
      .then(data => {
        setProfile(data)
        setBio(data.bio || '')
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }, [API_URL, router])

  // Fetch user's rooms
  const fetchUserRooms = async () => {
    setLoadingRooms(true)
    setRoomsError('')
    const token = localStorage.getItem('token')
    try {
      const res = await fetch(`${API_URL}/api/user/rooms`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setRooms(data.rooms || [])
    } catch (err) {
      console.error('Failed to fetch rooms:', err)
      setRoomsError('Could not load your groups')
    } finally {
      setLoadingRooms(false)
    }
  }

  useEffect(() => {
    fetchUserRooms()
  }, [])

  const handleUpdateBio = async () => {
    const token = localStorage.getItem('token')
    try {
      const res = await fetch(`${API_URL}/api/user/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ bio })
      })
      if (res.ok) {
        setProfile(prev => prev ? { ...prev, bio } : prev)
        setIsEditing(false)
      } else {
        alert('Failed to update bio')
      }
    } catch (err) {
      alert('Error updating bio')
    }
  }

  const handleDeleteAccount = async () => {
    const token = localStorage.getItem('token')
    try {
      const res = await fetch(`${API_URL}/api/user/account`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        logout()
        router.push('/')
      } else {
        alert('Failed to delete account')
      }
    } catch (err) {
      alert('Error deleting account')
    }
  }

  const leaveRoom = async (room: string) => {
    const token = localStorage.getItem('token')
    try {
      const res = await fetch(`${API_URL}/api/rooms/${room}/leave`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        setRooms(prev => prev.filter(r => r.room !== room))
      } else {
        alert('Failed to leave room')
      }
    } catch (err) {
      alert('Error leaving room')
    }
  }

  const deleteRoom = async (room: string) => {
    if (!confirm(`Delete group #${room} permanently? This action cannot be undone.`)) return
    const token = localStorage.getItem('token')
    try {
      const res = await fetch(`${API_URL}/api/rooms/${room}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        setRooms(prev => prev.filter(r => r.room !== room))
      } else {
        alert('Failed to delete group')
      }
    } catch (err) {
      alert('Error deleting group')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-xl">Loading profile...</p>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-xl text-red-500">{error || 'Profile not found'}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4 md:p-6">
      <div className="max-w-5xl mx-auto">
        {/* Simple header with back button */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition text-gray-700 dark:text-gray-300 flex items-center gap-2 border border-gray-200 dark:border-gray-700"
          >
            ← Back
          </button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Profile</h1>
        </div>

        {/* Profile Card – modern glassmorphism */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-3xl shadow-xl p-6 md:p-8 mb-6 border border-gray-200/50 dark:border-gray-700/50">
          <div className="flex flex-col md:flex-row gap-8">
            {/* Left column – avatar and basic info */}
            <div className="flex flex-col items-center md:w-1/3">
              <Avatar name={profile.username} size="lg" className="mb-4 ring-4 ring-indigo-100 dark:ring-indigo-900/30" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{profile.username}</h2>
              <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400 text-sm mt-1">
                <FiMail className="w-3 h-3" />
                <span>{profile.email}</span>
              </div>
              <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400 text-xs mt-2">
                <FiCalendar className="w-3 h-3" />
                <span>Member since {new Date(profile.created_at).toLocaleDateString()}</span>
              </div>
            </div>

            {/* Right column – bio and stats */}
            <div className="flex-1">
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white flex items-center gap-2">
                  <FiUser className="text-indigo-500" /> Bio
                </h3>
                {isEditing ? (
                  <div className="space-y-3">
                    <textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      className="w-full p-3 border border-gray-200 dark:border-gray-700 rounded-xl dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                      rows={4}
                      placeholder="Tell something about yourself..."
                    />
                    <div className="flex gap-3">
                      <button
                        onClick={handleUpdateBio}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition shadow-md"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setIsEditing(false)
                          setBio(profile.bio || '')
                        }}
                        className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-gray-700 dark:text-gray-300 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-700">
                      {profile.bio || 'No bio yet. Click edit to add one.'}
                    </p>
                    <button
                      onClick={() => setIsEditing(true)}
                      className="mt-2 text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      Edit bio
                    </button>
                  </div>
                )}
              </div>

              {/* Stats Grid */}
              <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">Activity</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-4 rounded-xl text-center border border-blue-200 dark:border-blue-800/30">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{profile.message_count}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Messages</div>
                </div>
                <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 p-4 rounded-xl text-center border border-red-200 dark:border-red-800/30">
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400">{profile.toxic_message_count}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Toxic</div>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 p-4 rounded-xl text-center border border-green-200 dark:border-green-800/30">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">{profile.rooms_joined}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Rooms</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Your Groups Card */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-3xl shadow-xl p-6 mb-6 border border-gray-200/50 dark:border-gray-700/50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <FiMessageSquare className="text-indigo-500" /> Your Groups
            </h3>
            <button
              onClick={fetchUserRooms}
              className="p-2 text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition"
              title="Refresh"
            >
              <FiRefreshCw className={`w-5 h-5 ${loadingRooms ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {loadingRooms ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : roomsError ? (
            <p className="text-red-500 text-sm text-center py-4">{roomsError}</p>
          ) : rooms.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <FiMessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No groups yet</p>
              <p className="text-sm mt-1">Join a room to start chatting!</p>
            </div>
          ) : (
            <ul className="space-y-2 max-h-80 overflow-y-auto pr-1 scrollbar-thin">
              {rooms.map((item) => (
                <li key={item.room} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition border border-gray-200 dark:border-gray-700 group">
                  <button
                    onClick={() => router.push(`/chat/${encodeURIComponent(item.room)}?user=${encodeURIComponent(profile.username)}`)}
                    className="flex-1 text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold shadow-md">
                        {item.room[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900 dark:text-white">#{item.room}</span>
                          {item.is_admin && (
                            <span className="text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 px-2 py-0.5 rounded-full">
                              admin
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Click to open</p>
                      </div>
                    </div>
                  </button>
                  <div className="flex gap-2 opacity-70 group-hover:opacity-100 transition">
                    {/* Leave group button */}
                    <button
                      onClick={() => {
                        if (confirm(`Leave group #${item.room}?`)) leaveRoom(item.room);
                      }}
                      className="p-2 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition"
                      title="Leave group"
                    >
                      <HiOutlineLogout size={18} />
                    </button>
                    {/* Delete group button (admin only) */}
                    {item.is_admin && (
                      <button
                        onClick={() => deleteRoom(item.room)}
                        className="p-2 text-gray-500 hover:text-red-700 dark:text-gray-400 dark:hover:text-red-500 transition"
                        title="Delete group permanently"
                      >
                        <FiTrash2 size={18} />
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Settings Card */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-3xl shadow-xl p-6 border border-gray-200/50 dark:border-gray-700/50">
          <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Account Settings</h3>
          <div className="space-y-3">
            <button
              onClick={logout}
              className="w-full flex items-center gap-3 px-4 py-3 bg-yellow-500 hover:bg-yellow-600 text-white rounded-xl transition shadow-md"
            >
              <FiLogOut className="w-5 h-5" />
              <span>Logout</span>
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full flex items-center gap-3 px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl transition shadow-md"
            >
              <FiTrash2 className="w-5 h-5" />
              <span>Delete Account (Permanently)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full p-6 animate-fadeIn">
            <h3 className="text-xl font-bold mb-4 dark:text-white">Delete Account?</h3>
            <p className="mb-6 text-gray-600 dark:text-gray-300">
              This action is permanent. All your messages will be deleted and you won't be able to recover your account.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <ProfileContent />
    </ProtectedRoute>
  )
}