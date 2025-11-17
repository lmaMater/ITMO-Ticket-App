import Logo from "@/assets/logo.svg"
import IconLocation from "@/assets/icon-location.svg"
import IconTickets from "@/assets/icon-tickets.svg"

export default function Navbar() {
  return (
    <nav className="flex items-center p-4 border-b border-blue-500">
      {/* Левая часть: лого */}
      <div className="w-1/4 flex items-center justify-center border border-red-500">
        <img src={Logo} alt="logo" className="h-20 w-auto border border-green-500" />
      </div>

      {/* Правая часть: кнопки с иконками, поиск, ЛК */}
      <div className="w-3/4 flex items-center justify-end space-x-4 border border-purple-500">
        {/* Кнопка "Город" */}
        <div className="cursor-pointer">
          <img src={IconLocation} alt="tickets" className="max-h-full max-w-full" />
        </div>

        {/* Кнопка "Мои пероприятия" */}
        <div className="cursor-pointer">
          <img src={IconTickets} alt="tickets" className="max-h-full max-w-full" />
        </div>


        {/* Поиск */}
        <input
          type="text"
          placeholder="Поиск..."
          className="border border-yellow-500 rounded-full px-4 py-2 focus:outline-none"
        />

        {/* Кнопка "Мой профиль" */}
        <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center border border-pink-500">
          ?
        </div>
      </div>
    </nav>
  )
}
