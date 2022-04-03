
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useHttp } from "../hooks/http.hook"
import { CircularProgress } from "@mui/material"

export const RedirectPage = () => {

  const { request, error, clearError } = useHttp()
  const [inviteData, setInviteData] = useState(null)
  const navigate = useNavigate()


  // * Получение инфомрации о приглашении
  // ? inviteId - id приглашения
  const getInviteInfo = async (inviteId) => {
    const data = await request('/api/invite/inviteinfo', 'POST', { inviteId: inviteId })
    return data
  }

  // * Получение информации о приглашении при загрузке страницы
  useEffect(() => {
    const inviteId = document.location.pathname.split('/')[2]
    getInviteInfo(inviteId).then(data => { setInviteData(data) })
  }, [])

  // * Редирект при успехе
  useEffect(() => {
    if (inviteData) {
      sessionStorage.setItem('invite', JSON.stringify({ inviteId: inviteData.inviteId }))
      navigate('/client', { replace: true })
    }
  }, [inviteData])

  // * Редирект при ошибке
  useEffect(() => {
    if (error) {
      navigate('/auth', { replace: true })
    }
  }, [error, clearError])

  return (
    <div style={{ display: 'flex', justifyContent: 'center' }}>
      <CircularProgress />
    </div>
  )
}