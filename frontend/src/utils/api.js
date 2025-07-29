// frontend/src/utils/api.js
import axios from "axios"

// Function to get a cookie by name
function getCookie(name) {
  let cookieValue = null
  if (document.cookie && document.cookie !== "") {
    const cookies = document.cookie.split(";")
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim()
      // Does this cookie string begin with the name we want?
      if (cookie.substring(0, name.length + 1) === name + "=") {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1))
        break
      }
    }
  }
  return cookieValue
}

// Create a custom Axios instance
const api = axios.create({
  baseURL: "http://localhost:8000/api", // Your Django backend API base URL
  withCredentials: true, // Important for sending and receiving cookies (sessions, CSRF)
})

// Add a request interceptor to include the CSRF token
api.interceptors.request.use(
  (config) => {
    // Only add CSRF token to non-GET requests
    if (config.method !== "get") {
      const csrfToken = getCookie("csrftoken")
      if (csrfToken) {
        config.headers["X-CSRFToken"] = csrfToken
        console.log("Axios Interceptor: X-CSRFToken set to:", csrfToken.substring(0, 10) + "...") // Log partial token
      } else {
        console.warn("Axios Interceptor: CSRF cookie 'csrftoken' not found. Request might fail.")
      }
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  },
)

// Configure Axios to automatically handle Django's CSRF token
// Django's CSRF cookie is named 'csrftoken' by default
api.defaults.xsrfCookieName = "csrftoken"
// Django expects the CSRF token in the 'X-CSRFToken' header
api.defaults.xsrfHeaderName = "X-CSRFToken"

// This function is still useful to ensure the csrftoken cookie is set by Django
// It makes a GET request to a Django view that ensures the cookie is sent.
export const getCsrfToken = async () => {
  try {
    const response = await api.get("/csrf/")
    console.log("Frontend: Initial CSRF token request sent. Check browser cookies for 'csrftoken'.")
    return response.data.csrfToken // Returns the token from the response body (for debugging)
  } catch (error) {
    console.error("Frontend: Error fetching initial CSRF token:", error)
    throw error
  }
}

export default api
