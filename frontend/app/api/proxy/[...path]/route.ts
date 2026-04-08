import { NextRequest } from 'next/server'

const BACKEND_ORIGIN = process.env.BACKEND_ORIGIN || 'https://groupchatrealtime-xqyvkfhbupicrstda7x4gh.streamlit.app'

function buildTargetUrl(path: string[], req: NextRequest): string {
  const cleanOrigin = BACKEND_ORIGIN.replace(/\/$/, '')
  const cleanPath = path.join('/')
  const query = req.nextUrl.search
  return `${cleanOrigin}/${cleanPath}${query}`
}

async function proxy(req: NextRequest, params: { path: string[] }) {
  if (!params.path?.length) {
    return new Response('Missing proxy path', { status: 400 })
  }

  const targetUrl = buildTargetUrl(params.path, req)
  const headers = new Headers(req.headers)
  headers.delete('host')
  headers.delete('content-length')

  const hasBody = !['GET', 'HEAD'].includes(req.method)
  const body = hasBody ? await req.text() : undefined

  const upstream = await fetch(targetUrl, {
    method: req.method,
    headers,
    body,
    redirect: 'follow',
  })

  return new Response(upstream.body, {
    status: upstream.status,
    headers: upstream.headers,
  })
}

export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxy(req, params)
}

export async function POST(req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxy(req, params)
}

export async function PUT(req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxy(req, params)
}

export async function PATCH(req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxy(req, params)
}

export async function DELETE(req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxy(req, params)
}

export async function OPTIONS(req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxy(req, params)
}
