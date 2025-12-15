"use client"

import React, { useState, useContext, useEffect } from "react"
import { UserContext } from "./UserContext"
import SeatMap from "./SeatMap"
import { ScrollArea } from "@/components/ui/scroll-area"

export default function TicketModal({ open, onClose, event }) {
  const { user, updateUser } = useContext(UserContext)

  const [tierId, setTierId] = useState(null)
  const [qty, setQty] = useState(1)
  const [hasSeats, setHasSeats] = useState(false)
  const [selectedSeats, setSelectedSeats] = useState([])

  const [availableMap, setAvailableMap] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  useEffect(() => {
    if (!open || !event) return

    setTierId(event.price_tiers?.[0]?.id ?? null)
    setQty(1)
    setSelectedSeats([])
    setError("")
    setSuccess("")

    fetch(`http://127.0.0.1:8000/events/${event.id}/has-seats`)
      .then(r => r.json())
      .then(d => setHasSeats(d.has_seats))
      .catch(() => setHasSeats(false))

    Promise.all(
      (event.price_tiers || []).map(async t => {
        const res = await fetch(
          `http://127.0.0.1:8000/events/${event.id}/tier/${t.id}/available`
        )
        const data = await res.json().catch(() => ({}))
        return [t.id, data.available ?? 0]
      })
    ).then(arr => setAvailableMap(Object.fromEntries(arr)))
  }, [event, open])

  if (!open || !event) return null

  const selectedTier = event.price_tiers.find(t => t.id === tierId)
  const maxQty = availableMap[tierId] ?? 0

  const total = hasSeats
    ? selectedSeats.length * Number(selectedTier?.price ?? 0)
    : qty * Number(selectedTier?.price ?? 0)

  const handlePurchase = async () => {
    setError("")

    if (!user) return setError("Нужно войти")
    if (!selectedTier) return setError("Выберите тариф")

    let payload

    if (!hasSeats) {
      if (qty > maxQty) return setError(`Максимум ${maxQty}`)
      payload = {
        items: [{ tier_id: tierId, quantity: qty }]
      }
    } else {
      if (selectedSeats.length === 0)
        return setError("Выберите места")

      payload = {
        items: selectedSeats.map(id => ({ ticket_id: id }))
      }
    }

    setLoading(true)
    try {
      const res = await fetch("http://127.0.0.1:8000/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("access_token")}`
        },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.detail || "Ошибка покупки")
      }

      const data = await res.json()
      updateUser?.({ ...user, wallet_balance: data.wallet_balance })
      setSuccess(`Заказ #${data.id} оформлен`)

      setTimeout(() => {
        setSuccess("")
        onClose()
      }, 800)
    } catch (e) {
      setError(e.message || "Ошибка")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-lg max-h-[90vh] flex flex-col">

        {/* HEADER */}
        <div className="p-6 border-b shrink-0">
          <h3 className="text-xl font-semibold">{event.title}</h3>
        </div>

        {/* SCROLLABLE CONTENT */}
        <ScrollArea className="px-6 py-4 max-h-[65vh]">
          <div className="space-y-4">

            {/* Tier */}
            <div>
              <label className="block text-sm text-gray-600 mb-1">Тариф</label>
              <select
                value={tierId ?? ""}
                onChange={e => setTierId(Number(e.target.value))}
                className="w-full border rounded px-3 py-2"
              >
                {event.price_tiers.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name} — {t.price}₽ (осталось {availableMap[t.id] ?? 0})
                  </option>
                ))}
              </select>
            </div>

            {/* Quantity */}
            {!hasSeats && (
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Количество
                </label>
                <input
                  type="number"
                  min="1"
                  max={maxQty}
                  value={qty}
                  onChange={e =>
                    setQty(Math.min(maxQty, Math.max(1, Number(e.target.value))))
                  }
                  className="border rounded px-3 py-2 w-24"
                />
                <div className="text-xs text-gray-500 mt-1">
                  Доступно: {maxQty}
                </div>
              </div>
            )}

            {/* Seat map */}
            {hasSeats && (
              <div>
                <div className="text-sm text-gray-600 mb-2">
                  Выберите места
                </div>

                {/* ВАЖНО: ограничиваем высоту карты */}
                <div className="border rounded max-h-[320px] overflow-hidden">
                  <ScrollArea className="h-[320px]">
                    <SeatMap
                      eventId={event.id}
                      tierId={tierId}
                      selected={selectedSeats}
                      onChange={setSelectedSeats}
                    />
                  </ScrollArea>
                </div>

                <div className="text-xs text-gray-500 mt-1">
                  Выбрано мест: {selectedSeats.length}
                </div>
              </div>
            )}

            {/* Total */}
            <div className="flex justify-between items-center pt-2">
              <div className="text-sm text-gray-500">Итого</div>
              <div className="text-lg font-semibold">{total}₽</div>
            </div>

            {error && <div className="text-red-500 text-sm">{error}</div>}
            {success && <div className="text-green-600 text-sm">{success}</div>}
          </div>
        </ScrollArea>

        {/* FOOTER */}
        <div className="p-4 border-t shrink-0 flex gap-2 justify-end">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
          >
            Отмена
          </button>
          <button
            onClick={handlePurchase}
            disabled={loading}
            className="px-4 py-2 bg-orange-500 rounded font-semibold hover:bg-orange-600"
          >
            {loading ? "Обработка..." : "Купить"}
          </button>
        </div>
      </div>
    </div>
  )
}
