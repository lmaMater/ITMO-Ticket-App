"use client"

import * as React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Trash, Plus } from "lucide-react"

export default function EditEventModal({ event, open, onClose, onSave, venues: venuesProp }) {
  const evt = event || {}

  const [title, setTitle] = React.useState(evt.title || "")
  const [description, setDescription] = React.useState(evt.description || "")
  const [venueId, setVenueId] = React.useState(evt.venue?.id ? String(evt.venue.id) : "")
  const [genreId, setGenreId] = React.useState(evt.genre?.id ? String(evt.genre.id) : "")
  const [startDatetime, setStartDatetime] = React.useState(evt.start_datetime || "")
  const [endDatetime, setEndDatetime] = React.useState(evt.end_datetime || "")
  const [posterUrl, setPosterUrl] = React.useState(evt.poster_url || "")
  const [venues, setVenues] = React.useState(venuesProp || [])
  const [genres, setGenres] = React.useState([])
  const [saving, setSaving] = React.useState(false)

  const initialTiers = (evt.price_tiers || []).map((t, i) => ({
    key: t.id ? `existing-${t.id}` : `t-${i}-${Date.now()}`,
    id: t.id ?? null,
    name: t.name ?? "",
    price: t.price ?? 0,
    capacity: t.capacity ?? 0
  }))
  const [tiers, setTiers] = React.useState(initialTiers.length ? initialTiers : [{ key: `t-default-${Date.now()}`, name: "", price: 0, capacity: 0 }])

  React.useEffect(() => {
    if (Array.isArray(venuesProp) && venuesProp.length) setVenues(venuesProp)
  }, [venuesProp])

  React.useEffect(() => {
    if (!venuesProp) {
      const token = localStorage.getItem("access_token")
      fetch("http://127.0.0.1:8000/admin/venues", { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : [])
        .then(setVenues)
        .catch(console.error)
    }
    fetch("http://127.0.0.1:8000/genres")
      .then(r => r.ok ? r.json() : [])
      .then(setGenres)
      .catch(console.error)
    // eslint-disable-next-line
  }, [])

  React.useEffect(() => {
    const e = event || {}
    setTitle(e.title || "")
    setDescription(e.description || "")
    setVenueId(e.venue?.id ? String(e.venue.id) : "")
    setGenreId(e.genre?.id ? String(e.genre.id) : "")
    setStartDatetime(e.start_datetime || "")
    setEndDatetime(e.end_datetime || "")
    setPosterUrl(e.poster_url || "")
    if (e.price_tiers && e.price_tiers.length) {
      setTiers(e.price_tiers.map((t,i) => ({
        key: t.id ? `existing-${t.id}` : `t-${i}-${Date.now()}`,
        id: t.id ?? null,
        name: t.name ?? "",
        price: t.price ?? 0,
        capacity: t.capacity ?? 0
      })))
    } else if (!event) {
      setTiers([{ key: `t-default-${Date.now()}`, name: "", price: 0, capacity: 0 }])
    }
  }, [event])

  const addTier = () => setTiers(prev => [...prev, { key: `t-${Date.now()}-${Math.random()}`, name: "", price: 0, capacity: 0 }])
  const removeTier = (key) => setTiers(prev => prev.filter(t => t.key !== key))
  const updateTier = (key, field, value) => setTiers(prev => prev.map(t => t.key === key ? { ...t, [field]: value } : t))

  const validate = () => {
    if (!title.trim()) { alert("Введите название события"); return false }
    if (!startDatetime || !endDatetime) { alert("Заполните дату начала и конца"); return false }
    for (const t of tiers) {
      if (!String(t.name).trim() || Number.isNaN(Number(t.price)) || Number(t.price) < 0 || Number.isNaN(Number(t.capacity)) || Number(t.capacity) < 0) {
        alert("Проверьте тарифы: у каждого должен быть тип, цена и количество корректные")
        return false
      }
    }
    return true
  }

  const handleSave = async () => {
    if (!validate()) return
    setSaving(true)
    try {
      const token = localStorage.getItem("access_token")
      const isNew = !evt.id
      const url = isNew ? "http://127.0.0.1:8000/admin/events" : `http://127.0.0.1:8000/admin/events/${evt.id}`
      const method = isNew ? "POST" : "PATCH"

      const sendTiers = tiers.map(t => ({
        name: String(t.name),
        price: Number(t.price) || 0,
        capacity: Number(t.capacity) || 0,
        ...(t.id ? { id: t.id } : {})
      }))

      const body = {
        title,
        description,
        venue_id: venueId ? Number(venueId) : null,
        genre_id: genreId ? Number(genreId) : null,
        start_datetime: startDatetime,
        end_datetime: endDatetime,
        poster_url: posterUrl,
        price_tiers: sendTiers
      }

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(body)
      })

      if (!res.ok) {
        let err
        try { err = await res.json() } catch (_) { const t = await res.text().catch(() => ""); err = { detail: t || res.statusText } }
        throw new Error(JSON.stringify(err))
      }

      const saved = await res.json()
      onSave(saved)
      onClose()
    } catch (err) {
      console.error(err)
      alert("Ошибка при сохранении: " + err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      {/* DialogContent теперь фиксирует высоту и делает внутренности скроллящимися */}
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{evt.id ? "Редактировать событие" : "Создать новое событие"}</DialogTitle>
        </DialogHeader>

        {/* основная часть — задаём max высоту и скролл */}
        <div className="max-h-[65vh] overflow-y-auto pr-2">
          <div className="grid gap-4 py-4">
            <div className="grid gap-1">
              <Label>Название</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} />
            </div>

            <div className="grid gap-1">
              <Label>Описание</Label>
              <Input value={description} onChange={e => setDescription(e.target.value)} />
            </div>

            <div className="grid gap-1">
              <Label>Место проведения</Label>
              <Select value={venueId} onValueChange={v => setVenueId(v ?? "")}>
                <SelectTrigger>
                  <SelectValue placeholder={venues.length ? "Выберите место" : "Залы не загружены"} />
                </SelectTrigger>
                <SelectContent>
                  {venues.length === 0 ? <SelectItem value="" disabled>Нет доступных залов</SelectItem> : venues.map(v => <SelectItem key={v.id} value={String(v.id)}>{v.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-1">
              <Label>Жанр</Label>
              <Select value={genreId} onValueChange={v => setGenreId(v ?? "")}>
                <SelectTrigger>
                  <SelectValue placeholder={genres.length ? "Выберите жанр" : "Жанры не загружены"} />
                </SelectTrigger>
                <SelectContent>
                  {genres.length === 0 ? <SelectItem value="" disabled>Нет жанров</SelectItem> : genres.map(g => <SelectItem key={g.id} value={String(g.id)}>{g.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-1">
              <Label>Начало</Label>
              <Input type="datetime-local" value={startDatetime} onChange={e => setStartDatetime(e.target.value)} />
            </div>

            <div className="grid gap-1">
              <Label>Конец</Label>
              <Input type="datetime-local" value={endDatetime} onChange={e => setEndDatetime(e.target.value)} />
            </div>

            <div className="grid gap-1">
              <Label>URL постера</Label>
              <Input value={posterUrl} onChange={e => setPosterUrl(e.target.value)} />
            </div>

            {/* Тарифы — теперь с подписью полей сверху (тип / цена / количество) */}
            <div className="pt-2">
              <div className="flex items-center justify-between">
                <Label>Тарифы / билеты</Label>
                <Button variant="ghost" size="sm" onClick={addTier}><Plus size={14} /> Добавить тариф</Button>
              </div>

              <div className="grid grid-cols-12 gap-2 text-xs text-gray-500 mt-2 px-2">
                <div className="col-span-4">Тип (name)</div>
                <div className="col-span-3">Цена (price)</div>
                <div className="col-span-3">Количество (capacity)</div>
                <div className="col-span-2"></div>
              </div>

              <div className="space-y-3 mt-2">
                {tiers.map(t => (
                  <div key={t.key} className="grid grid-cols-12 gap-2 items-center border p-2 rounded">
                    <div className="col-span-4">
                      <Input placeholder="Тип (например VIP)" value={t.name} onChange={e => updateTier(t.key, "name", e.target.value)} />
                    </div>
                    <div className="col-span-3">
                      <Input placeholder="Цена" type="number" min="0" value={t.price} onChange={e => updateTier(t.key, "price", e.target.value)} />
                    </div>
                    <div className="col-span-3">
                      <Input placeholder="Количество" type="number" min="0" value={t.capacity} onChange={e => updateTier(t.key, "capacity", e.target.value)} />
                    </div>
                    <div className="col-span-2 text-right">
                      <Button variant="destructive" size="sm" onClick={() => removeTier(t.key)}>
                        <Trash size={14} /> Удалить
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
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
