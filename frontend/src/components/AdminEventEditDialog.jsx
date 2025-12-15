"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useState } from "react"

export default function AdminEventEditDialog({ open, onClose, event, onSaved }) {
  const [form, setForm] = useState({
    title: event.title,
    description: event.description ?? "",
    poster_url: event.poster_url ?? ""
  })

  const token = localStorage.getItem("access_token")

  const save = async () => {
    const res = await fetch(`http://127.0.0.1:8000/admin/events/${event.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(form)
    })

    if (!res.ok) {
      alert("Ошибка сохранения")
      return
    }

    const updated = await res.json()
    onSaved(updated)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Редактировать событие</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <Input
            placeholder="Название"
            value={form.title}
            onChange={e => setForm({ ...form, title: e.target.value })}
          />

          <Textarea
            placeholder="Описание"
            rows={4}
            value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
          />

          <Input
            placeholder="URL постера"
            value={form.poster_url}
            onChange={e => setForm({ ...form, poster_url: e.target.value })}
          />

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Отмена</Button>
            <Button onClick={save}>Сохранить</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
