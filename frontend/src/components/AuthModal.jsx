"use client"

import * as React from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { UserContext } from "./UserContext"

export default function AuthModal({ open, onClose }) {
  const { login } = React.useContext(UserContext)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState("")

  const [loginEmail, setLoginEmail] = React.useState("")
  const [loginPassword, setLoginPassword] = React.useState("")

  const [regEmail, setRegEmail] = React.useState("")
  const [regPassword, setRegPassword] = React.useState("")
  const [regName, setRegName] = React.useState("")

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    try {
      await login(loginEmail, loginPassword)
      onClose()
    } catch {
      setError("Неверный email или пароль")
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("http://127.0.0.1:8000/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: regEmail, password: regPassword, name: regName })
      });

      const data = await res.json(); // читаем тело ответа

      if (!res.ok) {
        // если есть detail от FastAPI, показываем его
        throw new Error(data.detail || "Ошибка регистрации");
      }

      await login(regEmail, regPassword);
      onClose();
    } catch (err) {
      setError(err.message); // покажет точную ошибку
    } finally {
      setLoading(false);
    }
  };


  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded shadow-md w-96">
        <h2 className="text-xl font-bold mb-4">Авторизация</h2>
        {error && <p className="text-red-500 mb-2">{error}</p>}

        <Tabs defaultValue="login" className="w-full">
          <TabsList>
            <TabsTrigger value="login">Вход</TabsTrigger>
            <TabsTrigger value="register">Регистрация</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <form onSubmit={handleLogin} className="flex flex-col gap-2 mt-4">
              <input
                type="email"
                placeholder="Email"
                value={loginEmail}
                onChange={e => setLoginEmail(e.target.value)}
                className="border px-2 py-1 rounded"
                required
              />
              <input
                type="password"
                placeholder="Пароль"
                value={loginPassword}
                onChange={e => setLoginPassword(e.target.value)}
                className="border px-2 py-1 rounded"
                required
              />
              <button
                type="submit"
                disabled={loading}
                className="bg-orange-500 text-black px-4 py-2 rounded mt-2 hover:bg-orange-600"
              >
                Войти
              </button>
            </form>
          </TabsContent>

          <TabsContent value="register">
            <form onSubmit={handleRegister} className="flex flex-col gap-2 mt-4">
              <input
                type="text"
                placeholder="Имя"
                value={regName}
                onChange={e => setRegName(e.target.value)}
                className="border px-2 py-1 rounded"
                required
              />
              <input
                type="email"
                placeholder="Email"
                value={regEmail}
                onChange={e => setRegEmail(e.target.value)}
                className="border px-2 py-1 rounded"
                required
              />
              <input
                type="password"
                placeholder="Пароль"
                value={regPassword}
                onChange={e => setRegPassword(e.target.value)}
                className="border px-2 py-1 rounded"
                required
              />
              <button
                type="submit"
                disabled={loading}
                className="bg-green-500 text-black px-4 py-2 rounded mt-2 hover:bg-green-600"
              >
                Зарегистрироваться
              </button>
            </form>
          </TabsContent>
        </Tabs>

        <button
          className="mt-4 text-sm text-gray-500"
          onClick={onClose}
        >
          Отмена
        </button>
      </div>
    </div>
  )
}
