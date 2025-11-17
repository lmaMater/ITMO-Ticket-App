import { useState, useContext } from "react"
import { Link } from "react-router-dom"
import Logo from "@/assets/logo.svg"
import IconLocation from "@/assets/icon-location.svg"
import IconTickets from "@/assets/icon-tickets.svg"
import { UserContext } from "./UserContext"

export default function Navbar({ user, onProfileClick }) {
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
        <div className="cursor-pointer">
          <img src={IconLocation} alt="tickets" className="max-h-full max-w-full" />
        </div>

        <div className="cursor-pointer">
          <img src={IconTickets} alt="tickets" className="max-h-full max-w-full" />
        </div>

        <input type="text" placeholder="Поиск..." className="border rounded-full px-4 py-2 focus:outline-none" />

        {/* Профиль */}
        <div
          className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center cursor-pointer"
          onClick={onProfileClick}
        >
          {user
          ? user.name?.[0].toUpperCase() || "👤" // берем первую букву имени, заглавную, если нет — 👤
          : "?"}
        </div>
      </div>
    </nav>
  )
}
