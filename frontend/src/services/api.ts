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

export type StaffUser = {
  id: string
  email: string
  role: string
  isActive: boolean
  createdAt: string
}

export async function listStaff() {
  const response = await api.get<{ users: StaffUser[] }>("/staff")
  return response.data
}

export async function createStaff(payload: { email: string; password: string; role: 'waiter' | 'kitchen' }) {
  const response = await api.post<{ user: StaffUser }>("/staff", payload)
  return response.data
}

// ─── Tables ─────────────────────────────────────────────────────────────────

export type FloorTable = {
  id: string
  tenantId: string
  label: string
  capacity: number
  status: string
  createdAt: string
}

export async function listTables() {
  const response = await api.get<{ tables: FloorTable[] }>("/tables")
  return response.data.tables
}

export async function createTable(payload: { label: string; capacity?: number }) {
  const response = await api.post<{ table: FloorTable }>("/tables", payload)
  return response.data.table
}

export async function updateTable(id: string, payload: { label?: string; capacity?: number }) {
  const response = await api.patch<{ table: FloorTable }>(`/tables/${id}`, payload)
  return response.data.table
}

export async function setTableStatus(id: string, status: 'empty' | 'occupied' | 'bill_pending') {
  const response = await api.patch<{ table: FloorTable }>(`/tables/${id}/status`, { status })
  return response.data.table
}

export async function deleteTable(id: string) {
  await api.delete(`/tables/${id}`)
}

// ─── Menu ───────────────────────────────────────────────────────────────────

export type MenuItemDto = {
  id: string
  category: string
  name: string
  description: string | null
  price: string
  sortOrder: number
  isAvailable: boolean
}

export async function fetchMenu() {
  const response = await api.get<{ version: number; items: MenuItemDto[] }>("/menu")
  return response.data
}

export async function createMenuItem(payload: {
  category: string
  name: string
  description?: string | null
  price: number
  sortOrder?: number
  isAvailable?: boolean
}) {
  const response = await api.post<{ item: MenuItemDto }>("/menu/items", payload)
  return response.data.item
}

export async function updateMenuItem(id: string, payload: Partial<{
  category: string
  name: string
  description: string | null
  price: number
  sortOrder: number
  isAvailable: boolean
}>) {
  const response = await api.patch<{ item: MenuItemDto }>(`/menu/items/${id}`, payload)
  return response.data.item
}

export async function deleteMenuItem(id: string) {
  await api.delete(`/menu/items/${id}`)
}

// ─── Orders ─────────────────────────────────────────────────────────────────

export type OrderLineDto = {
  id: string
  menuItemId: string
  quantity: number
  unitPrice: string
  itemName: string
  note: string | null
}

export type OrderDto = {
  id: string
  tableId: string
  tableLabel: string
  menuVersion: number
  status: string
  source: string
  notes: string | null
  createdAt: string
  placedBy: { id: string; email: string; role: string } | null
  items: OrderLineDto[]
}

export async function listOrders(params?: { tableId?: string; status?: string }) {
  const response = await api.get<{ orders: OrderDto[] }>("/orders", { params })
  return response.data.orders
}

export async function createOrder(payload: {
  tableId: string
  items: { menuItemId: string; quantity: number; note?: string }[]
  notes?: string
}) {
  const response = await api.post<{ order: OrderDto }>("/orders", payload)
  return response.data.order
}

export async function advanceOrderStatus(orderId: string) {
  const response = await api.patch<{ order: OrderDto }>(`/orders/${orderId}/status`, {})
  return response.data.order
}

// ─── Analytics & admin tenant ─────────────────────────────────────────────────

export type DashboardSummary = {
  revenueToday: string
  revenueYesterday: string
  revenueTrendPct: number | null
  tablesActive: number
  tablesTotal: number
  openOrders: number
  staffActive: number
}

export type DashboardRecentOrder = {
  id: string
  shortId: string
  tableLabel: string
  status: string
  itemsSummary: string
  total: string
  createdAt: string
}

export async function fetchDashboard() {
  const response = await api.get<{
    summary: DashboardSummary
    recentOrders: DashboardRecentOrder[]
  }>("/analytics/dashboard")
  return response.data
}

export type ReportDay = { date: string; orderCount: number; servedRevenue: string }
export type TopItem = { itemName: string; quantity: number; revenue: string }

export async function fetchAnalyticsReports() {
  const response = await api.get<{
    topItems: TopItem[]
    ordersByDay: ReportDay[]
    rangeDays: number
  }>("/analytics/reports")
  return response.data
}

export type AdminTenant = {
  id: string
  name: string
  ownerEmail: string
  tier: string
  isActive: boolean
  createdAt: string
}

export async function getAdminTenant() {
  const response = await api.get<{ tenant: AdminTenant }>("/admin/tenant")
  return response.data.tenant
}

export default api
