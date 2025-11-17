import Carousel from "@/components/Carousel"
import EventGallery from "@/components/EventGallery"
import Footer from "@/components/Footer"

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1">
        <Carousel />
        <EventGallery />
      </main>
      <Footer />
    </div>
  )
}
