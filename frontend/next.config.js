
/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === 'production'
const backendOrigin = process.env.BACKEND_ORIGIN || 'https://groupchatrealtime-y26cbnltf4peoc4u3uibjo.streamlit.app'
const defaultApiUrl = isProd
  ? '/backend'
  : 'http://localhost:8000'
const defaultWsUrl = isProd
  ? 'wss://groupchatrealtime-y26cbnltf4peoc4u3uibjo.streamlit.app'
  : 'ws://localhost:8000'

const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/backend/:path*',
        destination: `${backendOrigin}/:path*`,
      },
    ]
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || defaultApiUrl,
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL || defaultWsUrl,
  },
}

module.exports = nextConfig
