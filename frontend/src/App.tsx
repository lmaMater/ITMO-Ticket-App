import { BrowserRouter, Routes, Route } from "react-router-dom"
import Home from "@/pages/Home"
import Event from "@/pages/Event"
import Navbar from "@/components/Navbar"
import { UserProvider } from "@/components/UserContext"
import LoginModal from "@/components/AuthModal"
import ProfileModal from "@/components/ProfileModal"
import { useState, useContext } from "react"
import { UserContext } from "@/components/UserContext"

function AppWrapper() {
  const [openLogin, setOpenLogin] = useState(false)
  const [openProfile, setOpenProfile] = useState(false)
  const { user, logout } = useContext(UserContext)

  const handleProfileClick = () => {
    if (!user) setOpenLogin(true)
    else setOpenProfile(true)
  }

  return (
    <BrowserRouter>
      <Navbar onProfileClick={handleProfileClick} user={user} />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/events/:eventId" element={<Event />} />
      </Routes>

      {/* Глобальные модалки */}
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
