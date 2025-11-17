// /frontend/src/components/TicketModal.jsx
"use client"
import * as React from "react"

export default function TicketModal({ event, isOpen, onClose }) {
  const [qty, setQty] = React.useState(1)

  if (!isOpen) return null

  const minPrice = event.price_tiers.reduce((min, t) => Math.min(min, t.price), Infinity)

  const handlePurchase = () => {
    alert(`Покупаем ${qty} билет(ов) на ${event.title} по цене от ${minPrice}₽`)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-black text-white rounded-lg p-6 max-w-md w-full relative">
        <button
          className="absolute top-2 right-2 text-gray-400 hover:text-white"
          onClick={onClose}
        >
          ✕
        </button>

        <h2 className="text-2xl font-bold mb-4">{event.title}</h2>
        <p className="text-sm text-gray-300 mb-4">{event.venue.name} · {event.genre.name}</p>
        <p className="mb-4">Стоимость от {minPrice}₽</p>

        <div className="flex items-center gap-4 mb-6">
          <label htmlFor="qty" className="text-sm">Количество:</label>
          <input
            id="qty"
            type="number"
            min={1}
            value={qty}
            onChange={e => setQty(parseInt(e.target.value))}
            className="w-16 px-2 py-1 text-black rounded"
          />
        </div>

        <button
          onClick={handlePurchase}
          className="bg-orange-500 hover:bg-orange-600 text-black font-semibold px-5 py-2 rounded w-full"
        >
          Купить
        </button>
      </div>
    </div>
  )
}
