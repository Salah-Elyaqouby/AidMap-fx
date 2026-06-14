import { NextRequest, NextResponse } from 'next/server'

type RouterEngine = 'graphhopper' | 'osrm' | 'valhalla'
type UiProfile = 'walking' | 'cycling' | 'driving'

const OSRM_BASE = process.env.OSRM_BASE_URL || 'https://router.project-osrm.org'
const GRAPHOPPER_API_KEY = process.env.GRAPHHOPPER_API_KEY || ''
const VALHALLA_BASE = process.env.VALHALLA_BASE_URL || ''

function parseNum(value: string | null) {
  const n = Number(value)
  return Number.isFinite(n) ? n : NaN
}

function decodePolyline5(str: string): [number, number][] {
  let index = 0
  let lat = 0
  let lng = 0
  const coordinates: [number, number][] = []

  while (index < str.length) {
    let shift = 0
    let result = 0
    let byte = 0

    do {
      byte = str.charCodeAt(index++) - 63
      result |= (byte & 0x1f) << shift
      shift += 5
    } while (byte >= 0x20)

    const dlat = result & 1 ? ~(result >> 1) : result >> 1
    lat += dlat

    shift = 0
    result = 0

    do {
      byte = str.charCodeAt(index++) - 63
      result |= (byte & 0x1f) << shift
      shift += 5
    } while (byte >= 0x20)

    const dlng = result & 1 ? ~(result >> 1) : result >> 1
    lng += dlng

    coordinates.push([lng / 1e5, lat / 1e5])
  }

  return coordinates
}

function decodePolyline6(str: string): [number, number][] {
  let index = 0
  let lat = 0
  let lng = 0
  const coordinates: [number, number][] = []

  while (index < str.length) {
    let shift = 0
    let result = 0
    let byte = 0

    do {
      byte = str.charCodeAt(index++) - 63
      result |= (byte & 0x1f) << shift
      shift += 5
    } while (byte >= 0x20)

    const dlat = result & 1 ? ~(result >> 1) : result >> 1
    lat += dlat

    shift = 0
    result = 0

    do {
      byte = str.charCodeAt(index++) - 63
      result |= (byte & 0x1f) << shift
      shift += 5
    } while (byte >= 0x20)

    const dlng = result & 1 ? ~(result >> 1) : result >> 1
    lng += dlng

    coordinates.push([lng / 1e6, lat / 1e6])
  }

  return coordinates
}

function toGeoJsonLine(coords: [number, number][]) {
  return {
    type: 'LineString',
    coordinates: coords,
  }
}
function mapProfileForOsrm(profile: UiProfile) {
  if (profile === 'walking') return 'foot'
  if (profile === 'cycling') return 'bike'
  return 'driving'
}
function mapProfileForGraphhopper(profile: UiProfile) {
  if (profile === 'walking') return 'foot'
  if (profile === 'cycling') return 'bike'
  return 'car'
}

function mapProfileForValhalla(profile: UiProfile) {
  if (profile === 'walking') return 'pedestrian'
  if (profile === 'cycling') return 'bicycle'
  return 'auto'
}

async function routeWithOsrm(
  fromLng: number,
  fromLat: number,
  toLng: number,
  toLat: number,
  profile: UiProfile
) {
  const osrmProfile = mapProfileForOsrm(profile)

  const url =
    `${OSRM_BASE}/route/v1/${osrmProfile}/` +
    `${fromLng},${fromLat};${toLng},${toLat}` +
    `?overview=full&geometries=geojson&steps=false`

  const res = await fetch(url, { cache: 'no-store' })
  const data = await res.json()

  if (!res.ok || !data?.routes?.length) {
    throw new Error(data?.message || 'OSRM route failed')
  }

  const route = data.routes[0]

  return {
    geometry: route.geometry,
    distanceKm: Number(route.distance || 0) / 1000,
    durationMin: Number(route.duration || 0) / 60,
  }
}

async function routeWithGraphhopper(
  fromLng: number,
  fromLat: number,
  toLng: number,
  toLat: number,
  profile: UiProfile
) {
  if (!GRAPHOPPER_API_KEY) {
    throw new Error('GraphHopper API key is missing')
  }

  const ghProfile = mapProfileForGraphhopper(profile)

  const url =
    `https://graphhopper.com/api/1/route?` +
    `point=${fromLat},${fromLng}` +
    `&point=${toLat},${toLng}` +
    `&profile=${ghProfile}` +
    `&points_encoded=true` +
    `&locale=ar` +
    `&key=${GRAPHOPPER_API_KEY}`

  const res = await fetch(url, { cache: 'no-store' })
  const data = await res.json()

  if (!res.ok || !data?.paths?.length) {
    throw new Error(data?.message || 'GraphHopper route failed')
  }

  const path = data.paths[0]
  const coords = decodePolyline5(path.points)

  return {
    geometry: toGeoJsonLine(coords),
    distanceKm: Number(path.distance || 0) / 1000,
    durationMin: Number(path.time || 0) / 1000 / 60,
  }
}

async function routeWithValhalla(
  fromLng: number,
  fromLat: number,
  toLng: number,
  toLat: number,
  profile: UiProfile
) {
  if (!VALHALLA_BASE) {
    throw new Error('Valhalla base URL is missing')
  }

  const costing = mapProfileForValhalla(profile)

  const res = await fetch(`${VALHALLA_BASE}/route`, {
    method: 'POST',
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      locations: [
        { lon: fromLng, lat: fromLat },
        { lon: toLng, lat: toLat },
      ],
      costing,
      directions_options: { language: 'ar' },
      shape_format: 'geojson',
    }),
  })

  const data = await res.json()

  if (!res.ok || !data?.trip?.legs?.length) {
    throw new Error(data?.error || 'Valhalla route failed')
  }

  const leg = data.trip.legs[0]
  const summary = leg.summary || {}

  let geometry = leg.shape

  if (typeof geometry === 'string') {
    geometry = toGeoJsonLine(decodePolyline6(geometry))
  }

  return {
    geometry,
    distanceKm: Number(summary.length ?? 0),
    durationMin: Number(summary.time ?? 0) / 60,
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)

    const service = (searchParams.get('service') || 'osrm') as RouterEngine
    const profile = (searchParams.get('profile') || 'walking') as UiProfile

    const fromLng = parseNum(searchParams.get('fromLng'))
    const fromLat = parseNum(searchParams.get('fromLat'))
    const toLng = parseNum(searchParams.get('toLng'))
    const toLat = parseNum(searchParams.get('toLat'))

    if (
      !Number.isFinite(fromLng) ||
      !Number.isFinite(fromLat) ||
      !Number.isFinite(toLng) ||
      !Number.isFinite(toLat)
    ) {
      return NextResponse.json({ message: 'Invalid coordinates' }, { status: 400 })
    }

    let result

    if (service === 'graphhopper') {
      result = await routeWithGraphhopper(fromLng, fromLat, toLng, toLat, profile)
    } else if (service === 'valhalla') {
      result = await routeWithValhalla(fromLng, fromLat, toLng, toLat, profile)
    } else {
      result = await routeWithOsrm(fromLng, fromLat, toLng, toLat, profile)
    }

    if (
      !result?.geometry ||
      !Number.isFinite(result?.distanceKm) ||
      !Number.isFinite(result?.durationMin)
    ) {
      return NextResponse.json({ message: 'Invalid route response' }, { status: 500 })
    }

    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || 'Route request failed' },
      { status: 500 }
    )
  }
}