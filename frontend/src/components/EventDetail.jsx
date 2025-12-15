"use client"

import * as React from "react"
import { useParams } from "react-router-dom"
import { useContext, useEffect, useState } from "react"
import { UserContext } from "@/components/UserContext"
import LoginModal from "@/components/AuthModal"
import TicketModal from "@/components/TicketModal"
import EditEventModal from "@/components/EditEventModal"
import { Button } from "@/components/ui/button"

export default function EventDetail() {
  const { eventId } = useParams()
  const [event, setEvent] = useState(null)
  const [venues, setVenues] = useState([])
  const [minPrice, setMinPrice] = useState(null)
  const [loading, setLoading] = useState(true)

  const { user } = useContext(UserContext)
  const isAdmin = user?.role === "admin"

  const [openLogin, setOpenLogin] = useState(false)
  const [openTicket, setOpenTicket] = useState(false)
  const [openEdit, setOpenEdit] = useState(false)
  const [pendingBuy, setPendingBuy] = useState(false)

  useEffect(() => {
    if (!eventId) return
    setLoading(true)

    const fetchEvent = fetch(`http://127.0.0.1:8000/events/${eventId}`).then(r => r.ok ? r.json() : null)
    const fetchPrice = fetch(`http://127.0.0.1:8000/events/${eventId}/min_price`).then(r => r.ok ? r.json() : { min_price: null })
    const fetchVenues = fetch(`http://127.0.0.1:8000/admin/venues`).then(r => r.ok ? r.json() : [])

    Promise.all([fetchEvent, fetchPrice, fetchVenues])
      .then(([ev, price, venuesList]) => {
        setEvent(ev)
        setMinPrice(price?.min_price ?? null)
        setVenues(venuesList)
      })
      .finally(() => setLoading(false))
  }, [eventId])

  useEffect(() => {
    if (user && pendingBuy) {
      setOpenLogin(false)
      setOpenTicket(true)
      setPendingBuy(false)
    }
  }, [user, pendingBuy])

  const handleBuyClick = () => {
    if (!user) {
      setOpenLogin(true)
      setPendingBuy(true)
    } else {
      setOpenTicket(true)
    }
  }

  const handleDeleteEvent = async () => {
    if (!confirm("Удалить мероприятие?")) return
    const token = localStorage.getItem("access_token")
    const res = await fetch(`http://127.0.0.1:8000/admin/events/${event.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) window.location.href = "/"
    else alert("Ошибка при удалении")
  }

  if (loading) return <div className="p-8 text-center">Загружаю...</div>
  if (!event) return <div className="p-8 text-center">Событие не найдено</div>

  return (
    <div className="max-w-4xl mx-auto p-6 flex flex-col gap-6">
      <h1 className="text-3xl font-bold">{event.title}</h1>

      <p className="text-sm text-gray-500">
        {event.venue?.name} · {event.genre?.name} ·{" "}
        {new Date(event.start_datetime).toLocaleString("ru-RU")}
      </p>

      <p className="whitespace-pre-line">{event.description}</p>

      <div className="flex justify-between items-center mt-6">
        <div>
          <div className="text-xs text-gray-400">Стоимость от</div>
          <div className="text-xl font-semibold">{minPrice ? `${minPrice} ₽` : "—"}</div>
        </div>

        <div className="flex gap-3">
          <Button onClick={handleBuyClick}>Купить билет</Button>

          {isAdmin && (
            <>
              <Button variant="outline" onClick={() => setOpenEdit(true)}>Редактировать</Button>
              <Button variant="destructive" onClick={handleDeleteEvent}>Удалить</Button>
            </>
          )}
        </div>
      </div>

      <div className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 mt-6">Постер</div>

      <LoginModal open={openLogin} onClose={() => { setOpenLogin(false); setPendingBuy(false) }} />
      <TicketModal open={openTicket} onClose={() => setOpenTicket(false)} event={event} />

      {isAdmin && (
        <EditEventModal
          open={openEdit}
          onClose={() => setOpenEdit(false)}
          event={event}
          venues={venues}
          onSave={setEvent}
        />
      )}
    </div>
  )
}
