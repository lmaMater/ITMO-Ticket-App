import { BrowserRouter, Routes, Route } from "react-router-dom"
import Home from "@/pages/Home"
import Event from "@/pages/Event"
import Navbar from "@/components/Navbar"
import { UserProvider, UserContext } from "@/components/UserContext"
import OrderPage from "@/pages/OrderPage"
import LoginModal from "@/components/AuthModal"
import ProfileModal from "@/components/ProfileModal"
import { useState, useContext } from "react"

function AppWrapper() {
  const [openLogin, setOpenLogin] = useState(false)
  const [openProfile, setOpenProfile] = useState(false)
  const { user, logout, loading } = useContext(UserContext)

  const handleProfileClick = () => {
    if (!user) setOpenLogin(true)
    else setOpenProfile(true)
  }

  if (loading) return <div className="flex items-center justify-center h-screen">Загрузка...</div>

  return (
    <BrowserRouter>
      <Navbar onProfileClick={handleProfileClick} user={user} />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/events/:eventId" element={<Event />} />
        <Route path="/orders" element={<OrderPage />} /> {/* вот сюда */}
      </Routes>


      <LoginModal open={openLogin} onClose={() => setOpenLogin(false)} />
      <ProfileModal open={openProfile} onClose={() => setOpenProfile(false)} user={user} logout={logout} />
    </BrowserRouter>
  )
}

export default function App() {
  return (
    <UserProvider>
      <AppWrapper />
    </UserProvider>
  )
}
