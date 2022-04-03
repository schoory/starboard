import { useCallback, useState } from "react"
import { useHttp } from "./http.hook";

export const useCompany = () => {
  const { request } = useHttp()

  const [companyId, setCompanyId] = useState(null);
  const [companyName, setCompanyName] = useState(null);
  const [companyEmail, setCompanyEmail] = useState(null);
  const [companyAddress, setCompanyAddress] = useState(null);
  const [companyPhone, setCompanyPhone] = useState(null);
  const [companyWeb, setCompanyWeb] = useState(null);
  const [creationDate, setCreationDate] = useState(null);
  const [usersCount, setUsersCount] = useState(0)
  const [adminsCount, setAdminsCount] = useState(0)
  const [clientsCount, setClientsCount] = useState(0)
  const [users, setUsers] = useState(null);
  const [clients, setClients] = useState(null);
  const [admins, setAdmins] = useState(null);
  const [owner, setOwner] = useState(null)

  const [loading, setLoading] = useState(false)

  
  // * Возвращает информацию о компании пользователя
  // ? token - токен пользователя, userId - id пользователя
  const getCompanyInfo = useCallback( async (token, userId) => {
    const data = await request('/api/company/companyinfo', 'POST', { userId: userId }, {
      'Authorization': `Bearer ${token}`
    }) 
    if (data && data.users.includes(userId)) {
      setCompanyId(data.companyId)
      setCompanyName(data.companyName)
      setCompanyEmail(data.companyEmail)
      setCompanyAddress(data.companyAddress)
      setCompanyPhone(data.companyPhone)
      setCompanyWeb(data.companyWeb)
      setCreationDate(data.creationDate)
      setUsers(data.users)
      setClients(data.clients)
      setAdmins(data.admins)
      setUsersCount(data.users.length)
      setAdminsCount(data.admins.length)
      setClientsCount(data.clients ? data.clients.length : 0)
      setOwner(data.owner)
      return data.users
    } else { clearCompanyInfo() }
    return []
  }, [request])

  // * Получает информацию о пользователях компании
  // ? token - токен пользователя
  const getUsersList = useCallback( async  (token) => {
    const data = await request('/api/company/companyusers', 'POST', { companyId: companyId }, {
      'Authorization': `Bearer ${token}`
    })
    setUsers(data.users)
    setUsersCount(data.users.length)
    return -1
  }, [request])

  const clearCompanyInfo = useCallback(() => {
    setCompanyId(null)
    setCompanyName(null)
    setCompanyEmail(null)
    setCompanyAddress(null)
    setCompanyPhone(null)
    setCompanyWeb(null)
    setCreationDate(null)
    setUsers(null)
    setClients(null)
    setAdmins(null)
    setUsersCount(0)
    setAdminsCount(0)
    setClientsCount(0)
    setOwner(null)
  }, [])

  const getClientsList = useCallback( async (token, companyId) => {
    const data = await request('/api/company/getclients', 'POST', { companyId: companyId }, {
      'Authorization': `Bearer ${token}`
    })
    if (data) {
      setClients(data)
      return data
    } 
    return []
  }, [request])

  return { 
    companyId, companyName, companyEmail, companyAddress, companyPhone, 
    companyWeb, creationDate, usersCount, clientsCount, adminsCount, users, 
    clients, admins, owner, getCompanyInfo, getUsersList, clearCompanyInfo, getClientsList, loading 
  }
}