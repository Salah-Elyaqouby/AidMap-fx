'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

type PlaceType = 'hospital' | 'shelter' | 'water' | 'food' | 'school'

type MapPlace = {
  id: string
  name: string
  type: PlaceType
  lng: number
  lat: number
  operator: string
  statusText: string
  capacity: number
  occupancy: number
}

const TYPE_META: Record<PlaceType, { label: string; color: string; emoji: string }> = {
  hospital: { label: 'مستشفى',        color: '#dc2626', emoji: '🏥' },
  shelter:  { label: 'مركز إيواء',    color: '#16a34a', emoji: '🏠' },
  water:    { label: 'نقطة ماء',      color: '#2563eb', emoji: '💧' },
  food:     { label: 'دعم غذائي',     color: '#f59e0b', emoji: '🍞' },
  school:   { label: 'مدرسة',         color: '#7c3aed', emoji: '🏫' },
}

const ALL_TYPES = Object.keys(TYPE_META) as PlaceType[]

export default function MapPreviewPage() {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef       = useRef<maplibregl.Map | null>(null)
  const markersRef   = useRef<maplibregl.Marker[]>([])

  const [allPlaces, setAllPlaces] = useState<MapPlace[]>([])
  const [loading, setLoading]     = useState(true)
  const [searchQ, setSearchQ]     = useState('')
  const [activeTypes, setActiveTypes] = useState<Set<PlaceType>>(new Set(ALL_TYPES))

  // Init map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: 'https://tiles.openfreemap.org/styles/positron',
      center: [34.47, 31.5],
      zoom: 10,
    })
    map.addControl(new maplibregl.NavigationControl(), 'top-right')
    map.on('load', () => map.resize())
    mapRef.current = map
    return () => { map.remove(); mapRef.current = null }
  }, [])

  // Fetch all data
  useEffect(() => {
    fetch('/api/project/places', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => {
        const raw: any[] = Array.isArray(d?.data) ? d.data : []
        const valid = raw
          .map(p => ({
            id:        String(p.id),
            name:      String(p.name ?? ''),
            type:      (ALL_TYPES.includes(p.type) ? p.type : 'shelter') as PlaceType,
            lat:       Number(p.lat),
            lng:       Number(p.lng),
            operator:  String(p.operator ?? ''),
            statusText: String(p.statusText ?? ''),
            capacity:  Number(p.capacity ?? 0),
            occupancy: Number(p.occupancy ?? 0),
          }))
          .filter(p => Number.isFinite(p.lat) && Number.isFinite(p.lng) && p.lat !== 0 && p.lng !== 0)
        setAllPlaces(valid)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // Filtered list based on search + type toggles
  const visible = useMemo(() => {
    const q = searchQ.trim().toLowerCase()
    return allPlaces.filter(p => {
      if (!activeTypes.has(p.type)) return false
      if (q && !p.name.toLowerCase().includes(q) && !p.operator.toLowerCase().includes(q) && !p.statusText.toLowerCase().includes(q)) return false
      return true
    })
  }, [allPlaces, activeTypes, searchQ])

  // Gaza bounding box — only fit bounds if markers are within this region
  const GAZA_BOUNDS = { minLat: 31.2, maxLat: 31.75, minLng: 34.2, maxLng: 34.65 }
  const inGaza = (p: MapPlace) =>
    p.lat >= GAZA_BOUNDS.minLat && p.lat <= GAZA_BOUNDS.maxLat &&
    p.lng >= GAZA_BOUNDS.minLng && p.lng <= GAZA_BOUNDS.maxLng

  // Re-render markers when visible changes
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    markersRef.current.forEach(m => m.remove())
    markersRef.current = []

    if (!visible.length) return

    visible.forEach(p => {
      const meta = TYPE_META[p.type]

      const el = document.createElement('div')
      el.title = p.name
      el.style.cssText = `
        width:30px; height:30px; border-radius:50% 50% 50% 0;
        background:${meta.color}; border:2.5px solid #fff;
        box-shadow:0 3px 10px rgba(0,0,0,.35);
        transform:rotate(-45deg); cursor:pointer;
        transition: transform .15s;
      `
      el.onmouseenter = () => { el.style.transform = 'rotate(-45deg) scale(1.25)' }
      el.onmouseleave = () => { el.style.transform = 'rotate(-45deg) scale(1)' }

      const popup = new maplibregl.Popup({ offset: 18, maxWidth: '280px', closeButton: true })
        .setHTML(`
          <div style="font-family:Arial,sans-serif;direction:rtl;padding:6px 0;min-width:200px">
            <div style="font-size:16px;font-weight:800;color:#111;margin-bottom:6px;line-height:1.3">${p.name}</div>
            <span style="display:inline-block;padding:3px 10px;border-radius:999px;font-size:11px;font-weight:700;background:${meta.color}20;color:${meta.color};margin-bottom:8px">
              ${meta.emoji} ${meta.label}
            </span>
            ${p.operator ? `<div style="font-size:12px;color:#555;margin-bottom:3px">📍 ${p.operator}</div>` : ''}
            ${p.statusText ? `<div style="font-size:12px;color:#555;margin-bottom:3px">ℹ️ ${p.statusText}</div>` : ''}
            ${p.capacity > 0 ? `
              <div style="margin-top:8px;padding:8px;background:#f8fafc;border-radius:8px;font-size:12px">
                <div style="display:flex;justify-content:space-between;margin-bottom:3px">
                  <span style="color:#64748b">الطاقة الكلية</span><strong>${p.capacity}</strong>
                </div>
                <div style="display:flex;justify-content:space-between">
                  <span style="color:#64748b">الحالي</span><strong>${p.occupancy}</strong>
                </div>
                <div style="margin-top:6px;height:6px;background:#e2e8f0;border-radius:3px;overflow:hidden">
                  <div style="height:100%;width:${Math.min(100, p.capacity > 0 ? Math.round(p.occupancy/p.capacity*100) : 0)}%;background:${meta.color};border-radius:3px"></div>
                </div>
              </div>
            ` : ''}
            <div style="margin-top:6px;font-size:10px;color:#94a3b8">${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}</div>
          </div>
        `)

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([p.lng, p.lat])
        .setPopup(popup)
        .addTo(map)

      markersRef.current.push(marker)
    })

    // Only fit bounds to markers that are inside Gaza — ignore stray test coordinates
    const gazaMarkers = visible.filter(inGaza)
    try {
      if (gazaMarkers.length > 0) {
        const bounds = new maplibregl.LngLatBounds()
        gazaMarkers.forEach(p => bounds.extend([p.lng, p.lat]))
        map.fitBounds(bounds, { padding: 80, maxZoom: 14, duration: 800 })
      }
      // else: keep the default Gaza center set at map init
    } catch {}
  }, [visible])

  const toggleType = (t: PlaceType) => {
    setActiveTypes(prev => {
      const next = new Set(prev)
      if (next.has(t)) { next.delete(t) } else { next.add(t) }
      return next
    })
  }

  const counts = useMemo(() => {
    const c: Partial<Record<PlaceType, number>> = {}
    for (const t of ALL_TYPES) c[t] = allPlaces.filter(p => p.type === t).length
    return c
  }, [allPlaces])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '16px 20px' }} dir="rtl">

      {/* Title */}
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: '#0f172a', margin: 0 }}>خريطة الأماكن</h1>
        <p style={{ fontSize: 13, color: '#64748b', margin: '3px 0 0' }}>
          {loading ? 'جاري التحميل...' : `${allPlaces.length} موقع مسجل • ${visible.length} ظاهر`}
        </p>
      </div>

      {/* Controls row */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>

        {/* Search */}
        <div style={{ position: 'relative', minWidth: 220, flex: 1, maxWidth: 360 }}>
          <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: 16 }}>🔍</span>
          <input
            value={searchQ}
            onChange={e => setSearchQ(e.target.value)}
            placeholder="ابحث بالاسم أو المنطقة..."
            style={{
              width: '100%', height: 40, paddingRight: 36, paddingLeft: 12,
              border: '2px solid #e2e8f0', borderRadius: 10, fontSize: 13,
              outline: 'none', background: '#fff', boxSizing: 'border-box',
            }}
            onFocus={e => { e.currentTarget.style.borderColor = '#3b82f6' }}
            onBlur={e => { e.currentTarget.style.borderColor = '#e2e8f0' }}
          />
          {searchQ && (
            <button onClick={() => setSearchQ('')} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 16, padding: 0 }}>✕</button>
          )}
        </div>

        {/* Type filter buttons */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {ALL_TYPES.map(t => {
            const meta = TYPE_META[t]
            const active = activeTypes.has(t)
            const cnt = counts[t] ?? 0
            return (
              <button
                key={t}
                onClick={() => toggleType(t)}
                style={{
                  padding: '6px 12px', borderRadius: 999, border: '2px solid',
                  borderColor: active ? meta.color : '#e2e8f0',
                  background: active ? meta.color : '#fff',
                  color: active ? '#fff' : '#475569',
                  fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  opacity: cnt === 0 ? 0.4 : 1,
                  transition: 'all .15s',
                }}
              >
                {meta.emoji} {meta.label}
                {cnt > 0 && <span style={{ marginRight: 4, opacity: 0.85 }}>({cnt})</span>}
              </button>
            )
          })}

          {/* Select all / clear */}
          <button
            onClick={() => setActiveTypes(activeTypes.size === ALL_TYPES.length ? new Set() : new Set(ALL_TYPES))}
            style={{ padding: '6px 12px', borderRadius: 999, border: '2px solid #e2e8f0', background: '#f8fafc', color: '#475569', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
          >
            {activeTypes.size === ALL_TYPES.length ? 'إخفاء الكل' : 'إظهار الكل'}
          </button>
        </div>
      </div>

      {/* No data warning */}
      {!loading && allPlaces.length === 0 && (
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e', padding: '10px 14px', borderRadius: 10, fontSize: 13 }}>
          ⚠️ لا توجد أماكن بإحداثيات صحيحة. أضف إحداثيات (latitude / longitude) للمستشفيات والمدارس والمخيمات.
        </div>
      )}

      {!loading && allPlaces.length > 0 && visible.length === 0 && (
        <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', color: '#0369a1', padding: '10px 14px', borderRadius: 10, fontSize: 13 }}>
          لا توجد نتائج مطابقة للبحث أو الفلتر الحالي.
        </div>
      )}

      {/* Map */}
      <div
        ref={containerRef}
        style={{
          width: '100%', height: 640, borderRadius: 16,
          overflow: 'hidden', border: '1px solid #e2e8f0',
          boxShadow: '0 4px 24px rgba(0,0,0,.09)',
        }}
      />

      {/* Legend at bottom */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
        {ALL_TYPES.map(t => (
          <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#475569' }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: TYPE_META[t].color, flexShrink: 0 }} />
            {TYPE_META[t].label}
            {(counts[t] ?? 0) > 0 && <span style={{ color: '#94a3b8' }}>({counts[t]})</span>}
          </div>
        ))}
      </div>
    </div>
  )
}
