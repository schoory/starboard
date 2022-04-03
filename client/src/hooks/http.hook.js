import { useState, useCallback, useContext } from "react";
import { AuthContext } from "../context/AuthContext";

export const useHttp = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const auth = useContext(AuthContext)
  const request = useCallback(async (url, method = 'GET', body = null, headers = {}) => {
    setLoading(true)
    try {
      if (body) {
        body = JSON.stringify(body)
        headers['Content-Type'] = 'application/json'
      }
      
      let res = await fetch(url, {method, body, headers})
      let data = await res.json()

      if (res.status === 401) {
        const userData = JSON.parse(localStorage.getItem('userData'))
        res = await fetch('/api/auth/refresh', { method: 'POST', body: JSON.stringify({ refreshToken: userData.refreshToken, userId: userData.userId }), headers: { 'Content-Type': 'application/json' } })
        data = await res.json()
        await auth.login(data.token, data.userId, data.refreshToken, data.userMembership)
        if (headers['Authorization']) {
          headers['Authorization'] = `Bearer ${data.token}`
        }
        res = await fetch(url, {method, body, headers})
        data = await res.json()
      }
      
      if (!res.ok) {
        throw new Error(data.data[0].msg || 'Что-то пошло не так')
      }
      
      setLoading(false)
      
      return data
    } catch (e) {
      setLoading(false)
      setError(e.message)
      throw e
    }
  }, [])

  const requestFile = useCallback(async (url, method = 'GET', body = null, headers = {}) => {
  setLoading(true)
  try {
    if (body) {
      body = JSON.stringify(body)
      headers['Content-Type'] = 'application/json'
    }
    
    const res = await fetch(url, {method, body, headers})
    
    if (!res.ok) {
      throw new Error('Что-то пошло не так')
    }
    
    setLoading(false)
    
    return res
  } catch (e) {
    setLoading(false)
    setError(e.message)
    throw e
  }
  }, [])

  const requestUploadFile = useCallback(async (url, method = 'GET', body = null, headers = {}) => {
    setLoading(true)
    try {
      let formData = new FormData()

      if (body) {
        Object.entries(body).map(item => {
          formData.append(item[0], item[1])
        })
        body = formData
      }
      
      const res = await fetch(url, {method, body, headers})
      
      let data = await res.json()

      if (res.status === 401) {
        const userData = JSON.parse(localStorage.getItem('userData'))
        res = await fetch('/api/auth/refresh', { method: 'POST', body: JSON.stringify({ refreshToken: userData.refreshToken, userId: userData.userId }), headers: { 'Content-Type': 'application/json' } })
        data = await res.json()
        await auth.login(data.token, data.userId, data.refreshToken)
        if (headers['Authorization']) {
          headers['Authorization'] = `Bearer ${data.token}`
        }
        res = await fetch(url, {method, body, headers})
        data = await res.json()
      }
      
      if (!res.ok) {
        throw new Error('Что-то пошло не так')
      }
      
      setLoading(false)
      
      return data
    } catch (e) {
      setLoading(false)
      setError(e.message)
      throw e
    }
    }, [])

  const clearError = useCallback(() => setError(null), [])

  return {loading, request, requestFile, requestUploadFile, error, clearError}
}