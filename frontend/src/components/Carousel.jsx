"use client"

import * as React from "react"
import Autoplay from "embla-carousel-autoplay"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"

export default function FullscreenCarousel() {
  const [events, setEvents] = React.useState([])
  const [selectedIndex, setSelectedIndex] = React.useState(0)

  const plugin = React.useRef(
    Autoplay({ delay: 7000, stopOnInteraction: true })
  )

  const onSelect = React.useCallback(embla => {
    setSelectedIndex(embla.selectedScrollSnap())
  }, [])

  const onInit = embla => {
    embla.on("select", () => onSelect(embla))
    onSelect(embla)
  }

  React.useEffect(() => {
    fetch("http://127.0.0.1:8000/events/top")
      .then(res => res.json())
      .then(setEvents)
      .catch(() => setEvents([]))
  }, [])

  if (!events.length) return <p className="text-center py-10">Загружаю...</p>

  return (
    <div className="relative w-full py-10">
      <Carousel
        plugins={[plugin.current]}
        className="w-full"
        setApi={onInit}
        onMouseEnter={plugin.current.stop}
        onMouseLeave={plugin.current.reset}
      >
        <CarouselContent>
          {events.map((event, index) => {
            const diff = Math.abs(index - selectedIndex)

            const isCenter = diff === 0
            const isSide = diff === 1

            const scale =
              isCenter ? "scale-100" : isSide ? "scale-75" : "scale-50 opacity-0"
            const opacity =
              isCenter ? "opacity-100" : isSide ? "opacity-40" : "opacity-0"

            return (
              <CarouselItem key={event.id} className="flex justify-center">
                <div
                  className={`
                    transition-all duration-500
                    ${scale} ${opacity}
                    w-full
                  `}
                >
                  <Card className="w-full h-[33vh] bg-black text-white overflow-hidden rounded-none">
                    <div className="px-10 h-full flex flex-col">
                        {/* Верхняя половина — заголовок и дата */}
                        <div className="flex-1 flex items-center justify-between">
                        <CardHeader className="p-0 flex-1">
                            <CardTitle className="text-4xl font-bold line-clamp-1">{event.title}</CardTitle>
                        </CardHeader>
                        {/* Дата в кружке */}
                        <div className="ml-4 flex-shrink-0">
                            <span className="bg-orange-500 text-black font-semibold px-4 py-2 rounded-full text-lg">
                            {new Date(event.event_date).toLocaleDateString("ru-RU", {
                                day: "2-digit",
                                month: "2-digit",
                            })}
                            </span>
                        </div>
                        </div>

                        {/* Нижняя половина — описание + локация + теги */}
                        <div className="flex-1 flex flex-col justify-evenly">
                        <CardContent className="p-0">
                            <p className="line-clamp-2">{event.description}</p>
                            <p className="text-sm text-gray-300">{event.location.name}</p>
                            <p className="text-sm text-gray-300">{event.tags.map(t => t.name).join(", ")}</p>
                        </CardContent>
                        </div>
                    </div>
                  </Card>
                </div>
              </CarouselItem>
            )
          })}
        </CarouselContent>

        <CarouselPrevious className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 bg-transparent shadow-none border-none w-auto h-auto p-0">
          <span className="text-4xl">‹</span>
        </CarouselPrevious>

        <CarouselNext className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 bg-transparent shadow-none border-none w-auto h-auto p-0">
          <span className="text-4xl">›</span>
        </CarouselNext>
      </Carousel>
    </div>
  )
}
