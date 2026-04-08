'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/app/context/AuthContext'
import { useState, useEffect, useCallback } from 'react'
import { Menu, X, Home, User, LogOut, LogIn, UserPlus, MessageSquare, Bell, Check, X as XIcon, Sun, Moon, RefreshCw } from 'lucide-react'

export default function Navbar() {
  const { user, logout } = useAuth()
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [darkMode, setDarkMode] = useState(false)
  const [pendingRequests, setPendingRequests] = useState<{ room: string; username: string }[]>([])
  const [showRequestsDropdown, setShowRequestsDropdown] = useState(false)
  const [loadingRequests, setLoadingRequests] = useState(false)
  const [requestsError, setRequestsError] = useState('')

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

  // Fetch pending requests
  const fetchPendingRequests = useCallback(async () => {
    if (!user) return
    setLoadingRequests(true)
    setRequestsError('')
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      const roomsRes = await fetch(`${API_URL}/api/user/rooms`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!roomsRes.ok) throw new Error(`Failed to fetch rooms: ${roomsRes.status}`)
      const roomsData = await roomsRes.json()
      const adminRooms = (roomsData.rooms || []).filter((r: any) => r.is_admin).map((r: any) => r.room)

      if (adminRooms.length === 0) {
        setPendingRequests([])
        return
      }

      const requests: { room: string; username: string }[] = []
      for (const room of adminRooms) {
        const res = await fetch(`${API_URL}/api/rooms/${room}/pending-requests?admin=${user.username}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (res.ok) {
          const data = await res.json()
          const pending = data.pending || []
          pending.forEach((username: string) => {
            requests.push({ room, username })
          })
        } else if (res.status === 403) {
          console.warn(`Not authorized to view requests for room ${room}`)
        } else {
          console.error(`Failed to fetch requests for room ${room}: ${res.status}`)
        }
      }
      setPendingRequests(requests)
    } catch (error) {
      console.error('Failed to fetch pending requests:', error)
      setRequestsError('Could not load requests')
    } finally {
      setLoadingRequests(false)
    }
  }, [user, API_URL])

  useEffect(() => {
    if (user) {
      fetchPendingRequests()
      const interval = setInterval(fetchPendingRequests, 10000) // every 10 seconds
      return () => clearInterval(interval)
    }
  }, [user, fetchPendingRequests])

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
        // Try to get error detail from backend
        let errorMsg = `HTTP ${res.status}`
        try {
          const errorData = await res.json()
          errorMsg = errorData.detail || errorMsg
        } catch {
          // ignore
        }
        alert(`❌ Approval failed: ${errorMsg}`)
        // Refresh the list to ensure it's up‑to‑date
        await fetchPendingRequests()
      }
    } catch (error) {
      alert('Network error approving request')
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
        let errorMsg = `HTTP ${res.status}`
        try {
          const errorData = await res.json()
          errorMsg = errorData.detail || errorMsg
        } catch {
          // ignore
        }
        alert(`❌ Rejection failed: ${errorMsg}`)
        await fetchPendingRequests()
      }
    } catch (error) {
      alert('Network error rejecting request')
    }
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

  // Scroll effect
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const navLinks = [
    { href: '/', label: 'Home', icon: Home, auth: null },
    { href: '/profile', label: 'Profile', icon: User, auth: true },
    { href: '/login', label: 'Login', icon: LogIn, auth: false },
    { href: '/register', label: 'Register', icon: UserPlus, auth: false },
  ]

  const filteredLinks = navLinks.filter(link => 
    link.auth === null || 
    (link.auth === true && user) || 
    (link.auth === false && !user)
  )

  return (
    <nav
      className={`sticky top-0 z-50 w-full transition-all duration-300 ${
        scrolled
          ? 'bg-card/80 backdrop-blur-md border-b border-border shadow-sm'
          : 'bg-card/60 backdrop-blur-sm border-b border-border'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo / Brand */}
          <Link
            href="/"
            className="flex items-center gap-2 text-xl font-bold text-foreground hover:text-primary transition-colors"
          >
            <MessageSquare className="w-6 h-6 text-primary" />
            <div className="flex flex-col justify-center">
              <span className="text-xl font-black tracking-tight text-gray-900 dark:text-white leading-none">
                REALTIME Chat<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">Mod</span>
              </span>
              <span className="text-[9px] font-bold text-gray-400 dark:text-gray-500 tracking-[0.2em] uppercase mt-0.5">
                AI moderation
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {filteredLinks.map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href
              return (
                <Link
                  key={href}
                  href={href}
                  className={`relative px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                    isActive
                      ? 'text-primary bg-primary/10 after:absolute after:bottom-0 after:left-3 after:right-3 after:h-0.5 after:bg-primary after:rounded-full'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </Link>
              )
            })}
            
            {/* Dark Mode Toggle */}
            <button
              onClick={toggleDarkMode}
              className="ml-2 p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition"
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Notification Bell */}
            {user && (
              <div className="relative ml-2" id="requests-dropdown">
                <button
                  onClick={() => setShowRequestsDropdown(!showRequestsDropdown)}
                  className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition focus:outline-none"
                >
                  <Bell className="w-4 h-4" />
                  {pendingRequests.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] flex items-center justify-center rounded-full">
                      {pendingRequests.length}
                    </span>
                  )}
                </button>
                {showRequestsDropdown && (
                  <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50">
                    <div className="p-3 border-b border-gray-100 dark:border-gray-700 font-semibold text-sm text-gray-700 dark:text-gray-200 flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <UserPlus size={16} /> Pending Join Requests
                      </span>
                      <button
                        onClick={fetchPendingRequests}
                        className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                        title="Refresh"
                      >
                        <RefreshCw className={`w-4 h-4 ${loadingRequests ? 'animate-spin' : ''}`} />
                      </button>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {loadingRequests ? (
                        <div className="p-4 text-center text-gray-500">Loading...</div>
                      ) : requestsError ? (
                        <div className="p-4 text-center text-red-500 text-sm">{requestsError}</div>
                      ) : pendingRequests.length === 0 ? (
                        <div className="p-4 text-center text-gray-500 text-sm">No pending requests</div>
                      ) : (
                        <div className="p-2 space-y-2">
                          {pendingRequests.map((req, idx) => (
                            <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                              <div className="text-sm">
                                <span className="font-medium">{req.username}</span> wants to join <span className="font-medium">#{req.room}</span>
                              </div>
                              <div className="flex gap-1">
                                <button
                                  onClick={() => handleApprove(req.room, req.username)}
                                  className="p-1 bg-green-500 hover:bg-green-600 text-white rounded"
                                  title="Approve"
                                >
                                  <Check className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => handleReject(req.room, req.username)}
                                  className="p-1 bg-red-500 hover:bg-red-600 text-white rounded"
                                  title="Reject"
                                >
                                  <XIcon className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {user && (
              <button
                onClick={logout}
                className="ml-2 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            aria-label="Toggle menu"
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div
        className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${
          isOpen ? 'max-h-96 border-t border-border' : 'max-h-0'
        }`}
      >
        <div className="px-4 py-2 space-y-1 bg-card/95 backdrop-blur-sm">
          {filteredLinks.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'text-primary bg-primary/10'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                <Icon className="w-5 h-5" />
                {label}
              </Link>
            )
          })}
          <button
            onClick={toggleDarkMode}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
          >
            {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            {darkMode ? 'Light Mode' : 'Dark Mode'}
          </button>
          {user && (
            <>
              <div className="px-4 py-2">
                <div className="text-sm font-medium text-muted-foreground mb-2">Pending Requests: {pendingRequests.length}</div>
                {pendingRequests.slice(0, 3).map((req, idx) => (
                  <div key={idx} className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                    {req.username} wants to join #{req.room}
                  </div>
                ))}
                {pendingRequests.length > 3 && (
                  <div className="text-xs text-gray-500 mt-1">And {pendingRequests.length - 3} more...</div>
                )}
              </div>
              <button
                onClick={() => {
                  logout()
                  setIsOpen(false)
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
              >
                <LogOut className="w-5 h-5" />
                Logout
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}