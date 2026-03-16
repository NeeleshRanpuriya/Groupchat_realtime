'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/context/AuthContext'
import ProtectedRoute from '@/app/components/ProtectedRoute'
import Avatar from '@/app/components/Avatar'

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

function ProfileContent() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [bio, setBio] = useState('')
  const [darkMode, setDarkMode] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

  // Dark mode
  useEffect(() => {
    const saved = localStorage.getItem('darkMode') === 'true'
    setDarkMode(saved)
    if (saved) document.documentElement.classList.add('dark')
    else document.documentElement.classList.remove('dark')
  }, [])

  const toggleDarkMode = () => {
    setDarkMode(!darkMode)
    localStorage.setItem('darkMode', (!darkMode).toString())
    document.documentElement.classList.toggle('dark')
  }

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
    <div className={`min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4`}>
      <div className="max-w-4xl mx-auto">
        {/* Header with back button */}
        <div className="flex justify-between items-center mb-6">
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
          >
            ← Back
          </button>
          <h1 className="text-2xl font-bold dark:text-white">My Profile</h1>
          <button
            onClick={toggleDarkMode}
            className="p-2 bg-gray-200 dark:bg-gray-700 rounded-lg text-xl"
          >
            {darkMode ? '☀️' : '🌙'}
          </button>
        </div>

        {/* Profile Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 mb-6">
          <div className="flex flex-col md:flex-row gap-8">
            {/* Avatar & Basic Info */}
            <div className="flex flex-col items-center md:w-1/3">
              <Avatar name={profile.username} size="lg" className="mb-4" />
              <h2 className="text-xl font-bold dark:text-white">{profile.username}</h2>
              <p className="text-gray-600 dark:text-gray-400 text-sm">{profile.email}</p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                Member since {new Date(profile.created_at).toLocaleDateString()}
              </p>
            </div>

            {/* Bio & Stats */}
            <div className="flex-1">
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2 dark:text-white">Bio</h3>
                {isEditing ? (
                  <div>
                    <textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      className="w-full p-3 border rounded-lg dark:bg-gray-700 dark:text-white"
                      rows={4}
                      placeholder="Tell something about yourself..."
                    />
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={handleUpdateBio}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setIsEditing(false)
                          setBio(profile.bio || '')
                        }}
                        className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-gray-700 dark:text-gray-300 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      {profile.bio || 'No bio yet.'}
                    </p>
                    <button
                      onClick={() => setIsEditing(true)}
                      className="mt-2 text-sm text-blue-600 hover:underline"
                    >
                      Edit bio
                    </button>
                  </div>
                )}
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{profile.message_count}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Messages</div>
                </div>
                <div className="bg-red-50 dark:bg-red-900/30 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400">{profile.toxic_message_count}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Toxic</div>
                </div>
                <div className="bg-green-50 dark:bg-green-900/30 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">{profile.rooms_joined}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Rooms</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Settings Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
          <h3 className="text-xl font-bold mb-4 dark:text-white">Account Settings</h3>
          
          <div className="space-y-4">
            <button
              onClick={logout}
              className="w-full px-4 py-3 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg text-left"
            >
              🚪 Logout
            </button>
            
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg text-left"
            >
              🗑️ Delete Account (Permanently)
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-4 dark:text-white">Delete Account?</h3>
            <p className="mb-6 text-gray-600 dark:text-gray-300">
              This action is permanent. All your messages will be deleted and you won't be able to recover your account.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
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