import { createContext } from "react";

export const AuthContext = createContext( {
  token: null,
  userId: null,
  userMembership: null,
  validateUser: () => {},
  login: async () => {},
  logout: () => {}
})