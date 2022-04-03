import { useEffect, useState } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { AuthContext } from './context/AuthContext';
import { CompanyContext } from './context/CompanyContext';
import { SocketContext } from './context/SocketContext';
import { ClientContext } from './context/ClientContext';
import { useAuth } from './hooks/auth.hook';
import { useCompany } from './hooks/company.hook'
import { useRoutes } from './routes';
import { useClient } from './hooks/client.hook';
import { io } from 'socket.io-client'
import { useSocket } from './hooks/socket.hook';

import { useHttp } from './hooks/http.hook';

import { CircularProgress } from '@mui/material';

const socket = io.connect()

function App() {
  const { token, userId, login, logout, userMembership, validateUser } = useAuth()

  const { request } = useHttp()

  const company = useCompany()
  const socketHook = useSocket()
  const client = useClient()
  const isAuthenticated = Boolean(token) // Проверка на авторизацию, если есть token - true, иначе - false
  const routes = useRoutes(isAuthenticated, userMembership)

  const [pageLoading, setPageLoading] = useState(false)


  const getLoadingScreen = () => {
    return (
      <div className="company__loading">
        <CircularProgress />
      </div>
    )
  }

  useEffect(() => {
    socketHook.rememberSocket(socket)
  })

  useEffect(() => {

    if (!pageLoading) {
      setPageLoading(true)
    }

    switch (userMembership) {
      case 'company':
        company.getCompanyInfo(token, userId).then( () => setPageLoading(false) )
        break
      case 'client': 
        client.getData(token, userId).then( () => setPageLoading(false) )
        break
      case 'none': 
        setPageLoading(false)
        break
      case null:
        setPageLoading(false)
        break
      default:
        if (!pageLoading) {
          setPageLoading(true)
        }
        break
    }
  }, [userMembership])

  // загрузка сведения при логине
  useEffect(() => {
    if (userId) {
      validateUser()
    }
  }, [userId])

  return (
    <AuthContext.Provider value={{
      token, userId, validateUser, login, logout, userMembership
    }}>
      <CompanyContext.Provider value={{
        companyId: company.companyId, companyName: company.companyName, companyEmail: company.companyEmail, 
        companyAddress: company.companyAddress, companyPhone: company.companyPhone, companyWeb: company.companyWeb, 
        creationDate: company.creationDate, usersCount: company.usersCount, adminsCount: company.adminsCount, 
        clientsCount: company.clientsCount, users: company.users, admins: company.admins, clients: company.clients, 
        owner: company.owner, getCompanyInfo: company.getCompanyInfo, getUsersList: company.getUsersList, clearCompanyInfo: company.clearCompanyInfo,
        getClientsList: company.getClientsList
      }}>
        <SocketContext.Provider value={{ 
          socket: socketHook.socket, getCompanyUsers: socketHook.getCompanyUsers, 
          rememberSocket: socketHook.rememberSocket, getCompanyInfo: socketHook.getCompanyInfo, getNotification: socketHook.getNotification,
          getCompanyClients: socketHook.getCompanyClients, getClientDirectors: socketHook.getClientDirectors, getClientDocuments: socketHook.getClientDocuments,
          getClientInfo: socketHook.getClientInfo, getMessages: socketHook.getMessages, userTyping: socketHook.userTyping, userTypingEnds: socketHook.userTypingEnds,
          getChats: socketHook.getChats, typingRemoveListener: socketHook.typingRemoveListener
        }}>
          <ClientContext.Provider value={client}>
            {
              pageLoading ? 
                getLoadingScreen() :
                <Router>
                  <div>
                    {routes}
                  </div>
                </Router>
            }
          </ClientContext.Provider>
        </SocketContext.Provider>
      </CompanyContext.Provider>
    </AuthContext.Provider>
  );
}

export default App;
