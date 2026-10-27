"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { apiRequest } from "@/lib/api";
import {
  TOKEN_KEY,
  clearStoredToken,
  getStoredToken,
  storeToken,
} from "@/lib/auth-storage";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const tokenRef = useRef(undefined);

  useEffect(() => {
    let active = true;

    // Resuelve la identidad a partir del token guardado. Se ejecuta al
    // arrancar y cada vez que otra pestaña inicia o cierra sesión.
    async function syncSession() {
      const token = getStoredToken();

      if (token === tokenRef.current) return;
      tokenRef.current = token;

      if (!token) {
        if (active) {
          setUser(null);
          setLoading(false);
        }
        return;
      }

      if (active) setLoading(true);

      try {
        const data = await apiRequest("/auth/me");
        if (active && tokenRef.current === token) setUser(data.user);
      } catch {
        if (active && tokenRef.current === token) {
          clearStoredToken();
          tokenRef.current = null;
          setUser(null);
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    syncSession();

    const handleUnauthorized = () => {
      tokenRef.current = null;
      clearStoredToken();
      setUser(null);
    };

    const handleStorage = (event) => {
      // `event.key === null` significa que se limpió todo el almacenamiento.
      if (event.key !== null && event.key !== TOKEN_KEY) return;
      syncSession();
    };

    window.addEventListener("cubito:unauthorized", handleUnauthorized);
    window.addEventListener("storage", handleStorage);

    return () => {
      active = false;
      // Permite que un remontaje (React StrictMode en desarrollo) vuelva a
      // resolver la sesión en lugar de quedarse con el estado del primer efecto.
      tokenRef.current = undefined;
      window.removeEventListener("cubito:unauthorized", handleUnauthorized);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const login = useCallback(async ({ email, password, remember = false }) => {
    const data = await apiRequest("/auth/login", {
      method: "POST",
      body: { email, password, remember },
    });

    storeToken(data.token, remember);
    tokenRef.current = data.token;
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    apiRequest("/auth/logout", { method: "POST" }).catch(() => {});
    tokenRef.current = null;
    clearStoredToken();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: Boolean(user),
      login,
      logout,
    }),
    [user, loading, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth debe usarse dentro de AuthProvider");
  }

  return context;
}
