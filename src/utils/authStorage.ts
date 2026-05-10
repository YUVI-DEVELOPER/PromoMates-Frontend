export const AUTH_TOKEN_STORAGE_KEY = "promomates.accessToken";
export const AUTH_UNAUTHORIZED_EVENT = "promomates:auth:unauthorized";


export function getStoredAuthToken(): string | null {
  return window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
}


export function setStoredAuthToken(token: string): void {
  window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
}


export function clearStoredAuthToken(): void {
  window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
}


export function notifyUnauthorized(): void {
  window.dispatchEvent(new Event(AUTH_UNAUTHORIZED_EVENT));
}
