import { useState } from 'react'

interface Analysis {
  toxicity: {
    score: number
    is_toxic: boolean
    categories: Record<string, number>
    top_categories: string[]
  }
  intent: {
    type: string
    confidence: number
    explanation: string
  }
  tone: {
    type: string
    confidence: number
    explanation: string
  }
}

interface Coaching {
  message: string | null
  suggested_rewrite: string | null
}

interface AnalysisPanelProps {
  analysis: Analysis | null
  coaching: Coaching | null
}

export default function AnalysisPanel({ analysis, coaching }: AnalysisPanelProps) {
  const [showRewrite, setShowRewrite] = useState(false)

  if (!analysis) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">
          📊 Message Analysis
        </h3>
        <p className="text-gray-500 text-sm">
          Send a message to see real-time AI analysis
        </p>
      </div>
    )
  }

  const getToxicityColor = (score: number) => {
    if (score > 0.7) return 'text-red-600'
    if (score > 0.5) return 'text-orange-600'
    if (score > 0.3) return 'text-yellow-600'
    return 'text-green-600'
  }

  const getToxicityLabel = (score: number) => {
    if (score > 0.7) return 'High Toxicity'
    if (score > 0.5) return 'Moderate'
    if (score > 0.3) return 'Slight Concern'
    return 'Clean'
  }

  const getIntentEmoji = (intent: string) => {
    const emojis: Record<string, string> = {
      question: '❓',
      complaint: '😤',
      insult: '😡',
      threat: '⚠️',
      positive: '😊',
      disagreement: '🤔',
      neutral: '😐'
    }
    return emojis[intent] || '💬'
  }

  const getToneEmoji = (tone: string) => {
    const emojis: Record<string, string> = {
      polite: '🤗',
      rude: '😠',
      aggressive: '🔥',
      'passive-aggressive': '😏',
      sarcastic: '🙄',
      neutral: '😐',
      frustrated: '😤'
    }
    return emojis[tone] || '💭'
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">
        📊 Message Analysis
      </h3>

      {/* Toxicity Score */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">Toxicity Score</span>
          <span className={`text-lg font-bold ${getToxicityColor(analysis.toxicity.score)}`}>
            {(analysis.toxicity.score * 100).toFixed(1)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all ${
              analysis.toxicity.score > 0.7
                ? 'bg-red-500'
                : analysis.toxicity.score > 0.5
                ? 'bg-orange-500'
                : analysis.toxicity.score > 0.3
                ? 'bg-yellow-500'
                : 'bg-green-500'
            }`}
            style={{ width: `${analysis.toxicity.score * 100}%` }}
          />
        </div>
        <p className="text-xs text-gray-600 mt-1">{getToxicityLabel(analysis.toxicity.score)}</p>
      </div>

      {/* Top Toxic Categories */}
      {analysis.toxicity.top_categories.length > 0 && (
        <div className="mb-4">
          <span className="text-sm font-medium text-gray-700 block mb-2">
            Detected Issues:
          </span>
          <div className="flex flex-wrap gap-2">
            {analysis.toxicity.top_categories.map((cat, idx) => (
              <span
                key={idx}
                className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full"
              >
                {cat}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Intent */}
      <div className="mb-4 p-3 bg-blue-50 rounded-lg">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium text-gray-700">
            {getIntentEmoji(analysis.intent.type)} Intent
          </span>
          <span className="text-xs text-gray-600">
            {(analysis.intent.confidence * 100).toFixed(0)}% confident
          </span>
        </div>
        <p className="text-sm font-semibold text-blue-900 capitalize">
          {analysis.intent.type}
        </p>
        <p className="text-xs text-gray-600 mt-1">{analysis.intent.explanation}</p>
      </div>

      {/* Tone */}
      <div className="mb-4 p-3 bg-purple-50 rounded-lg">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium text-gray-700">
            {getToneEmoji(analysis.tone.type)} Tone
          </span>
          <span className="text-xs text-gray-600">
            {(analysis.tone.confidence * 100).toFixed(0)}% confident
          </span>
        </div>
        <p className="text-sm font-semibold text-purple-900 capitalize">
          {analysis.tone.type}
        </p>
      </div>

      {/* Coaching */}
      {coaching?.message && (
        <div className="mt-4 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded">
          <h4 className="text-sm font-semibold text-yellow-900 mb-2">
            💡 Communication Coaching
          </h4>
          <p className="text-sm text-gray-700">{coaching.message}</p>
        </div>
      )}

      {/* Suggested Rewrite */}
      {coaching?.suggested_rewrite && (
        <div className="mt-4">
          <button
            onClick={() => setShowRewrite(!showRewrite)}
            className="w-full px-4 py-2 bg-green-100 hover:bg-green-200 text-green-800 font-semibold rounded-lg transition"
          >
            {showRewrite ? '🔼 Hide' : '✨ Show'} Polite Rewrite
          </button>
          {showRewrite && (
            <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-gray-800">{coaching.suggested_rewrite}</p>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(coaching.suggested_rewrite!)
                  alert('Copied to clipboard!')
                }}
                className="mt-2 text-xs text-green-700 hover:text-green-900"
              >
                📋 Copy to clipboard
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
} 