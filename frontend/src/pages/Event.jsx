// /frontend/src/pages/EventPage.tsx
import Navbar from "@/components/Navbar"
import Footer from "@/components/Footer"
import EventDetail from "@/components/EventDetail"

export default function Event() {
  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1">
        <EventDetail />
      </main>
    </div>
  )
}
