'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, MapPin, Loader2, X } from 'lucide-react'

interface NominatimResult {
  place_id: number
  display_name: string
  lat: string
  lon: string
  type: string
  importance: number
}

interface AddressSearchProps {
  onSelect: (lat: number, long: number, displayName: string) => void
  placeholder?: string
  initialValue?: string
  disabled?: boolean
}

export default function AddressSearch({
  onSelect,
  placeholder = 'Search for an address…',
  initialValue = '',
  disabled = false,
}: AddressSearchProps) {
  const [query, setQuery] = useState(initialValue)
  const [results, setResults] = useState<NominatimResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [selectedName, setSelectedName] = useState(initialValue)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 3) {
      setResults([])
      setIsOpen(false)
      return
    }

    // Cancel previous request
    abortRef.current?.abort()
    abortRef.current = new AbortController()

    setIsLoading(true)
    try {

      const url = `http://localhost:3001/api/places/search?q=${encodeURIComponent(q)}`
      const res = await fetch(url, {
        signal: abortRef.current.signal,
        headers: { 'Accept-Language': 'en' },
      })
      const data: NominatimResult[] = await res.json()
      setResults(data)
      setIsOpen(data.length > 0)
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Nominatim error:', err)
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setQuery(val)
    setSelectedName('') // clear confirmed selection while typing

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(val), 400)
  }

  const handleSelect = (result: NominatimResult) => {
    const displayName = result.display_name
    setQuery(displayName)
    setSelectedName(displayName)
    setResults([])
    setIsOpen(false)
    onSelect(parseFloat(result.lat), parseFloat(result.lon), displayName)
  }

  const handleClear = () => {
    setQuery('')
    setSelectedName('')
    setResults([])
    setIsOpen(false)
    abortRef.current?.abort()
  }

  // Shorten a long Nominatim display_name for dropdown readability
  const shortenName = (name: string) => {
    const parts = name.split(', ')
    if (parts.length <= 3) return name
    return parts.slice(0, 3).join(', ') + '…'
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative flex items-center">
        <Search className="absolute left-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          className={`
            w-full pl-8 pr-8 py-2 border rounded-md text-sm
            text-gray-900 dark:text-gray-100
            bg-white dark:bg-gray-800
            border-gray-300 dark:border-gray-600
            focus:outline-none focus:ring-2 focus:ring-blue-500
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors
            ${selectedName ? 'border-green-500 dark:border-green-600' : ''}
          `}
        />
        <div className="absolute right-2.5 flex items-center">
          {isLoading
            ? <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
            : query
              ? <button onClick={handleClear} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="h-4 w-4" />
              </button>
              : null
          }
        </div>
      </div>

      {isOpen && results.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {results.map((r) => (
            <li key={r.place_id}>
              <button
                onClick={() => handleSelect(r)}
                className="w-full flex items-start gap-2.5 px-3 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-blue-500" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {shortenName(r.display_name)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {parseFloat(r.lat).toFixed(4)}, {parseFloat(r.lon).toFixed(4)}
                  </p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {selectedName && (
        <p className="mt-1 text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
          <MapPin className="h-3 w-3" />
          <span className="truncate">{shortenName(selectedName)}</span>
        </p>
      )}
    </div>
  )
}
