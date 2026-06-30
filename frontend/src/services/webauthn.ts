import api from './api'

// ─── Base64url ────────────────────────────────────────────────────────────────

function toBuffer(base64url: string): ArrayBuffer {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64.padEnd(base64.length + (4 - (base64.length % 4)) % 4, '=')
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes.buffer
}

function toBase64url(buffer: ArrayBuffer | null | undefined): string {
  if (!buffer) return ''
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

// ─── Registro biométrico (requiere JWT activo) ────────────────────────────────

export async function registerBiometric(deviceName: string): Promise<void> {
  const { data: options } = await api.post('/auth/webauthn/register/options', { deviceName })

  const createOptions: PublicKeyCredentialCreationOptions = {
    ...options,
    challenge: toBuffer(options.challenge),
    user: { ...options.user, id: toBuffer(options.user.id) },
    excludeCredentials: (options.excludeCredentials ?? []).map((c: { id: string; type: string; transports?: string[] }) => ({
      ...c,
      id: toBuffer(c.id),
    })),
  }

  const credential = (await navigator.credentials.create({ publicKey: createOptions })) as PublicKeyCredential
  if (!credential) throw new Error('El dispositivo canceló la operación')

  const response = credential.response as AuthenticatorAttestationResponse

  await api.post('/auth/webauthn/register/complete', {
    id: credential.id,
    rawId: toBase64url(credential.rawId),
    type: credential.type,
    deviceName,
    response: {
      clientDataJSON: toBase64url(response.clientDataJSON),
      attestationObject: toBase64url(response.attestationObject),
    },
  })
}

// ─── Login biométrico ─────────────────────────────────────────────────────────

export async function loginWithBiometric(email: string): Promise<string> {
  const { data: options } = await api.post('/auth/webauthn/login/options', { email })

  const assertionOptions: PublicKeyCredentialRequestOptions = {
    ...options,
    challenge: toBuffer(options.challenge),
    allowCredentials: (options.allowCredentials ?? []).map((c: { id: string; type: string; transports?: string[] }) => ({
      ...c,
      id: toBuffer(c.id),
    })),
  }

  const assertion = (await navigator.credentials.get({ publicKey: assertionOptions })) as PublicKeyCredential
  if (!assertion) throw new Error('El dispositivo canceló la operación')

  const response = assertion.response as AuthenticatorAssertionResponse

  const { data } = await api.post('/auth/webauthn/login/complete', {
    id: assertion.id,
    rawId: toBase64url(assertion.rawId),
    type: assertion.type,
    response: {
      clientDataJSON: toBase64url(response.clientDataJSON),
      authenticatorData: toBase64url(response.authenticatorData),
      signature: toBase64url(response.signature),
      userHandle: toBase64url(response.userHandle ?? undefined),
    },
  })

  return data.token as string
}

export const isWebAuthnSupported = () =>
  typeof window !== 'undefined' && !!window.PublicKeyCredential
