"use client"
import * as React from "react"

export const UserContext = React.createContext(null)

async function fetchJson(url, opts = {}) {
  const res = await fetch(url, opts)
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    const err = text || res.statusText || `HTTP ${res.status}`
    throw new Error(err)
  }
  return res.json().catch(() => ({}))
}

export function UserProvider({ children }) {
  const [user, setUser] = React.useState(null)
  const [loading, setLoading] = React.useState(true)

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

  const login = async (email, password) => {
    const data = await fetchJson("http://127.0.0.1:8000/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    })
    localStorage.setItem("access_token", data.access_token)
    if (data.user) {
      setUser(data.user)
      return true
    }
    const me = await fetchJson("http://127.0.0.1:8000/users/me", {
      headers: { Authorization: `Bearer ${data.access_token}` }
    })
    setUser(me)
    return true
  }

  const register = async (email, password, full_name) => {
    const data = await fetchJson("http://127.0.0.1:8000/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, full_name }),
    })
    localStorage.setItem("access_token", data.access_token)
    if (data.user) setUser(data.user)
    else {
      const me = await fetchJson("http://127.0.0.1:8000/users/me", {
        headers: { Authorization: `Bearer ${data.access_token}` }
      })
      setUser(me)
    }
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
    <UserContext.Provider value={{ user, login, register, logout, updateUser, loading }}>
      {children}
    </UserContext.Provider>
  )
}
