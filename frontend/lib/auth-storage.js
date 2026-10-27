export const TOKEN_KEY = "cubito.auth.token";

export function getStoredToken() {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY);
}

export function storeToken(token, remember) {
  if (typeof window === "undefined") return;

  clearStoredToken();
  const storage = remember ? localStorage : sessionStorage;
  storage.setItem(TOKEN_KEY, token);
}

export function clearStoredToken() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
}
