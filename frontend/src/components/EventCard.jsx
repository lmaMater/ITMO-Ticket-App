import { Link } from "react-router-dom"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"

export default function EventCard({ event, minPrice }) {
  return (
    <Link to={`/events/${event.id}`} className="group">
      <Card className="bg-black text-white overflow-hidden rounded-lg flex flex-col hover:shadow-2xl hover:scale-105 transition-all duration-300">
        <CardHeader className="p-4 h-14">
          <CardTitle className="text-xl line-clamp-2">{event.title}</CardTitle>
        </CardHeader>
        <CardContent className="p-4 flex-1 flex flex-col justify-between">
          <div>
            <p className="text-sm line-clamp-2 mb-2">{event.description}</p>
            <p className="text-xs text-gray-300 line-clamp-1">{event.venue.name}</p>
            <p className="text-xs text-gray-300 line-clamp-1">{event.genre.name}</p>
          </div>
          <div className="flex justify-between mt-2">
            <span className="bg-orange-500 text-black px-3 py-1 rounded text-xs font-semibold">
              {minPrice ? `От ${minPrice}₽` : "—"}
            </span>
            <span className="text-xs text-gray-400">
              {new Date(event.start_datetime).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" })}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
