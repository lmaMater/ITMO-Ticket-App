import { useState, useContext } from "react"
import LoginModal from "./AuthModal"
import ProfileModal from "./ProfileModal"
import { UserContext } from "./UserContext"
import Navbar from "./Navbar"

export default function NavbarWithModals() {
  const { user, logout } = useContext(UserContext)

  const [openLogin, setOpenLogin] = useState(false)
  const [openProfile, setOpenProfile] = useState(false)

  return (
    <>
      <Navbar 
        onOpenLogin={() => setOpenLogin(true)}
        onOpenProfile={() => setOpenProfile(true)}
      />

      <LoginModal open={openLogin} onClose={() => setOpenLogin(false)} />

      <ProfileModal
        open={openProfile}
        onClose={() => setOpenProfile(false)}
        user={user}
        logout={logout}
      />
    </>
  )
}
