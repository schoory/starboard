
import { useState, useCallback, useEffect } from "react";

import { useHttp } from "./http.hook";

const storageName = 'userData'

export const useAuth = () => {

  const { request } = useHttp()

  const [token, setToken] = useState(null); // Токен 
  const [refreshToken, setRefreshToken] = useState(null) // Refresh Token
  const [userId, setUserId] = useState(null); // id пользователя
  const [userMembership, setUserMembership] = useState(null) // принадлежность пользователя к компании или клиенту

  // * Вход в систему, запись в локальное хранилище
  const login = useCallback( (jwtToken, id, refreshToken) => {
    setToken(jwtToken)
    setRefreshToken(refreshToken)
    setUserId(id)

    localStorage.setItem(storageName, JSON.stringify({
      userId: id, token: jwtToken, refreshToken: refreshToken
    }))
  }, [])

  // * Выход из системы, выгружает локальное хранилище
  const logout = useCallback( () => {
    setToken(null)
    setUserId(null)
    setRefreshToken(null)
    setUserMembership(null)
    localStorage.removeItem(storageName)
  }, [])

  // * Проверка принадлежности пользователя
  const validateUser = async () => {
    request(
      '/api/auth/validate',
      'POST',
      { 
        userId: userId 
      },
      {
        Authorization: `Bearer ${token}`
      }
    ).then(data => {
      switch (data.membership) {
        
        case 'company':
          setUserMembership(data.membership)
          break

        case 'client': 
          setUserMembership(data.membership)
          break

        case 'none': 
          setUserMembership(data.membership)
          break
      
        default:
          setUserMembership('none')
          break

      }
    })
  }

  // * При загрузке страницы проверяет локальное хранилище и берет оттуда значения
  useEffect( () => {
    const data = JSON.parse(localStorage.getItem(storageName))
    if (data && data.token) {
      login(data.token, data.userId, data.refreshToken, data.membership)
    }
  }, [login])

  return {login, logout, token, refreshToken, userId, userMembership, validateUser}
}