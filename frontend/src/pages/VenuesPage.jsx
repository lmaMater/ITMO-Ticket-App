"use client"
import React, { useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"
import VenueModal from "@/components/VenueModal"

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
    <div className="space-y-6 p-4">
      <h1 className="text-3xl font-bold text-center">Список залов</h1>

      <div className="space-y-4">
        {venues.map(v => (
          <div
            key={v.id}
            className="border p-4 rounded cursor-pointer hover:bg-gray-100 transition"
            onClick={() => openModal(v.id)}
          >
            <div className="font-semibold text-lg">{v.name}</div>
            <div className="text-sm text-gray-600">{v.address}</div>
          </div>
        ))}
      </div>

      {venue && <VenueModal venue={venue} onClose={closeModal} />}
    </div>
  )
}
