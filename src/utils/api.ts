const rawApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim() || ''
const normalizedApiBaseUrl = rawApiBaseUrl.replace(/\/$/, '')

export const buildApiUrl = (path: string): string => {
  if (!path.startsWith('/')) {
    throw new Error('API path must start with "/".')
  }

  return normalizedApiBaseUrl ? `${normalizedApiBaseUrl}${path}` : path
}
