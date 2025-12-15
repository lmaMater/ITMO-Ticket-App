// src/components/OrderModal.jsx
"use client"
import React, { useEffect, useState, useContext } from "react"
import { UserContext } from "@/components/UserContext"

export default function OrderModal({ order: initialOrder, onClose, onUpdateOrder, onRefetchOrders }) {
  const { user, updateUser } = useContext(UserContext)
  const [order, setOrder] = useState(initialOrder)
  const [loadingIds, setLoadingIds] = useState(new Set()) // set of ticket ids loading
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    setOrder(initialOrder)
  }, [initialOrder])

  const setLoading = (id) => setLoadingIds(s => new Set([...s, id]))
  const clearLoading = (id) => setLoadingIds(s => { const n = new Set(s); n.delete(id); return n })

  const activateTicket = async (ticketId) => {
    if (!confirm("Активировать билет? Это действие необратимо.")) return
    setError("")
    setLoading(ticketId)
    try {
      const token = localStorage.getItem("access_token")
      const res = await fetch(`http://127.0.0.1:8000/tickets/${ticketId}/activate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
      })
      if (!res.ok) {
        const b = await res.json().catch(()=>({}))
        throw new Error(b.detail || "Ошибка активации")
      }
      // локально обновляем статус билета
      const next = {
        ...order,
        items: order.items.map(it => (it.ticket_id === ticketId ? { ...it, status: "activated" } : it))
      }
      setOrder(next)
      onUpdateOrder?.(next)
    } catch (e) {
      console.error(e)
      setError(e.message || "Ошибка")
    } finally {
      clearLoading(ticketId)
    }
  }

  const refundOrder = async () => {
    if (!confirm("Запросить возврат по этому заказу? Возврат затронет все ещё неактивированные билеты.")) return
    setError("")
    setActionLoading(true)
    try {
      const token = localStorage.getItem("access_token")
      const res = await fetch(`http://127.0.0.1:8000/orders/${order.id}/refund`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
      })
      if (!res.ok) {
        const b = await res.json().catch(()=>({}))
        throw new Error(b.detail || "Ошибка возврата")
      }
      const data = await res.json() // backend returns { refunded, amount }
      // помечаем проданные (sold) как canceled — backend должен вернуть что сделал, но мы синхронизируем UI:
      const next = {
        ...order,
        items: order.items.map(it => it.status === "sold" ? { ...it, status: "canceled" } : it),
        total_amount: Math.max(0, (order.total_amount - (data.amount || 0)))
      }
      setOrder(next)
      onUpdateOrder?.(next)
      // если бек вернул wallet balance — обновим контекст юзера
      if (data.wallet_balance && updateUser) {
        updateUser({ ...user, wallet_balance: data.wallet_balance })
      } else {
        // иначе имеем смысл перезапросить заказы/профиль
        onRefetchOrders?.()
      }
    } catch (e) {
      console.error(e)
      setError(e.message || "Ошибка")
    } finally {
      setActionLoading(false)
    }
  }

  // helper to style status
  const statusClass = (s) => {
    if (s === "activated") return "bg-green-100 text-green-800"
    if (s === "canceled") return "bg-red-100 text-red-800"
    if (s === "sold") return "bg-yellow-100 text-yellow-800"
    return "bg-gray-100 text-gray-800"
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-lg w-full max-w-3xl p-5 overflow-auto max-h-[90vh]">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-xl font-semibold">Заказ #{order.id}</h3>
            <div className="text-sm text-gray-600">Сумма: {order.total_amount.toFixed(2)} ₽</div>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="px-3 py-1 bg-gray-200 rounded">Закрыть</button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          {order.items.map(item => (
            <div key={item.id} className="border rounded p-3 flex flex-col gap-2">
              {item.event_poster && (
                <img src={item.event_poster} alt={item.event_title} className="w-full h-28 object-cover rounded" />
              )}
              <div className="text-sm font-semibold truncate">{item.event_title ?? item.ticket_name}</div>
              {item.tier_name && <div className="text-xs text-gray-600">Тариф: {item.tier_name}</div>}
              {item.seat_label && <div className="text-xs text-gray-600">Место: {item.seat_label}</div>}
              <div className="text-sm">Цена: {item.price.toFixed(2)} ₽</div>

              <div className={`inline-block px-2 py-1 text-xs rounded ${statusClass(item.status)}`}>
                {item.status}
              </div>

              <div className="mt-2">
                {item.status === "sold" && (
                  <button
                    type="button"
                    onClick={() => activateTicket(item.ticket_id ?? item.ticket_id)}
                    disabled={loadingIds.has(item.ticket_id)}
                    className="w-full px-2 py-1 bg-green-600 text-white rounded text-sm"
                  >
                    {loadingIds.has(item.ticket_id) ? "..." : "Активировать"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {error && <div className="mt-3 text-sm text-red-600">{error}</div>}

        <div className="flex justify-between items-center mt-4">
          <div className="text-sm text-gray-600">Статус заказа: {order.status}</div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={refundOrder}
              disabled={actionLoading}
              className="px-3 py-1 bg-red-500 text-white rounded"
            >
              {actionLoading ? "Обрабатываем..." : "Запросить возврат (все неактивированные)"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
