import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/app/context/AuthContext'
import Navbar from '@/app/components/Navbar'
import FooterWrapper from '@/app/components/FooterWrapper'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'ChatMod AI',
  description: 'AI-powered real‑time chat moderation',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} flex flex-col min-h-screen`}>
        <AuthProvider>
          <Navbar />
          <main className="flex-grow">{children}</main>
          <FooterWrapper />
        </AuthProvider>
      </body>
    </html>
  )
}