"use client"
import React, { useEffect, useState, useContext } from "react"
import { UserContext } from "./UserContext"

export default function OrdersPage() {
  const { user } = useContext(UserContext)
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    const token = localStorage.getItem("access_token")
    fetch("http://127.0.0.1:8000/orders/me", {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(setOrders)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [user])

  if (loading) return <div className="p-8 text-center">Загружаю заказы...</div>
  if (!orders.length) return <div className="p-8 text-center">У вас пока нет заказов</div>

  return (
    <div className="max-w-4xl mx-auto p-6 flex flex-col gap-4">
      <h1 className="text-2xl font-bold mb-4">Мои заказы</h1>
      {orders.map(o => (
        <div key={o.id} className="border p-4 rounded shadow-sm flex justify-between">
          <div>
            <div><strong>Заказ:</strong> {o.id}</div>
            <div><strong>Сумма:</strong> {o.total_amount}₽</div>
            <div><strong>Статус:</strong> {o.status}</div>
          </div>
          <div className="flex flex-col gap-1">
            {o.items?.map(item => (
              <div key={item.id}>{item.ticket_name} — {item.price}₽</div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
