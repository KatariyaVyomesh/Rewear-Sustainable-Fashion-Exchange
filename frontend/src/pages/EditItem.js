"use client"

import { useState, useEffect } from "react"
import { useNavigate, useParams } from "react-router-dom"
import api from "../utils/api"

const EditItem = () => {
  const navigate = useNavigate()
  const { id } = useParams() // Get item ID from URL
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    image: null,
    point_value: "",
    available: true, // Include available status for editing
  })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true) // Loading for initial fetch
  const [actionLoading, setActionLoading] = useState(false) // Loading for form submission
  const [imagePreview, setImagePreview] = useState(null)

  useEffect(() => {
    const fetchItemData = async () => {
      try {
        const response = await api.get(`/items/${id}/`)
        const itemData = response.data
        setFormData({
          title: itemData.title,
          description: itemData.description,
          image: null, // Don't pre-fill image file, user will re-upload if needed
          point_value: itemData.point_value !== null ? itemData.point_value : "",
          available: itemData.available,
        })
        if (itemData.image) {
          setImagePreview(itemData.image) // Directly use the Cloudinary URL
        }
      } catch (err) {
        console.error("Error fetching item for edit:", err)
        setError("Failed to load item data.")
        navigate("/dashboard") // Redirect if item not found or not authorized
      } finally {
        setLoading(false)
      }
    }
    fetchItemData()
  }, [id, navigate])

  const handleChange = (e) => {
    const { name, value, type, checked, files } = e.target
    if (name === "image" && files && files[0]) {
      setFormData({
        ...formData,
        image: files[0],
      })
      setImagePreview(URL.createObjectURL(files[0]))
    } else {
      setFormData({
        ...formData,
        [name]: type === "checkbox" ? checked : value,
      })
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setActionLoading(true)
    setError("")

    const dataToSend = new FormData()
    dataToSend.append("title", formData.title)
    dataToSend.append("description", formData.description)
    dataToSend.append("available", formData.available) // Send available status
    if (formData.image) {
      dataToSend.append("image", formData.image)
    }
    if (formData.point_value !== "") {
      dataToSend.append("point_value", formData.point_value)
    } else {
      // If point_value is explicitly cleared, send null to backend
      dataToSend.append("point_value", "")
    }

    console.log("Attempting to update item data...")
    for (const pair of dataToSend.entries()) {
      console.log(pair[0] + ": " + pair[1])
    }

    try {
      // Use PATCH for partial updates, or PUT for full replacement
      await api.patch(`/items/${id}/`, dataToSend)
      navigate(`/items/${id}`) // Go back to item detail page
    } catch (err) {
      console.error("Error updating item:", err.response || err)
      const errorData = err.response?.data
      if (errorData) {
        const errorMessage = Object.values(errorData).flat().join(", ")
        setError(errorMessage)
      } else {
        setError("Failed to update item. Check console for details.")
      }
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return <div className="loading">Loading item for edit...</div>
  }

  return (
    <div className="add-item-page">
      {" "}
      {/* Reusing add-item-page styling */}
      <div className="add-item-container">
        <h2>Edit Item</h2>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit} className="add-item-form">
          <div className="form-group">
            <label htmlFor="title">Title:</label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              placeholder="Enter item title"
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description:</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              required
              rows="4"
              placeholder="Describe your item..."
            />
          </div>

          <div className="form-group">
            <label htmlFor="image">Image File (Leave blank to keep current):</label>
            <input type="file" id="image" name="image" accept="image/*" onChange={handleChange} />
          </div>

          {imagePreview && (
            <div className="image-preview">
              <img src={imagePreview || "/placeholder.svg"} alt="Preview" />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="point_value">Point Value (Optional):</label>
            <input
              type="number"
              id="point_value"
              name="point_value"
              value={formData.point_value}
              onChange={handleChange}
              placeholder="e.g., 10 (leave empty for swap-only)"
              min="0"
            />
            <small>Set points required to redeem this item. If left empty, item can only be swapped.</small>
          </div>

          <div className="form-group checkbox-group">
            {" "}
            {/* Added checkbox-group for styling */}
            <input
              type="checkbox"
              id="available"
              name="available"
              checked={formData.available}
              onChange={handleChange}
            />
            <label htmlFor="available">Available for Swap/Redeem</label>
          </div>

          <div className="form-actions">
            <button type="submit" disabled={actionLoading} className="btn btn-primary">
              {actionLoading ? "Updating Item..." : "Update Item"}
            </button>
            <button type="button" onClick={() => navigate(`/items/${id}`)} className="btn btn-secondary">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default EditItem
