"use client"
import * as React from "react"

export const UserContext = React.createContext(null)

export function UserProvider({ children }) {
  const [user, setUser] = React.useState(null) // null = не авторизован

  React.useEffect(() => {
    const token = localStorage.getItem("access_token")
    if (token) {
      fetch("http://127.0.0.1:8000/users/me", {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.ok ? res.json() : Promise.reject())
        .then(setUser)
        .catch(() => localStorage.removeItem("access_token"))
    }
  }, [])

  const login = async (email, password) => {
    const res = await fetch("http://127.0.0.1:8000/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    })

    if (!res.ok) throw new Error("Неверные данные")

    const data = await res.json()
    localStorage.setItem("access_token", data.access_token)

    // подтягиваем реального юзера
    const me = await fetch("http://127.0.0.1:8000/users/me", {
      headers: { Authorization: `Bearer ${data.access_token}` }
    }).then(r => r.json())

    setUser(me)
    return true
  }

  const register = async (email, password, full_name) => {
    const res = await fetch("http://127.0.0.1:8000/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, full_name }),
    })

    if (!res.ok) throw new Error("Ошибка регистрации")

    const data = await res.json()

    localStorage.setItem("access_token", data.access_token)
    setUser(data.user)
    return true
    }



  const logout = () => {
    localStorage.removeItem("access_token")
    setUser(null)
  }

  const updateUser = (updatedUser) => {
    setUser(updatedUser)
  }

  return (
    <UserContext.Provider value={{ user, login, logout, updateUser }}>
      {children}
    </UserContext.Provider>
  )
}
