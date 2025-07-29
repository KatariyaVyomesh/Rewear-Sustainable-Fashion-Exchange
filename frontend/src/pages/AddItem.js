"use client"

import { useState } from "react"
import { useNavigate } from "react-router-dom"
import api from "../utils/api" // Import our custom api instance

const AddItem = () => {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    image: null,
    point_value: "", // New state for point_value
  })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [imagePreview, setImagePreview] = useState(null)

  const handleChange = (e) => {
    const { name, value, files } = e.target
    if (name === "image" && files && files[0]) {
      setFormData({
        ...formData,
        image: files[0],
      })
      setImagePreview(URL.createObjectURL(files[0]))
    } else {
      setFormData({
        ...formData,
        [name]: value,
      })
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    const dataToSend = new FormData()
    dataToSend.append("title", formData.title)
    dataToSend.append("description", formData.description)
    if (formData.image) {
      dataToSend.append("image", formData.image)
    }
    // Only append point_value if it's a non-empty string
    if (formData.point_value !== "") {
      dataToSend.append("point_value", formData.point_value)
    }

    console.log("Attempting to send item data...")
    for (const pair of dataToSend.entries()) {
      console.log(pair[0] + ": " + pair[1])
    }

    try {
      await api.post("/items/", dataToSend)
      navigate("/dashboard")
    } catch (error) {
      console.error("Error adding item:", error.response || error)
      const errorData = error.response?.data
      if (errorData) {
        const errorMessage = Object.values(errorData).flat().join(", ")
        setError(errorMessage)
      } else {
        setError("Failed to add item. Check console for details.")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="add-item-page">
      <div className="add-item-container">
        <h2>Add New Item</h2>

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
            <label htmlFor="image">Image File:</label>
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
            <small>Set points required to redeem this item. If left empty, it can only be swapped.</small>
          </div>

          <div className="form-actions">
            <button type="submit" disabled={loading} className="btn btn-primary">
              {loading ? "Adding Item..." : "Add Item"}
            </button>
            <button type="button" onClick={() => navigate("/dashboard")} className="btn btn-secondary">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AddItem
