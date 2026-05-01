export type AuthData = {
  token: string
  tenant: { id: string; name: string }
  user: { id: string; email: string; role: string }
}

const STORAGE_KEY = "dineops_auth"

// Simple client-side auth store using localStorage.
export function saveAuthData(auth: AuthData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(auth))
  localStorage.setItem("dineops_token", auth.token)
}

export function getAuthData(): AuthData | null {
  // Load saved auth state from localStorage if available.
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as AuthData
  } catch {
    return null
  }
}

export function logout() {
  // Clear auth storage so the app returns to the login state.
  localStorage.removeItem(STORAGE_KEY)
  localStorage.removeItem("dineops_token")
}
