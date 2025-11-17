"use client"

import React, { useState, useContext, useEffect } from "react"
import { UserContext } from "./UserContext"

export default function TicketModal({ open, onClose, event }) {
  const { user } = useContext(UserContext)
  const [tierId, setTierId] = useState(null)
  const [qty, setQty] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  useEffect(() => {
    if (event?.price_tiers?.length) {
      setTierId(prev => prev ?? event.price_tiers[0].id)
    } else {
      setTierId(null)
    }
    setQty(1)
    setError("")
    setSuccess("")
  }, [event, open])

  if (!open) return null

  const selectedTier = event?.price_tiers?.find(t => t.id === Number(tierId))
  const total = selectedTier ? (Number(selectedTier.price) * Number(qty)) : 0

  const handlePurchase = async () => {
    setError("")
    if (!user) {
      setError("Нужно войти в аккаунт")
      return
    }
    if (!selectedTier) {
      setError("Выберите тариф")
      return
    }

    setLoading(true)
    try {
      const token = localStorage.getItem("access_token")
      const payload = {
        items: [
          {
            ticket_id: selectedTier.id, // или ID конкретного билета
            price: Number(selectedTier.price)
          }
        ]
      }


      const res = await fetch("http://127.0.0.1:8000/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.detail || `Ошибка ${res.status}`)
      }

      const data = await res.json()
      setSuccess(`Успешно! Заказ #${data.id} создан.`)
      setTimeout(() => {
        setSuccess("")
        onClose()
      }, 900)
    } catch (err) {
      setError(err.message || "Ошибка покупки")
    } finally {
      setLoading(false)
    }
  }



  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-lg max-w-lg w-full p-6">
        <h3 className="text-xl font-semibold mb-3">{event?.title ?? "Покупка билета"}</h3>

        <div className="space-y-3">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Тариф</label>
            <select
              value={tierId ?? ""}
              onChange={(e) => setTierId(e.target.value)}
              className="w-full border rounded px-3 py-2"
            >
              {event?.price_tiers?.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name} — {t.price}₽
                </option>
              ))}
              {!event?.price_tiers?.length && <option value="">Нет доступных тарифов</option>}
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Кол-во</label>
            <input
              type="number"
              min="1"
              value={qty}
              onChange={(e) => setQty(Math.max(1, Number(e.target.value || 1)))}
              className="w-24 border rounded px-3 py-2"
            />
          </div>

          <div className="flex items-center justify-between mt-2">
            <div>
              <div className="text-xs text-gray-500">Итого</div>
              <div className="text-lg font-semibold">{total}₽</div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                disabled={loading}
              >
                Отмена
              </button>
              <button
                onClick={handlePurchase}
                className="px-4 py-2 bg-orange-500 text-black rounded font-semibold hover:bg-orange-600"
                disabled={loading}
              >
                {loading ? "Обрабатываем..." : "Купить"}
              </button>
            </div>
          </div>

          {error && <div className="text-red-500 text-sm">{error}</div>}
          {success && <div className="text-green-600 text-sm">{success}</div>}
        </div>
      </div>
    </div>
  )
}
