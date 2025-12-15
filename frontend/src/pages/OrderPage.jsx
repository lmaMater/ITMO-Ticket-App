"use client"
import React, { useEffect, useState, useContext } from "react"
import { UserContext } from "@/components/UserContext"
import OrderModal from "@/components/OrderModal"

export default function OrdersPage() {
  const { user, loading: userLoading } = useContext(UserContext)
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [openOrder, setOpenOrder] = useState(null)

  const fetchOrders = async () => {
    if (!user) return
    setLoading(true)
    try {
      const token = localStorage.getItem("access_token")
      const res = await fetch("http://127.0.0.1:8000/orders/me", {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) throw res
      const data = await res.json()
      setOrders(data)
    } catch (err) {
      console.error(err)
      setOrders([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!userLoading) fetchOrders()
  }, [user, userLoading])

  const handleUpdateOrder = (updatedOrder) => {
    setOrders(prev => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o))
  }

  if (userLoading) return <div className="p-8 text-center">Загружаю заказы...</div>
  if (!user) return (
    <div className="p-8 text-center">
      Авторизуйтесь или зарегистрируйтесь, чтобы просматривать свои заказы.
    </div>
  )
  if (!orders.length) return <div className="p-8 text-center">У вас пока нет заказов</div>

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Мои заказы</h1>
      <div className="grid gap-4">
        {orders.map(order => (
          <div
            key={order.id}
            className="border rounded p-4 cursor-pointer hover:shadow-md transition"
            onClick={() => setOpenOrder(order)}
          >
            <div className="flex justify-between items-center">
              <div>
                <div className="text-sm text-gray-500">Заказ #{order.id}</div>
                <div className="font-semibold">{order.items?.[0]?.event_title ?? order.items?.[0]?.ticket_name}</div>
                <div className="text-sm text-gray-600">
                  {order.items?.length ?? 0} билетов · {Array.from(new Set(order.items.map(i => i.tier_name))).filter(Boolean).join(", ")}
                </div>
              </div>
              <div className="text-right font-semibold">
                {order.status === "refunded" ? (
                  <span className="line-through text-gray-400">{order.total_amount.toFixed(2)} ₽</span>
                ) : (
                  <span>{order.total_amount.toFixed(2)} ₽</span>
                )}
                <div className={`text-xs px-2 py-1 rounded mt-1 ${order.status === "paid" ? "bg-yellow-100 text-yellow-800" : "bg-gray-100 text-gray-800"}`}>
                  {order.status}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {openOrder && (
        <OrderModal
          order={openOrder}
          onClose={() => setOpenOrder(null)}
          onUpdateOrder={(upd) => {
            handleUpdateOrder(upd)
            setOpenOrder(upd)
          }}
          onRefetchOrders={fetchOrders}
        />
      )}
    </div>
  )
}
