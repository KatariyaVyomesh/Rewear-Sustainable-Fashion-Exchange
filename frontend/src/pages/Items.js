"use client"

import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import api from "../utils/api"

const Items = () => {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    fetchItems()
  }, [])

  const fetchItems = async () => {
    try {
      const response = await api.get("/items/")
      console.log("API Response for /items/:", response.data) // Existing log
      setItems(response.data)
      if (response.data.length === 0) {
        console.log("No items received from API. Displaying 'No items found' message.")
      } else {
        console.log(`Successfully fetched ${response.data.length} items.`)
      }
    } catch (error) {
      console.error("Error fetching items:", error.response?.data || error.message || error) // More detailed error logging
      setItems([]) // Ensure items array is empty on error
    } finally {
      setLoading(false)
    }
  }

  const filteredItems = items.filter(
    (item) =>
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  // Helper function to get the full image URL (now directly from Cloudinary)
  const getFullImageUrl = (relativePath) => {
    // Cloudinary URLs are absolute, so no need to prepend localhost:8000
    return relativePath || "/placeholder.svg?height=250&width=250"
  }

  return (
    <div className="items-page">
      <div className="items-header">
        <h1>Browse Items</h1>
        <div className="search-container">
          <input
            type="text"
            placeholder="Search items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      {loading ? (
        <div className="loading">Loading items...</div>
      ) : filteredItems.length === 0 ? (
        <div className="no-items">
          <p>No items found.</p>
          <Link to="/add-item" className="btn btn-primary">
            Add the first item!
          </Link>
        </div>
      ) : (
        <div className="items-grid">
          {filteredItems.map((item) => (
            <div key={item.id} className="item-card">
              <Link to={`/items/${item.id}`}>
                {/* Use getFullImageUrl */}
                <img src={getFullImageUrl(item.image) || "/placeholder.svg"} alt={item.title} className="item-image" />
                <div className="item-info">
                  <h3>{item.title}</h3>
                  <p className="item-description">
                    {item.description.length > 100 ? `${item.description.substring(0, 100)}...` : item.description}
                  </p>
                  <div className="item-meta">
                    <span className="item-uploader">By: {item.uploader.username}</span>
                    {item.featured && <span className="featured-badge">Featured</span>}
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Items
