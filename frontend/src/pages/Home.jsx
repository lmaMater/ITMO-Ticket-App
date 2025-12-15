"use client"

import * as React from "react"
import Carousel from "@/components/Carousel"
import EventGallery from "@/components/EventGallery"
import Footer from "@/components/Footer"
import EditEventModal from "@/components/EditEventModal"
import { Button } from "@/components/ui/button"
import { UserContext } from "@/components/UserContext"

export default function Home() {
  const [events, setEvents] = React.useState([])
  const [venues, setVenues] = React.useState([])
  const [openEdit, setOpenEdit] = React.useState(false)
  const [editingEvent, setEditingEvent] = React.useState(null)

  const { user } = React.useContext(UserContext)
  const isAdmin = user?.role === "admin"

  // загрузка событий и залов
  React.useEffect(() => {
    fetch("http://127.0.0.1:8000/events")
      .then(r => r.ok ? r.json() : [])
      .then(setEvents)
      .catch(console.error)

    if (isAdmin) {
      const token = localStorage.getItem("access_token")
      fetch("http://127.0.0.1:8000/admin/venues", { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : [])
        .then(setVenues)
        .catch(console.error)
    }
  }, [isAdmin])

  const handleOpenCreate = () => {
    // создаём пустой объект для формы — modal сам подхватит пустые поля
    setEditingEvent(null)
    setOpenEdit(true)
  }

  const handleSaveEvent = (savedEvent) => {
    // если эвент уже есть, обновляем его в списке
    setEvents(prev => {
      const exists = prev.find(e => e.id === savedEvent.id)
      if (exists) {
        return prev.map(e => e.id === savedEvent.id ? savedEvent : e)
      }
      return [savedEvent, ...prev] // добавляем новый в начало
    })
  }

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1">
        <Carousel />

        {isAdmin && (
          <div className="flex justify-center my-4">
            <Button onClick={handleOpenCreate}>➕ Создать мероприятие</Button>
          </div>
        )}

        <EventGallery events={events} />

        <EditEventModal
          open={openEdit}
          onClose={() => setOpenEdit(false)}
          event={editingEvent}
          venues={venues}          // <-- передаём сюда уже загруженные залы
          onSave={handleSaveEvent}
        />
      </main>

      <Footer />
    </div>
  )
}
