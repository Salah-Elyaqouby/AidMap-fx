import { NextRequest, NextResponse } from 'next/server'
import { clientIp, rateLimit } from '@/lib/api/rate-limit'

export async function GET(req: NextRequest) {
  const ip = clientIp(req)
  const rl = rateLimit(`geocode:${ip}`, 40, 60_000)
  if (!rl.ok) {
    return NextResponse.json(
      { items: [] },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } },
    )
  }

  const { searchParams } = new URL(req.url)
  const q = (searchParams.get('q') ?? '').trim()
  if (!q || q.length < 2) return NextResponse.json({ items: [] })

  const url =
    `https://nominatim.openstreetmap.org/search?format=json&limit=6&addressdetails=1` +
    `&accept-language=ar,en&q=${encodeURIComponent(q)}`

  const res = await fetch(url, {
    headers: { 'User-Agent': 'AidMap/1.0 (contact: demo@example.com)' },
  })

  if (!res.ok) return NextResponse.json({ items: [] })
  const data = (await res.json()) as any[]

  return NextResponse.json({
    items: data.map((x) => ({
      label: x.display_name,
      lat: Number(x.lat),
      lng: Number(x.lon),
    })),
  })
}