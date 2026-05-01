import axios from "axios"

// Axios client for frontend API calls. Uses the VITE_API_URL env var if provided.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:4000/api",
  headers: { "Content-Type": "application/json" },
})

api.interceptors.request.use((config) => {
  // Attach the JWT to every outgoing request if it exists.
  const token = localStorage.getItem("dineops_token")
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export type SignupPayload = {
  restaurantName: string
  ownerEmail: string
  password: string
}

export type LoginPayload = {
  email: string
  password: string
}

export async function signup(payload: SignupPayload) {
  // Send signup data to the backend and return the response payload.
  const response = await api.post("/auth/signup", payload)
  return response.data
}

export async function login(payload: LoginPayload) {
  // Send login data to the backend and return the auth token and user info.
  const response = await api.post("/auth/login", payload)
  return response.data
}

export type MeResponse = {
  tenant: { id: string; name: string }
  user: { id: string; email: string; role: string }
}

/** Validates the JWT and returns current user + tenant from the database. */
export async function getMe() {
  const response = await api.get<MeResponse>("/me")
  return response.data
}

export default api
