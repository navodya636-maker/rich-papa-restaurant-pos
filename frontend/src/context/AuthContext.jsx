import { createContext, useContext, useState } from "react";
import api from "../services/api";

const AuthContext = createContext(null);
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("rp_user")); } catch { return null; }
  });
  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    localStorage.setItem("rp_token", data.token);
    localStorage.setItem("rp_user", JSON.stringify(data.user));
    setUser(data.user);
  };
  const logout = () => {
    localStorage.removeItem("rp_token");
    localStorage.removeItem("rp_user");
    setUser(null);
  };
  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>;
};
export const useAuth = () => useContext(AuthContext);
