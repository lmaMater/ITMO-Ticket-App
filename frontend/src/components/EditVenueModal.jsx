"use client"

import * as React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

export default function EditVenueModal({ venue, open, onClose, onSave }) {
  const [name, setName] = React.useState(venue?.name || "")
  const [address, setAddress] = React.useState(venue?.address || "")
  const [seatsMapJson, setSeatsMapJson] = React.useState(JSON.stringify(venue?.seats_map_json || {}, null, 2))
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    if (venue) {
      setName(venue.name || "")
      setAddress(venue.address || "")
      setSeatsMapJson(JSON.stringify(venue.seats_map_json || {}, null, 2))
    } else {
      setName("")
      setAddress("")
      setSeatsMapJson("{}")
    }
  }, [venue])

  const handleSave = async () => {
    setSaving(true)
    try {
      const token = localStorage.getItem("access_token")
      const isNew = !venue?.id
      const url = isNew
        ? "http://127.0.0.1:8000/admin/venues"
        : `http://127.0.0.1:8000/admin/venues/${venue.id}`
      const method = isNew ? "POST" : "PATCH"

      let seatsParsed = {}
      try {
        seatsParsed = JSON.parse(seatsMapJson)
      } catch {
        alert("JSON карты мест некорректен")
        setSaving(false)
        return
      }

      const formData = {
        name,
        address,
        seats_map_json: seatsParsed
      }

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      })

      if (!res.ok) throw new Error("Ошибка при сохранении зала")
      const saved = await res.json()
      onSave(saved) // сразу обновляем данные на странице
      onClose()
    } catch (err) {
      console.error(err)
      alert(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{venue?.id ? "Редактировать зал" : "Создать новый зал"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-1">
            <Label>Название</Label>
            <Input value={name} onChange={e => setName(e.target.value)} />
          </div>

          <div className="grid gap-1">
            <Label>Адрес</Label>
            <Input value={address} onChange={e => setAddress(e.target.value)} />
          </div>

          <div className="grid gap-1">
            <Label>Схема мест (JSON)</Label>
            <Input
              value={seatsMapJson}
              onChange={e => setSeatsMapJson(e.target.value)}
              className="font-mono"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Отмена</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Сохраняем..." : "Сохранить"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
