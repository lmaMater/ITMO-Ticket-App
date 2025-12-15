"use client"

import React, { useState, useEffect, useContext } from "react"
import { UserContext } from "./UserContext"
import SeatMap from "./SeatMap" // твой компонент карты мест — оставляем его как есть
import { ScrollArea } from "@/components/ui/scroll-area"

export default function TicketModal({ open, onClose, event }) {
  const { user, updateUser } = useContext(UserContext)

  const [tierId, setTierId] = useState(null)
  const [qty, setQty] = useState(1)
  const [selectedSeats, setSelectedSeats] = useState([])

  // availableMap: { [tierId]: { available: number, has_seats: boolean } }
  const [availableMap, setAvailableMap] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  // загрузка avail/has_seats
  useEffect(() => {
    if (!open || !event) return

    setTierId(event.price_tiers?.[0]?.id ?? null)
    setQty(1)
    setSelectedSeats([])
    setError("")
    setSuccess("")
    setAvailableMap({})

    const token = localStorage.getItem("access_token")

    // получаем для каждого тарифа available + has_seats
    Promise.all(
      (event.price_tiers || []).map(async (t) => {
        try {
          const res = await fetch(
            `http://127.0.0.1:8000/events/${event.id}/tier/${t.id}/available`,
            { headers: token ? { Authorization: `Bearer ${token}` } : {} }
          )
          const data = await res.json().catch(() => ({}))
          // fallback на sensible defaults
          return [t.id, { available: Number(data.available ?? 0), has_seats: Boolean(data.has_seats) }]
        } catch (e) {
          return [t.id, { available: 0, has_seats: false }]
        }
      })
    ).then((arr) => {
      setAvailableMap(Object.fromEntries(arr))
    }).catch((e) => {
      console.error("Failed to fetch tier availability", e)
    })
  }, [open, event])

  if (!open || !event) return null

  const selectedTier = event.price_tiers.find(t => t.id === tierId) || null
  const tierInfo = availableMap[tierId] || { available: 0, has_seats: false }
  const maxQty = tierInfo.available
  const tierHasSeats = tierInfo.has_seats

  // total: если сидячие — считаем по выбранным местам, иначе по qty
  const total = (tierHasSeats ? selectedSeats.length : qty) * Number(selectedTier?.price ?? 0)

  const handlePurchase = async () => {
    setError("")
    if (!user) return setError("Нужно войти в аккаунт")
    if (!selectedTier) return setError("Выберите тариф")

    let payload = null

    if (!tierHasSeats) {
      if (qty < 1) return setError("Неверное количество")
      if (qty > maxQty) return setError(`Доступно максимум ${maxQty}`)
      payload = { items: [{ tier_id: tierId, quantity: qty }] }
    } else {
      if (selectedSeats.length === 0) return setError("Выберите места")
      payload = { items: selectedSeats.map(id => ({ ticket_id: id })) }
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
        throw new Error(d.detail || `Ошибка ${res.status}`)
      }

      const data = await res.json()
      // обновляем баланс в контексте
      updateUser?.({ ...user, wallet_balance: data.wallet_balance })
      setSuccess(`Успешно! Заказ #${data.id} создан.`)

      // уменьшить локально доступное число (чтобы UI сразу реагировал)
      setAvailableMap(prev => {
        const prevEntry = prev[tierId] || { available: 0, has_seats: tierHasSeats }
        const newAvailable = prevEntry.available - (tierHasSeats ? selectedSeats.length : qty)
        return { ...prev, [tierId]: { ...prevEntry, available: Math.max(0, newAvailable) } }
      })

      setTimeout(() => {
        setSuccess("")
        onClose()
      }, 800)
    } catch (err) {
      setError(err.message || "Ошибка покупки")
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
          <div className="text-sm text-gray-600 mt-1">{selectedTier ? `${selectedTier.name} — ${selectedTier.price}₽` : ""}</div>
        </div>

        {/* SCROLLABLE CONTENT */}
        <ScrollArea className="px-6 py-4 max-h-[65vh]">
          <div className="space-y-4">

            {/* Tier selector */}
            <div>
              <label className="block text-sm text-gray-600 mb-1">Тариф</label>
              <select
                value={tierId ?? ""}
                onChange={(e) => {
                  const id = Number(e.target.value)
                  setTierId(id)
                  setQty(1)
                  setSelectedSeats([])
                }}
                className="w-full border rounded px-3 py-2"
              >
                {event.price_tiers.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name} — {t.price}₽ (осталось {availableMap[t.id]?.available ?? 0})
                  </option>
                ))}
              </select>
            </div>

            {/* If no seats => quantity input */}
            {!tierHasSeats && (
              <div>
                <label className="block text-sm text-gray-600 mb-1">Количество</label>
                <input
                  type="number"
                  min="1"
                  max={Math.max(1, maxQty)}
                  value={qty}
                  onChange={(e) => setQty(Math.min(maxQty, Math.max(1, Number(e.target.value || 1))))}
                  className="border rounded px-3 py-2 w-28"
                />
                <div className="text-xs text-gray-500 mt-1">Доступно: {maxQty}</div>
              </div>
            )}

            {/* If has seats => show SeatMap */}
            {tierHasSeats && (
              <div>
                <div className="text-sm text-gray-600 mb-2">Выберите места</div>

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

                <div className="text-xs text-gray-500 mt-1">Выбрано мест: {selectedSeats.length}</div>
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
          <button onClick={onClose} disabled={loading} className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">
            Отмена
          </button>
          <button onClick={handlePurchase} disabled={loading} className="px-4 py-2 bg-orange-500 rounded font-semibold hover:bg-orange-600">
            {loading ? "Обработка..." : "Купить"}
          </button>
        </div>
      </div>
    </div>
  )
}
