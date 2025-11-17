"use client"

import * as React from "react"
import { useParams } from "react-router-dom"
import { useContext, useEffect, useState } from "react"
import { UserContext } from "@/components/UserContext"
import LoginModal from "@/components/AuthModal" // или тот файл, как у тебя называется
import TicketModal from "@/components/TicketModal"

export default function EventDetail() {
  const { eventId } = useParams()
  const [event, setEvent] = React.useState(null)
  const [minPrice, setMinPrice] = React.useState(null)
  const [loading, setLoading] = React.useState(true)

  const { user } = useContext(UserContext)

  const [openLogin, setOpenLogin] = useState(false)
  const [openTicket, setOpenTicket] = useState(false)
  const [pendingBuy, setPendingBuy] = useState(false) // если хотел купить, но открыл логин

  useEffect(() => {
    if (!eventId) return
    setLoading(true)
    Promise.all([
      fetch(`http://127.0.0.1:8000/events/${eventId}`).then(r => r.ok ? r.json() : Promise.reject()),
      fetch(`http://127.0.0.1:8000/events/${eventId}/min_price`).then(r => r.ok ? r.json() : Promise.resolve({min_price: null})),
    ])
      .then(([ev, price]) => {
        setEvent(ev)
        setMinPrice(price?.min_price ?? null)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [eventId])

  // если пользователь залогинился в процессе — и была попытка купить — открываем билеты
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

  if (loading) return <div className="p-8 text-center">Загружаю...</div>
  if (!event) return <div className="p-8 text-center">Событие не найдено</div>

  return (
    <div className="max-w-4xl mx-auto p-6 flex flex-col gap-6">
        <h1 className="text-3xl font-bold">{event.title}</h1>

        <div className="flex flex-col gap-4">
            <p className="text-sm text-gray-500">
            {event.venue?.name} · {event.genre?.name} · {new Date(event.start_datetime).toLocaleString("ru-RU")}
            </p>

            <p className="whitespace-pre-line">{event.description}</p>

            <div className="flex justify-between items-center mt-4">
            <div>
                <div className="text-xs text-gray-400">Стоимость от</div>
                <div className="text-xl font-semibold">{minPrice ? `${minPrice} ₽` : "—"}</div>
            </div>

            <button
                className="bg-orange-500 hover:bg-orange-600 text-black font-semibold px-5 py-2 rounded"
                onClick={handleBuyClick}
            >
                Купить билет
            </button>
            </div>
        </div>

        {/* Постер всегда снизу */}
        <div className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 mt-6">
            Постер
        </div>

        <LoginModal open={openLogin} onClose={() => { setOpenLogin(false); setPendingBuy(false) }} />
        <TicketModal open={openTicket} onClose={() => setOpenTicket(false)} event={event} />
    </div>
  )
}
