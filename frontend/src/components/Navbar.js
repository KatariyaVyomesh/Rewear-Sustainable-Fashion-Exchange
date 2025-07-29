"use client"
import { Link, useNavigate } from "react-router-dom"

const Navbar = ({ user, onLogout }) => {
  const navigate = useNavigate()

  const handleLogout = () => {
    onLogout()
    navigate("/")
  }

  return (
    <nav className="navbar">
      <div className="nav-container">
        <Link to="/" className="nav-logo">
          ReWear
        </Link>

        <div className="nav-menu">
          <Link to="/items" className="nav-link">
            Browse Items
          </Link>

          {user ? (
            <>
              <Link to="/dashboard" className="nav-link">
                Dashboard
              </Link>
              <Link to="/add-item" className="nav-link">
                Add Item
              </Link>
              {user.is_staff && ( // Conditionally render for staff users
                <Link to="/moderation" className="nav-link">
                  Moderation Panel
                </Link>
              )}
              <span className="nav-user">Welcome, {user.username}!</span>
              <button onClick={handleLogout} className="nav-button">
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="nav-link">
                Login
              </Link>
              <Link to="/register" className="nav-link">
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}

export default Navbar
