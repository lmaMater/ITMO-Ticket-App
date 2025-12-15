"use client"
import React, { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import EventCard from "./EventCard"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Link } from "react-router-dom"

export default function VenueModal({ venue, onClose }) {
  const [events, setEvents] = useState([])
  const [seats, setSeats] = useState([])
  const [loadingEvents, setLoadingEvents] = useState(true)
  const [loadingSeats, setLoadingSeats] = useState(false)
  const [showSeats, setShowSeats] = useState(false)
  const [errorEvents, setErrorEvents] = useState("")
  const [errorSeats, setErrorSeats] = useState("")
  const [selectedSeat, setSelectedSeat] = useState(null)

  useEffect(() => {
    if (!venue) return
    setLoadingEvents(true)
    setErrorEvents("")
    ;(async () => {
      try {
        const res = await fetch(`http://127.0.0.1:8000/events?venue_id=${venue.id}`)
        const data = await safeParse(res)
        setEvents(Array.isArray(data) ? data : [])
      } catch (e) {
        console.error("events load err", e)
        setErrorEvents("Не удалось загрузить мероприятия: " + (e.message || ""))
        setEvents([])
      } finally {
        setLoadingEvents(false)
      }
    })()
  }, [venue])

  const loadSeats = async () => {
    setLoadingSeats(true)
    setErrorSeats("")
    try {
      const res = await fetch(`http://127.0.0.1:8000/venues/${venue.id}/seats`)
      const data = await safeParse(res)
      setSeats(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error("seats load err", e)
      setErrorSeats("Не удалось загрузить места")
      setSeats([])
    } finally {
      setLoadingSeats(false)
    }
  }

  // --- легенда ---
  const seatTypes = Array.from(new Set(seats.map(s => s.seat_type).filter(Boolean)))
  const tierNames = Array.from(
    new Set(
      events
        .flatMap(ev => (ev.price_tiers || []).map(t => t.name))
        .filter(Boolean)
        .map(t => t.trim().toLowerCase()) // нормализация
    )
  ).map(t => t.charAt(0).toUpperCase() + t.slice(1)) // первый символ заглавный

  const legendKeys = [...seatTypes, ...tierNames]

  const palette = ["bg-yellow-300","bg-amber-300","bg-lime-300","bg-cyan-300","bg-sky-300","bg-violet-300","bg-pink-300","bg-rose-300","bg-emerald-300"]
  const typeColors = {}
  legendKeys.forEach((k, i) => typeColors[k] = palette[i % palette.length])

  const rows = {}
  seats.forEach(s => {
    const r = s.row_label || "?"
    if (!rows[r]) rows[r] = []
    rows[r].push(s)
  })
  const sortedRowKeys = Object.keys(rows).sort()

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 overflow-auto">
      <div className="bg-white rounded-lg w-full max-w-6xl p-5 flex flex-col gap-4 max-h-[90vh]">
        {/* header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">{venue.name}</h2>
            <div className="text-sm text-gray-600">{venue.address}</div>
          </div>
          <Button size="sm" onClick={onClose}>Закрыть</Button>
        </div>

        {/* контент: мероприятия + схема */}
        <div className="flex flex-col gap-4 overflow-auto max-h-[70vh]">
          {/* events */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Актуальные мероприятия в этом месте</h3>
            {loadingEvents ? (
              <div className="text-sm text-gray-500">Загрузка...</div>
            ) : errorEvents ? (
              <div className="text-sm text-red-600">{errorEvents}</div>
            ) : events.length === 0 ? (
              <div className="text-sm text-gray-500">Нет мероприятий</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {events.map(ev => (
                  <Link key={ev.id} to={`/events/${ev.id}`} className="no-underline" onClick={onClose}>
                    <EventCard event={ev} minPrice={computeMinPrice(ev)} />
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* seats toggle */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">{seats.length ? `${seats.length} мест в базе` : "Схема: неизвестно / танцпол"}</div>
            <Button size="sm" onClick={async () => { if (!showSeats) await loadSeats(); setShowSeats(s => !s) }}>
              {showSeats ? "Спрятать места" : "Показать места"}
            </Button>
          </div>

          {/* seats + legend */}
          {showSeats && (
            <div className="border rounded p-3 bg-gray-50 flex gap-6">
              <div className="flex-1 min-w-0">
                <h4 className="font-medium mb-2">Места (схема)</h4>
                {loadingSeats ? (
                  <div className="text-sm text-gray-500">Загрузка...</div>
                ) : errorSeats ? (
                  <div className="text-sm text-red-600">{errorSeats}</div>
                ) : seats.length === 0 ? (
                  <div className="text-sm text-gray-700">Танцпол — мест нет в схеме. Смотри тарифы в мероприятиях.</div>
                ) : (
                  <ScrollArea className="max-h-56 overflow-y-auto border rounded p-2 bg-white">
                    <div className="space-y-2">
                      {sortedRowKeys.map(rowLabel => (
                        <div key={rowLabel} className="flex items-center gap-2">
                          <div className="w-8 font-bold text-sm">{rowLabel}</div>
                          <div className="flex gap-1 overflow-x-auto min-w-0">
                            {rows[rowLabel].map(s => (
                              <div
                                key={s.id}
                                className={`px-2 py-1 text-xs rounded border min-w-[36px] text-center ${typeColors[s.seat_type] ?? "bg-gray-200"} ${selectedSeat?.id === s.id ? "border-2 border-blue-500" : ""}`}
                                onClick={() => setSelectedSeat(s)}
                              >
                                {s.seat_number}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>

              {/* legend */}
              <div className="w-56">
                <h4 className="font-medium mb-2">Легенда</h4>
                <div className="flex flex-col gap-2">
                  {legendKeys.map(k => (
                    <div key={k} className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-sm border ${typeColors[k] ?? "bg-gray-200"}`}></div>
                      <div className="text-sm">{k}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* helpers */
function computeMinPrice(ev) {
  try {
    const prices = (ev.price_tiers || []).map(t => Number(t.price || 0)).filter(p => p > 0)
    if (!prices.length) return null
    return Math.min(...prices)
  } catch {
    return null
  }
}

async function safeParse(res) {
  try {
    return await res.json()
  } catch (e) {
    try {
      const text = await res.text()
      const maybe = text.trim()
      const unwrapped = (maybe.startsWith('"') && maybe.endsWith('"')) ? JSON.parse(maybe) : maybe
      return JSON.parse(unwrapped)
    } catch (e2) {
      console.error("safeParse failed", e2)
      throw e2
    }
  }
}
