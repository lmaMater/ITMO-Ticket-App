import React from "react"

export default function ProfileModal({ open, onClose, user, logout }) {
  if (!open || !user) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
      <div className="bg-white p-6 rounded-xl w-80 shadow-xl">
        <h2 className="text-xl font-bold mb-4">Профиль</h2>

        <div className="flex flex-col space-y-2 mb-4">
          {user.full_name && <div><strong>Имя:</strong> {user.full_name}</div>}
          <div><strong>Email:</strong> {user.email}</div>
          {user.wallet_balance !== undefined && (
            <div><strong>Баланс:</strong> {Number(user.wallet_balance).toFixed(2)} ₽</div>
          )}
        </div>

        <button
          onClick={() => { logout(); onClose(); }}
          className="w-full py-2 bg-red-500 text-white rounded-lg mb-2"
        >
          Выйти
        </button>

        <button
          onClick={onClose}
          className="w-full py-2 bg-gray-300 rounded-lg"
        >
          Закрыть
        </button>
      </div>
    </div>
  )
}
