"use client"

import { useState, useEffect } from "react"
import { useParams, useNavigate, Link } from "react-router-dom"
import api from "../utils/api"

const ItemDetail = ({ user }) => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [item, setItem] = useState(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [currentUser, setCurrentUser] = useState(user)
  const [pendingSwaps, setPendingSwaps] = useState([])
  const [hasRequestedSwap, setHasRequestedSwap] = useState(false)
  const [currentUserItems, setCurrentUserItems] = useState([]) // State for user's own available items
  const [selectedSwapItem, setSelectedSwapItem] = useState("") // State for selected item to offer in a swap

  useEffect(() => {
    fetchItem()
    fetchUserProfile()
  }, [id])

  useEffect(() => {
    if (currentUser) {
      fetchCurrentUserItems()
      checkUserSwapStatus()
    }
  }, [currentUser, item])

  const fetchItem = async () => {
    try {
      const response = await api.get(`/items/${id}/`)
      setItem(response.data)
      if (user && response.data.uploader.id === user.id) {
        fetchPendingSwapsForMyItem(response.data.id)
      }
    } catch (error) {
      console.error("Error fetching item:", error)
      navigate("/items")
    } finally {
      setLoading(false)
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

  const fetchCurrentUserItems = async () => {
    try {
      const response = await api.get("/items/")
      const userOwnedAvailableItems = response.data.filter(
        (item) => currentUser && item.uploader.id === currentUser.id && item.available,
      )
      setCurrentUserItems(userOwnedAvailableItems)
      if (userOwnedAvailableItems.length > 0 && !selectedSwapItem) {
        setSelectedSwapItem(userOwnedAvailableItems[0].id)
      }
    } catch (error) {
      console.error("Error fetching current user's items:", error)
    }
  }

  const checkUserSwapStatus = async () => {
    if (currentUser && item) {
      try {
        const response = await api.get("/swaps/")
        const existingSwap = response.data.find(
          (swap) => swap.item.id === item.id && (swap.status === "pending" || swap.status === "approved"),
        )
        setHasRequestedSwap(!!existingSwap)
      } catch (error) {
        console.error("Error checking user swap status:", error)
      }
    }
  }

  const handleSwapOrRedeem = async (actionType) => {
    if (!currentUser) {
      navigate("/login")
      return
    }

    setActionLoading(true)
    setMessage("")

    try {
      if (actionType === "swap") {
        if (!selectedSwapItem) {
          setMessage("Please select an item to offer for the swap.")
          setActionLoading(false)
          return
        }
        await api.post("/swaps/create/", { item_id: item.id, requested_item_id: selectedSwapItem })
        setMessage("Swap request sent successfully!")
      } else if (actionType === "redeem") {
        await api.post("/swaps/create/", { item_id: item.id })
        setMessage("Redeem request sent successfully! Points deducted.")
      }
      setHasRequestedSwap(true)
      fetchUserProfile()
      fetchCurrentUserItems()
    } catch (error) {
      const errorMessage = error.response?.data?.error || "Failed to send request"
      setMessage(errorMessage)
    } finally {
      setActionLoading(false)
    }
  }

  const handleApproveSwap = async (swapId) => {
    setActionLoading(true)
    setMessage("")
    try {
      await api.patch(`/swaps/${swapId}/approve/`)
      setMessage("Swap approved successfully! Item is now unavailable.")
      fetchItem()
      fetchUserProfile()
      fetchPendingSwapsForMyItem(item.id)
      fetchCurrentUserItems()
    } catch (error) {
      const errorMessage = error.response?.data?.error || "Failed to approve swap."
      setMessage(errorMessage)
    } finally {
      setActionLoading(false)
    }
  }

  const handleDisapproveSwap = async (swapId) => {
    setActionLoading(true)
    setMessage("")
    try {
      await api.patch(`/swaps/${swapId}/disapprove/`)
      setMessage("Swap disapproved. Offered item is now available again.")
      fetchItem() // Refresh item status
      fetchUserProfile() // Refresh requester's points (if points were refunded)
      fetchPendingSwapsForMyItem(item.id) // Refresh pending swaps for this item
      fetchCurrentUserItems() // Refresh user's own items (if they offered one)
    } catch (error) {
      const errorMessage = error.response?.data?.error || "Failed to disapprove swap."
      setMessage(errorMessage)
    } finally {
      setActionLoading(false)
    }
  }

  const handleRemoveItem = async () => {
    if (window.confirm("Are you sure you want to remove this item? This action cannot be undone.")) {
      setActionLoading(true)
      setMessage("")
      try {
        await api.delete(`/items/${id}/`)
        setMessage("Item removed successfully!")
        navigate("/dashboard") // Redirect to dashboard after deletion
      } catch (error) {
        const errorMessage = error.response?.data?.detail || "Failed to remove item."
        setMessage(errorMessage)
      } finally {
        setActionLoading(false)
      }
    }
  }

  const handleUpdateItem = () => {
    navigate(`/edit-item/${id}`)
  }

  const fetchPendingSwapsForMyItem = async (itemId) => {
    try {
      const response = await api.get("/my-item-swaps/")
      const filteredSwaps = response.data.filter((swap) => swap.item.id === itemId && swap.status === "pending")
      setPendingSwaps(filteredSwaps)
    } catch (error) {
      console.error("Error fetching pending swaps for my item:", error)
    }
  }

  if (loading) {
    return <div className="loading">Loading item...</div>
  }

  if (!item) {
    return <div className="error">Item not found</div>
  }

  const isOwner = currentUser && currentUser.id === item.uploader.id
  const hasEnoughPoints = currentUser && item.point_value !== null && currentUser.points >= item.point_value
  const canRedeemThisItem = item.point_value !== null // Can this specific item be redeemed via points?

  // Determine if the item is available for interaction by non-owners
  const isInteractable = item.available && item.moderation_status === "approved"

  const getFullImageUrl = (relativePath) => {
    // Cloudinary URLs are absolute, so no need to prepend localhost:8000
    return relativePath || "/placeholder.svg?height=400&width=400"
  }

  return (
    <div className="item-detail-page">
      <div className="item-detail-container">
        <div className="item-image-section">
          <img src={getFullImageUrl(item.image) || "/placeholder.svg"} alt={item.title} className="item-detail-image" />
        </div>

        <div className="item-info-section">
          <h1>{item.title}</h1>
          {item.featured && <span className="featured-badge">Featured Item</span>}

          <div className="item-meta">
            <p>
              <strong>Uploaded by:</strong> {item.uploader.username}
            </p>
            <p>
              <strong>Added:</strong> {new Date(item.created_at).toLocaleDateString()}
            </p>
            <p>
              <strong>Status:</strong> {item.available ? "Available" : "Not Available"}
            </p>
            <p>
              <strong>Moderation:</strong>{" "}
              {item.moderation_status.charAt(0).toUpperCase() + item.moderation_status.slice(1)}
            </p>
            {item.point_value !== null && (
              <p>
                <strong>Redeem Value:</strong> {item.point_value} points
              </p>
            )}
          </div>

          <div className="item-description">
            <h3>Description</h3>
            <p>{item.description}</p>
          </div>

          {message && (
            <div className={`message ${message.includes("successfully") ? "success" : "error"}`}>{message}</div>
          )}

          <div className="item-actions">
            {!currentUser ? (
              <div>
                <p>Please log in to interact with this item.</p>
                <button onClick={() => navigate("/login")} className="btn btn-primary">
                  Login
                </button>
              </div>
            ) : isOwner ? (
              <>
                <p>This is your item.</p>
                <div className="owner-actions" style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
                  <button onClick={handleUpdateItem} className="btn btn-secondary">
                    Update Item
                  </button>
                  <button onClick={handleRemoveItem} className="btn nav-button">
                    Remove Item
                  </button>
                </div>
                {pendingSwaps.length > 0 && (
                  <div className="pending-swaps-section">
                    <h4>Incoming Requests for Your Item:</h4>
                    {pendingSwaps.map((swap) => (
                      <div
                        key={swap.id}
                        className="pending-swap-card"
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          border: "1px solid #eee",
                          padding: "0.75rem",
                          borderRadius: "4px",
                          marginBottom: "0.5rem",
                        }}
                      >
                        <span>
                          Request from: {swap.user.username}{" "}
                          {swap.requested_item ? (
                            <>
                              offering{" "}
                              <Link to={`/items/${swap.requested_item.id}`}>"{swap.requested_item.title}"</Link>
                            </>
                          ) : (
                            "via points"
                          )}
                        </span>
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                          <button
                            onClick={() => handleApproveSwap(swap.id)}
                            disabled={actionLoading}
                            className="btn btn-primary btn-small"
                          >
                            {actionLoading ? "Approving..." : "Approve"}
                          </button>
                          <button
                            onClick={() => handleDisapproveSwap(swap.id)}
                            disabled={actionLoading}
                            className="btn btn-secondary btn-small"
                          >
                            {actionLoading ? "Disapproving..." : "Disapprove"}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : !isInteractable ? ( // Check if item is not available OR not approved
              <p>This item is currently {item.available ? "pending moderation" : "not available"}.</p>
            ) : hasRequestedSwap ? (
              <p>You have already requested this item.</p>
            ) : (
              <>
                {/* Option 1: Redeem via Points (if item has a point value) */}
                {canRedeemThisItem && (
                  <div className="redeem-option">
                    <p>
                      Redeem cost: {item.point_value} points. Your points: {currentUser.points}
                    </p>
                    <button
                      onClick={() => handleSwapOrRedeem("redeem")}
                      disabled={actionLoading || !hasEnoughPoints}
                      className="btn btn-primary"
                    >
                      {actionLoading ? "Redeeming..." : !hasEnoughPoints ? "Insufficient Points" : "Redeem via Points"}
                    </button>
                  </div>
                )}

                {/* Option 2: Swap with your item (if user has items to offer) */}
                {currentUserItems.length > 0 && (
                  <div className="swap-option" style={{ marginTop: "1rem" }}>
                    <p>Offer one of your items for a swap:</p>
                    <select
                      value={selectedSwapItem}
                      onChange={(e) => setSelectedSwapItem(e.target.value)}
                      className="form-group input"
                    >
                      {currentUserItems.map((myitem) => (
                        <option key={myitem.id} value={myitem.id}>
                          {myitem.title}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => handleSwapOrRedeem("swap")}
                      disabled={actionLoading || !selectedSwapItem}
                      className="btn btn-primary"
                    >
                      {actionLoading ? "Sending Swap..." : "Swap with this Item"}
                    </button>
                  </div>
                )}

                {/* Message if neither option is available */}
                {!canRedeemThisItem && currentUserItems.length === 0 && (
                  <p>This item can only be swapped, and you don't have any items listed to offer.</p>
                )}
                {!canRedeemThisItem && currentUserItems.length > 0 && (
                  <p>This item can only be swapped. Select one of your items above to offer.</p>
                )}
                {canRedeemThisItem && !hasEnoughPoints && currentUserItems.length === 0 && (
                  <p>
                    You don't have enough points to redeem this item, and you don't have any items listed to offer for a
                    swap.
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ItemDetail
