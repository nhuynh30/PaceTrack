import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL as string,
  withCredentials: true, // sends the HTTP-only refresh token cookie
});

// Attach the in-memory access token on every request.
// AuthContext calls setApiToken() after login / refresh so this stays in sync.
let _accessToken: string | null = null;

export function setApiToken(token: string | null) {
  _accessToken = token;
}

api.interceptors.request.use((config) => {
  if (_accessToken) {
    config.headers.Authorization = `Bearer ${_accessToken}`;
  }
  return config;
});
