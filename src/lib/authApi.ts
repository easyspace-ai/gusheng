export interface CurrentUser {
  id: string
  email: string
  name: string
  role: string
}

export interface AuthMeResponse {
  user: CurrentUser
  loggedIn: boolean
  mode?: string
}

function getBaseUrl(): string {
  const envUrl = (import.meta.env.VITE_API_URL as string | undefined)?.trim()
  if (envUrl) return envUrl.replace(/\/$/, '')
  return 'http://localhost:8787'
}

export async function getCurrentUser(): Promise<AuthMeResponse> {
  const response = await fetch(`${getBaseUrl()}/api/auth/me`, {
  })

  if (!response.ok) {
    throw new Error(`Failed to load current user: ${response.status}`)
  }

  return response.json() as Promise<AuthMeResponse>
}
