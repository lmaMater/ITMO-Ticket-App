import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import Logo from "@/assets/logo.svg"
import IconLocation from "@/assets/icon-location.svg"
import IconTickets from "@/assets/icon-tickets.svg"
import { UserContext } from "./UserContext"

export default function Navbar({ user, onProfileClick }) {
  const navigate = useNavigate()
  const [showBalance, setShowBalance] = useState(false)

  const toggleBalance = () => setShowBalance(prev => !prev)

  return (
    <nav className="flex items-center p-4 border-b border-blue-500">
      {/* Лого */}
      <div className="w-1/4 flex items-center justify-center">
        <Link to="/">
          <img src={Logo} alt="logo" className="h-20 w-auto cursor-pointer hover:scale-105 transition-transform duration-200" />
        </Link>
      </div>
      
      {/* Правая часть */}
      <div className="w-3/4 flex items-center justify-end space-x-4">
        <div className="cursor-pointer" onClick={() => navigate("/venues")}>
          <img src={IconLocation} alt="location" className="max-h-full max-w-full" />
        </div>


        <div className="cursor-pointer" onClick={() => navigate("/orders")}>
          <img src={IconTickets} alt="tickets" className="max-h-full max-w-full" />
        </div>

        <input type="text" placeholder="Поиск..." className="border rounded-full px-4 py-2 focus:outline-none" />

        {/* Профиль + баланс */}
        <div className="flex items-center gap-1">
          {/* Аватар */}
          <div
            className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center cursor-pointer"
            onClick={onProfileClick}
          >
            {user?.full_name ? user.full_name[0].toUpperCase() : "👤"}
          </div>

          {/* Баланс */}
          <div
            className={`text-sm font-medium text-gray-700 whitespace-nowrap cursor-pointer select-none w-[80px] text-right`}
            onClick={toggleBalance}
          >
            {showBalance ? (
              <span>{user?.wallet_balance?.toFixed(2) ?? "0.00"} ₽</span>
            ) : (
              <span className="blur-[2px]">8888.88 ₽</span> // замазанное
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
