const getDefaultApiBaseUrl = (): string => {
  if (typeof window === 'undefined') {
    return ''
  }

  const host = window.location.hostname
  if (host === 'localhost' || host === '127.0.0.1') {
    return 'http://localhost:3001'
  }

  return ''
}

const rawApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim() || getDefaultApiBaseUrl()
const normalizedApiBaseUrl = rawApiBaseUrl.replace(/\/$/, '')

export const buildApiUrl = (path: string): string => {
  if (!path.startsWith('/')) {
    throw new Error('API path must start with "/".')
  }

  return normalizedApiBaseUrl ? `${normalizedApiBaseUrl}${path}` : path
}

export interface ParsedApiResponse {
  data: Record<string, unknown> | null
  rawText: string
}

export const parseApiResponse = async (response: Response): Promise<ParsedApiResponse> => {
  const rawText = await response.text()

  if (!rawText) {
    return { data: null, rawText: '' }
  }

  try {
    const parsed = JSON.parse(rawText) as Record<string, unknown>
    return { data: parsed, rawText }
  } catch {
    return { data: null, rawText }
  }
}

export const getApiErrorMessage = ({
  response,
  data,
  rawText,
  fallback
}: {
  response: Response
  data: Record<string, unknown> | null
  rawText: string
  fallback: string
}): string => {
  const apiError = data?.error
  if (typeof apiError === 'string' && apiError.trim()) {
    return apiError
  }

  const apiMessage = data?.message
  if (typeof apiMessage === 'string' && apiMessage.trim()) {
    return apiMessage
  }

  const responseLooksLikeHtml = rawText.trim().startsWith('<')
  if (responseLooksLikeHtml) {
    return 'The API returned HTML instead of JSON. Check VITE_API_BASE_URL and ensure the backend API is running.'
  }

  if (response.status === 404) {
    return `API endpoint not found (404) at ${response.url}. Check VITE_API_BASE_URL and backend deployment routes.`
  }

  if (!response.ok) {
    return `Request failed (${response.status}). Please try again.`
  }

  return fallback
}
