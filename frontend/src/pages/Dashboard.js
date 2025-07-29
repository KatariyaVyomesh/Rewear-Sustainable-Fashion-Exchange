"use client"

import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import api from "../utils/api"

const ITEM_REDEEM_COST = 10 // Must match backend ITEM_REDEEM_COST

const Dashboard = ({ user }) => {
  const [swaps, setSwaps] = useState([]) // Swaps initiated by the current user
  const [incomingSwaps, setIncomingSwaps] = useState([]) // Swaps requested for the current user's items
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState(user) // Use state for user to update points
  const [currentUserListedItems, setCurrentUserListedItems] = useState([]) // New state for user's own listed items

  useEffect(() => {
    fetchUserSwaps()
    fetchIncomingSwaps()
    fetchUserProfile()
    fetchCurrentUserListedItems() // Fetch user's own items
  }, [])

  const fetchUserSwaps = async () => {
    try {
      const response = await api.get("/swaps/")
      setSwaps(response.data)
    } catch (error) {
      console.error("Error fetching user's initiated swaps:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchIncomingSwaps = async () => {
    try {
      const response = await api.get("/my-item-swaps/")
      setIncomingSwaps(response.data)
    } catch (error) {
      console.error("Error fetching incoming swaps:", error)
    }
  }

  const fetchUserProfile = async () => {
    try {
      const response = await api.get("/user/profile/")
      setCurrentUser(response.data)
    } catch (error) {
      console.error("Error fetching user profile:", error)
    }
  }

  const fetchCurrentUserListedItems = async () => {
    try {
      // Fetch all items and filter by uploader.id and availability
      const response = await api.get("/items/")
      const userOwnedAvailableItems = response.data.filter(
        (item) => item.uploader.id === currentUser.id && item.available,
      )
      setCurrentUserListedItems(userOwnedAvailableItems)
    } catch (error) {
      console.error("Error fetching current user's listed items:", error)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case "pending":
        return "#f39c12"
      case "approved":
        return "#27ae60"
      case "rejected":
        return "#e74c3c"
      case "completed":
        return "#3498db"
      default:
        return "#95a5a6"
    }
  }

  // Helper function to get the full image URL (now directly from Cloudinary)
  const getFullImageUrl = (relativePath) => {
    // Cloudinary URLs are absolute, so no need to prepend localhost:8000
    return relativePath || "/placeholder.svg?height=200&width=200"
  }

  const hasItemsToSwap = currentUserListedItems.length > 0
  const hasEnoughPoints = currentUser && currentUser.points >= ITEM_REDEEM_COST

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Welcome back, {currentUser.username}!</h1>
        <div className="user-stats">
          <div className="stat">
            <span className="stat-label">Points:</span>
            <span className="stat-value">{currentUser.points}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Listed Items:</span>
            <span className="stat-value">{currentUserListedItems.length}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Email:</span>
            <span className="stat-value">{currentUser.email}</span>
          </div>
        </div>
      </div>

      <div className="dashboard-actions">
        <Link to="/add-item" className="btn btn-primary">
          Add New Item
        </Link>
        <Link to="/items" className="btn btn-secondary">
          Browse Items
        </Link>
      </div>

      {/* Conditional guidance based on user's status */}
      <div className="swaps-section" style={{ marginBottom: "2rem" }}>
        <h2>What's Next?</h2>
        <div className="no-swaps">
          {" "}
          {/* Reusing no-swaps styling for a message box */}
          {hasItemsToSwap ? (
            <p>You have items listed! Browse other items and offer yours for a swap.</p>
          ) : hasEnoughPoints ? (
            <p>You have {currentUser.points} points! Browse items to redeem one via points.</p>
          ) : (
            <p>You don't have items listed or enough points to redeem. Add an item to get started!</p>
          )}
          <Link to="/items" className="btn btn-primary" style={{ marginTop: "1rem" }}>
            Browse Items Now
          </Link>
        </div>
      </div>

      {/* Section for Incoming Swap Requests */}
      <div className="swaps-section">
        <h2>Incoming Requests for Your Items</h2> {/* Generic text */}
        {loading ? (
          <div className="loading">Loading incoming requests...</div>
        ) : incomingSwaps.length === 0 ? (
          <div className="no-swaps">
            <p>No one has requested your items yet.</p>
          </div>
        ) : (
          <div className="swaps-grid">
            {incomingSwaps.map((swap) => (
              <div key={swap.id} className="swap-card">
                <Link to={`/items/${swap.item.id}`}>
                  <img
                    src={getFullImageUrl(swap.item.image) || "/placeholder.svg"}
                    alt={swap.item.title}
                    className="swap-image"
                  />
                  <div className="swap-info">
                    <h3>
                      {swap.item.title} (Requested by: {swap.user.username})
                    </h3>
                    <p className="swap-description">
                      {swap.requested_item ? (
                        <>
                          Offering: <Link to={`/items/${swap.requested_item.id}`}>"{swap.requested_item.title}"</Link>
                        </>
                      ) : (
                        "Redeeming via points"
                      )}
                    </p>
                    <div className="swap-meta">
                      <span className="swap-status" style={{ backgroundColor: getStatusColor(swap.status) }}>
                        {swap.status.charAt(0).toUpperCase() + swap.status.slice(1)}
                      </span>
                      <span className="swap-date">{new Date(swap.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Existing Section for Your Initiated Swap Requests */}
      <div className="swaps-section" style={{ marginTop: "2rem" }}>
        <h2>Your Initiated Requests</h2> {/* Generic text */}
        {loading ? (
          <div className="loading">Loading your requests...</div>
        ) : swaps.length === 0 ? (
          <div className="no-swaps">
            <p>You haven't made any requests yet.</p>
            <Link to="/items" className="btn btn-primary">
              Browse Items
            </Link>
          </div>
        ) : (
          <div className="swaps-grid">
            {swaps.map((swap) => (
              <div key={swap.id} className="swap-card">
                <Link to={`/items/${swap.item.id}`}>
                  <img
                    src={getFullImageUrl(swap.item.image) || "/placeholder.svg"}
                    alt={swap.item.title}
                    className="swap-image"
                  />
                  <div className="swap-info">
                    <h3>{swap.item.title}</h3>
                    <p className="swap-description">
                      {swap.requested_item ? (
                        <>
                          Offered: <Link to={`/items/${swap.requested_item.id}`}>"{swap.requested_item.title}"</Link>
                        </>
                      ) : (
                        "Redeemed via points"
                      )}
                    </p>
                    <div className="swap-meta">
                      <span className="swap-status" style={{ backgroundColor: getStatusColor(swap.status) }}>
                        {swap.status.charAt(0).toUpperCase() + swap.status.slice(1)}
                      </span>
                      <span className="swap-date">{new Date(swap.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Dashboard
