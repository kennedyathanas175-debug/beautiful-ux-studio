import { createContext, useCallback, useContext, useEffect, useMemo, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ensureCsrf } from "./api";
import type { AuthResponse, Innovator } from "./api-types";

interface AuthContextValue {
  user: Innovator | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<Innovator>;
  register: (payload: {
    email: string;
    fullName: string;
    password: string;
    passwordConfirm: string;
    role: string;
    institution?: string | null;
  }) => Promise<Innovator>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  setUser: (user: Innovator) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function fetchMe(): Promise<Innovator | null> {
  try {
    const response = await api.get<AuthResponse>("/auth/me/");
    return response.user;
  } catch (error) {
    const status = (error as { status?: number }).status;
    if (status === 401 || status === 403) return null;
    throw error;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const meQuery = useQuery({
    queryKey: ["me"],
    queryFn: fetchMe,
    staleTime: 30_000,
    retry: false,
  });

  useEffect(() => {
    void ensureCsrf();
  }, []);

  const setUser = useCallback(
    (user: Innovator) => {
      queryClient.setQueryData(["me"], user);
    },
    [queryClient],
  );

  const login = useCallback(
    async (email: string, password: string) => {
      const response = await api.post<AuthResponse>("/auth/login/", { email, password });
      queryClient.setQueryData(["me"], response.user);
      await queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] !== "me",
      });
      return response.user;
    },
    [queryClient],
  );

  const register = useCallback(
    async (payload: {
      email: string;
      fullName: string;
      password: string;
      passwordConfirm: string;
      role: string;
      institution?: string | null;
    }) => {
      const response = await api.post<AuthResponse>("/auth/register/", payload);
      queryClient.setQueryData(["me"], response.user);
      await queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] !== "me",
      });
      return response.user;
    },
    [queryClient],
  );

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout/");
    } finally {
      queryClient.clear();
      queryClient.setQueryData(["me"], null);
    }
  }, [queryClient]);

  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["me"] });
  }, [queryClient]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: meQuery.data ?? null,
      loading: meQuery.isLoading,
      login,
      register,
      logout,
      refresh,
      setUser,
    }),
    [meQuery.data, meQuery.isLoading, login, register, logout, refresh, setUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
