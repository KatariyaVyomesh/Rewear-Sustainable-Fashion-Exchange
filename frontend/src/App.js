"use client"

import { useState, useEffect } from "react"
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom"
// Import our custom Axios instance
import api, { getCsrfToken } from "./utils/api"
import "./App.css"

// Components
import Navbar from "./components/Navbar"
import LandingPage from "./pages/LandingPage"
import Login from "./pages/Login"
import Register from "./pages/Register"
import Dashboard from "./pages/Dashboard"
import AddItem from "./pages/AddItem"
import Items from "./pages/Items"
import ItemDetail from "./pages/ItemDetail"
import EditItem from "./pages/EditItem"
import ModerationPanel from "./pages/ModerationPanel" // New import

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Fetch CSRF token globally when the app loads
        await getCsrfToken()
        // Then check authentication status
        const response = await api.get("/user/profile/")
        setUser(response.data)
      } catch (error) {
        console.error("App initialization error:", error)
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    initializeApp()
  }, [])

  const handleLogin = (userData) => {
    setUser(userData)
  }

  const handleLogout = async () => {
    try {
      await api.post("/logout/") // Use our custom api instance
      setUser(null)
      console.log("Logout successful on server. Reloading page...")
      // Reload the page to ensure all session/auth states are cleared
      window.location.reload()
    } catch (error) {
      console.error("Logout error:", error)
      // Even if logout fails on server, try to clear client state
      setUser(null)
      window.location.reload()
    }
  }

  if (loading) {
    return <div className="loading">Loading...</div>
  }

  return (
    <Router>
      <div className="App">
        <Navbar user={user} onLogout={handleLogout} />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <Login onLogin={handleLogin} />} />
          <Route path="/register" element={user ? <Navigate to="/dashboard" /> : <Register onLogin={handleLogin} />} />
          <Route path="/dashboard" element={user ? <Dashboard user={user} /> : <Navigate to="/login" />} />
          <Route path="/add-item" element={user ? <AddItem /> : <Navigate to="/login" />} />
          <Route path="/items" element={<Items />} />
          <Route path="/items/:id" element={<ItemDetail user={user} />} />
          <Route path="/edit-item/:id" element={user ? <EditItem /> : <Navigate to="/login" />} />
          <Route path="/moderation" element={user && user.is_staff ? <ModerationPanel /> : <Navigate to="/login" />} />{" "}
          {/* New Route */}
        </Routes>
      </div>
    </Router>
  )
}

export default App
