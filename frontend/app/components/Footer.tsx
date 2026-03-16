'use client'

export default function Footer() {
  return (
    <footer className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 py-6 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center text-gray-600 dark:text-gray-400 text-sm">
          <p>© {new Date().getFullYear()} ChatMod AI. All rights reserved.</p>
          <p className="mt-2">
            Built with FastAPI, Next.js, and ❤️ for real‑time moderation.
          </p>
        </div>
      </div>
    </footer>
  )
}