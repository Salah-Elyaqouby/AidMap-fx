'use client'

import { useEffect, useState } from 'react'
import { MapLibrePreview } from '@/app/components/maps/MapPreviewContent'

type MapPlace = {
  id: string
  name: string
  type: 'shelter' | 'hospital' | 'water' | 'food'
  lng: number
  lat: number
  operator: string
  capacity: number
  occupancy: number
  availableBeds: number
  statusText: string
}

function toSafeNumber(value: unknown, fallback = 0): number {
  if (value === null || value === undefined || value === '') return fallback
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function normalizePlace(item: any): MapPlace | null {
  const lat = toSafeNumber(item?.lat, NaN)
  const lng = toSafeNumber(item?.lng, NaN)

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null
  }

  return {
    id: String(item?.id ?? crypto.randomUUID()),
    name: String(item?.name ?? 'بدون اسم'),
    type:
      item?.type === 'hospital'
        ? 'hospital'
        : item?.type === 'water'
          ? 'water'
          : item?.type === 'food'
            ? 'food'
            : 'shelter',
    lat,
    lng,
    operator: String(item?.operator ?? ''),
    capacity: toSafeNumber(item?.capacity, 0),
    occupancy: toSafeNumber(item?.occupancy, 0),
    availableBeds: toSafeNumber(item?.availableBeds, 0),
    statusText: String(item?.statusText ?? ''),
  }
}

export default function ProjectMapPreviewPage() {
  const [places, setPlaces] = useState<MapPlace[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadPlaces = async () => {
      try {
        setLoading(true)
        setError('')

        const res = await fetch('/api/project/places', {
          cache: 'no-store',
        })

        const data = await res.json()

        if (!res.ok) {
          throw new Error(data?.message || 'فشل في جلب الأماكن')
        }

        const rawPlaces = Array.isArray(data?.data) ? data.data : []

        const normalizedPlaces = rawPlaces
          .map(normalizePlace)
          .filter(Boolean) as MapPlace[]

        setPlaces(normalizedPlaces)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'حدث خطأ')
        setPlaces([])
      } finally {
        setLoading(false)
      }
    }

    loadPlaces()
  }, [])

  
  if (loading) {
    return <div className="p-6">جاري تحميل الخريطة...</div>
  }

  if (error) {
    return <div className="p-6 text-red-600">{error}</div>
  }

  if (!places.length) {
    return <div className="p-6 text-amber-600">لا توجد أماكن لعرضها على الخريطة</div>
  }

  return (
    <div className="p-6">
      <MapLibrePreview
        height={700}
        adminPlaces={places}
        osmEnabled={false}
      />
    </div>
  )
}