"use client"
import React, { useEffect, useState, useContext } from "react"
import { useSearchParams } from "react-router-dom"
import VenueModal from "@/components/VenueModal"
import EditVenueModal from "@/components/EditVenueModal"
import { UserContext } from "@/components/UserContext"
import { Button } from "@/components/ui/button"

export default function VenuesPage() {
  const { user } = useContext(UserContext)
  const isAdmin = user?.role === "admin"

  const [searchParams, setSearchParams] = useSearchParams()
  const venueId = searchParams.get("id")

  const [venues, setVenues] = useState([])
  const [venue, setVenue] = useState(null)
  const [openEdit, setOpenEdit] = useState(false)
  const [creatingNew, setCreatingNew] = useState(false)

  // загрузка списка залов
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

  const handleVenueSaved = (updated) => {
    // если новый зал — добавляем в список, иначе обновляем
    setVenues(prev => {
      const idx = prev.findIndex(v => v.id === updated.id)
      if (idx >= 0) {
        const newArr = [...prev]
        newArr[idx] = updated
        return newArr
      } else {
        return [...prev, updated]
      }
    })
    setCreatingNew(false)
  }

  return (
    <div className="space-y-6 p-4">
      <h1 className="text-3xl font-bold text-center">Список залов</h1>

      {isAdmin && (
        <div className="text-center mb-4">
          <Button onClick={() => setCreatingNew(true)}>➕ Создать новый зал</Button>
        </div>
      )}

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

      {/* редактирование/просмотр зала */}
      {venue && <VenueModal venue={venue} onClose={closeModal} onVenueSaved={handleVenueSaved} />}

      {/* создание нового зала */}
      {creatingNew && (
        <EditVenueModal
          open={creatingNew}
          onClose={() => setCreatingNew(false)}
          venue={{ name: "", address: "", seats_map_json: {} }} // пустой объект для создания
          onSave={handleVenueSaved}
        />
      )}
    </div>
  )
}
