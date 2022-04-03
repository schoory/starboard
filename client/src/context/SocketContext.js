
import { createContext } from "react";

export const SocketContext = createContext({
  socket: null,
  rememberSocket: null,
  getCompanyUsers: () => {},
  getNotification: () => {},
  getCompanyInfo: () => {},
  getCompanyClients: () => {},
  getClientDirectors: () => {},
  getClientDocuments: () => {},
  getClientInfo: () => {},
  getMessages: () => {},
  getChats: () => {},
  userTyping: () => {},
  userTypingEnds: () => {},
  typingRemoveListener: () => {}
})