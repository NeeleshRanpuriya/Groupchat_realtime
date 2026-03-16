'use client'

import { usePathname } from 'next/navigation'
import Footer from './Footer'

export default function FooterWrapper() {
  const pathname = usePathname()
  // Hide footer on chat pages (paths starting with /chat/)
  const isChatPage = pathname?.startsWith('/chat/') ?? false

  if (isChatPage) return null

  return <Footer />
}