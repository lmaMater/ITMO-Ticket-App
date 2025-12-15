"use client"
import React, { useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"
import VenueModal from "@/components/VenueModal"
import { Button } from "@/components/ui/button"

export default function VenuesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const venueId = searchParams.get("id")
  const [venues, setVenues] = useState([])
  const [venue, setVenue] = useState(null)

  // список залов
  useEffect(() => {
    fetch("http://127.0.0.1:8000/venues")
      .then(res => res.json())
      .then(data => setVenues(data))
      .catch(console.error)
  }, [])

  // выбранный зал
  useEffect(() => {
    if (!venueId) return setVenue(null)
    fetch(`http://127.0.0.1:8000/venues/${venueId}`)
      .then(res => res.json())
      .then(data => setVenue(data))
      .catch(console.error)
  }, [venueId])

  const openModal = (id) => {
    setSearchParams({ id })
  }

  const closeModal = () => {
    setVenue(null)
    searchParams.delete("id")
    setSearchParams(searchParams)
  }

  return (
    <div className="space-y-4">
      {venues.map(v => (
        <div key={v.id} className="flex justify-between items-center border p-3 rounded">
          <div>
            <div className="font-semibold">{v.name}</div>
            <div className="text-sm text-gray-600">{v.address}</div>
          </div>
          <Button onClick={() => openModal(v.id)}>Открыть</Button>
        </div>
      ))}
      {venue && <VenueModal venue={venue} onClose={closeModal} />}
    </div>
  )
}
