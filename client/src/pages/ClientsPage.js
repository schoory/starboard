
import { useContext, useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { AuthContext } from "../context/AuthContext"
import { CompanyContext } from "../context/CompanyContext"
import { SocketContext } from "../context/SocketContext"
import { useHttp } from "../hooks/http.hook"
import { saveAs } from 'file-saver'

import sub from 'date-fns/sub'

import { CircularProgress, Button, Alert, Snackbar, Dialog, DialogActions, TextField, DialogContent, SvgIcon, Tooltip, Typography, Badge } from "@mui/material"

import './ClientsPage.css'
import { Stargrid } from "../components/Stargrid"

import useMediaQuery from '@mui/material/useMediaQuery';


export const ClientsPage = () => {
  const navigate = useNavigate()

  const { loading, request, requestFile, error, clearError } = useHttp()
  const auth = useContext(AuthContext)
  const company = useContext(CompanyContext)
  const socket = useContext(SocketContext)

  // ? Структура колонок для таблицы
  const [columns, setColumns] = useState([
    { name: 'check',        type: 'boolean',    label: '', width: 50, checked: false },
    { name: 'name',         type: 'title',     label: 'Наименование компании'},
    { name: 'uen',          type: 'index',      label: 'ИНН'},
    { name: 'bizfile',      type: 'controls',   label: '', width: 135 },
    { name: 'status',       type: 'string',     label: 'Статус' },
    { name: 'shareCapital', type: 'money',      label: 'Стоимость акции' },
    { name: 'regDate',      type: 'date',       label: 'Дата регистрации' },
    { name: 'lastAGM',      type: 'date',       label: 'Последний совет директоров' },
    { name: 'lastARFilled', type: 'date',       label: 'Последнее декларирование' },
  ])

  // ? Строки для таблицы
  const [rows, setRows] = useState([])
  const [allRows, setAllRows] = useState([])

  // ? Количество клиентов по типам
  const [clientsCards, setClientsCards] = useState({
    total: { count: 0, active: true }, 
    active: { count: 0, active: false }, 
    inactive: { count: 0, active: false }, 
    progress: { count: 0, active: false }, 
    recent: { count: 0, active: false }, 
    archived: { count: 0, active: false }
  })

  // ? Список приглашений
  const [invites, setInvites] = useState([])

  // ? Список пользователей
  const [clients, setClients] = useState([])

  // ? Диалог добавления приглашения для клиента
  const [dialogInvite, setDialogInvite] = useState({ 
    visible: false, email: '', name: '', message: ''
  })
  
  // ? Детальная информация о клиенте
  const [clientDetails, setClientDetails] = useState({ visible: false, client: null, mainContact: null })

  const [snack, setSnack] = useState({
    text: '', severity: 'warning', visibility: false
  })

  const smScreen = useMediaQuery('(max-width: 600px)')
  const xsScreen = useMediaQuery('(max-width: 430px)')

  // * создание набора данных для таблицы
  const makeDataSet = (data) => {
    let rows = new Array()
    data.map(row => {
      rows.push({
        check: { type: 'boolean', value: false, width: 50, label: '' },
        name: { type: 'title', value: row.clientName },
        uen: { type: 'index', value: row.UEN },
        bizfile: { type: 'controls', value: ['view', 'documents', 'message'], width: 135 },
        status: { type: 'string', value: row.clientStatus },
        shareCapital: { type: 'money', prefix: '$', value: row.shareCapital },
        regDate: { type: 'date', value: row.dateOfReg },
        lastAGM: { type: 'date', value: row.lastAGM },
        lastARFilled: { type: 'date', value: row.lastARFilled },
      })
    })
    setAllRows(rows)
    setRows(rows)
  }

  // * получение сведений о приглашениях
  const handleGetInvites = () => {
    request('/api/company/getinvites', 'POST', { companyId: company.companyId }, {
      Authorization: `Bearer ${auth.token}`
    }).then(data => {
      setInvites(data.invites)
    })
  }

  // * получение списка клиентов
  const handleGetClients = () => {
    company.getClientsList(auth.token, company.companyId).then(data => {
      setClients(data)
    })
  }

  // * подключение сокета к комнате и слушателей событий
  useEffect(() => {
    if (company.companyId) {
      socket.socket.emit('join-room', company.companyId + '/clients')
    }
    socket.socket.on('clients-update', handleGetClients)
    socket.socket.on('invites-update', handleGetInvites)
    return () => {
      socket.socket.removeListener('clients-update', handleGetClients)
      socket.socket.removeListener('invites-update', handleGetInvites)
    } 
  }, [company])

  // * получение списка приглашений
  useEffect(() => {
    if (company.companyId) {
      if (invites.length === 0) {
        handleGetInvites()
      }
    }
  }, [company])

  // * создание набора данных для таблиц
  useEffect(() => {
    if (company.companyId && company.clients && company.clients.length > 0) {
      request('/api/company/getclientsinfo', 'POST', { clientsId: company.clients }, {
        Authorization: `Bearer ${auth.token}`
      }).then(data => {
        setClients(data.clients)
        makeDataSet(data.clients)
      })
    }
  }, [company])

  // * установка количества клиентов по типам
  useEffect(() => {
    if (allRows && allRows.length > 0) {
      setClientsCards({
        total: { count: allRows.length, active: true },
        active: { count: allRows.filter(row => row.status.value === 'Active').length, active: false },
        inactive: { count: allRows.filter(row => row.status.value === 'Inactive').length, active: false },
        progress: { count: invites.length, active: false },
        recent: { count: allRows.filter(row => new Date(row.regDate.value) >= sub(new Date(), { days: 30 })).length, active: false },
        archived: { count: allRows.filter(row => row.status.value === 'Archived').length, active: false }
      })
    }
  }, [allRows, invites])

  // * выбор фильтра через карточки
  useEffect(() => {
    for (let key in clientsCards) {
      if (clientsCards[key].active) {
        switch (key) {
          case 'total':
            setRows(allRows)
            break
          case 'active': 
            setRows(allRows.filter(row => row.status.value === 'Active'))
            break
          case 'inactive': 
            setRows(allRows.filter(row => row.status.value === 'Inactive'))
            break
          case 'recent':
            setRows(allRows.filter(row => new Date(row.regDate.value) >= sub(new Date(), { days: 30 })))
            break
          case 'archived': 
            setRows(allRows.filter(row => row.status.value === 'Archived'))
            break
          default:
            setRows(allRows)
            break
        }
      }
    }
  }, [clientsCards])

  // * вывод ошибок 
  useEffect(() => {
    if (error) {
      setSnack({ text: error, severity: 'error', visibility: true})
    }
    clearError()
  }, [error, clearError])
  
  // * отправка приглашения
  const handleInviteCompany = () => {
    request('/api/company/inviteclient', 'POST', { user: dialogInvite.email, companyId: company.companyId }, {
      Authorization: `Bearer ${auth.token}`
    }).then(data => {
      setSnack({ text: data.data[0].msg, severity: 'success', visibility: true})
      socket.socket.emit('invites-changed', { id: `${company.companyId}` })
      socket.socket.emit('invites-changed', { id: `${company.companyId}/clients` })
      handleGetInvites()
    })
    setDialogInvite({ visible: false, email: '', name: '', message: '' })
  }

  // * показ дополнительной информации о клиенте
  const handleViewClick = (event) => {
    if (!clientDetails.visible) {
      request('/api/company/getclientdetails', 'POST', { clientUEN: event }, {
        Authorization: `Bearer ${auth.token}`
      }).then(data => { 
        setClientDetails({ visible: true, client: data.client, mainContact: data.mainContact })
      })
    }
  }

  // * перенаправление на страницу с документами клиента
  const handleDocumentsClick = (event) => {
    const client = clients.find(item => item.UEN === event)
    navigate(`/client/${client._id}?tab=documents`)
  }

  // * перенаправление на чат с контактным лицом клиента
  const handleMessageClick = (event) => {
    const client = clients.find(item => item.UEN === event)
    request('/api/client/getmaincontact', 'POST', { id: client.mainContact }, {
      Authorization: `Bearer ${auth.token}`
    }).then(data => navigate(`/messages?newchat=${data.mainContact.id}`))
  }

  // * скачивание файла с информацией о клиенте
  const handleDownloadPdf = () => {
    request('/api/client/createclientpdf', 'POST', { companyId: company.companyId, clientId: clientDetails.client._id }, {
      Authorization: `Bearer ${auth.token}`
    }).then(data => {
      if (data && data.created) {
        requestFile(`/api/client/getclientpdf/${company.companyId}`, 'GET', null, {
          Authorization: `Bearer ${auth.token}`
        }).then(res => {
          res.blob().then(blob => {
            const pdfBlob = new Blob([blob], {type: "application/pdf;charset=utf-8"})
            saveAs(pdfBlob, 'Информация о клиенте.pdf')
          })
        })
      }
    })
  }

  // * перенаправление на страницу клиента
  const handleMoreDetailsClick = () => {
    navigate(`/client/${clientDetails.client._id}`)
  }

  // * выбор карточки с фильтрацией
  const handleCardSelect = ({ currentTarget }) => {
    const card = currentTarget.getAttribute('data-card')
    let cards = { ...clientsCards }
    for (let key in cards) {
      cards[key].active = false
    }
    cards[card].active = true
    setClientsCards(cards)
  }

  // * возвращает пустой список, если у компании нет клиентов
  const renderEmptyClientList = () => {
    return (
        <div className="clients__empty">
          <p>У вашей компании еще нет ни одного клиента</p>
          {
            company.admins && company.admins.includes(auth.userId) ? 
              <Button 
                className="clients__empty-btn" 
                onClick={ () => { setDialogInvite({ visible: true, email: '', name: '', message: '' }) } }
              >
                Отправьте приглашение стать клиентом вашей компании
              </Button> :
              null
          }
        </div>
    )
  }

  // * возвращает список клиентов компании
  const renderClientList = () => {
    return (
      <div className="clients__content">
        <div className="cards">
          <div 
            data-card='total'
            className={clientsCards.total.active ? "cards__card cards__card_selected cards__card_clickable cards__card_total" : "cards__card cards__card_clickable cards__card_total"}
            onClick={handleCardSelect}
          >
            {
              xsScreen
                ? (
                  <div className="cards__card-icon">
                    <Badge
                      badgeContent={ clientsCards.total.count }
                    > 
                      <SvgIcon>
                        <path fill="currentColor" d="M13.07 10.41A5 5 0 0 0 13.07 4.59A3.39 3.39 0 0 1 15 4A3.5 3.5 0 0 1 15 11A3.39 3.39 0 0 1 13.07 10.41M5.5 7.5A3.5 3.5 0 1 1 9 11A3.5 3.5 0 0 1 5.5 7.5M7.5 7.5A1.5 1.5 0 1 0 9 6A1.5 1.5 0 0 0 7.5 7.5M16 17V19H2V17S2 13 9 13 16 17 16 17M14 17C13.86 16.22 12.67 15 9 15S4.07 16.31 4 17M15.95 13A5.32 5.32 0 0 1 18 17V19H22V17S22 13.37 15.94 13Z" />
                      </SvgIcon>
                    </Badge>
                  </div>
                )
                : (
                  <>
                    <div className="cards__card-icon">
                      <SvgIcon>
                        <path fill="currentColor" d="M13.07 10.41A5 5 0 0 0 13.07 4.59A3.39 3.39 0 0 1 15 4A3.5 3.5 0 0 1 15 11A3.39 3.39 0 0 1 13.07 10.41M5.5 7.5A3.5 3.5 0 1 1 9 11A3.5 3.5 0 0 1 5.5 7.5M7.5 7.5A1.5 1.5 0 1 0 9 6A1.5 1.5 0 0 0 7.5 7.5M16 17V19H2V17S2 13 9 13 16 17 16 17M14 17C13.86 16.22 12.67 15 9 15S4.07 16.31 4 17M15.95 13A5.32 5.32 0 0 1 18 17V19H22V17S22 13.37 15.94 13Z" />
                      </SvgIcon>
                    </div>
                    <h3>{clientsCards.total.count}</h3>
                    <p>Всего</p>
                  </>
                )
            }
          </div>
          <div 
            data-card='active'
            className={clientsCards.active.active ? "cards__card cards__card_selected cards__card_clickable cards__card_active" : "cards__card cards__card_clickable cards__card_active"}
            onClick={handleCardSelect}
          >
            {
              xsScreen
                ? (
                  <div className="cards__card-icon">
                    <Badge
                      badgeContent={ clientsCards.active.count }
                    > 
                      <SvgIcon>
                        <path fill="currentColor" d="M21.1,12.5L22.5,13.91L15.97,20.5L12.5,17L13.9,15.59L15.97,17.67L21.1,12.5M11,4A4,4 0 0,1 15,8A4,4 0 0,1 11,12A4,4 0 0,1 7,8A4,4 0 0,1 11,4M11,6A2,2 0 0,0 9,8A2,2 0 0,0 11,10A2,2 0 0,0 13,8A2,2 0 0,0 11,6M11,13C11.68,13 12.5,13.09 13.41,13.26L11.74,14.93L11,14.9C8.03,14.9 4.9,16.36 4.9,17V18.1H11.1L13,20H3V17C3,14.34 8.33,13 11,13Z" />
                      </SvgIcon>
                    </Badge>
                  </div>
                )
                : (
                  <>
                    <div className="cards__card-icon">
                      <SvgIcon>
                        <path fill="currentColor" d="M21.1,12.5L22.5,13.91L15.97,20.5L12.5,17L13.9,15.59L15.97,17.67L21.1,12.5M11,4A4,4 0 0,1 15,8A4,4 0 0,1 11,12A4,4 0 0,1 7,8A4,4 0 0,1 11,4M11,6A2,2 0 0,0 9,8A2,2 0 0,0 11,10A2,2 0 0,0 13,8A2,2 0 0,0 11,6M11,13C11.68,13 12.5,13.09 13.41,13.26L11.74,14.93L11,14.9C8.03,14.9 4.9,16.36 4.9,17V18.1H11.1L13,20H3V17C3,14.34 8.33,13 11,13Z" />
                      </SvgIcon>
                    </div>
                    <h3>{clientsCards.active.count}</h3>
                    <p>Активных</p>
                  </>
                )
            }
          </div>
          <div 
            data-card='inactive'
            className={clientsCards.inactive.active ? "cards__card cards__card_selected cards__card_clickable cards__card_inactive" : "cards__card cards__card_clickable cards__card_inactive"}
            onClick={handleCardSelect}
          >
            {
              xsScreen
                ? (
                  <div className="cards__card-icon">
                    <Badge
                      badgeContent={ clientsCards.inactive.count }
                    > 
                      <SvgIcon>
                        <path fill="currentColor" d="M10 4A4 4 0 0 0 6 8A4 4 0 0 0 10 12A4 4 0 0 0 14 8A4 4 0 0 0 10 4M10 6A2 2 0 0 1 12 8A2 2 0 0 1 10 10A2 2 0 0 1 8 8A2 2 0 0 1 10 6M10 13C7.33 13 2 14.33 2 17V20H11.5A6.5 6.5 0 0 1 11.03 18.1H3.9V17C3.9 16.36 7.03 14.9 10 14.9C10.5 14.9 11 14.95 11.5 15.03A6.5 6.5 0 0 1 12.55 13.29C11.61 13.1 10.71 13 10 13M17.5 13C15 13 13 15 13 17.5C13 20 15 22 17.5 22C20 22 22 20 22 17.5C22 15 20 13 17.5 13M17.5 14.5C19.16 14.5 20.5 15.84 20.5 17.5C20.5 18.06 20.35 18.58 20.08 19L16 14.92C16.42 14.65 16.94 14.5 17.5 14.5M14.92 16L19 20.08C18.58 20.35 18.06 20.5 17.5 20.5C15.84 20.5 14.5 19.16 14.5 17.5C14.5 16.94 14.65 16.42 14.92 16Z" />
                      </SvgIcon>
                    </Badge>
                  </div>
                )
                : (
                  <>
                    <div className="cards__card-icon">
                      <SvgIcon>
                        <path fill="currentColor" d="M10 4A4 4 0 0 0 6 8A4 4 0 0 0 10 12A4 4 0 0 0 14 8A4 4 0 0 0 10 4M10 6A2 2 0 0 1 12 8A2 2 0 0 1 10 10A2 2 0 0 1 8 8A2 2 0 0 1 10 6M10 13C7.33 13 2 14.33 2 17V20H11.5A6.5 6.5 0 0 1 11.03 18.1H3.9V17C3.9 16.36 7.03 14.9 10 14.9C10.5 14.9 11 14.95 11.5 15.03A6.5 6.5 0 0 1 12.55 13.29C11.61 13.1 10.71 13 10 13M17.5 13C15 13 13 15 13 17.5C13 20 15 22 17.5 22C20 22 22 20 22 17.5C22 15 20 13 17.5 13M17.5 14.5C19.16 14.5 20.5 15.84 20.5 17.5C20.5 18.06 20.35 18.58 20.08 19L16 14.92C16.42 14.65 16.94 14.5 17.5 14.5M14.92 16L19 20.08C18.58 20.35 18.06 20.5 17.5 20.5C15.84 20.5 14.5 19.16 14.5 17.5C14.5 16.94 14.65 16.42 14.92 16Z" />
                      </SvgIcon>
                    </div>
                    <h3>{clientsCards.inactive.count}</h3>
                    <p>Неактивных</p>
                  </>
                )
            }
          </div>
          <div className="cards__card cards__card_progress">
            {
              xsScreen
                ? (
                  <div className="cards__card-icon">
                    <Badge
                      badgeContent={ clientsCards.progress.count }
                    > 
                      <SvgIcon>
                        <path fill="currentColor" d="M11 4C8.8 4 7 5.8 7 8S8.8 12 11 12 15 10.2 15 8 13.2 4 11 4M11 6C12.1 6 13 6.9 13 8S12.1 10 11 10 9 9.1 9 8 9.9 6 11 6M11 13C8.3 13 3 14.3 3 17V20H12.5C12.2 19.4 12.1 18.8 12 18.1H4.9V17C4.9 16.4 8 14.9 11 14.9C11.5 14.9 12 15 12.5 15C12.8 14.4 13.1 13.8 13.6 13.3C12.6 13.1 11.7 13 11 13M18 20C16.6 20 15.5 18.9 15.5 17.5C15.5 17.1 15.6 16.7 15.8 16.4L14.7 15.3C14.3 15.9 14 16.7 14 17.5C14 19.7 15.8 21.5 18 21.5V23L20.2 20.8L18 18.5V20M18 13.5V12L15.8 14.2L18 16.4V15C19.4 15 20.5 16.1 20.5 17.5C20.5 17.9 20.4 18.3 20.2 18.6L21.3 19.7C21.7 19.1 22 18.3 22 17.5C22 15.3 20.2 13.5 18 13.5Z" />
                      </SvgIcon>
                    </Badge>
                  </div>
                )
                : (
                  <>
                    <div className="cards__card-icon">
                      <SvgIcon>
                        <path fill="currentColor" d="M11 4C8.8 4 7 5.8 7 8S8.8 12 11 12 15 10.2 15 8 13.2 4 11 4M11 6C12.1 6 13 6.9 13 8S12.1 10 11 10 9 9.1 9 8 9.9 6 11 6M11 13C8.3 13 3 14.3 3 17V20H12.5C12.2 19.4 12.1 18.8 12 18.1H4.9V17C4.9 16.4 8 14.9 11 14.9C11.5 14.9 12 15 12.5 15C12.8 14.4 13.1 13.8 13.6 13.3C12.6 13.1 11.7 13 11 13M18 20C16.6 20 15.5 18.9 15.5 17.5C15.5 17.1 15.6 16.7 15.8 16.4L14.7 15.3C14.3 15.9 14 16.7 14 17.5C14 19.7 15.8 21.5 18 21.5V23L20.2 20.8L18 18.5V20M18 13.5V12L15.8 14.2L18 16.4V15C19.4 15 20.5 16.1 20.5 17.5C20.5 17.9 20.4 18.3 20.2 18.6L21.3 19.7C21.7 19.1 22 18.3 22 17.5C22 15.3 20.2 13.5 18 13.5Z" />
                      </SvgIcon>
                    </div>
                    <h3>{clientsCards.progress.count}</h3>
                    <p>В процессе</p>
                  </>
                )
            }
          </div>
          <div 
            data-card='recent'
            className={clientsCards.recent.active ? "cards__card cards__card_selected cards__card_clickable cards__card_recent" : "cards__card cards__card_clickable cards__card_recent"}
            onClick={handleCardSelect}
          >
            {
              xsScreen
                ? (
                  <div className="cards__card-icon">
                    <Badge
                      badgeContent={ clientsCards.recent.count }
                    > 
                      <SvgIcon>
                        <path fill="currentColor" d="M15,4A4,4 0 0,0 11,8A4,4 0 0,0 15,12A4,4 0 0,0 19,8A4,4 0 0,0 15,4M15,5.9C16.16,5.9 17.1,6.84 17.1,8C17.1,9.16 16.16,10.1 15,10.1A2.1,2.1 0 0,1 12.9,8A2.1,2.1 0 0,1 15,5.9M4,7V10H1V12H4V15H6V12H9V10H6V7H4M15,13C12.33,13 7,14.33 7,17V20H23V17C23,14.33 17.67,13 15,13M15,14.9C17.97,14.9 21.1,16.36 21.1,17V18.1H8.9V17C8.9,16.36 12,14.9 15,14.9Z" />
                      </SvgIcon>
                    </Badge>
                  </div>
                )
                : (
                  <>
                    <div className="cards__card-icon">
                      <SvgIcon>
                        <path fill="currentColor" d="M11 4C8.8 4 7 5.8 7 8S8.8 12 11 12 15 10.2 15 8 13.2 4 11 4M11 6C12.1 6 13 6.9 13 8S12.1 10 11 10 9 9.1 9 8 9.9 6 11 6M11 13C8.3 13 3 14.3 3 17V20H12.5C12.2 19.4 12.1 18.8 12 18.1H4.9V17C4.9 16.4 8 14.9 11 14.9C11.5 14.9 12 15 12.5 15C12.8 14.4 13.1 13.8 13.6 13.3C12.6 13.1 11.7 13 11 13M18 20C16.6 20 15.5 18.9 15.5 17.5C15.5 17.1 15.6 16.7 15.8 16.4L14.7 15.3C14.3 15.9 14 16.7 14 17.5C14 19.7 15.8 21.5 18 21.5V23L20.2 20.8L18 18.5V20M18 13.5V12L15.8 14.2L18 16.4V15C19.4 15 20.5 16.1 20.5 17.5C20.5 17.9 20.4 18.3 20.2 18.6L21.3 19.7C21.7 19.1 22 18.3 22 17.5C22 15.3 20.2 13.5 18 13.5Z" />
                      </SvgIcon>
                    </div>
                    <h3>{clientsCards.recent.count}</h3>
                    <p>В процессе</p>
                  </>
                )
            }
          </div>
          <div 
            data-card='archived'
            className={clientsCards.archived.active ? "cards__card cards__card_selected cards__card_clickable cards__card_archived" : "cards__card cards__card_clickable cards__card_archived"}
            onClick={handleCardSelect}
          >
            {
              xsScreen
                ? (
                  <div className="cards__card-icon">
                    <Badge
                      badgeContent={ clientsCards.archived.count }
                    > 
                      <SvgIcon>
                        <path fill="currentColor" d="M15 14C16.33 14 19 14.67 19 16V17H11V16C11 14.67 13.67 14 15 14M15 13C16.11 13 17 12.11 17 11S16.11 9 15 9C13.9 9 13 9.89 13 11C13 12.11 13.9 13 15 13M22 8V18C22 19.11 21.11 20 20 20H4C2.9 20 2 19.11 2 18V6C2 4.89 2.9 4 4 4H10L12 6H20C21.11 6 22 6.9 22 8M20 8H4V18H20V8Z" />
                      </SvgIcon>
                    </Badge>
                  </div>
                )
                : (
                  <>
                    <div className="cards__card-icon">
                      <SvgIcon>
                        <path fill="currentColor" d="M15 14C16.33 14 19 14.67 19 16V17H11V16C11 14.67 13.67 14 15 14M15 13C16.11 13 17 12.11 17 11S16.11 9 15 9C13.9 9 13 9.89 13 11C13 12.11 13.9 13 15 13M22 8V18C22 19.11 21.11 20 20 20H4C2.9 20 2 19.11 2 18V6C2 4.89 2.9 4 4 4H10L12 6H20C21.11 6 22 6.9 22 8M20 8H4V18H20V8Z" />
                      </SvgIcon>
                    </div>
                    <h3>{clientsCards.archived.count}</h3>
                    <p>В архиве</p>
                  </>
                )
            }
          </div>
        </div>
        <Stargrid className="clients__grid" columns={columns} rows={rows} maxRows={9} onViewClick={handleViewClick} onDocumentsClick={handleDocumentsClick} onMessageClick={handleMessageClick}/>
        <div className={ clientDetails.visible ? "clients__details clients__details_active cdetails" : "clients__details cdetails"}>
          {
            loading || !clientDetails.client || !clientDetails.mainContact ? 
              <div>
                <div className="cdetails__close">
                  <Button onClick={() => { setClientDetails({ visible: false, client: null, mainContact: null }) }}>
                    <SvgIcon>
                      <path fill="currentColor" d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
                    </SvgIcon>
                  </Button>
                </div>
                <div className="cdetails__loading">
                  <CircularProgress />
                </div>
              </div> :
              <div>
                <div className="cdetails__close">
                  <Button onClick={() => { setClientDetails({ visible: false, client: null, mainContact: null }) }}>
                    <SvgIcon>
                      <path fill="currentColor" d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
                    </SvgIcon>
                  </Button>
                </div>
                <div className="cdetails__title">{ clientDetails.client.clientName }</div>
                <div className="cdetails__item">
                  <p className="cdetails__label">Зарегистрированный адрес</p>
                  <Tooltip title={clientDetails.client.registeredAddress.toString()}>
                    <Typography noWrap className="cdetails__value">
                      { clientDetails.client.registeredAddress }
                    </Typography>
                  </Tooltip>
                </div>
                <div className="cdetails__item">
                  <p className="cdetails__label">Оплаченный капитал</p>
                  <p className="cdetails__value"><small>$</small>{ ` ${clientDetails.client.capital}` }</p>
                </div>
                <div className="cdetails__item">
                  <p className="cdetails__label">Количество акций</p>
                  <p className="cdetails__value">{ clientDetails.client.numOfShares }</p>
                </div>
                <div className="cdetails__item">
                  <p className="cdetails__label">Контактное лицо</p>
                  <p className="cdetails__value">{ `${clientDetails.mainContact.firstName} ${clientDetails.mainContact.lastName}` }</p>
                </div>
                <div className="cdetails__item">
                  <p className="cdetails__label">Телефон контактного лица</p>
                  <p className="cdetails__value">{ clientDetails.mainContact.phoneNumber ? clientDetails.mainContact.phoneNumber : 'Не указан' }</p>
                </div>
                <div className="cdetails__item">
                  <p className="cdetails__label">Адрес электронной почты контактного лица</p>
                  <p className="cdetails__value"><a href={`mailto:${clientDetails.mainContact.email}`}>{ clientDetails.mainContact.email }</a></p>
                </div>
                <div className="cdetails__actions">
                  <Button disableElevation variant="contained" className="cdetails__btn" onClick={handleMoreDetailsClick}>Показать всю информацию</Button>
                  <Button 
                    disableElevation 
                    variant="text" 
                    startIcon={
                      <SvgIcon>
                        <path fill="currentColor" d="M6,2A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2H6M6,4H13V9H18V20H6V4M8,12V14H16V12H8M8,16V18H13V16H8Z" />
                      </SvgIcon>
                    } 
                    className="cdetails__btn cdetails__btn_text"
                    onClick={handleDownloadPdf}
                    data-client-name={clientDetails.client.clientName}
                  >Скачать PDF</Button>
                </div>
              </div>
          }
        </div>
      </div>
    )
  }

  return (
    <div className="clients">
      <div className="clients__nav">
        <h2 className="clients__nav-title">Клиенты</h2>
        {
          company.clients ? 
            <Button onClick={ () => { setDialogInvite({ visible: true, email: '', name: '', message: '' }) } }>
              + Добавить клиента
            </Button> : 
            <></>
        }
      </div>
      
      {
        company.clients ? 
          renderClientList() :
          renderEmptyClientList() 
      }

      {/* Dialogs */}

      <Dialog
        open={dialogInvite.visible}
        fullScreen={smScreen}
        onClose={ () => { setDialogInvite({ visible: false, email: '', name: '', message: '' }) } }
        className='clients__dialog dialog'
      >
        <div className='dialog__title'>
          <h1>Пригласите владельца бизнеса создать компанию</h1>
          <SvgIcon onClick={ () => { setDialogInvite({ visible: false, email: '', name: '', message: '' }) } }>
            <path fill="currentColor" d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
          </SvgIcon>
        </div>
        <DialogContent className='dialog__content'>
          <p className="dialog__label">Электронная почта владельца бизнеса</p>
          <TextField 
            fullWidth
            className='dialog__input'
            value={dialogInvite.email}
            onChange={ ({ target: { value } }) => { setDialogInvite({ ...dialogInvite, email: value }) } }
          />
          <p className="dialog__label">Имя владельца бизнеса</p>
          <TextField 
            fullWidth
            className='dialog__input'
            value={dialogInvite.name}
            onChange={ ({ target: { value } }) => { setDialogInvite({ ...dialogInvite, name: value }) } }
          />
          <p className="dialog__label">Сообщение</p>
          <TextField 
            fullWidth
            multiline
            rows={5}
            className='dialog__input'
            value={dialogInvite.message}
            onChange={ ({ target: { value } }) => { setDialogInvite({ ...dialogInvite, message: value }) } }
          />
        </DialogContent>
        <DialogActions className='dialog__actions'>
          <Button 
            disableElevation 
            variant="contained" 
            className='dialog__btn'
            onClick={handleInviteCompany}
          >
            Отправить
          </Button>
        </DialogActions>
      </Dialog>

      {/* /Dialogs */}

      {/* Snacks */}

      <Snackbar open={snack.visibility} autoHideDuration={3000} onClose={ () => { setSnack({ ...snack, visibility: false }) } }>
        <Alert severity={snack.severity} variant='filled' onClose={ () => { setSnack({ ...snack, visibility: false }) } }>
          {snack.text}
        </Alert>
      </Snackbar>

      {/* /Snacks */}

    </div>
  )
}