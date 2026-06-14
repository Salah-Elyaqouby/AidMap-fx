'use client'

import 'maplibre-gl/dist/maplibre-gl.css'
import { useEffect, useMemo, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'

import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';

import {
  Dialog,
  DialogContent,
} from '../../../components/ui/dialog';
import { toast } from "sonner";
export type Place = {
  id: string
  name: string
  type?: string
  lng: number
  lat: number
}

export type AdminPlace = {
  id: string
  name: string
  type: 'shelter' | 'hospital' | 'water' | 'food'
  lng: number
  lat: number
  operator?: string
  capacity?: number | null
  occupancy?: number | null
  availableBeds?: number | null
  statusText?: string
}

type Props = {
  lng?: number
  lat?: number
  zoom?: number
  height?: number
  places?: Place[]
  adminPlaces?: AdminPlace[]

  osmEnabled?: boolean
  osmAmenities?: Array<
    'hospital' | 'clinic' | 'school' | 'pharmacy' | 'doctors' | 'drinking_water'
  >

  osmCategories?: {
    shelters?: boolean
    medical?: boolean
    aid?: boolean
    food?: boolean
  }
}

type HandlerItem = {
  type: 'click' | 'mouseenter' | 'mouseleave'
  layerId: string
  handler: (e?: any) => void
}

type RouterEngine = 'graphhopper' | 'osrm' | 'valhalla'
type UserLocation = { lng: number; lat: number }

type ShelterItem = {
  id: string
  name: string
  operator: string
  amenity: string
  kind: 'school' | 'unrwa_school'
  lng: number
  lat: number
  capacity?: number | null
  occupancy?: number | null
  availableBeds?: number | null
  statusText?: string
  isAvailable: boolean
}

type LayerFilter = 'all' | 'shelters' | 'medical' | 'aid' | 'food' | 'none'

type SelectedPlaceCard = {
  id: string
  name: string
  kind?: string
  amenity?: string
  operator?: string
  lng: number
  lat: number
  statusText?: string
  distanceText?: string
  durationText?: string
  loading?: boolean
  error?: string
  warning?: string
}

type UnifiedSearchItem = {
  id: string
  name: string
  kind: 'school' | 'unrwa_school' | 'medical' | 'water' | 'food'
  amenity?: string
  operator?: string
  lng: number
  lat: number
  statusText?: string
  isAvailable?: boolean
  source: 'osm' | 'admin'
}

const DEFAULT_OSM_CATEGORIES = {
  shelters: true,
  medical: true,
  aid: true,
  food: true,
} as const

declare global {
  interface Window {
    __maplibreRTLInitialized?: boolean
  }
}

class IconButtonControl implements maplibregl.IControl {
  private _map?: maplibregl.Map
  private _container?: HTMLDivElement
  private _btn?: HTMLButtonElement

  constructor(
    private opts: {
      title: string
      icon: string
      onClick: () => void
      active?: () => boolean
    }
  ) {}

  onAdd(map: maplibregl.Map) {
    this._map = map

    const container = document.createElement('div')
    container.className = 'maplibregl-ctrl maplibregl-ctrl-group'
    container.style.display = 'flex'
    container.style.flexDirection = 'column'
    container.style.alignItems = 'stretch'

    const btn = document.createElement('button')
    btn.type = 'button'
    btn.title = this.opts.title
    btn.setAttribute('aria-label', this.opts.title)
    btn.style.width = '32px'
    btn.style.height = '32px'
    btn.style.display = 'flex'
    btn.style.alignItems = 'center'
    btn.style.justifyContent = 'center'
    btn.innerHTML = this.opts.icon

    btn.onclick = (e) => {
      e.preventDefault()
      this.opts.onClick()
      window.setTimeout(() => this.syncActive(), 0)
    }

    container.appendChild(btn)
    this._container = container
    this._btn = btn

    this.syncActive()
    return container
  }

  onRemove() {
    if (this._container?.parentNode) {
      this._container.parentNode.removeChild(this._container)
    }
    this._map = undefined
  }

  syncActive() {
    if (!this._btn) return
    const isActive = this.opts.active?.() ?? false
    this._btn.style.background = isActive ? '#e5e7eb' : ''
  }
}

const LAYERS_ICON = `
<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
  <path d="M12 3 3 8l9 5 9-5-9-5Z" stroke="#111827" stroke-width="2" stroke-linejoin="round"/>
  <path d="M3 12l9 5 9-5" stroke="#111827" stroke-width="2" stroke-linejoin="round"/>
  <path d="M3 16l9 5 9-5" stroke="#111827" stroke-width="2" stroke-linejoin="round"/>
</svg>
`

const QUERY_ICON = `
<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
  <circle cx="12" cy="12" r="9" stroke="#111827" stroke-width="2"/>
  <path d="M9.6 9.6A2.6 2.6 0 0 1 12 8.3c1.4 0 2.6 1 2.6 2.3 0 1.2-.8 1.8-1.6 2.2-.9.5-1.6 1-1.6 2.2v.3"
        stroke="#111827" stroke-width="2" stroke-linecap="round"/>
  <circle cx="12" cy="17.7" r="1" fill="#111827"/>
</svg>
`

export function MapLibrePreview({
  lng = 34.4667,
  lat = 31.5,
  zoom = 10,
  height = 600,
  places = [],
  adminPlaces = [],
  osmEnabled = false,
  osmAmenities = ['hospital', 'clinic', 'school', 'pharmacy', 'doctors', 'drinking_water'],
  osmCategories = DEFAULT_OSM_CATEGORIES,
}: Props) {
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)

  const mapRef = useRef<maplibregl.Map | null>(null)
  const markersRef = useRef<maplibregl.Marker[]>([])
  const osmHandlersRef = useRef<HandlerItem[]>([])
  const adminHandlersRef = useRef<HandlerItem[]>([])

  const layersControlRef = useRef<IconButtonControl | null>(null)
  const queryControlRef = useRef<IconButtonControl | null>(null)
  const lastRouteKeyRef = useRef('')

  const [layersOpen, setLayersOpen] = useState(false)
  const [queryMode, setQueryMode] = useState(false)

  const [selectedLayerFilter, setSelectedLayerFilter] = useState<LayerFilter>('all')

  const [profile, setProfile] = useState<'driving' | 'walking' | 'cycling'>('walking')
  const [routerEngine, setRouterEngine] = useState<RouterEngine>('osrm')

  const [topSearch, setTopSearch] = useState('')
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null)
  const [shelters, setShelters] = useState<ShelterItem[]>([])
  const [searchNotice, setSearchNotice] = useState('')
  const [selectedPlace, setSelectedPlace] = useState<SelectedPlaceCard | null>(null)
  const [osmSearchItems, setOsmSearchItems] = useState<UnifiedSearchItem[]>([])
  const [searchResults, setSearchResults] = useState<UnifiedSearchItem[]>([])
  const [isSearching, setIsSearching] = useState(false)

  const layerCats = useMemo(() => {
    switch (selectedLayerFilter) {
      case 'all':
        return { shelters: true, medical: true, aid: true, food: true }
      case 'shelters':
        return { shelters: true, medical: false, aid: false, food: false }
      case 'medical':
        return { shelters: false, medical: true, aid: false, food: false }
      case 'aid':
        return { shelters: false, medical: false, aid: true, food: false }
      case 'food':
        return { shelters: false, medical: false, aid: false, food: true }
      case 'none':
        return { shelters: false, medical: false, aid: false, food: false }
      default:
        return osmCategories ?? DEFAULT_OSM_CATEGORIES
    }
  }, [selectedLayerFilter, osmCategories])

  const OSM_LAYERS = [
    'osm-clusters',
    'osm-cluster-count',
    'osm-schools-layer',
    'osm-schools-labels',
    'osm-unrwa-schools-layer',
    'osm-unrwa-schools-labels',
    'osm-medical-layer',
    'osm-medical-labels',
    'osm-water-layer',
    'osm-water-labels',
    'osm-food-layer',
    'osm-food-labels',
  ] as const

  const ADMIN_LAYERS = [
    'admin-shelters-layer',
    'admin-shelters-labels',
    'admin-unrwa-shelters-layer',
    'admin-unrwa-shelters-labels',
    'admin-medical-layer',
    'admin-medical-labels',
    'admin-water-layer',
    'admin-water-labels',
    'admin-food-layer',
    'admin-food-labels',
  ] as const

  const amenityToArabic = (a: string) => {
    switch (a) {
      case 'school':
        return 'مدرسة'
      case 'hospital':
        return 'مستشفى'
      case 'clinic':
        return 'عيادة'
      case 'pharmacy':
        return 'صيدلية'
      case 'doctors':
        return 'أطباء'
      case 'drinking_water':
        return 'نقطة ماء'
      case 'community_centre':
        return 'مركز مجتمعي'
      case 'social_centre':
        return 'مركز دعم'
      case 'marketplace':
        return 'سوق'
      default:
        return a
    }
  }

  const kindToArabic = (kind?: string) => {
    switch (kind) {
      case 'school':
        return 'مركز إيواء'
      case 'unrwa_school':
        return 'مركز إيواء - وكالة'
      case 'medical':
        return 'خدمة طبية'
      case 'water':
        return 'نقطة توزيع ماء'
      case 'food':
        return 'مركز دعم / توزيع'
      default:
        return 'موقع'
    }
  }

  const defaultStatusByKind = (kind?: string) => {
    switch (kind) {
      case 'school':
      case'unrwa_school':
        return 'مركز إيواء'
      case 'medical':
        return 'خدمة طبية'
      case 'water':
        return 'نقطة توزيع ماء'
      case 'food':
        return 'مركز دعم / توزيع'
      default:
        return 'موقع'
    }
  }

  const looksMojibake = (s: string) => /Ã.|Â|Ø.|Ù./.test(s)

  const fixUtf8FromLatin1 = (s: string) => {
    try {
      const bytes = Uint8Array.from(s, (c) => c.charCodeAt(0))
      return new TextDecoder('utf-8', { fatal: false }).decode(bytes)
    } catch {
      return s
    }
  }

  const cleanText = (v: any) => {
    const t = (v ?? '').toString().trim()
    if (!t) return ''
    let out = t
    if (looksMojibake(out)) out = fixUtf8FromLatin1(out)
    if (looksMojibake(out)) out = fixUtf8FromLatin1(out)
    return out.replace(/\uFFFD/g, '').trim()
  }

  const normalizeArabic = (value: string) => {
    return cleanText(value)
      .toLowerCase()
      .replace(/[أإآ]/g, 'ا')
      .replace(/ة/g, 'ه')
      .replace(/ى/g, 'ي')
      .replace(/ؤ/g, 'و')
      .replace(/ئ/g, 'ي')
      .replace(/\u0640/g, '')
      .replace(/[\u064B-\u065F]/g, '')
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  }

  const formatDistanceKm = (km: number) => {
    if (!Number.isFinite(km)) return '—'
    if (km >= 1) return `${km.toFixed(1)} كم`
    return `${Math.round(km * 1000)} م`
  }

  const formatDurationMin = (minutes: number) => {
    if (!Number.isFinite(minutes)) return '—'
    const total = Math.max(0, Math.round(minutes))
    const h = Math.floor(total / 60)
    const m = total % 60
    if (h > 0) return `${h} س ${m} د`
    return `${m} د`
  }

  const getAdjustedDurationMin = (
    durationMin: number,
    mode: 'walking' | 'cycling' | 'driving'
  ) => {
    if (!Number.isFinite(durationMin)) return durationMin
    if (mode === 'driving') return durationMin * 1.8
    if (mode === 'cycling') return durationMin * 1.15
    return durationMin
  }

  const estimateDurationByProfile = (
    distanceKm: number,
    mode: 'walking' | 'cycling' | 'driving'
  ) => {
    const speedKmH = mode === 'walking' ? 5 : mode === 'cycling' ? 15 : 40
    return (distanceKm / speedKmH) * 60
  }

  const parseNumber = (v: any) => {
    if (v === null || v === undefined || v === '') return null
    const n = Number(String(v).replace(/[^\d.-]/g, ''))
    return Number.isFinite(n) ? n : null
  }

  const haversineKm = (a: UserLocation, b: UserLocation) => {
    const toRad = (deg: number) => (deg * Math.PI) / 180
    const R = 6371
    const dLat = toRad(b.lat - a.lat)
    const dLng = toRad(b.lng - a.lng)
    const sa =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(a.lat)) *
        Math.cos(toRad(b.lat)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2)
    return 2 * R * Math.atan2(Math.sqrt(sa), Math.sqrt(1 - sa))
  }

  const itemMatchesCurrentFilter = (item: UnifiedSearchItem) => {
    if (selectedLayerFilter === 'none') return false
    if (selectedLayerFilter === 'shelters') {
      return item.kind === 'school' || item.kind === 'unrwa_school'
    }
    if (selectedLayerFilter === 'medical') return item.kind === 'medical'
    if (selectedLayerFilter === 'aid') return item.kind === 'water'
    if (selectedLayerFilter === 'food') return item.kind === 'food'
    return true
  }

  const fetchRouteData = async (from: UserLocation, to: UserLocation) => {
    const url =
      `/api/route?profile=${profile}` +
      `&service=${routerEngine}` +
      `&fromLng=${from.lng}&fromLat=${from.lat}` +
      `&toLng=${to.lng}&toLat=${to.lat}`

    const res = await fetch(url)
    const data = await res.json()
    if (!res.ok) throw new Error(data?.message || 'Route request failed')
    return data
  }

  const openDirections = (to: { lng: number; lat: number }) => {
    const destination = `${to.lat},${to.lng}`

    const travelMode =
      profile === 'driving' ? 'driving' : profile === 'cycling' ? 'bicycling' : 'walking'

    const url = userLocation
      ? `https://www.google.com/maps/dir/?api=1&origin=${userLocation.lat},${userLocation.lng}&destination=${destination}&travelmode=${travelMode}`
      : `https://www.google.com/maps/search/?api=1&query=${destination}`

    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const osmAmenitiesKey = useMemo(() => osmAmenities.join(','), [osmAmenities])

  const adminSearchItems = useMemo<UnifiedSearchItem[]>(() => {
    const list = Array.isArray(adminPlaces) ? adminPlaces : []

    return list.map((p) => {
      const rawName = cleanText(p.name) || 'موقع'
      const rawOperator = cleanText(p.operator)
      const isUnrwaShelter =
        p.type === 'shelter' &&
        normalizeArabic(`${rawName} ${rawOperator}`).includes(normalizeArabic('اونروا'))

      const kind =
        p.type === 'shelter'
          ? isUnrwaShelter
            ? 'unrwa_school'
            : 'school'
          : p.type === 'hospital'
            ? 'medical'
            : p.type === 'water'
              ? 'water'
              : 'food'

      const isAvailable =
        p.type === 'shelter'
          ? (p.availableBeds ?? 0) > 0 || cleanText(p.statusText).includes('متاح')
          : true

      const statusText =
        p.statusText ||
        (p.type === 'shelter'
          ? p.availableBeds !== null && p.availableBeds !== undefined
            ? `شاغر: ${p.availableBeds}${p.capacity ? ` / السعة ${p.capacity}` : ''}`
            : 'مركز إيواء'
          : p.type === 'hospital'
            ? 'خدمة طبية'
            : p.type === 'water'
              ? 'نقطة توزيع ماء'
              : 'مركز دعم / توزيع')

      return {
        id: p.id,
        name: rawName,
        kind,
        amenity:
          p.type === 'hospital'
            ? 'hospital'
            : p.type === 'water'
              ? 'drinking_water'
              : p.type === 'shelter'
                ? 'school'
                : 'community_centre',
        operator: rawOperator,
        lng: p.lng,
        lat: p.lat,
        statusText,
        isAvailable,
        source: 'admin' as const,
      }
    })
  }, [adminPlaces])

  const allSearchItems = useMemo(() => {
    return [...osmSearchItems, ...adminSearchItems]
  }, [osmSearchItems, adminSearchItems])

  const applyLayerVisibility = () => {
    const map = mapRef.current
    if (!map) return

    const setVis = (id: string, on: boolean) => {
      if (!map.getLayer(id)) return
      map.setLayoutProperty(id, 'visibility', on ? 'visible' : 'none')
    }

    const showAny =
      !!layerCats?.shelters || !!layerCats?.medical || !!layerCats?.aid || !!layerCats?.food

    setVis('osm-clusters', showAny)
    setVis('osm-cluster-count', showAny)

    const showSchools = !!layerCats?.shelters
    setVis('osm-schools-layer', showSchools)
    setVis('osm-schools-labels', showSchools)
    setVis('osm-unrwa-schools-layer', showSchools)
    setVis('osm-unrwa-schools-labels', showSchools)

    setVis('osm-medical-layer', !!layerCats?.medical)
    setVis('osm-medical-labels', !!layerCats?.medical)

    setVis('osm-water-layer', !!layerCats?.aid)
    setVis('osm-water-labels', !!layerCats?.aid)

    setVis('osm-food-layer', !!layerCats?.food)
    setVis('osm-food-labels', !!layerCats?.food)

    setVis('admin-shelters-layer', !!layerCats?.shelters)
    setVis('admin-shelters-labels', !!layerCats?.shelters)
    setVis('admin-unrwa-shelters-layer', !!layerCats?.shelters)
    setVis('admin-unrwa-shelters-labels', !!layerCats?.shelters)

    setVis('admin-medical-layer', !!layerCats?.medical)
    setVis('admin-medical-labels', !!layerCats?.medical)

    setVis('admin-water-layer', !!layerCats?.aid)
    setVis('admin-water-labels', !!layerCats?.aid)

    setVis('admin-food-layer', !!layerCats?.food)
    setVis('admin-food-labels', !!layerCats?.food)
  }

  const cleanupOsm = () => {
    const map = mapRef.current
    if (!map) return

    osmHandlersRef.current.forEach(({ type, layerId, handler }) => {
      map.off(type, layerId, handler)
    })
    osmHandlersRef.current = []

    OSM_LAYERS.forEach((id) => {
      if (map.getLayer(id)) map.removeLayer(id)
    })

    if (map.getSource('osm-places')) map.removeSource('osm-places')
  }

  const cleanupAdmin = () => {
    const map = mapRef.current
    if (!map) return

    adminHandlersRef.current.forEach(({ type, layerId, handler }) => {
      map.off(type, layerId, handler)
    })
    adminHandlersRef.current = []

    ADMIN_LAYERS.forEach((id) => {
      if (map.getLayer(id)) map.removeLayer(id)
    })

    if (map.getSource('admin-places')) map.removeSource('admin-places')
  }

  const clearRoute = () => {
    const map = mapRef.current
    if (!map) return
    if (map.getLayer('route-layer')) map.removeLayer('route-layer')
    if (map.getSource('route-source')) map.removeSource('route-source')
  }

  const drawRoute = (geometry: any) => {
    const map = mapRef.current
    if (!map) return

    const sourceId = 'route-source'
    const layerId = 'route-layer'

    const geojson = {
      type: 'FeatureCollection',
      features: [{ type: 'Feature', geometry, properties: {} }],
    } as any

    if (map.getSource(sourceId)) {
      ;(map.getSource(sourceId) as any).setData(geojson)
    } else {
      map.addSource(sourceId, { type: 'geojson', data: geojson })
      map.addLayer({
        id: layerId,
        type: 'line',
        source: sourceId,
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-width': 5,
          'line-color': '#2563eb',
          'line-opacity': 0.85,
        },
      })
    }
  }

  const fitToGeometry = (geometry: any) => {
    const map = mapRef.current
    if (!map) return

    const coords = geometry?.coordinates
    if (!Array.isArray(coords) || coords.length < 2) return

    const bounds = new maplibregl.LngLatBounds()
    for (const c of coords) bounds.extend(c)
    map.fitBounds(bounds, { padding: 70, maxZoom: 15 })
  }

  const openPlaceCardAndRoute = async (place: {
    id: string
    name: string
    kind?: string
    amenity?: string
    operator?: string
    lng: number
    lat: number
    statusText?: string
  }) => {
    const map = mapRef.current
    if (!map) return

    const cardData: SelectedPlaceCard = {
      id: place.id,
      name: place.name || 'موقع',
      kind: place.kind,
      amenity: place.amenity,
      operator: place.operator,
      lng: place.lng,
      lat: place.lat,
      statusText: place.statusText || defaultStatusByKind(place.kind),
      loading: true,
    }

    setSelectedPlace(cardData)

    if (!userLocation) {
      toast.warning("يرجى تحديد موقعك أولاً للحصول على أدق النتائج");
      clearRoute()
      map.flyTo({
        center: [place.lng, place.lat],
        zoom: Math.max(map.getZoom(), 15),
      })

      setSelectedPlace({
        ...cardData,
        loading: false,
        warning: 'يرجى أولاً تحديد موقعك من زر الموقع على يمين الخريطة.',
      })
      return
    }

    try {
      const data = await fetchRouteData(userLocation, {
        lng: place.lng,
        lat: place.lat,
      })

      drawRoute(data.geometry)
      fitToGeometry(data.geometry)

      const adjustedDurationMin = getAdjustedDurationMin(
        Number(data.durationMin),
        profile
      )

      setSelectedPlace({
        ...cardData,
        loading: false,
        distanceText: formatDistanceKm(Number(data.distanceKm)),
        durationText: formatDurationMin(adjustedDurationMin),
        error: undefined,
        warning: undefined,
      })
    } catch (err) {
      console.error(err)
      clearRoute()

      const directKm = haversineKm(userLocation, {
        lng: place.lng,
        lat: place.lat,
      })

      map.flyTo({
        center: [place.lng, place.lat],
        zoom: Math.max(map.getZoom(), 15),
      })

      setSelectedPlace({
        ...cardData,
        loading: false,
        warning: 'تعذر حساب المسار الفعلي، تم عرض تقدير تقريبي حسب وسيلة التنقل.',
        distanceText: formatDistanceKm(directKm),
        durationText: formatDurationMin(estimateDurationByProfile(directKm, profile)),
        error: undefined,
      })
    }
  }

  const runShelterSearch = async () => {
    const q = normalizeArabic(topSearch)
    setIsSearching(true)
    setSearchResults([])
    setSearchNotice('')

    let matches = allSearchItems.filter(itemMatchesCurrentFilter)

    if (!matches.length) {
      setIsSearching(false)
      setSearchNotice('لا توجد بيانات متاحة حالياً للبحث.')
      return
    }

    if (q) {
      const qTokens = q.split(' ').filter(Boolean)

      matches = matches.filter((item) => {
        const hay = normalizeArabic(
          [
            item.name,
            item.operator || '',
            item.statusText || '',
            kindToArabic(item.kind),
            item.amenity ? amenityToArabic(item.amenity) : '',
          ].join(' ')
        )

        return qTokens.every((token) => hay.includes(token))
      })
    } else {
      matches = matches.filter((item) => {
        if (item.kind === 'school' || item.kind === 'unrwa_school') {
          return item.isAvailable !== false
        }
        return true
      })
    }

    if (!matches.length) {
      setIsSearching(false)
      setSearchNotice('لا توجد نتائج مطابقة للبحث الحالي.')
      return
    }

    const sorted = [...matches].sort((a, b) => {
      if (!userLocation) return a.name.localeCompare(b.name, 'ar')
      return (
        haversineKm(userLocation, { lng: a.lng, lat: a.lat }) -
        haversineKm(userLocation, { lng: b.lng, lat: b.lat })
      )
    })

    setSearchResults(sorted.slice(0, 8))
    setIsSearching(false)

    if (sorted.length === 1) {
      const first = sorted[0]
      setSearchNotice(`تم العثور على نتيجة واحدة: ${first.name || 'موقع'}`)
      await openPlaceCardAndRoute({
        id: first.id,
        name: first.name,
        kind: first.kind,
        amenity: first.amenity,
        operator: first.operator,
        lng: first.lng,
        lat: first.lat,
        statusText: first.statusText,
      })
      setSearchResults([])
      return
    }

    setSearchNotice(`تم العثور على ${sorted.length} نتيجة. اختر النتيجة المناسبة من القائمة.`)
  }

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    if (mapRef.current) return

    // --- ضيفي السطر هنا ---
    console.log("الموقع يعمل الآن"); 
    // أو إذا كنتِ تستخدمين التوستر:
    // toast.info("يرجى إدخال موقع المستخدم");
    // -----------------------

    if (typeof window !== 'undefined' && !window.__maplibreRTLInitialized) {
      const anyMap: any = maplibregl
      if (typeof anyMap.setRTLTextPlugin === 'function') {
        anyMap.setRTLTextPlugin(
          'https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-rtl-text/v0.2.3/mapbox-gl-rtl-text.js',
          () => {},
          true
        )
        window.__maplibreRTLInitialized = true
      }
    }

    const map = new maplibregl.Map({
      container: el,
      style: 'https://tiles.openfreemap.org/styles/positron',
      center: [lng, lat],
      zoom,
    })

    mapRef.current = map

    map.addControl(new maplibregl.NavigationControl(), 'top-right')

    const geolocate = new maplibregl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: true,
      showUserLocation: true,
    })

    geolocate.on('geolocate', (pos: GeolocationPosition) => {
      toast.info("جاري تحديد موقعك الحالي...");
      const current = {
        lng: pos.coords.longitude,
        lat: pos.coords.latitude,
      }
      setUserLocation(current)
      setSearchNotice('تم تحديد موقعك. يمكنك الآن البحث وعرض أقرب النتائج.')

      map.flyTo({
        center: [current.lng, current.lat],
        zoom: Math.max(map.getZoom(), 13),
      })
    })

    map.addControl(geolocate, 'top-right')

    const layersCtrl = new IconButtonControl({
      title: 'Layers',
      icon: LAYERS_ICON,
      onClick: () => setLayersOpen((v) => !v),
      active: () => layersOpen,
    })

    const queryCtrl = new IconButtonControl({
      title: 'Query feature',
      icon: QUERY_ICON,
      onClick: () => setQueryMode((v) => !v),
      active: () => queryMode,
    })

    layersControlRef.current = layersCtrl
    queryControlRef.current = queryCtrl

    map.addControl(layersCtrl, 'top-right')
    map.addControl(queryCtrl, 'top-right')

    map.on('load', () => map.resize())

    const t1 = window.setTimeout(() => map.resize(), 80)
    const t2 = window.setTimeout(() => map.resize(), 250)

    const handleResize = () => map.resize()
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      window.clearTimeout(t1)
      window.clearTimeout(t2)

      markersRef.current.forEach((m) => m.remove())
      markersRef.current = []

      cleanupOsm()
      cleanupAdmin()
      clearRoute()

      map.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    layersControlRef.current?.syncActive()
  }, [layersOpen])

  useEffect(() => {
    queryControlRef.current?.syncActive()
  }, [queryMode])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const onClick = (e: maplibregl.MapMouseEvent & maplibregl.ExpiryData) => {
      const feats = map.queryRenderedFeatures(e.point)

      if (!feats?.length) {
        new maplibregl.Popup({ offset: 12 })
          .setLngLat(e.lngLat)
          .setHTML(`<div style="font-size:12px;color:#6b7280">لا يوجد عنصر هنا</div>`)
          .addTo(map)
        return
      }

      const f: any = feats[0]
      const layerId = f?.layer?.id ? String(f.layer.id) : 'unknown'
      const props = f?.properties ?? {}

      const rows = Object.entries(props)
        .slice(0, 18)
        .map(([k, v]) => {
          const vv = cleanText(v)
          return `<div style="display:flex;gap:8px"><div style="min-width:90px;color:#6b7280">${k}</div><div style="color:#111827;word-break:break-word">${vv || '-'}</div></div>`
        })
        .join('')

      new maplibregl.Popup({ offset: 12 })
        .setLngLat(e.lngLat)
        .setHTML(
          `<div style="font-size:12px;line-height:1.4">
            <div style="font-weight:800;color:#111827;margin-bottom:6px">Query</div>
            <div style="color:#6b7280;margin-bottom:6px">Layer: <span style="color:#111827;font-weight:700">${layerId}</span></div>
            ${rows || `<div style="color:#6b7280">No properties</div>`}
          </div>`
        )
        .addTo(map)
    }

    if (queryMode) {
      map.getCanvas().style.cursor = 'crosshair'
      map.on('click', onClick)
    } else {
      map.getCanvas().style.cursor = ''
      map.off('click', onClick)
    }

    return () => {
      map.off('click', onClick)
      if (map.getCanvas()) map.getCanvas().style.cursor = ''
    }
  }, [queryMode])

  useEffect(() => {
    const wrap = wrapperRef.current
    if (!wrap) return
    const ro = new ResizeObserver(() => mapRef.current?.resize())
    ro.observe(wrap)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    setTimeout(() => mapRef.current?.resize(), 50)
  }, [layersOpen])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    map.easeTo({ center: [lng, lat], zoom })
  }, [lng, lat, zoom])

  useEffect(() => {
    setSearchResults([])
  }, [selectedLayerFilter])

  useEffect(() => {
    applyLayerVisibility()
  }, [layerCats, adminSearchItems, osmSearchItems, osmEnabled])

  useEffect(() => {
    if (!selectedPlace || !userLocation) return

    const key = [
      selectedPlace.id,
      selectedPlace.lng,
      selectedPlace.lat,
      profile,
      routerEngine,
      userLocation.lng,
      userLocation.lat,
    ].join('|')

    if (lastRouteKeyRef.current === key) return
    lastRouteKeyRef.current = key

    openPlaceCardAndRoute({
      id: selectedPlace.id,
      name: selectedPlace.name,
      kind: selectedPlace.kind,
      amenity: selectedPlace.amenity,
      operator: selectedPlace.operator,
      lng: selectedPlace.lng,
      lat: selectedPlace.lat,
      statusText: selectedPlace.statusText,
    })
  }, [profile, routerEngine, userLocation, selectedPlace])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    markersRef.current.forEach((m) => m.remove())
    markersRef.current = []

    if (!places.length) {
      window.setTimeout(() => map.resize(), 50)
      return
    }

    const bounds = new maplibregl.LngLatBounds()

    places.forEach((p) => {
      bounds.extend([p.lng, p.lat])

      const el = document.createElement('div')
      el.style.width = '20px'
      el.style.height = '20px'
      el.style.borderRadius = '50%'
      el.style.background = '#dc2626'
      el.style.border = '2px solid #fff'
      el.style.boxShadow = '0 2px 8px rgba(0,0,0,.25)'
      el.style.cursor = 'pointer'

      el.addEventListener('click', async (evt) => {
        evt.stopPropagation();
        // ضيفي التوستر هنا
  toast.loading("جاري عرض تفاصيل الموقع...", { duration: 1500 });

        await openPlaceCardAndRoute({
          id: p.id,
          name: cleanText(p.name) || 'موقع',
          kind: cleanText(p.type),
          lng: p.lng,
          lat: p.lat,
          statusText: cleanText(p.type) || 'موقع',
        })
      })

      const marker = new maplibregl.Marker({ element: el }).setLngLat([p.lng, p.lat]).addTo(map)
      markersRef.current.push(marker)
    })

    if (places.length === 1) {
      map.flyTo({
        center: [places[0].lng, places[0].lat],
        zoom: Math.max(map.getZoom(), 12),
      })
    } else {
      map.fitBounds(bounds, { padding: 50, maxZoom: 14 })
    }

    window.setTimeout(() => map.resize(), 60)
  }, [places])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    if (!osmEnabled) {
      cleanupOsm()
      setShelters([])
      setOsmSearchItems([])
      return
    }

    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | null = null

    const getBbox = () => {
      try {
        const b = map.getBounds()
        return {
          south: b.getSouth(),
          west: b.getWest(),
          north: b.getNorth(),
          east: b.getEast(),
        }
      } catch {
        return { south: 31.2, west: 34.2, north: 31.65, east: 34.6 }
      }
    }

    const attachLayerHandler = (type: HandlerItem['type'], layerId: string, handler: any) => {
      if (!map.getLayer(layerId)) return
      map.on(type, layerId, handler)
      osmHandlersRef.current.push({ type, layerId, handler })
    }

    const attachPlaceCardHandler = (layerId: string) => {
      if (!map.getLayer(layerId)) return

      const onClick = async (e: any) => {
        const f = e.features?.[0] as any
        if (!f) return
        toast.loading("جاري تحديد المسار إلى الموقع...", { duration: 2000 });

        const [clickedLng, clickedLat] = f.geometry.coordinates
        const p = f.properties || {}

        const kind = cleanText(p.kind || '')
        const name = cleanText(p.display_name || p.name || 'موقع')
        toast.loading("جاري تحديد المسار إلى الموقع...", { duration: 2000 });
        const operator = cleanText(p.operator || '')
        const amenity = cleanText(p.amenity || '')

        let statusText = defaultStatusByKind(kind)

        if (kind === 'school' || kind === 'unrwa_school') {
          const matchedShelter = shelters.find(
            (s) =>
              Math.abs(s.lng - clickedLng) < 0.000001 &&
              Math.abs(s.lat - clickedLat) < 0.000001 &&
              s.kind === kind
          )
          if (matchedShelter?.statusText) statusText = matchedShelter.statusText
        }

        await openPlaceCardAndRoute({
          id: String(p.id || `${clickedLng}-${clickedLat}`),
          name,
          kind,
          amenity,
          operator,
          lng: clickedLng,
          lat: clickedLat,
          statusText,
        })
      }

      attachLayerHandler('click', layerId, onClick)
      attachLayerHandler('mouseenter', layerId, () => (map.getCanvas().style.cursor = 'pointer'))
      attachLayerHandler('mouseleave', layerId, () => (map.getCanvas().style.cursor = ''))
    }

    const isUnrwa = (name: string, operator: string) => {
      const t = normalizeArabic(`${name} ${operator}`)
      return (
        t.includes('unrwa') ||
        t.includes(normalizeArabic('وكالة')) ||
        t.includes(normalizeArabic('الاونروا')) ||
        t.includes(normalizeArabic('الأونروا')) ||
        t.includes(normalizeArabic('اونروا'))
      )
    }

    async function run() {
      try {
        const { south, west, north, east } = getBbox()

        const foodExtra = `
          nwr["amenity"="community_centre"](${south},${west},${north},${east});
          nwr["amenity"="social_centre"](${south},${west},${north},${east});
          nwr["amenity"="marketplace"](${south},${west},${north},${east});
          nwr["office"="ngo"](${south},${west},${north},${east});
          nwr["social_facility"](${south},${west},${north},${east});
          nwr["shop"="supermarket"](${south},${west},${north},${east});
        `

        const overpassQuery = `
[out:json][timeout:25];
(
  ${osmAmenities
    .map((a) => `nwr["amenity"="${a}"](${south},${west},${north},${east});`)
    .join('\n')}
  nwr["amenity"="school"](${south},${west},${north},${east});
  ${foodExtra}
);
out center tags;
`

        const url =
          'https://overpass-api.de/api/interpreter?data=' + encodeURIComponent(overpassQuery)

        const res = await fetch(url)
        const osm = await res.json()
        if (cancelled) return

        const rawShelters: ShelterItem[] = []
        const rawSearchItems: UnifiedSearchItem[] = []

        const allFeatures = (osm.elements || [])
          .filter((el: any) => {
            if (el.type === 'node') {
              return typeof el.lat === 'number' && typeof el.lon === 'number'
            }
            return (
              el.center &&
              typeof el.center.lat === 'number' &&
              typeof el.center.lon === 'number'
            )
          })
          .map((el: any, idx: number) => {
            const lon = el.type === 'node' ? el.lon : el.center.lon
            const lat2 = el.type === 'node' ? el.lat : el.center.lat

            const tags = el.tags || {}
            const rawName =
              tags['name:ar'] || tags.name || tags['name:en'] || tags.operator || ''
            const operator = tags.operator || tags['operator:ar'] || ''
            const amenity = tags.amenity || ''
            const shop = tags.shop || ''
            const office = tags.office || ''
            const socialFacility = tags.social_facility || ''

            const display = cleanText(rawName)
            const op = cleanText(operator)

            let kind: 'school' | 'unrwa_school' | 'medical' | 'water' | 'food' = 'food'
            if (amenity === 'school') {
              kind = isUnrwa(display, op) ? 'unrwa_school' : 'school'
            } else if (['hospital', 'clinic', 'pharmacy', 'doctors'].includes(amenity)) {
              kind = 'medical'
            } else if (amenity === 'drinking_water') {
              kind = 'water'
            } else if (
              ['community_centre', 'social_centre', 'marketplace'].includes(amenity) ||
              office === 'ngo' ||
              socialFacility ||
              shop === 'supermarket'
            ) {
              kind = 'food'
            }

            let statusText = defaultStatusByKind(kind)
            let isAvailable = true

            if (kind === 'school' || kind === 'unrwa_school') {
              const capacity =
                parseNumber(tags['capacity:persons']) ??
                parseNumber(tags.capacity) ??
                parseNumber(tags['shelter:capacity'])

              const occupancy =
                parseNumber(tags['occupancy:persons']) ??
                parseNumber(tags.occupancy) ??
                parseNumber(tags['shelter:occupancy'])

              const availableBeds =
                parseNumber(tags['beds_available']) ??
                parseNumber(tags['available_beds']) ??
                (capacity !== null && occupancy !== null ? Math.max(capacity - occupancy, 0) : null)

              const statusRaw = cleanText(
                tags.status ||
                  tags['shelter:status'] ||
                  tags.vacancy ||
                  tags.availability ||
                  tags['beds:status']
              ).toLowerCase()

              isAvailable =
                availableBeds !== null
                  ? availableBeds > 0
                  : ['available', 'open', 'vacant', 'empty', 'yes'].includes(statusRaw)

              statusText =
                availableBeds !== null
                  ? `شاغر: ${availableBeds}${capacity !== null ? ` / السعة ${capacity}` : ''}`
                  : isAvailable
                    ? 'فارغ / متاح'
                    : 'غير معروف'

              rawShelters.push({
                id: String(el.id ?? idx),
                name: display || 'مركز إيواء',
                operator: op,
                amenity,
                kind: kind as 'school' | 'unrwa_school',
                lng: lon,
                lat: lat2,
                capacity,
                occupancy,
                availableBeds,
                statusText,
                isAvailable,
              })
            }

            rawSearchItems.push({
              id: String(el.id ?? idx),
              name: display || 'موقع',
              kind,
              amenity,
              operator: op,
              lng: lon,
              lat: lat2,
              statusText,
              isAvailable,
              source: 'osm',
            })

            return {
              type: 'Feature',
              properties: {
                id: String(el.id ?? idx),
                name: rawName,
                display_name: display,
                operator: op,
                amenity: amenity || '',
                kind,
              },
              geometry: { type: 'Point', coordinates: [lon, lat2] },
            }
          })

        setShelters(rawShelters)
        setOsmSearchItems(rawSearchItems)

        const geojson = {
          type: 'FeatureCollection',
          features: allFeatures,
        } as any

        cleanupOsm()

        map.addSource('osm-places', {
          type: 'geojson',
          data: geojson,
          cluster: true,
          clusterMaxZoom: 13,
          clusterRadius: 50,
        })

        map.addLayer({
          id: 'osm-clusters',
          type: 'circle',
          source: 'osm-places',
          filter: ['has', 'point_count'],
          paint: {
            'circle-radius': ['step', ['get', 'point_count'], 16, 10, 22, 30, 28],
            'circle-color': '#333',
            'circle-opacity': 0.55,
            'circle-stroke-width': 2,
            'circle-stroke-color': '#fff',
          },
        })

        map.addLayer({
          id: 'osm-cluster-count',
          type: 'symbol',
          source: 'osm-places',
          filter: ['has', 'point_count'],
          layout: {
            'text-field': ['get', 'point_count_abbreviated'],
            'text-size': 12,
          },
          paint: { 'text-color': '#fff' },
        })

        const onClusterClick = (e: any) => {
          const feats = map.queryRenderedFeatures(e.point, { layers: ['osm-clusters'] })
          const cluster = feats[0]
          if (!cluster) return

          const source = map.getSource('osm-places') as any
          const clusterId = cluster.properties.cluster_id
          source.getClusterExpansionZoom(clusterId, (err: any, expansionZoom: number) => {
            if (err) return
            map.easeTo({
              center: (cluster.geometry as any).coordinates,
              zoom: expansionZoom,
            })
          })
        }

        attachLayerHandler('click', 'osm-clusters', onClusterClick)
        attachLayerHandler('mouseenter', 'osm-clusters', () => (map.getCanvas().style.cursor = 'pointer'))
        attachLayerHandler('mouseleave', 'osm-clusters', () => (map.getCanvas().style.cursor = ''))

        map.addLayer({
          id: 'osm-schools-layer',
          type: 'circle',
          source: 'osm-places',
          filter: ['all', ['!', ['has', 'point_count']], ['==', ['get', 'kind'], 'school']],
          paint: {
            'circle-radius': 6,
            'circle-color': '#2a9d8f',
            'circle-stroke-width': 1,
            'circle-stroke-color': '#fff',
          },
        })

        map.addLayer({
          id: 'osm-schools-labels',
          type: 'symbol',
          source: 'osm-places',
          filter: ['all', ['!', ['has', 'point_count']], ['==', ['get', 'kind'], 'school']],
          minzoom: 11,
          layout: {
            'text-field': ['coalesce', ['get', 'display_name'], 'مركز إيواء'],
            'text-size': 12,
            'text-offset': [0, 1.2],
            'text-anchor': 'top',
          },
          paint: {
            'text-color': '#111',
            'text-halo-color': '#fff',
            'text-halo-width': 1.4,
          },
        })

        map.addLayer({
          id: 'osm-unrwa-schools-layer',
          type: 'circle',
          source: 'osm-places',
          filter: ['all', ['!', ['has', 'point_count']], ['==', ['get', 'kind'], 'unrwa_school']],
          paint: {
            'circle-radius': 6,
            'circle-color': '#1b7fbd',
            'circle-stroke-width': 1,
            'circle-stroke-color': '#fff',
          },
        })

        map.addLayer({
          id: 'osm-unrwa-schools-labels',
          type: 'symbol',
          source: 'osm-places',
          filter: ['all', ['!', ['has', 'point_count']], ['==', ['get', 'kind'], 'unrwa_school']],
          minzoom: 11,
          layout: {
            'text-field': ['coalesce', ['get', 'display_name'], 'مركز إيواء - وكالة'],
            'text-size': 12,
            'text-offset': [0, 1.2],
            'text-anchor': 'top',
          },
          paint: {
            'text-color': '#111',
            'text-halo-color': '#fff',
            'text-halo-width': 1.4,
          },
        })

        map.addLayer({
          id: 'osm-medical-layer',
          type: 'circle',
          source: 'osm-places',
          filter: ['all', ['!', ['has', 'point_count']], ['==', ['get', 'kind'], 'medical']],
          paint: {
            'circle-radius': 6,
            'circle-color': '#e63946',
            'circle-stroke-width': 1,
            'circle-stroke-color': '#fff',
          },
        })

        map.addLayer({
          id: 'osm-medical-labels',
          type: 'symbol',
          source: 'osm-places',
          filter: ['all', ['!', ['has', 'point_count']], ['==', ['get', 'kind'], 'medical']],
          minzoom: 11,
          layout: {
            'text-field': ['coalesce', ['get', 'display_name'], 'خدمة طبية'],
            'text-size': 12,
            'text-offset': [0, 1.2],
            'text-anchor': 'top',
          },
          paint: {
            'text-color': '#111',
            'text-halo-color': '#fff',
            'text-halo-width': 1.4,
          },
        })

        map.addLayer({
          id: 'osm-water-layer',
          type: 'circle',
          source: 'osm-places',
          filter: ['all', ['!', ['has', 'point_count']], ['==', ['get', 'kind'], 'water']],
          paint: {
            'circle-radius': 6,
            'circle-color': '#457b9d',
            'circle-stroke-width': 1,
            'circle-stroke-color': '#fff',
          },
        })

        map.addLayer({
          id: 'osm-water-labels',
          type: 'symbol',
          source: 'osm-places',
          filter: ['all', ['!', ['has', 'point_count']], ['==', ['get', 'kind'], 'water']],
          minzoom: 11,
          layout: {
            'text-field': ['coalesce', ['get', 'display_name'], 'نقطة ماء'],
            'text-size': 12,
            'text-offset': [0, 1.2],
            'text-anchor': 'top',
          },
          paint: {
            'text-color': '#111',
            'text-halo-color': '#fff',
            'text-halo-width': 1.4,
          },
        })

        map.addLayer({
          id: 'osm-food-layer',
          type: 'circle',
          source: 'osm-places',
          filter: ['all', ['!', ['has', 'point_count']], ['==', ['get', 'kind'], 'food']],
          paint: {
            'circle-radius': 6,
            'circle-color': '#f4a261',
            'circle-stroke-width': 1,
            'circle-stroke-color': '#fff',
          },
        })

        map.addLayer({
          id: 'osm-food-labels',
          type: 'symbol',
          source: 'osm-places',
          filter: ['all', ['!', ['has', 'point_count']], ['==', ['get', 'kind'], 'food']],
          minzoom: 11,
          layout: {
            'text-field': ['coalesce', ['get', 'display_name'], 'مركز دعم / توزيع'],
            'text-size': 12,
            'text-offset': [0, 1.2],
            'text-anchor': 'top',
          },
          paint: {
            'text-color': '#111',
            'text-halo-color': '#fff',
            'text-halo-width': 1.4,
          },
        })

        attachPlaceCardHandler('osm-schools-layer')
        attachPlaceCardHandler('osm-unrwa-schools-layer')
        attachPlaceCardHandler('osm-medical-layer')
        attachPlaceCardHandler('osm-water-layer')
        attachPlaceCardHandler('osm-food-layer')

        applyLayerVisibility()

        window.setTimeout(() => map.resize(), 60)
      } catch (err) {
        console.error('OSM fetch failed:', err)
      }
    }

    const scheduleRun = () => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        if (!cancelled) run()
      }, 350)
    }

    cleanupOsm()
    if (map.loaded()) run()
    else map.once('load', run)

    map.on('moveend', scheduleRun)
    map.on('zoomend', scheduleRun)

    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
      map.off('moveend', scheduleRun)
      map.off('zoomend', scheduleRun)
      cleanupOsm()
    }
  }, [osmEnabled, osmAmenitiesKey])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    let cancelled = false

    const attachAdminLayers = () => {
      if (cancelled) return

      const attachAdminHandler = (
        type: HandlerItem['type'],
        layerId: string,
        handler: any
      ) => {
        if (!map.getLayer(layerId)) return
        map.on(type, layerId, handler)
        adminHandlersRef.current.push({ type, layerId, handler })
      }

      const makeAdminGeojson = () => {
        const features = adminSearchItems.map((item) => ({
          type: 'Feature',
          properties: {
            id: item.id,
            name: item.name,
            display_name: item.name,
            kind: item.kind,
            amenity: item.amenity || '',
            operator: item.operator || '',
            statusText: item.statusText || '',
            source: 'admin',
          },
          geometry: {
            type: 'Point',
            coordinates: [item.lng, item.lat],
          },
        }))

        return {
          type: 'FeatureCollection',
          features,
        } as any
      }

      cleanupAdmin()

      map.addSource('admin-places', {
        type: 'geojson',
        data: makeAdminGeojson(),
      })

      map.addLayer({
        id: 'admin-shelters-layer',
        type: 'circle',
        source: 'admin-places',
        filter: ['==', ['get', 'kind'], 'school'],
        paint: {
          'circle-radius': 7,
          'circle-color': '#16a34a',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#fff',
        },
      })

      map.addLayer({
        id: 'admin-shelters-labels',
        type: 'symbol',
        source: 'admin-places',
        filter: ['==', ['get', 'kind'], 'school'],
        minzoom: 11,
        layout: {
          'text-field': ['coalesce', ['get', 'display_name'], 'مركز إيواء'],
          'text-size': 12,
          'text-offset': [0, 1.2],
          'text-anchor': 'top',
        },
        paint: {
          'text-color': '#111',
          'text-halo-color': '#fff',
          'text-halo-width': 1.2,
        },
      })

      map.addLayer({
        id: 'admin-unrwa-shelters-layer',
        type: 'circle',
        source: 'admin-places',
        filter: ['==', ['get', 'kind'], 'unrwa_school'],
        paint: {
          'circle-radius': 7,
          'circle-color': '#0ea5e9',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#fff',
        },
      })

      map.addLayer({
        id: 'admin-unrwa-shelters-labels',
        type: 'symbol',
        source: 'admin-places',
        filter: ['==', ['get', 'kind'], 'unrwa_school'],
        minzoom: 11,
        layout: {
          'text-field': ['coalesce', ['get', 'display_name'], 'مركز إيواء - وكالة'],
          'text-size': 12,
          'text-offset': [0, 1.2],
          'text-anchor': 'top',
        },
        paint: {
          'text-color': '#111',
          'text-halo-color': '#fff',
          'text-halo-width': 1.2,
        },
      })

      map.addLayer({
        id: 'admin-medical-layer',
        type: 'circle',
        source: 'admin-places',
        filter: ['==', ['get', 'kind'], 'medical'],
        paint: {
          'circle-radius': 7,
          'circle-color': '#dc2626',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#fff',
        },
      })

      map.addLayer({
        id: 'admin-medical-labels',
        type: 'symbol',
        source: 'admin-places',
        filter: ['==', ['get', 'kind'], 'medical'],
        minzoom: 11,
        layout: {
          'text-field': ['coalesce', ['get', 'display_name'], 'مستشفى'],
          'text-size': 12,
          'text-offset': [0, 1.2],
          'text-anchor': 'top',
        },
        paint: {
          'text-color': '#111',
          'text-halo-color': '#fff',
          'text-halo-width': 1.2,
        },
      })

      map.addLayer({
        id: 'admin-water-layer',
        type: 'circle',
        source: 'admin-places',
        filter: ['==', ['get', 'kind'], 'water'],
        paint: {
          'circle-radius': 7,
          'circle-color': '#2563eb',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#fff',
        },
      })

      map.addLayer({
        id: 'admin-water-labels',
        type: 'symbol',
        source: 'admin-places',
        filter: ['==', ['get', 'kind'], 'water'],
        minzoom: 11,
        layout: {
          'text-field': ['coalesce', ['get', 'display_name'], 'نقطة ماء'],
          'text-size': 12,
          'text-offset': [0, 1.2],
          'text-anchor': 'top',
        },
        paint: {
          'text-color': '#111',
          'text-halo-color': '#fff',
          'text-halo-width': 1.2,
        },
      })

      map.addLayer({
        id: 'admin-food-layer',
        type: 'circle',
        source: 'admin-places',
        filter: ['==', ['get', 'kind'], 'food'],
        paint: {
          'circle-radius': 7,
          'circle-color': '#f59e0b',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#fff',
        },
      })

      map.addLayer({
        id: 'admin-food-labels',
        type: 'symbol',
        source: 'admin-places',
        filter: ['==', ['get', 'kind'], 'food'],
        minzoom: 11,
        layout: {
          'text-field': ['coalesce', ['get', 'display_name'], 'مركز دعم / توزيع'],
          'text-size': 12,
          'text-offset': [0, 1.2],
          'text-anchor': 'top',
        },
        paint: {
          'text-color': '#111',
          'text-halo-color': '#fff',
          'text-halo-width': 1.2,
        },
      })

      const adminClickableLayers = [
        'admin-shelters-layer',
        'admin-unrwa-shelters-layer',
        'admin-medical-layer',
        'admin-water-layer',
        'admin-food-layer',
      ]

      adminClickableLayers.forEach((layerId) => {
        const onClick = async (e: any) => {
          const f = e.features?.[0]
          if (!f) return

          const p = f.properties || {}
          const [clickedLng, clickedLat] = f.geometry.coordinates

          await openPlaceCardAndRoute({
            id: String(p.id),
            name: cleanText(p.display_name || p.name || 'موقع'),
            kind: cleanText(p.kind),
            amenity: cleanText(p.amenity),
            operator: cleanText(p.operator),
            lng: clickedLng,
            lat: clickedLat,
            statusText: cleanText(p.statusText) || defaultStatusByKind(cleanText(p.kind)),
          })
        }

        attachAdminHandler('click', layerId, onClick)
        attachAdminHandler('mouseenter', layerId, () => (map.getCanvas().style.cursor = 'pointer'))
        attachAdminHandler('mouseleave', layerId, () => (map.getCanvas().style.cursor = ''))
      })

      applyLayerVisibility()
      window.setTimeout(() => map.resize(), 50)
    }

    if (map.loaded()) {
      attachAdminLayers()
    } else {
      map.once('load', attachAdminLayers)
    }

    return () => {
      cancelled = true
      cleanupAdmin()
    }
  }, [adminSearchItems])

  const openSearchResult = async (item: UnifiedSearchItem) => {
    setSearchResults([])
    setTopSearch(item.name)
    await openPlaceCardAndRoute({
      id: item.id,
      name: item.name,
      kind: item.kind,
      amenity: item.amenity,
      operator: item.operator,
      lng: item.lng,
      lat: item.lat,
      statusText: item.statusText,
    })
  }

  return (
    <div
      ref={wrapperRef}
      style={{
        position: 'relative',
        width: '100%',
        height: `${height}px`,
        minHeight: 500,
        overflow: 'hidden',
        background: '#fff',
        borderRadius: 12,
      }}
    >
      <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
        <div
          ref={containerRef}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            zIndex: 1,
          }}
        />

        <div
          style={{
            position: 'absolute',
            top: 12,
            left: 12,
            width: 360,
            maxWidth: 'calc(100% - 24px)',
            background: 'rgba(255,255,255,0.96)',
            backdropFilter: 'blur(6px)',
            border: '1px solid #e5e7eb',
            borderRadius: 12,
            padding: 10,
            zIndex: 20,
            boxShadow: '0 10px 24px rgba(0,0,0,.16)',
          }}
        >
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setProfile('walking')}
              style={{
                height: 32,
                padding: '0 10px',
                borderRadius: 8,
                border: '1px solid #d1d5db',
                background: profile === 'walking' ? '#e5e7eb' : '#fff',
                cursor: 'pointer',
              }}
            >
              مشي
            </button>

            <button
              type="button"
              onClick={() => setProfile('driving')}
              style={{
                height: 32,
                padding: '0 10px',
                borderRadius: 8,
                border: '1px solid #d1d5db',
                background: profile === 'driving' ? '#e5e7eb' : '#fff',
                cursor: 'pointer',
              }}
            >
              سيارة
            </button>

            <button
              type="button"
              onClick={() => setProfile('cycling')}
              style={{
                height: 32,
                padding: '0 10px',
                borderRadius: 8,
                border: '1px solid #d1d5db',
                background: profile === 'cycling' ? '#e5e7eb' : '#fff',
                cursor: 'pointer',
              }}
            >
              دراجة
            </button>

            <select
              value={routerEngine}
              onChange={(e) => setRouterEngine(e.target.value as RouterEngine)}
              style={{
                flex: 1,
                minWidth: 120,
                height: 32,
                borderRadius: 8,
                border: '1px solid #d1d5db',
                padding: '0 8px',
                fontSize: 13,
                background: '#fff',
              }}
            >
              <option value="osrm">OSRM</option>
              <option value="graphhopper">GraphHopper</option>
              <option value="valhalla">Valhalla</option>
            </select>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              width: '100%',
              height: 40,
              border: '1px solid #e2e8f0',
              background: '#fff',
              borderRadius: 8,
              overflow: 'hidden',
            }}
          >
            <input
              value={topSearch}
              onChange={(e) => {
                setTopSearch(e.target.value)
                if (!e.target.value.trim()) {
                  setSearchResults([])
                  setSearchNotice('')
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  runShelterSearch()
                }
              }}
              placeholder="ابحث عن مركز إيواء أو مستشفى أو نقطة ماء"
              style={{
                height: '100%',
                flex: 1,
                padding: '0 12px',
                fontSize: 14,
                outline: 'none',
                border: 'none',
                minWidth: 0,
                background: 'transparent',
              }}
            />

            <button
              type="button"
              onClick={runShelterSearch}
              title="بحث"
              style={{
                height: '100%',
                width: 44,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: 'none',
                background: '#2563eb',
                cursor: 'pointer',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z"
                  stroke="white"
                  strokeWidth="2"
                />
                <path
                  d="M16.3 16.3 21 21"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>

          {searchResults.length > 0 && (
            <div
              dir="rtl"
              style={{
                marginTop: 8,
                maxHeight: 240,
                overflowY: 'auto',
                border: '1px solid #e5e7eb',
                borderRadius: 10,
                background: '#fff',
              }}
            >
              {searchResults.map((item) => (
                <button
                  key={`${item.source}-${item.id}`}
                  type="button"
                  onClick={() => openSearchResult(item)}
                  style={{
                    width: '100%',
                    textAlign: 'right',
                    padding: '10px 12px',
                    border: 'none',
                    borderBottom: '1px solid #f3f4f6',
                    background: '#fff',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{item.name}</div>
                  <div style={{ marginTop: 4, fontSize: 12, color: '#6b7280' }}>
                    {kindToArabic(item.kind)}
                    {item.operator ? ` • ${item.operator}` : ''}
                    {userLocation
                      ? ` • ${formatDistanceKm(haversineKm(userLocation, { lng: item.lng, lat: item.lat }))}`
                      : ''}
                  </div>
                </button>
              ))}
            </div>
          )}

          <div style={{ marginTop: 8, fontSize: 12, color: '#6b7280', lineHeight: 1.5 }}>
            {isSearching
              ? 'جاري البحث...'
              : searchNotice || 'حدد موقعك أولاً ثم جرّب البحث أو اضغط على أي نقطة في الخريطة.'}
          </div>
        </div>

        {selectedPlace && (
          <div
            dir="rtl"
            style={{
              position: 'absolute',
              top: 12,
              right: 12,
              width: 380,
              maxWidth: 'calc(100% - 24px)',
              background: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: 18,
              overflow: 'hidden',
              zIndex: 40,
              boxShadow: '0 16px 40px rgba(0,0,0,.18)',
            }}
          >
            <div
              style={{
                padding: '14px 16px',
                borderBottom: '1px solid #e5e7eb',
                display: 'flex',
                alignItems: 'start',
                justifyContent: 'space-between',
                gap: 12,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#111827', lineHeight: 1.3 }}>
                  {selectedPlace.name}
                </div>

                <div style={{ marginTop: 6, fontSize: 13, color: '#6b7280' }}>
                  {kindToArabic(selectedPlace.kind)}
                  {selectedPlace.amenity ? ` • ${amenityToArabic(selectedPlace.amenity)}` : ''}
                </div>

                {!!selectedPlace.operator && (
                  <div style={{ marginTop: 6, fontSize: 13, color: '#6b7280' }}>
                    {selectedPlace.operator}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedPlace(null)
                  lastRouteKeyRef.current = ''
                  clearRoute()
                }}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 999,
                  border: 'none',
                  background: '#fff',
                  fontSize: 28,
                  lineHeight: 1,
                  cursor: 'pointer',
                  color: '#374151',
                  flexShrink: 0,
                }}
              >
                ×
              </button>
            </div>

            <div
              style={{
                padding: '14px 16px',
                display: 'flex',
                gap: 10,
                borderBottom: '1px solid #e5e7eb',
              }}
            >
              <button
                type="button"
                onClick={() => openDirections({ lng: selectedPlace.lng, lat: selectedPlace.lat })}
                style={{
                  flex: 1,
                  height: 42,
                  borderRadius: 999,
                  border: 'none',
                  background: '#e8f0fe',
                  color: '#1967d2',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                الاتجاهات
              </button>

              <button
                type="button"
                onClick={() => {
                  const map = mapRef.current
                  if (!map) return
                  map.flyTo({
                    center: [selectedPlace.lng, selectedPlace.lat],
                    zoom: Math.max(map.getZoom(), 16),
                  })
                }}
                style={{
                  flex: 1,
                  height: 42,
                  borderRadius: 999,
                  border: '1px solid #d1d5db',
                  background: '#fff',
                  color: '#111827',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                عرض الموقع
              </button>
            </div>

            <div style={{ padding: '16px' }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '6px 12px',
                  borderRadius: 999,
                  background: '#ecfdf5',
                  color: '#065f46',
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                {selectedPlace.statusText || defaultStatusByKind(selectedPlace.kind)}
              </div>

              {selectedPlace.loading && (
                <div style={{ marginTop: 14, color: '#6b7280', fontSize: 14 }}>
                  جاري حساب المسار...
                </div>
              )}

              {selectedPlace.warning && (
                <div style={{ marginTop: 14, color: '#b45309', fontSize: 14, fontWeight: 700 }}>
                  {selectedPlace.warning}
                </div>
              )}

              {selectedPlace.error && (
                <div style={{ marginTop: 14, color: '#b91c1c', fontSize: 14, fontWeight: 700 }}>
                  {selectedPlace.error}
                </div>
              )}

              {(selectedPlace.distanceText || selectedPlace.durationText) && (
                <div
                  style={{
                    marginTop: 14,
                    padding: 14,
                    border: '1px solid #e5e7eb',
                    borderRadius: 14,
                    background: '#f9fafb',
                    display: 'grid',
                    gap: 10,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ color: '#6b7280', fontSize: 14 }}>المسافة</span>
                    <strong style={{ color: '#111827', fontSize: 15 }}>
                      {selectedPlace.distanceText ?? '—'}
                    </strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ color: '#6b7280', fontSize: 14 }}>الوقت التقريبي</span>
                    <strong style={{ color: '#111827', fontSize: 15 }}>
                      {selectedPlace.durationText ?? '—'}
                    </strong>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {layersOpen && (
          <div
            style={{
              position: 'absolute',
              top: 12,
              left: 388,
              width: 260,
              maxWidth: 'calc(100% - 24px)',
              background: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: 10,
              padding: 10,
              boxShadow: '0 10px 24px rgba(0,0,0,.14)',
              zIndex: 30,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontWeight: 800, color: '#111827' }}>عرض الطبقات</div>
              <button
                type="button"
                onClick={() => setLayersOpen(false)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  border: '1px solid #d1d5db',
                  background: '#fff',
                  cursor: 'pointer',
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 6 }}>
              اختر ما الذي تريد عرضه على الخريطة
            </div>

            <div style={{ marginTop: 10 }}>
              <select
                dir="rtl"
                value={selectedLayerFilter}
                onChange={(e) => setSelectedLayerFilter(e.target.value as LayerFilter)}
                style={{
                  width: '100%',
                  height: 38,
                  borderRadius: 8,
                  border: '1px solid #d1d5db',
                  padding: '0 10px',
                  fontSize: 13,
                  background: '#fff',
                  color: '#111827',
                }}
              >
                <option value="all">إظهار الكل</option>
                <option value="shelters">مراكز الإيواء فقط</option>
                <option value="medical">العيادات الطبية والمستشفيات فقط</option>
                <option value="aid">نقاط الماء فقط</option>
                <option value="food">مراكز الدعم والغذاء فقط</option>
                <option value="none">إخفاء الكل</option>
              </select>
            </div>
          </div>
        )}

        {queryMode && (
          <div
            style={{
              position: 'absolute',
              right: 12,
              bottom: 110,
              padding: '8px 10px',
              background: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: 10,
              boxShadow: '0 10px 24px rgba(0,0,0,.12)',
              zIndex: 15,
              fontSize: 12,
              color: '#111827',
            }}
          >
            Query mode: اضغط على أي عنصر في الخريطة لعرض بياناته
          </div>
        )}

        <div
          dir="rtl"
          style={{
            position: 'absolute',
            right: 12,
            bottom: 12,
            width: 320,
            maxWidth: 'calc(100% - 24px)',
            background: 'rgba(255,255,255,0.96)',
            backdropFilter: 'blur(6px)',
            border: '1px solid #e5e7eb',
            borderRadius: 12,
            padding: '10px 12px',
            display: 'grid',
            gap: 8,
            fontSize: 14,
            zIndex: 20,
            boxShadow: '0 10px 24px rgba(0,0,0,.14)',
          }}
        >
          <div style={{ display: 'grid', gap: 4 }}>
            <span style={{ fontSize: 13, color: '#111827', fontWeight: 600 }}>
              اختر العناصر التي تريد عرضها
            </span>
            <select
              value={selectedLayerFilter}
              onChange={(e) => setSelectedLayerFilter(e.target.value as LayerFilter)}
              style={{
                height: 36,
                borderRadius: 8,
                border: '1px solid #d1d5db',
                padding: '0 10px',
                fontSize: 13,
                background: '#fff',
              }}
            >
              <option value="all">إظهار الكل</option>
              <option value="shelters">مراكز الإيواء فقط</option>
              <option value="medical">العيادات الطبية والمستشفيات فقط</option>
              <option value="aid">نقاط الماء فقط</option>
              <option value="food">مراكز الدعم والغذاء فقط</option>
              <option value="none">إخفاء الكل</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  )
}


const gazaPlaces = [
  { id: 'shelter_01', name: 'مأوى الأزهر', type: 'Shelter', lng: 34.4667, lat: 31.5017 },
  { id: 'aid_01', name: 'مركز توزيع', type: 'Aid Center', lng: 34.45, lat: 31.52 },
  { id: 'clinic_01', name: 'عيادة', type: 'Clinic', lng: 34.48, lat: 31.51 },
];


export default function MapPreview () {
  const [fullOpen, setFullOpen] = useState(false);

  const filteredPlaces = gazaPlaces;

  return (
    <>
      <Card className="h-full">
        <CardHeader className="py-4">
          <div className="flex items-center justify-between gap-3">
            <CardTitle dir="ltr" className="text-base text-left">
              Map Preview
            </CardTitle>

            <Button
              dir="ltr"
              variant="outline"
              size="sm"
              onClick={() => setFullOpen(true)}
            >
              Open Full Map
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-4">
          <div dir="ltr" className="rounded-lg overflow-hidden">
            <MapLibrePreview
              lng={34.4667}
              lat={31.5}
              zoom={10}
              height={420}
              places={filteredPlaces}
              osmEnabled={true}
              osmAmenities={[
                'hospital',
                'clinic',
                'school',
                'pharmacy',
                'doctors',
                'drinking_water',
              ]}
              osmCategories={{
                shelters: true,
                medical: true,
                aid: true,
              }}
            />
          </div>
        </CardContent>
      </Card>

      <Dialog open={fullOpen} onOpenChange={setFullOpen}>
        <DialogContent className="max-w-[1100px] p-0 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <div dir="ltr" className="font-semibold">Full Map</div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setFullOpen(false)}
            >
              Close
            </Button>
          </div>

          <div className="p-4">
            <MapLibrePreview
              lng={34.4667}
              lat={31.5}
              zoom={11}
              height={650}
              places={filteredPlaces}
              osmEnabled={true}
              osmAmenities={[
                'hospital',
                'clinic',
                'school',
                'pharmacy',
                'doctors',
                'drinking_water',
              ]}
              osmCategories={{
                shelters: true,
                medical: true,
                aid: true,
              }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};