"use client"
import { useEffect, useState } from "react"

export default function SeatMap({ eventId, tierId, selected, onChange }) {
  const [tickets, setTickets] = useState([])

  useEffect(() => {
    if (!tierId) return
    fetch(`http://127.0.0.1:8000/events/${eventId}/tickets?tier_id=${tierId}`)
      .then(r => r.json())
      .then(setTickets)
  }, [eventId, tierId])

  const toggle = id => {
    onChange(
      selected.includes(id)
        ? selected.filter(x => x !== id)
        : [...selected, id]
    )
  }

  return (
    <div className="grid grid-cols-6 gap-2 mb-3">
      {tickets.map(t => (
        <button
          key={t.id}
          disabled={t.status !== "available"}
          onClick={() => toggle(t.id)}
          className={`p-2 text-xs rounded border
            ${selected.includes(t.id) ? "bg-orange-400" : "bg-gray-100"}
            ${t.status !== "available" && "opacity-40 cursor-not-allowed"}
          `}
        >
          {t.row_label}{t.seat_number}
        </button>
      ))}
    </div>
  )
}
