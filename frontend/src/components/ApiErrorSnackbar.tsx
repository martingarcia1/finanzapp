import { useEffect, useState } from 'react'
import { Snackbar, Alert } from '@mui/material'
import { API_ERROR_EVENT } from '@/services/api'

/** Muestra los errores de cualquier operación de escritura contra el API. */
export default function ApiErrorSnackbar() {
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    const onError = (e: Event) => setMessage((e as CustomEvent<string>).detail)
    window.addEventListener(API_ERROR_EVENT, onError)
    return () => window.removeEventListener(API_ERROR_EVENT, onError)
  }, [])

  return (
    <Snackbar
      open={!!message}
      autoHideDuration={5000}
      onClose={() => setMessage(null)}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    >
      <Alert severity="error" variant="filled" onClose={() => setMessage(null)}>
        {message}
      </Alert>
    </Snackbar>
  )
}
