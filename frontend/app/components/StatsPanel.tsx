'use client'

import { useState, useEffect } from 'react'
import axios from 'axios'

interface Stats {
  total_messages: number
  toxic_messages: number
  clean_messages: number
  toxicity_rate: number
  intents: Record<string, number>
  tones: Record<string, number>
  active_connections: number
}

interface StatsPanelProps {
  apiUrl: string
}

export default function StatsPanel({ apiUrl }: StatsPanelProps) {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = async () => {
    setError(null)
    try {
      const response = await axios.get(`${apiUrl}/api/stats`)
      setStats(response.data)
    } catch (err) {
      setError('Failed to load statistics')
      console.error('Stats fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
    const interval = setInterval(fetchStats, 5000)
    return () => clearInterval(interval)
  }, [apiUrl])

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-2xl p-4">
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
          📈 Statistics
        </h3>
        <p className="text-muted-foreground text-sm animate-pulse">Loading...</p>
      </div>
    )
  }

  if (error || !stats) {
    return (
      <div className="bg-card border border-border rounded-2xl p-4 text-center">
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
          📈 Statistics
        </h3>
        <p className="text-muted-foreground text-sm mb-3">
          {error || 'No data available'}
        </p>
        <button
          onClick={fetchStats}
          className="px-4 py-2 bg-primary text-primary-foreground text-xs font-medium rounded-lg hover:bg-primary/90 transition"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-4 space-y-4">
      <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
        📈 Statistics
      </h3>

      {/* Active Users */}
      <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Active Users</span>
          <span className="text-xl font-bold text-green-500">
            {stats.active_connections}
          </span>
        </div>
      </div>

      {/* Total Messages */}
      <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Total Messages</span>
          <span className="text-xl font-bold text-blue-500">
            {stats.total_messages}
          </span>
        </div>
      </div>

      {/* Toxicity Rate */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Toxicity Rate</span>
          <span className="text-sm font-bold text-destructive">
            {stats.toxicity_rate.toFixed(1)}%
          </span>
        </div>
        <div className="flex gap-3 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            <span className="text-muted-foreground">Clean: {stats.clean_messages}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-red-500 rounded"></div>
            <span className="text-muted-foreground">Toxic: {stats.toxic_messages}</span>
          </div>
        </div>
      </div>

      {/* Intent Breakdown */}
      {Object.keys(stats.intents).length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-foreground">Top Intents</h4>
          <div className="space-y-1">
            {Object.entries(stats.intents)
              .sort(([, a], [, b]) => (b as number) - (a as number))
              .slice(0, 5)
              .map(([intent, count]) => (
                <div key={intent} className="flex justify-between text-xs">
                  <span className="capitalize text-muted-foreground">{intent}</span>
                  <span className="font-medium text-foreground">{count}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Tone Breakdown */}
      {Object.keys(stats.tones).length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-foreground">Top Tones</h4>
          <div className="space-y-1">
            {Object.entries(stats.tones)
              .sort(([, a], [, b]) => (b as number) - (a as number))
              .slice(0, 5)
              .map(([tone, count]) => (
                <div key={tone} className="flex justify-between text-xs">
                  <span className="capitalize text-muted-foreground">{tone}</span>
                  <span className="font-medium text-foreground">{count}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground/60 text-center pt-2 border-t border-border">
        Updates every 5 seconds
      </p>
    </div>
  )
}