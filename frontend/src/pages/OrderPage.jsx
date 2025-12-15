"use client"
import React, { useEffect, useState, useContext } from "react"
import { UserContext } from "@/components/UserContext"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export default function OrdersPage() {
  const { user, loading: userLoading } = useContext(UserContext)
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchOrders = () => {
    if (!user) return
    const token = localStorage.getItem("access_token")
    setLoading(true)
    fetch("http://127.0.0.1:8000/orders/me", {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.ok ? res.json() : Promise.reject(res))
      .then(setOrders)
      .catch(err => console.error(err))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (!userLoading) fetchOrders()
  }, [user, userLoading])

  const handleActivate = async (ticketId) => {
    try {
      const token = localStorage.getItem("access_token")
      const res = await fetch(`http://127.0.0.1:8000/tickets/${ticketId}/activate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) throw new Error("Failed to activate")
      fetchOrders()
    } catch (err) {
      console.error(err)
    }
  }

  const handleRefund = async (orderId) => {
    try {
      const token = localStorage.getItem("access_token")
      const res = await fetch(`http://127.0.0.1:8000/orders/${orderId}/refund`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) throw new Error("Failed to refund")
      fetchOrders()
    } catch (err) {
      console.error(err)
    }
  }

  if (loading) return <div className="p-8 text-center">Загружаю заказы...</div>
  if (!user) return <div className="p-8 text-center">Нужно войти, чтобы видеть заказы</div>
  if (!orders.length) return <div className="p-8 text-center">У вас пока нет заказов</div>

  return (
    <div className="max-w-5xl mx-auto p-6 flex flex-col gap-6">
      <h1 className="text-3xl font-bold mb-4">Мои заказы</h1>

      {orders.map(order => (
        <Card key={order.id} className="border shadow-sm">
          <CardHeader className="flex justify-between items-center">
            <CardTitle>Заказ #{order.id}</CardTitle>
            <Badge variant={order.status === "paid" ? "success" : "destructive"}>
              {order.status}
            </Badge>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-4">
              {order.items.map(item => (
                <Card key={item.id} className="w-[220px] border shadow-xs">
                  {item.event_poster && <img src={item.event_poster} alt={item.event_title} className="w-full h-32 object-cover rounded-t" />}
                  <CardContent>
                    <CardTitle className="text-sm font-semibold truncate">{item.event_title || item.ticket_name}</CardTitle>
                    {item.tier_name && <div className="text-sm text-gray-600">Тир: {item.tier_name}</div>}
                    {item.seat_label && <div className="text-sm text-gray-600">Место: {item.seat_label}</div>}
                    <div className="text-sm text-gray-600">Цена: {item.price.toFixed(2)} ₽</div>
                    {item.status === "sold" && (
                      <Button size="sm" className="mt-2 w-full" onClick={() => handleActivate(item.id)}>
                        Активировать
                      </Button>
                    )}
                    {item.status === "activated" && (
                      <Badge variant="secondary" className="mt-2">Активирован</Badge>
                    )}
                    {item.status === "canceled" && (
                      <Badge variant="destructive" className="mt-2">Отменён</Badge>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="mt-2 text-right font-semibold text-lg">
              Сумма заказа: {order.total_amount.toFixed(2)} ₽
            </div>
            {order.status === "paid" && (
              <div className="flex justify-end mt-2">
                <Button variant="outline" size="sm" onClick={() => handleRefund(order.id)}>Запросить возврат</Button>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
