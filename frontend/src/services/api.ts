import axios, { AxiosError } from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:5192/api',
})

export const TOKEN_KEY = 'fa_token'

// Eventos globales que escuchan AuthContext (sesión vencida) y ApiErrorSnackbar (errores al guardar)
export const UNAUTHORIZED_EVENT = 'fa:unauthorized'
export const API_ERROR_EVENT = 'fa:api-error'

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

/** Mensaje legible de un error del API ({ message } del backend, validaciones o red). */
export function getApiErrorMessage(err: unknown, fallback = 'Ocurrió un error inesperado'): string {
  if (err instanceof AxiosError) {
    if (!err.response) return 'No se pudo conectar con el servidor'
    const data = err.response.data as { message?: string; title?: string } | undefined
    return data?.message ?? data?.title ?? fallback
  }
  return (err as { message?: string })?.message ?? fallback
}

api.interceptors.response.use(
  (res) => res,
  (err: AxiosError) => {
    const isAuthRoute = err.config?.url?.startsWith('/auth/')
    if (err.response?.status === 401 && !isAuthRoute) {
      window.dispatchEvent(new Event(UNAUTHORIZED_EVENT))
    } else if (err.config?.method !== 'get' && !isAuthRoute) {
      window.dispatchEvent(new CustomEvent(API_ERROR_EVENT, { detail: getApiErrorMessage(err) }))
    }
    return Promise.reject(err)
  },
)

export default api
