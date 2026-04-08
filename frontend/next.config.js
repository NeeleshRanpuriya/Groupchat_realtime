
/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === 'production'
const defaultApiUrl = isProd
  ? 'https://groupchat-realtime-backend.onrender.com'
  : 'http://localhost:8000'
const defaultWsUrl = isProd
  ? 'wss://groupchat-realtime-backend.onrender.com'
  : 'ws://localhost:8000'

const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || defaultApiUrl,
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL || defaultWsUrl,
  },
}

module.exports = nextConfig
