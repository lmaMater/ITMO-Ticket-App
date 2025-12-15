"use client"
import * as React from "react"

export const UserContext = React.createContext(null)

async function fetchJson(url, opts = {}) {
  const res = await fetch(url, opts)
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(text || res.statusText || `HTTP ${res.status}`)
  }
  return res.json().catch(() => ({}))
}

export function UserProvider({ children }) {
  const [user, setUser] = React.useState(null)
  const [loading, setLoading] = React.useState(true)

  // ===== загрузка текущего пользователя =====
  React.useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem("access_token")
        if (!token) {
          setLoading(false)
          return
        }

        const me = await fetchJson("http://127.0.0.1:8000/users/me", {
          headers: { Authorization: `Bearer ${token}` }
        })
        setUser(me)
      } catch (e) {
        console.error("User fetch failed:", e)
        localStorage.removeItem("access_token")
        setUser(null)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  // ===== ЛОГИН =====
  const login = async (email, password) => {
    const data = await fetchJson("http://127.0.0.1:8000/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    })

    localStorage.setItem("access_token", data.access_token)

    if (data.user) {
      setUser(data.user)
    } else {
      const me = await fetchJson("http://127.0.0.1:8000/users/me", {
        headers: { Authorization: `Bearer ${data.access_token}` }
      })
      setUser(me)
    }

    return true
  }

  // ===== РЕГИСТРАЦИЯ =====
  const register = async (email, password, full_name) => {
    const data = await fetchJson("http://127.0.0.1:8000/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, full_name })
    })

    localStorage.setItem("access_token", data.access_token)

    if (data.user) {
      setUser(data.user)
    } else {
      const me = await fetchJson("http://127.0.0.1:8000/users/me", {
        headers: { Authorization: `Bearer ${data.access_token}` }
      })
      setUser(me)
    }

    return true
  }

  // ===== ЛОГАУТ =====
  const logout = () => {
    localStorage.removeItem("access_token")
    setUser(null)
  }

  const updateUser = (updatedUser) => {
    setUser(updatedUser)
  }

  const isAdmin = Boolean(user?.is_admin)

  return (
    <UserContext.Provider
      value={{
        user,
        loading,
        isAdmin,
        login,
        register,
        logout,
        updateUser
      }}
    >
      {children}
    </UserContext.Provider>
  )
}
