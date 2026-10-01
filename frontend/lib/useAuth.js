import { useState, useEffect, createContext, useContext } from "react";
import { useRouter } from "next/router";
import { getCurrentUser } from "./api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const publicPages = ["/login", "/register"];
    const isPublicPage = publicPages.includes(router.pathname);

    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

    if (!token) {
      setUser(null);
      setLoading(false);
      if (!isPublicPage && router.pathname !== "/") {
        router.replace("/login");
      }
      return;
    }

    // Ada token, validasi ke backend
    getCurrentUser()
      .then((res) => {
        setUser(res.data);
        // Jika sedang di halaman login/register dan sudah login, arahkan ke dashboard
        if (isPublicPage) {
          router.replace("/dashboard");
        }
      })
      .catch(() => {
        if (typeof window !== "undefined") {
          localStorage.removeItem("token");
        }
        setUser(null);
        if (!isPublicPage) {
          router.replace("/login");
        }
      })
      .finally(() => {
        setLoading(false);
      });
  }, [router.pathname]);

  const logout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
    }
    setUser(null);
    router.replace("/login");
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
