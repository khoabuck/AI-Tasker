export function getToken() {
  return localStorage.getItem('accessToken')
}

export function setToken(token) {
  localStorage.setItem('accessToken', token)
}

export function clearToken() {
  localStorage.removeItem('accessToken')
}

export function getCurrentUser() {
  const raw = localStorage.getItem('currentUser')
  return raw ? JSON.parse(raw) : null
}
