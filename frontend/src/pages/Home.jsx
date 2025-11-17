import Navbar from "@/components/Navbar"
import Carousel from "@/components/Carousel"
import Footer from "@/components/Footer"

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1">
        <Carousel />
      </main>
      <Footer />
    </div>
  )
}
