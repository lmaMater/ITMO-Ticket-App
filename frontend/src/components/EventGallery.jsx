import { useEffect, useState } from "react"
import EventCard from "./EventCard"

export default function EventGallery() {
  const [events, setEvents] = useState([])
  const [minPrices, setMinPrices] = useState({})

  useEffect(() => {
    fetch("http://127.0.0.1:8000/events")
      .then(res => res.json())
      .then(events => {
        setEvents(events)
        events.forEach(ev => {
          fetch(`http://127.0.0.1:8000/events/${ev.id}/min_price`)
            .then(r => r.json())
            .then(data => setMinPrices(prev => ({ ...prev, [ev.id]: data.min_price })))
        })
      })
  }, [])

  return (
    <div className="py-10 px-4">
      <h2 className="text-2xl font-bold mb-6">Все события</h2>
      <div className="grid grid-cols-3 gap-6">
        {events.map(event => (
          <EventCard key={event.id} event={event} minPrice={minPrices[event.id]} />
        ))}
      </div>
    </div>
  )
}
