
import { useState, useEffect, useContext, useRef, useCallback } from 'react'
import { useNavigate } from "react-router-dom";

import { useHttp } from "../hooks/http.hook"

import { AuthContext } from "../context/AuthContext"
import { CompanyContext } from "../context/CompanyContext"
import { SocketContext } from "../context/SocketContext"

import "date-fns"
import { ru } from "date-fns/locale"
import { format, add, sub, set, compareAsc, parseISO  } from "date-fns"

import { Button, SvgIcon, Tooltip, Stack, Breadcrumbs, Typography, CircularProgress, Popover, Badge, Alert, Snackbar, Checkbox } from "@mui/material"
import { Autocomplete, TextField, FormControlLabel, Dialog, DialogContent, DialogActions } from "@mui/material"
import { MonthPicker, YearPicker, LocalizationProvider } from "@mui/lab"

import AdapterDateFns from "@mui/lab/AdapterDateFns"

import "./EventsPage.css"

export const EventsPage = () => {
  const navigate = useNavigate()

  const { request, loading, error, clearError } = useHttp()
  
  const auth = useContext(AuthContext)
  const company = useContext(CompanyContext)
  const socket = useContext(SocketContext)

  // ? список событий
  const [events, setEvents] = useState([])
  // ? список уведомлений
  const [eventsNotification, setEventsNotification] = useState([])
  // ? список сотрудников компании
  const [users, setUsers] = useState([])
  // ? список клиентов компании
  const [clients, setClients] = useState([])

  // ? изменение размера контейнера
  const calendarMain = useRef(null)
  const [mainOffsetHeight, setMainOffsetHeight] = useState(0)

  // ? загрузочный экран при первой прогрузке страницы
  const [pageLoading, setPageLoading] = useState(true)

  // ? текущая дата
  const [currentDate, setCurrentDate] = useState(new Date())
  const maxDate = add(new Date(), { years: 20 })
  const minDate = sub(new Date(), { years: 5 })

  // ? списки месяцев и годов
  const [monthPicker, setMonthPicker] = useState({ visible: false, anchor: null })
  const [yearPicker, setYearPicker] = useState({ visible: false, anchor: null })

  const [snack, setSnack] = useState({
    text: '', severity: 'warning', visibility: false
  })

  // ? диалоговое окно создания нового события
  const [dialogNewEvent, setDialogNewEvent] = useState({
    visible: false, title: '', description: '', date: null, company: '', client: '', shared: false, notify: true
  })

  // * получение списка уведомлений
  const handleGetNotifications = () => {
    request('/api/user/geteventsnotification', 'POST', { userId: auth.userId }, {
      Authorization: `Bearer ${auth.token}`
    }).then(data => {
      setEventsNotification(data.notifications)
    })
  }

  // * получение списка событий
  const handleGetEvents = useCallback(() => {
    request('/api/user/getevents', 'POST', { userId: auth.userId, companyId: company.companyId }, {
      Authorization: `Bearer ${auth.token}`
    }).then(data => {
      setPageLoading(false)
      setEvents(data.events)
      handleGetNotifications()
    })
  }, [events])

  // * получение названий клиентов
  useEffect(() => {
    socket.socket.emit('join-room', `/events:${auth.userId}`)
    request('/api/company/getclientsinfo', 'POST', { clientsId: company.clients }, {
      Authorization: `Bearer ${auth.token}`
    }).then(data => {
      let rows = new Array()
      data.clients.forEach(client => {
        rows.push({ id: client._id, label: client.clientName })
      });
      setClients(rows)
    })
    handleGetEvents()
  }, [])

  // * получение списка сотрудников компаний
  useEffect(() => {
    if (events.length > 0) {
      const users = events.reduce((prev, item) => {
        if (!prev.includes(item.creator)) {
          prev.push(item.creator)
        }
        return prev
      }, [])
      if (users.length > 0) {
        request('/api/user/getusersnames', 'POST', { usersList: users }, {
          'Authorization': `Bearer ${auth.token}`
        }).then(data => setUsers(data.users))
      }
    }
  }, [events])

  // * подключение слушателей сокетов
  useEffect(() => {
    socket.socket.on('events-get', handleGetEvents)
    return () => {
      socket.socket.removeListener('events-get', handleGetEvents)
    }
  }, [events])

  // * установка высоты контейнера
  useEffect(() => {
    if (pageLoading) {
      setPageLoading(false)
    }
    if (calendarMain.current) {
      setMainOffsetHeight(calendarMain.current.offsetHeight)
    }
  })  

  // * уменьшение месяца
  const handleMinusMonth = () => {
    const newValue = sub(currentDate, { months: 1 })
    if (newValue < minDate) {
      return
    }
    setCurrentDate(newValue)
  }

  // * добавление месяца
  const handlePlusMonth = () => {
    const newValue = add(currentDate, { months: 1 })
    if (newValue > maxDate) {
      return
    }
    setCurrentDate(newValue)
  }

  // * показ диалогового окна для создания события
  const dialogCreateEvent = () => {
    if (currentDate.toLocaleDateString() < new Date().toLocaleDateString()) {
      return setSnack({ visibility: true, severity: 'warning', text: 'Вы не можете создать событие на прошедшую дату' })
    }
    request('/api/company/getclientsinfo', 'POST', { clientsId: company.clients }, {
      Authorization: `Bearer ${auth.token}`
    }).then(data => {
      let rows = new Array()
      data.clients.forEach(client => {
        rows.push({ id: client._id, label: client.clientName })
      });
      setClients(rows)
    })
    setDialogNewEvent({ visible: true, title: '', description: '', date: currentDate, company: '', client: '', shared: false, notify: true })
  }

  // * создание события
  const handleCreateEvent = () => {
    if ( dialogNewEvent.client && !clients.includes(dialogNewEvent.client) ) {
      return setSnack({ visibility: true, severity: 'warning', text: 'Некорректный клиент' })
    }

    if (!dialogNewEvent.title) {
      return setSnack({ visibility: true, severity: 'warning', text: 'Введите название события' })
    }

    request('/api/user/createevent', 'POST', {
      ...dialogNewEvent, companyId: company.companyId, senderId: auth.userId, client: dialogNewEvent.client
    }, {
      Authorization: `Bearer ${auth.token}`
    }).then(data => {
      socket.socket.emit('notification-update', { id: `/events:${auth.userId}` })
      company.users.forEach(user => {
        socket.socket.emit('notification-push')
        socket.socket.emit('events-update', { id: `/events:${user}` })
      })
      handleGetEvents()
      setDialogNewEvent({ visible: false, title: '', description: '', date: currentDate, company: '', client: '', shared: false, notify: true })
    })
  }

  // * создание/удаление оповещения о событии
  const handleEventNotification = ({ currentTarget }) => {
    const eventId = currentTarget.getAttribute('data-id')
    const notification = eventsNotification.find(item => item.params.eventId === eventId)
    if (notification) {
      request('/api/user/removeeventnotification', 'POST', { id: notification._id }, {
        Authorization: `Bearer ${auth.token}`
      }).then(data => { 
        handleGetNotifications() 
      })
    } else {
      request('/api/user/createeventnotification', 'POST', { id: eventId, userId: auth.userId }, {
        Authorization: `Bearer ${auth.token}`
      }).then(data => { 
        handleGetNotifications() 
      })
    }
    socket.socket.emit('notification-update', { id: `/events:${auth.userId}` })
  }

  // * удаление события
  const handleDeleteEvent = ({ currentTarget }) => {
    const eventId = currentTarget.getAttribute('data-id')
    const event = events.find(event => event._id === eventId)

    if (event.company) {
      if (event.creator !== auth.userId && !company.admins.includes(auth.userId)) {
        return setSnack({ visibility: true, severity: 'warning', text: 'У вас нет прав на удаление этого события' })
      }
    } 

    request('/api/user/deleteevent', 'POST', { id: eventId }, {
      Authorization: `Bearer ${auth.token}`
    }).then(data => { 
      handleGetEvents()
      request('/api/user/eventdeletenotification', 'POST', { usersId: company.users, senderId: auth.userId, eventTitle: events.find(event => event._id === eventId).title }, {
        Authorization: `Bearer ${auth.token}`
      }).then(data => {
        socket.socket.emit('notification-update', { id: `/events:${auth.userId}` })
        socket.socket.emit('notification-push')
        company.users.forEach(user => {
          socket.socket.emit('events-update', { id: `/events:${user}` })
        })
      })
    })
  }

  // * отрисовка загрузочного экрана
  const renderLoadingScreen = () => {
    return (
      <div className="event__loading">
        <CircularProgress />
      </div>
    )
  }

  // * показ списка близжайших событий
  const renderEvents = () => {
    if (events.length === 0) {
      return (
        <div className="event__menu-list event__menu-list_empty">
          <p>
            Еще не добавлено ни одного события
          </p>
        </div>
      )
    }

    const sortedEvents = events.sort((a, b) => compareAsc(parseISO(a.date), parseISO(b.date)))
    const sRows = new Array()

    const today = set(new Date(), { hours: 23, minutes: 59, seconds: 59, milliseconds: 999 })
    
    sortedEvents.forEach((event, index) => {
      const eventDate = set(new Date(event.date), { hours: 23, minutes: 59, seconds: 59, milliseconds: 999 })

      if (eventDate >= today) {
        sRows.push(
          <div className="event__menu-item" key={index} >
            <div className="event__menu-item-ico">
              <SvgIcon>
                {
                  event.company ? 
                    <path fill="currentColor" d="M18,15H16V17H18M18,11H16V13H18M20,19H12V17H14V15H12V13H14V11H12V9H20M10,7H8V5H10M10,11H8V9H10M10,15H8V13H10M10,19H8V17H10M6,7H4V5H6M6,11H4V9H6M6,15H4V13H6M6,19H4V17H6M12,7V3H2V21H22V7H12Z" /> :
                    <path fill="currentColor" d="M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,6A2,2 0 0,0 10,8A2,2 0 0,0 12,10A2,2 0 0,0 14,8A2,2 0 0,0 12,6M12,13C14.67,13 20,14.33 20,17V20H4V17C4,14.33 9.33,13 12,13M12,14.9C9.03,14.9 5.9,16.36 5.9,17V18.1H18.1V17C18.1,16.36 14.97,14.9 12,14.9Z" />
                }
              </SvgIcon>
            </div>
            <div className="event__menu-item-content">
              <div className="event__menu-item-title">
                <p>
                  { event.title }
                </p>
                <Button disableRipple className='event__menu-item-btn' data-id={event._id} onClick={handleEventNotification}>
                  <Tooltip title={ eventsNotification.find(item => item.params.eventId === event._id) ? 'Не напоминайте мне об этом событии' : 'Напомните мне об этом событии' }>
                    <SvgIcon>
                      {
                        eventsNotification.find(item => item.params.eventId === event._id) ?
                          <path fill="currentColor" d="M22.11,21.46L2.39,1.73L1.11,3L5.83,7.72C5.29,8.73 5,9.86 5,11V17L3,19V20H18.11L20.84,22.73L22.11,21.46M7,18V11C7,10.39 7.11,9.79 7.34,9.23L16.11,18H7M10,21H14A2,2 0 0,1 12,23A2,2 0 0,1 10,21M8.29,5.09C8.82,4.75 9.4,4.5 10,4.29C10,4.19 10,4.1 10,4A2,2 0 0,1 12,2A2,2 0 0,1 14,4C14,4.1 14,4.19 14,4.29C16.97,5.17 19,7.9 19,11V15.8L17,13.8V11A5,5 0 0,0 12,6C11.22,6 10.45,6.2 9.76,6.56L8.29,5.09Z" /> :
                          <path fill="currentColor" d="M10,21H14A2,2 0 0,1 12,23A2,2 0 0,1 10,21M21,19V20H3V19L5,17V11C5,7.9 7.03,5.17 10,4.29C10,4.19 10,4.1 10,4A2,2 0 0,1 12,2A2,2 0 0,1 14,4C14,4.1 14,4.19 14,4.29C16.97,5.17 19,7.9 19,11V17L21,19M17,11A5,5 0 0,0 12,6A5,5 0 0,0 7,11V18H17V11M19.75,3.19L18.33,4.61C20.04,6.3 21,8.6 21,11H23C23,8.07 21.84,5.25 19.75,3.19M1,11H3C3,8.6 3.96,6.3 5.67,4.61L4.25,3.19C2.16,5.25 1,8.07 1,11Z" /> 
                      }
                    </SvgIcon>
                  </Tooltip>
                </Button>
              </div>
              <div className="event__menu-item-description">
                <Typography noWrap>
                  { event.description }
                </Typography>
              </div>
              <div className="event__menu-item-footer">
                <p className='event__menu-item-clickable' onClick={ () => { setCurrentDate(eventDate) } }>
                  {
                    eventDate.toLocaleDateString()
                  }
                </p>
                {
                  event.company && users.length > 0 ?
                    <p>
                      {
                        users.find(user => user._id === event.creator)
                          ? users.find(user => user._id === event.creator).firstName + ' ' + users.find(user => user._id === event.creator).lastName
                          : ''
                      }
                    </p> :
                    <></>
                }
              </div> 
            </div>
          </div>
        )
      }
    })

    return (
      <div className="event__menu-list">
        <div className="event__menu-list-title">
          <p>Близжайшие события</p>
        </div>
        {
          sRows
        }
      </div>
    )
  }

  // * показ списка дней
  const renderDays = () => {
    const days = set(add(currentDate, {months: 1}), { date: 0 }).getDate()

    let rows = []
    for (let i = 0; i < days; i++) {
      rows.push(
        <div className="event__calendar-main-date" key={i}>
          <Button
            disableRipple 
            className={
              set(currentDate, { date: i+1 }) < set(minDate, { date: new Date().getDate()-1 }) || set(currentDate, { date: i+1 }) > maxDate ? "event__calendar-btn event__calendar-btn_grid event__calendar-btn_disabled" : 
              currentDate.getDate() === i+1 ? "event__calendar-btn event__calendar-btn_primary event__calendar-btn_grid" : "event__calendar-btn event__calendar-btn_darken event__calendar-btn_grid"
            }
            data-date={i+1}
            onClick={ ({ currentTarget }) => { setCurrentDate(set(currentDate, { date: currentTarget.getAttribute('data-date') })) } }
          >
            <Badge
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'right',
              }}
              data-color={
                events.find(
                  event => compareAsc(set(new Date(event.date), { hours: 23, minutes: 59, seconds: 59, milliseconds: 999 }), set(new Date(currentDate.getFullYear(), currentDate.getMonth(), i+1), { hours: 23, minutes: 59, seconds: 59, milliseconds: 999 })) === 0 && 
                    compareAsc(set(new Date(event.date), { hours: 23, minutes: 59, seconds: 59, milliseconds: 999 }), set(new Date(), { hours: 23, minutes: 59, seconds: 59, milliseconds: 999 })) === -1) ?
                  "dark" :
                  "primary"
              }
              color='primary'
              variant="dot"
              badgeContent={events.filter(event => new Date(event.date).toLocaleDateString() === new Date(currentDate.getFullYear(), currentDate.getMonth(), i+1).toLocaleDateString()).length}
            >
              {
                i+1
              }
            </Badge>
          </Button>
        </div>
      )      
    }

    return <>{rows}</>
  }

  // * показ событий выбранного дня
  const renderEventsByDay = () => {

    if (pageLoading) {
      return ( renderLoadingScreen() )
    }

    if (events.length === 0) {
      return (
        <div className="event__calendar-footer-list event__calendar-footer-list_empty">
          <p>
            На этот день не назначено ни одного события
          </p>
        </div>
      )
    }

    const dayEvents = events.filter(event => new Date(event.date).toLocaleDateString() === currentDate.toLocaleDateString())

    return (
      <div className="event__calendar-footer-list">
        {
          dayEvents.map((event, index) => {
            return (
              <div className="event__menu-item" key={index} >
                <div className="event__menu-item-ico">
                  <SvgIcon>
                    {
                      event.company ? 
                        <path fill="currentColor" d="M18,15H16V17H18M18,11H16V13H18M20,19H12V17H14V15H12V13H14V11H12V9H20M10,7H8V5H10M10,11H8V9H10M10,15H8V13H10M10,19H8V17H10M6,7H4V5H6M6,11H4V9H6M6,15H4V13H6M6,19H4V17H6M12,7V3H2V21H22V7H12Z" /> :
                        <path fill="currentColor" d="M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,6A2,2 0 0,0 10,8A2,2 0 0,0 12,10A2,2 0 0,0 14,8A2,2 0 0,0 12,6M12,13C14.67,13 20,14.33 20,17V20H4V17C4,14.33 9.33,13 12,13M12,14.9C9.03,14.9 5.9,16.36 5.9,17V18.1H18.1V17C18.1,16.36 14.97,14.9 12,14.9Z" />
                    }
                  </SvgIcon>
                </div>
                <div className="event__menu-item-content">
                  <div className="event__menu-item-title">
                    <p>
                      { event.title }
                    </p>
                  </div>
                  <div className="event__menu-item-controls">
                    {
                      compareAsc(set(new Date(event.date), { hours: 0, minutes: 0, seconds: 0, milliseconds: 0 }), set(new Date(), { hours: 0, minutes: 0, seconds: 0, milliseconds: 0 })) > -1 ?
                        <Button disableRipple className='event__calendar-btn' data-id={event._id} onClick={handleEventNotification}>
                          <Tooltip title={ eventsNotification.find(item => item.params.eventId === event._id) ? 'Не напоминайте мне об этом событии' : 'Напомните мне об этом событии' }>
                            <SvgIcon>
                              {
                                eventsNotification.find(item => item.params.eventId === event._id) ?
                                  <path fill="currentColor" d="M22.11,21.46L2.39,1.73L1.11,3L5.83,7.72C5.29,8.73 5,9.86 5,11V17L3,19V20H18.11L20.84,22.73L22.11,21.46M7,18V11C7,10.39 7.11,9.79 7.34,9.23L16.11,18H7M10,21H14A2,2 0 0,1 12,23A2,2 0 0,1 10,21M8.29,5.09C8.82,4.75 9.4,4.5 10,4.29C10,4.19 10,4.1 10,4A2,2 0 0,1 12,2A2,2 0 0,1 14,4C14,4.1 14,4.19 14,4.29C16.97,5.17 19,7.9 19,11V15.8L17,13.8V11A5,5 0 0,0 12,6C11.22,6 10.45,6.2 9.76,6.56L8.29,5.09Z" /> :
                                  <path fill="currentColor" d="M10,21H14A2,2 0 0,1 12,23A2,2 0 0,1 10,21M21,19V20H3V19L5,17V11C5,7.9 7.03,5.17 10,4.29C10,4.19 10,4.1 10,4A2,2 0 0,1 12,2A2,2 0 0,1 14,4C14,4.1 14,4.19 14,4.29C16.97,5.17 19,7.9 19,11V17L21,19M17,11A5,5 0 0,0 12,6A5,5 0 0,0 7,11V18H17V11M19.75,3.19L18.33,4.61C20.04,6.3 21,8.6 21,11H23C23,8.07 21.84,5.25 19.75,3.19M1,11H3C3,8.6 3.96,6.3 5.67,4.61L4.25,3.19C2.16,5.25 1,8.07 1,11Z" /> 
                              }
                            </SvgIcon>
                          </Tooltip>
                        </Button> : 
                        <></>
                    }
                    <Button disableRipple className='event__calendar-btn' data-id={event._id} onClick={handleDeleteEvent}>
                      <Tooltip title='Удалить событие'>
                        <SvgIcon>
                          <path fill="currentColor" d="M9,3V4H4V6H5V19A2,2 0 0,0 7,21H17A2,2 0 0,0 19,19V6H20V4H15V3H9M7,6H17V19H7V6M9,8V17H11V8H9M13,8V17H15V8H13Z" />
                        </SvgIcon>
                      </Tooltip>
                    </Button>
                  </div>
                  <div className="event__menu-item-description">
                    <Typography noWrap>
                      { event.description }
                    </Typography>
                  </div>
                  <div className="event__menu-item-footer">
                    <p>
                      {
                        event.company && users.length > 0 ? 
                        `Создано ${users.find(user => user._id === event.creator).firstName} ${users.find(user => user._id === event.creator).lastName}` :
                        <></>
                      }
                    </p>
                    {
                      event.client && clients.length > 0 ?
                        <p>
                          Событие связано с компанией <strong className='event__menu-item-clickable' onClick={ () => navigate(`/client/${event.client}`) }> { clients.find(client => client.id === event.client).label }</strong>
                        </p> :
                        <></>
                    }
                  </div> 
                </div>
              </div>
            )
          })
        }
      </div>
    )
  }

  // * показ загрузочного экрана при первом открытии страницы
  if (pageLoading) {
    return (
      renderLoadingScreen()
    )
  }

  return (
    <div className="event">
      <div className="event__nav">
        <Stack spacing={2}>
          <Breadcrumbs separator="›">
            <Typography 
              className='event__bread event__bread_active' 
            >
              События
            </Typography>
          </Breadcrumbs>
        </Stack>
      </div>

      <div className="event__content">
        <div className="event__wrapper">
          <div className="event__menu">
            {
              renderEvents()
            }
          </div>
          <div className="event__calendar">
            <div className="event__calendar-header">
              <p className="event__calendar-header-date">
                { format(currentDate, 'dd MMMM yyyy', { locale: ru }) }
              </p>
              <div className="event__calendar-header-actions">
                <Tooltip title='Создать событие'>
                  <Button disableRipple className="event__calendar-btn" onClick={dialogCreateEvent}>
                    <SvgIcon>
                      <path fill="currentColor" d="M14.06,9L15,9.94L5.92,19H5V18.08L14.06,9M17.66,3C17.41,3 17.15,3.1 16.96,3.29L15.13,5.12L18.88,8.87L20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18.17,3.09 17.92,3 17.66,3M14.06,6.19L3,17.25V21H6.75L17.81,9.94L14.06,6.19Z" />
                    </SvgIcon>
                  </Button>
                </Tooltip>
              </div>
            </div>
            <div className="event__calendar-main" ref={calendarMain}>
              <div className="event__calendar-main-inputs">
                <Button 
                  disableRipple 
                  className='event__calendar-btn event__calendar-btn_darken' 
                  onClick={handleMinusMonth}
                >
                  <SvgIcon>
                    <path fill="currentColor" d="M15.41,16.58L10.83,12L15.41,7.41L14,6L8,12L14,18L15.41,16.58Z" />
                  </SvgIcon>
                </Button>
                <p 
                  className='event__calendar-main-input event__calendar-main-input_month' 
                  onClick={ ({ currentTarget }) => { setMonthPicker({ visible: true, anchor: currentTarget }) } }
                >
                  {
                    format(currentDate, 'LLLL', { locale: ru })
                  }
                </p>
                <p 
                  className='event__calendar-main-input event__calendar-main-input_year' 
                  onClick={ ({ currentTarget }) => { setYearPicker({ visible: true, anchor: currentTarget }) } }
                >
                  {
                    format(currentDate, 'yyyy', { locale: ru })
                  }
                </p>
                <Button 
                  disableRipple 
                  className='event__calendar-btn event__calendar-btn_darken' 
                  onClick={handlePlusMonth}
                >
                  <SvgIcon>
                    <path fill="currentColor" d="M8.59,16.58L13.17,12L8.59,7.41L10,6L16,12L10,18L8.59,16.58Z" />
                  </SvgIcon>
                </Button>
              </div>
              <div className="event__calendar-main-wrapper">
                {
                  renderDays()
                }
              </div>
            </div>
            <div className="event__calendar-footer" style={{ height: `calc(100vh - ${+mainOffsetHeight}px - 253px)` }}>
              {
                renderEventsByDay()
              }
            </div>
          </div>
        </div>
      </div>
      
      {/* Popovers */}

      {/* MonthPopover */}
      <Popover 
        open={monthPicker.visible}
        anchorEl={monthPicker.anchor}
        onClose={ () => { setMonthPicker({ visible: false, anchor: null }) } }
        onClick={ () => { setMonthPicker({ visible: false, anchor: null }) } }
        className='event__popover'
        elevation={0}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
      >
        <LocalizationProvider dateAdapter={AdapterDateFns} locale={ru}>
          <MonthPicker
            date={currentDate}
            minDate={minDate}
            maxDate={maxDate}
            className='event__picker event__monthpicker'
            onChange={ (newDate) => { setCurrentDate(newDate) } }
          />
        </LocalizationProvider>
      </Popover>

      {/* YearPopover */}
      <Popover 
        open={yearPicker.visible}
        anchorEl={yearPicker.anchor}
        onClose={ () => { setYearPicker({ visible: false, anchor: null }) } }
        onClick={ () => { setYearPicker({ visible: false, anchor: null }) } }
        className='event__popover'
        elevation={0}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
      >
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <YearPicker
            date={currentDate}
            isDateDisabled={ () => false }
            minDate={minDate}
            maxDate={maxDate}
            className='event__picker event__yearpicker'
            onChange={ (newDate) => { setCurrentDate(newDate) } }
          />
        </LocalizationProvider>
      </Popover>

      {/* /Popovers */}

      {/* Snacks */}

      <Snackbar open={snack.visibility} autoHideDuration={3000} onClose={ () => { setSnack({ ...snack, visibility: false }) } }>
        <Alert severity={snack.severity} variant='filled' onClose={ () => { setSnack({ ...snack, visibility: false }) } }>
          {snack.text}
        </Alert>
      </Snackbar>

      {/* /Snacks */}

      {/* Dialogs */}

      <Dialog
        open={dialogNewEvent.visible}
        onClose={ () => { setDialogNewEvent({ visible: false, title: '', description: '', date: null, company: '', client: '', shared: false, notify: true }) } }
        className='clients__dialog dialog'
      >
        <div className='dialog__title'>
          <h1>Создание события</h1>
          <SvgIcon 
            onClick={ () => { setDialogNewEvent({ visible: false, title: '', description: '', date: null, company: '', client: '', shared: false, notify: true }) } }
          >
            <path fill="currentColor" d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
          </SvgIcon>
        </div>
        <DialogContent className='dialog__content'>
          {
            loading ? renderLoadingScreen() : 
            <>
              <p className="dialog__label">Название события</p>
              <TextField 
                className='dialog__input'
                fullWidth
                value={dialogNewEvent.title}
                onChange={ ({ target: { value } }) => { setDialogNewEvent({ ...dialogNewEvent, title: value }) } }
              />
              <p className="dialog__label">Описание</p>
              <TextField 
                className='dialog__input'
                fullWidth
                value={dialogNewEvent.description}
                onChange={ ({ target: { value } }) => { setDialogNewEvent({ ...dialogNewEvent, description: value }) } }
              />
              <p className="dialog__label">Клиент</p>
              <Autocomplete 
                disablePortal
                options={clients}
                getOptionLabel={ (option) => option.label }
                isOptionEqualToValue={ (option, value) => option.id === value.id }
                fullWidth
                autoComplete
                autoSelect
                loading={loading}
                loadingText='Загрузка...'
                noOptionsText='Нет данных о клиентах'
                onChange={(event, newValue) => { setDialogNewEvent({ ...dialogNewEvent, client: newValue ? newValue : '' }) }}
                renderInput={
                  (params) =>
                    <TextField 
                      {...params} 
                      value={dialogNewEvent.client} 
                      className="dialog__input dialog__input_autocomplete" 
                      helperText={`Если вы хотите создать событие относящееся к клиенту, выберите клиента`}
                      onChange={({ target: { value } }) => { setDialogNewEvent({ ...dialogNewEvent, client: value }) }} 
                    /> 
                }
              />
              <FormControlLabel 
                control={
                  <Checkbox checked={dialogNewEvent.shared} onChange={ ({ target: { checked } }) => { setDialogNewEvent({ ...dialogNewEvent, shared: checked }) } } />
                }
                label="Открыть видимость для компании"
              />
              <FormControlLabel 
                control={
                  <Checkbox checked={dialogNewEvent.notify} onChange={ ({ target: { checked } }) => { setDialogNewEvent({ ...dialogNewEvent, notify: checked }) } } />
                }
                label="Напомнить мне о событии"
              />
            </>
          }
        </DialogContent>
        <DialogActions className='dialog__actions'>
          <Button 
            disableElevation 
            variant="contained" 
            className='dialog__btn'
            onClick={handleCreateEvent}
          >
            Создать событие
          </Button>
        </DialogActions>
      </Dialog>

      {/* /Dialogs */}

    </div>
  )
}