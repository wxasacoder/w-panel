const BASE = '/api'

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(BASE + url, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || res.statusText)
  }
  return res.json()
}

export interface Group {
  id: number
  name: string
  sort_order: number
  created_at: string
  updated_at: string
  cards: Card[]
}

export interface Card {
  id: number
  group_id: number
  title: string
  url: string
  icon_type: 'favicon' | 'upload' | 'letter'
  icon_value: string
  icon_bg_color: string
  open_mode: '_self' | '_blank'
  sort_order: number
  created_at: string
  updated_at: string
}

export interface Settings {
  theme: string
  background_image: string
  card_opacity: string
  blur_level: string
  weather_effect: string
  [key: string]: string
}

export interface ThemeInfo {
  id: string
  name: string
  description: string
  author: string
  built_in: boolean
}

export interface UploadResponse {
  id: string
  url: string
}

// Groups
export const getGroups = () => request<Group[]>('/groups')
export const createGroup = (name: string) => request<Group>('/groups', { method: 'POST', body: JSON.stringify({ name }) })
export const updateGroup = (id: number, name: string) => request<any>(`/groups/${id}`, { method: 'PUT', body: JSON.stringify({ name }) })
export const deleteGroup = (id: number) => request<any>(`/groups/${id}`, { method: 'DELETE' })
export const reorderGroups = (ids: number[]) => request<any>('/groups/reorder', { method: 'PUT', body: JSON.stringify({ ids }) })

// Cards
export const createCard = (card: { group_id: number; title: string; url: string; icon_type?: string; icon_value?: string; icon_bg_color?: string; open_mode?: string }) =>
  request<Card>('/cards', { method: 'POST', body: JSON.stringify(card) })
export const updateCard = (id: number, data: Record<string, any>) => request<any>(`/cards/${id}`, { method: 'PUT', body: JSON.stringify(data) })
export const deleteCard = (id: number) => request<any>(`/cards/${id}`, { method: 'DELETE' })
export const reorderCards = (group_id: number, ids: number[]) => request<any>('/cards/reorder', { method: 'PUT', body: JSON.stringify({ group_id, ids }) })

// Search
export const searchCards = (q: string) => request<Card[]>(`/search?q=${encodeURIComponent(q)}`)

// Settings
export const getSettings = () => request<Settings>('/settings')
export const updateSettings = (settings: Record<string, string>) => request<any>('/settings', { method: 'PUT', body: JSON.stringify(settings) })

// Upload
export const uploadFile = async (file: File): Promise<UploadResponse> => {
  const formData = new FormData()
  formData.append('file', file)
  const res = await fetch(BASE + '/upload', { method: 'POST', body: formData })
  if (!res.ok) throw new Error('Upload failed')
  return res.json()
}

// Favicon
export const fetchFavicon = (url: string) => request<{ icon_url: string }>(`/favicon?url=${encodeURIComponent(url)}`)

// Themes
export const getThemes = () => request<ThemeInfo[]>('/themes')
