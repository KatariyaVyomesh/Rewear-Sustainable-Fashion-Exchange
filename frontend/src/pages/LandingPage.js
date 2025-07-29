"use client"

import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import api from "../utils/api"

const LandingPage = () => {
  const [featuredItems, setFeaturedItems] = useState([])
  const [currentSlide, setCurrentSlide] = useState(0)

  useEffect(() => {
    fetchFeaturedItems()
  }, [])

  const fetchFeaturedItems = async () => {
    try {
      const response = await api.get("/items/featured/")
      setFeaturedItems(response.data)
    } catch (error) {
      console.error("Error fetching featured items:", error)
    }
  }

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % featuredItems.length)
  }

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + featuredItems.length) % featuredItems.length)
  }

  // Helper function to get the full image URL (now directly from Cloudinary)
  const getFullImageUrl = (relativePath) => {
    // Cloudinary URLs are absolute, so no need to prepend localhost:8000
    return relativePath || "/placeholder.svg?height=300&width=300"
  }

  return (
    <div className="landing-page">
      <section className="hero">
        <div className="hero-content">
          <h1>Welcome to ReWear</h1>
          <p>Community Clothing Exchange - Give your clothes a second life!</p>
          <div className="hero-buttons">
            <Link to="/register" className="btn btn-primary">
              Get Started
            </Link>
            <Link to="/items" className="btn btn-secondary">
              Browse Items
            </Link>
          </div>
        </div>
      </section>

      {featuredItems.length > 0 && (
        <section className="featured-section">
          <h2>Featured Items</h2>
          <div className="carousel">
            <button className="carousel-btn prev" onClick={prevSlide}>
              ‹
            </button>
            <div className="carousel-content">
              <div className="featured-item">
                {/* Use getFullImageUrl */}
                <img
                  src={getFullImageUrl(featuredItems[currentSlide]?.image) || "/placeholder.svg"}
                  alt={featuredItems[currentSlide]?.title}
                />
                <h3>{featuredItems[currentSlide]?.title}</h3>
                <p>{featuredItems[currentSlide]?.description}</p>
                <Link to={`/items/${featuredItems[currentSlide]?.id}`} className="btn btn-primary">
                  View Details
                </Link>
              </div>
            </div>
            <button className="carousel-btn next" onClick={nextSlide}>
              ›
            </button>
          </div>
          <div className="carousel-dots">
            {featuredItems.map((_, index) => (
              <button
                key={index}
                className={`dot ${index === currentSlide ? "active" : ""}`}
                onClick={() => setCurrentSlide(index)}
              />
            ))}
          </div>
        </section>
      )}

      <section className="features">
        <div className="features-grid">
          <div className="feature">
            <h3>🔄 Easy Swapping</h3>
            <p>Request swaps for items you love and give your clothes a new home.</p>
          </div>
          <div className="feature">
            <h3>🌱 Sustainable</h3>
            <p>Reduce waste by participating in the circular economy of fashion.</p>
          </div>
          <div className="feature">
            <h3>👥 Community</h3>
            <p>Connect with like-minded people who care about sustainable fashion.</p>
          </div>
        </div>
      </section>
    </div>
  )
}

export default LandingPage
