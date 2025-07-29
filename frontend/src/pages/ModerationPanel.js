"use client"

import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import api from "../utils/api"

const ModerationPanel = () => {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState("")
  const [filterStatus, setFilterStatus] = useState("all") // 'all', 'pending', 'approved', 'rejected'

  useEffect(() => {
    fetchItemsForModeration()
  }, [filterStatus])

  const fetchItemsForModeration = async () => {
    setLoading(true)
    setMessage("")
    try {
      const response = await api.get("/moderator/items/")
      let filteredData = response.data
      if (filterStatus !== "all") {
        filteredData = response.data.filter((item) => item.moderation_status === filterStatus)
      }
      setItems(filteredData)
    } catch (error) {
      console.error("Error fetching items for moderation:", error.response?.data || error)
      setMessage("Failed to load items for moderation.")
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (itemId) => {
    setMessage("")
    try {
      await api.patch(`/moderator/items/${itemId}/approve/`)
      setMessage("Item approved successfully!")
      fetchItemsForModeration() // Refresh list
    } catch (error) {
      console.error("Error approving item:", error.response?.data || error)
      setMessage("Failed to approve item.")
    }
  }

  const handleReject = async (itemId) => {
    setMessage("")
    try {
      await api.patch(`/moderator/items/${itemId}/reject/`)
      setMessage("Item rejected successfully!")
      fetchItemsForModeration() // Refresh list
    } catch (error) {
      console.error("Error rejecting item:", error.response?.data || error)
      setMessage("Failed to reject item.")
    }
  }

  const handleDelete = async (itemId) => {
    if (window.confirm("Are you sure you want to permanently delete this item?")) {
      setMessage("")
      try {
        await api.delete(`/moderator/items/${itemId}/delete/`)
        setMessage("Item deleted successfully!")
        fetchItemsForModeration() // Refresh list
      } catch (error) {
        console.error("Error deleting item:", error.response?.data || error)
        setMessage("Failed to delete item.")
      }
    }
  }

  const getFullImageUrl = (relativePath) => {
    // Cloudinary URLs are absolute, so no need to prepend localhost:8000
    return relativePath || "/placeholder.svg?height=100&width=100"
  }

  const getStatusColor = (status) => {
    switch (status) {
      case "pending":
        return "#f39c12" // Orange
      case "approved":
        return "#27ae60" // Green
      case "rejected":
        return "#e74c3c" // Red
      default:
        return "#95a5a6" // Grey
    }
  }

  return (
    <div className="moderation-panel">
      <div className="moderation-header">
        <h1>Item Moderation Panel</h1>
        <div className="filter-controls">
          <label htmlFor="status-filter">Filter by Status:</label>
          <select id="status-filter" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {message && <div className={`message ${message.includes("successfully") ? "success" : "error"}`}>{message}</div>}

      {loading ? (
        <div className="loading">Loading items for moderation...</div>
      ) : items.length === 0 ? (
        <div className="no-items">
          <p>No items found for moderation with the current filter.</p>
        </div>
      ) : (
        <div className="moderation-grid">
          {items.map((item) => (
            <div key={item.id} className="moderation-card">
              <Link to={`/items/${item.id}`}>
                <img
                  src={getFullImageUrl(item.image) || "/placeholder.svg"}
                  alt={item.title}
                  className="moderation-item-image"
                />
              </Link>
              <div className="moderation-info">
                <h3>
                  <Link to={`/items/${item.id}`}>{item.title}</Link>
                </h3>
                <p>Uploader: {item.uploader.username}</p>
                <p>
                  Status:{" "}
                  <span style={{ backgroundColor: getStatusColor(item.moderation_status) }} className="status-badge">
                    {item.moderation_status.charAt(0).toUpperCase() + item.moderation_status.slice(1)}
                  </span>
                </p>
                <p>Available: {item.available ? "Yes" : "No"}</p>
                {item.point_value !== null && <p>Points: {item.point_value}</p>}
                <div className="moderation-actions">
                  {item.moderation_status !== "approved" && (
                    <button onClick={() => handleApprove(item.id)} className="btn btn-primary btn-small">
                      Approve
                    </button>
                  )}
                  {item.moderation_status !== "rejected" && (
                    <button onClick={() => handleReject(item.id)} className="btn btn-secondary btn-small">
                      Reject
                    </button>
                  )}
                  <button onClick={() => handleDelete(item.id)} className="btn nav-button btn-small">
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default ModerationPanel
