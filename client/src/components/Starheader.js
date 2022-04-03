
import { useContext, useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"

import { AuthContext } from "../context/AuthContext"
import { SocketContext } from "../context/SocketContext"

import { useHttp } from "../hooks/http.hook"

import ruLocale from 'date-fns/locale/ru'
import { compareAsc, format } from 'date-fns'

import { Button, SvgIcon, Badge, Avatar, ClickAwayListener } from '@mui/material'
import { Menu, MenuItem, Divider, ListItemIcon, Popover } from '@mui/material'
import { Settings, Logout } from '@mui/icons-material'

import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';

import './Starheader.css'

export const Starheader = (props) => {

  // ? props
  const { children } = props

  // ? контексты
  const auth = useContext(AuthContext)
  const socket = useContext(SocketContext)

  // ? хуки
  const { request } = useHttp()
  const navigate = useNavigate()

  // ? информация о пользователе
  const [user, setUser] = useState(null)

  // ? списки для уведомлений
  const [userNotifications, setUserNotifications] = useState([])
  const [messageNotifications, setMessageNotifications] = useState([])

  // ? 
  const [notificationPanel, setNotificationPanel] = useState({ visible: false, anchor: null })
  const [messagePanel, setMessagePanel] = useState({ visible: false, anchor: null })
  const [accountPanel, setAccountPanel] = useState({ visible: false, anchor: null })

  const [currentPage, setCurrentPage] = useState('')

  const theme = useTheme()
  const mdScreen = useMediaQuery(theme.breakpoints.down('md'))
  const smScreen = useMediaQuery('(max-width:700px)')
  const xsScreen = useMediaQuery('(max-width:430px)')

  const [menuVisible, setMenuVisible] = useState(false)

  // * получение списка уведомлений
  const listenerGetNotifications = () => {
    request(
      '/api/user/notificationslist',
      'POST',
      {
        userId: auth.userId
      }, 
      {
        Authorization: `Bearer ${auth.token}`
      }
    ).then(data => {
      const notifications = data
      setUserNotifications(notifications.filter(item => item.type !== 'message-notification'))
      setMessageNotifications(notifications.filter(item => item.type === 'message-notification'))
    })
  }

  // * получение информации о пользователе
  const getUser = () => {
    request(
      `/api/user/userinfo`, 
      'POST', 
      { 
        userId: auth.userId 
      }
    ).then(data => {
      setUser({ ...data })
    })
  }

  // * установка значений при загрузке страницы
  useEffect(() => {
    if (auth.userId) {
      getUser()
      listenerGetNotifications()
      setCurrentPage(document.location.pathname.split('/')[1])
    }
  }, [])

  // * подключение слушателей
  useEffect(() => {
    socket.socket.on('notification-get', listenerGetNotifications)
    return () => {
      socket.socket.removeListener('notification-get', listenerGetNotifications)
    }
  }, [auth, request])

  // * выход из системы
  const handleLogout = () => {
    auth.logout()
    navigate('/auth')
  }

  // * переход по меню
  const handleRedirect = ({ currentTarget }) => {
    const link = currentTarget.getAttribute('data-link')
    setCurrentPage(link)
    navigate(`/${link}`)
  }

  // * нажатие на уведомление
  const handleItemClick = ({ currentTarget }) => {
    
    const id = currentTarget.getAttribute('data-id')
    
    const item = userNotifications.find(item => item._id === id)

    if (item) {
      setCurrentPage('account')
      switch (item.type) {
        case 'invite':
        case 'invite-director':
          setCurrentPage('account')
          navigate('/account?section=notifications&filter=invites')
          break
        case 'event-remember':
        case 'event-new':
        case 'event-delete':
          navigate('/account?section=notifications&filter=events')
          break
        default:
          navigate('/account?section=notifications&filter=all')
          break
      }
    }

  }

  // * нажатие на уведомление о сообщениях
  const handleMessageClick = ({ currentTarget }) => {
    const id = currentTarget.getAttribute('data-id')
    
    request(
      '/api/user/deletemessagenotification',
      'POST',
      {
        userId: auth.userId,
        chatId: id,
      }, {
        Authorization: `Bearer ${auth.token}`
      }
    ).then(() => {
      setCurrentPage('messages')
      listenerGetNotifications()
      navigate(`/messages?chat=${id}`)
    })

  }

  // * отображение меню
  const renderMenuLinks = () => {
    switch (auth.userMembership) {
      case 'company':
        // для пользователей вошедших как компании
        return (
          <div className="starboard__menu-links">
            <Button 
              disableRipple
              data-link="company"
              className={
                currentPage === 'company' 
                  ? 'starboard__menu-btn starboard__menu-btn_active' 
                  : 'starboard__menu-btn'
              }
              onClick={handleRedirect}
              startIcon={ 
                <SvgIcon>
                  <path fill="currentColor" d="M10,2V4.26L12,5.59V4H22V19H17V21H24V2H10M7.5,5L0,10V21H15V10L7.5,5M14,6V6.93L15.61,8H16V6H14M18,6V8H20V6H18M7.5,7.5L13,11V19H10V13H5V19H2V11L7.5,7.5M18,10V12H20V10H18M18,14V16H20V14H18Z" />
                </SvgIcon> 
              }
            >
              Компания
            </Button>
            <Button 
              disableRipple
              data-link="clients"
              className={
                currentPage === 'clients'  || currentPage === 'client'
                  ? 'starboard__menu-btn starboard__menu-btn_active' 
                  : 'starboard__menu-btn'
              }
              onClick={handleRedirect}
              startIcon={ 
                <SvgIcon>
                  <path fill="currentColor" d="M13.07 10.41A5 5 0 0 0 13.07 4.59A3.39 3.39 0 0 1 15 4A3.5 3.5 0 0 1 15 11A3.39 3.39 0 0 1 13.07 10.41M5.5 7.5A3.5 3.5 0 1 1 9 11A3.5 3.5 0 0 1 5.5 7.5M7.5 7.5A1.5 1.5 0 1 0 9 6A1.5 1.5 0 0 0 7.5 7.5M16 17V19H2V17S2 13 9 13 16 17 16 17M14 17C13.86 16.22 12.67 15 9 15S4.07 16.31 4 17M15.95 13A5.32 5.32 0 0 1 18 17V19H22V17S22 13.37 15.94 13Z" />
                </SvgIcon> 
              }
            >
              Клиенты
            </Button>
            <Button 
              disableRipple
              data-link="events"
              className={
                currentPage === 'events'
                  ? 'starboard__menu-btn starboard__menu-btn_active' 
                  : 'starboard__menu-btn'
              }
              onClick={handleRedirect}
              startIcon={ 
                <SvgIcon>
                  <path fill="currentColor" d="M7,12H9V14H7V12M21,6V20A2,2 0 0,1 19,22H5C3.89,22 3,21.1 3,20V6A2,2 0 0,1 5,4H6V2H8V4H16V2H18V4H19A2,2 0 0,1 21,6M5,8H19V6H5V8M19,20V10H5V20H19M15,14V12H17V14H15M11,14V12H13V14H11M7,16H9V18H7V16M15,18V16H17V18H15M11,18V16H13V18H11Z" />
                </SvgIcon> 
              }
            >
              События
            </Button>
            <Button 
              disableRipple
              data-link="messages"
              className={
                currentPage === 'messages'
                  ? 'starboard__menu-btn starboard__menu-btn_active' 
                  : 'starboard__menu-btn'
              }
              onClick={handleRedirect}
              startIcon={ 
                <SvgIcon>
                  <path fill="currentColor" d="M15,4V11H5.17L4,12.17V4H15M16,2H3A1,1 0 0,0 2,3V17L6,13H16A1,1 0 0,0 17,12V3A1,1 0 0,0 16,2M21,6H19V15H6V17A1,1 0 0,0 7,18H18L22,22V7A1,1 0 0,0 21,6Z" />
                </SvgIcon> 
              }
            >
              Сообщения
            </Button>
          </div>
        )
      case 'client':
        // для пользователей вошедших как клиенты
        return (
          <div className="starboard__menu-links">
            <Button 
              disableRipple
              data-link="client"
              className={
                currentPage === 'client' 
                  ? 'starboard__menu-btn starboard__menu-btn_active' 
                  : 'starboard__menu-btn'
              }
              onClick={handleRedirect}
              startIcon={ 
                <SvgIcon>
                  <path fill="currentColor" d="M10,2V4.26L12,5.59V4H22V19H17V21H24V2H10M7.5,5L0,10V21H15V10L7.5,5M14,6V6.93L15.61,8H16V6H14M18,6V8H20V6H18M7.5,7.5L13,11V19H10V13H5V19H2V11L7.5,7.5M18,10V12H20V10H18M18,14V16H20V14H18Z" />
                </SvgIcon> 
              }
            >
              Компания
            </Button>
            <Button 
              disableRipple
              data-link="messages"
              className={
                currentPage === 'messages' 
                  ? 'starboard__menu-btn starboard__menu-btn_active' 
                  : 'starboard__menu-btn'
              }
              onClick={handleRedirect}
              startIcon={ 
                <SvgIcon>
                  <path fill="currentColor" d="M15,4V11H5.17L4,12.17V4H15M16,2H3A1,1 0 0,0 2,3V17L6,13H16A1,1 0 0,0 17,12V3A1,1 0 0,0 16,2M21,6H19V15H6V17A1,1 0 0,0 7,18H18L22,22V7A1,1 0 0,0 21,6Z" />
                </SvgIcon> 
              }
            >
              Сообщения
            </Button>
          </div>
        )
      case 'none':
        return (
          <div className="starboard__menu-links">
            <Button 
              disableRipple
              data-link="company"
              className={
                currentPage === 'company' 
                  ? 'starboard__menu-btn starboard__menu-btn_active' 
                  : 'starboard__menu-btn'
              }
              onClick={handleRedirect}
              startIcon={ 
                <SvgIcon>
                  <path fill="currentColor" d="M10,2V4.26L12,5.59V4H22V19H17V21H24V2H10M7.5,5L0,10V21H15V10L7.5,5M14,6V6.93L15.61,8H16V6H14M18,6V8H20V6H18M7.5,7.5L13,11V19H10V13H5V19H2V11L7.5,7.5M18,10V12H20V10H18M18,14V16H20V14H18Z" />
                </SvgIcon> 
              }
            >
              Компания
            </Button>
          </div>
        )
      case null:
        return (
          <div></div>
        )
      default:
        break;
    }
  }

  // * отображение уведомлений пользователя
  const renderUserNotifications = () => {

    // получение активных и не истекших уведомлений
    const notifications = userNotifications.filter(item => 
      compareAsc(new Date(item.expires), new Date()) === 1 && item.status === 'active'
    )

    if (notifications.length > 0) {

      const sRows = []

      notifications.forEach((item, index) => {
        if (sRows.length < 4) { 
          switch (item.type) {
            case 'invite':
              sRows.push(
                <div 
                  className="starboard__popover-item" 
                  key={index} 
                  data-id={item._id}
                  onClick={handleItemClick}
                > 
                  <div className="starboard__popover-item-header">
                    <div className="starboard__popover-item-ico">
                      <SvgIcon>
                        <path fill="currentColor" d="M12 7V3H2V21H13.35A5.8 5.8 0 0 1 13 19H12V17H13.35A5 5 0 0 1 14 15.69V15H12V13H14V11H12V9H20V13.09A5.58 5.58 0 0 1 22 13.81V7M6 19H4V17H6M6 15H4V13H6M6 11H4V9H6M6 7H4V5H6M10 19H8V17H10M10 15H8V13H10M10 11H8V9H10M10 7H8V5H10M16 13H18V11H16M16 11V13H18V11M16 11V13H18V11M20 15V18H23V20H20V23H18V20H15V18H18V15Z" />
                      </SvgIcon>
                    </div>
                    <div className="starboard__popover-item-title">
                      <p className="starboard__popover-item-type">Приглашение присоединиться к компании</p>
                      <p className='starboard__popover-item-company'>Компания: { item.companyName }</p>
                    </div>
                  </div>
                  <div className="starboard__popover-item-footer">
                    <p>
                      { 
                        `${format(new Date(item.creation), 'hh:mm')}  ${format(new Date(item.creation), 'dd.MM.yyyy')}`
                      }
                    </p>
                  </div>
                </div>
              )
              break
            case 'invite-director':
              sRows.push(
                <div 
                  className="starboard__popover-item" 
                  key={index} 
                  data-id={item._id}
                  onClick={handleItemClick}
                > 
                  <div className="starboard__popover-item-header">
                    <div className="starboard__popover-item-ico">
                      <SvgIcon>
                        <path fill="currentColor" d="M12 7V3H2V21H13.35A5.8 5.8 0 0 1 13 19H12V17H13.35A5 5 0 0 1 14 15.69V15H12V13H14V11H12V9H20V13.09A5.58 5.58 0 0 1 22 13.81V7M6 19H4V17H6M6 15H4V13H6M6 11H4V9H6M6 7H4V5H6M10 19H8V17H10M10 15H8V13H10M10 11H8V9H10M10 7H8V5H10M16 13H18V11H16M16 11V13H18V11M16 11V13H18V11M20 15V18H23V20H20V23H18V20H15V18H18V15Z" />
                      </SvgIcon>
                    </div>
                    <div className="starboard__popover-item-title">
                      <p className="starboard__popover-item-type">Приглашение присоединиться к компании на должность { item.params.post }</p>
                      <p className='starboard__popover-item-company'>Компания: { item.companyName }</p>
                    </div>
                  </div>
                  <div className="starboard__popover-item-footer">
                    <p>
                      { 
                        `${format(new Date(item.creation), 'HH:mm')}  ${format(new Date(item.creation), 'dd.MM.yyyy')}`
                      }
                    </p>
                  </div>
                </div>
              )
              break
            case 'event-new':
              sRows.push(
                <div 
                  className="starboard__popover-item" 
                  key={index} 
                  data-id={item._id}
                  data-event-id={item.params.eventId}
                  onClick={handleItemClick}
                > 
                  <div className="starboard__popover-item-header">
                    <div className="starboard__popover-item-ico">
                      <SvgIcon>
                        <path fill="currentColor" d="M19,19H5V8H19M16,1V3H8V1H6V3H5C3.89,3 3,3.89 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5C21,3.89 20.1,3 19,3H18V1M17,12H12V17H17V12Z" />
                      </SvgIcon>
                    </div>
                    <div className="starboard__popover-item-title">
                      <p className="starboard__popover-item-type">Новое событие</p>
                      <p className='starboard__popover-item-company'>{ item.message }</p>
                    </div>
                  </div>
                  <div className="starboard__popover-item-footer">
                    <p>
                      { 
                        `${format(new Date(item.creation), 'HH:mm')}  ${format(new Date(item.creation), 'dd.MM.yyyy')}`
                      }
                    </p>
                  </div>
                </div>
              )
              break
            case 'event-delete':
              sRows.push(
                <div 
                  className="starboard__popover-item" 
                  key={index} 
                  data-id={item._id}
                  data-event-id={item.params.eventId}
                  onClick={handleItemClick}
                > 
                  <div className="starboard__popover-item-header">
                    <div className="starboard__popover-item-ico">
                      <SvgIcon>
                        <path fill="currentColor" d="M19,19H5V8H19M16,1V3H8V1H6V3H5C3.89,3 3,3.89 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5C21,3.89 20.1,3 19,3H18V1M17,12H12V17H17V12Z" />
                      </SvgIcon>
                    </div>
                    <div className="starboard__popover-item-title">
                      <p className="starboard__popover-item-type">Событие удалено</p>
                      <p className='starboard__popover-item-company'>{ item.message }</p>
                    </div>
                  </div>
                  <div className="starboard__popover-item-footer">
                    <p>
                      { 
                        `${format(new Date(item.creation), 'HH:mm')}  ${format(new Date(item.creation), 'dd.MM.yyyy')}`
                      }
                    </p>
                  </div>
                </div>
              )
              break
            case 'event-remember':
              sRows.push(
                <div 
                  className="starboard__popover-item" 
                  key={index} 
                  data-id={item._id}
                  data-event-id={item.params.eventId}
                  onClick={handleItemClick}
                > 
                  <div className="starboard__popover-item-header">
                    <div className="starboard__popover-item-ico">
                      <SvgIcon>
                        <path fill="currentColor" d="M19,19H5V8H19M16,1V3H8V1H6V3H5C3.89,3 3,3.89 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5C21,3.89 20.1,3 19,3H18V1M17,12H12V17H17V12Z" />
                      </SvgIcon>
                    </div>
                    <div className="starboard__popover-item-title">
                      <p className="starboard__popover-item-type">Событие</p>
                      <p className='starboard__popover-item-company'>{ item.message }</p>
                    </div>
                  </div>
                  <div className="starboard__popover-item-footer">
                    <p>
                      { 
                        `${format(new Date(item.creation), 'HH:mm')}  ${format(new Date(item.creation), 'dd.MM.yyyy')}`
                      }
                    </p>
                  </div>
                </div>
              )
              break
            default:
              break;
          }
        }
      })

      return sRows

    } else {
      return (
        <div className="starboard__popover-item-empty">
          <p>У вас нет новых уведомлений</p>
        </div>
      )
    }
  }

  // * отображение уведомлений о сообщениях
  const renderMessageNotifications = () => {

    // получение активных и не истекших уведомлений
    const messages = messageNotifications.filter(item => 
      compareAsc(new Date(item.expires), new Date()) === 1 && item.status === 'active'
    )

    // группировка уведомлений по чату
    const notifications = messages.reduce((arr, item) => {
      const chatId = item.params.chatId
      arr[chatId] = arr[chatId] || []
      arr[chatId].push(item)
      return arr
    }, { })

    const sRows = []

    Object.keys(notifications).forEach((key, index) => {
      if (sRows.length < 4) {
        sRows.push(
          <div 
            data-id={key}
            key={index}
            className="starboard__popover-item"
            onClick={handleMessageClick}
          >
            <div className="starboard__popover-item-header">
              <div className="starboard__popover-item-ico">
                <SvgIcon>
                  <path fill="currentColor" d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2M20 16H5.2L4 17.2V4H20V16Z" />
                </SvgIcon>
              </div>
              <div className="starboard__popover-item-title">
                <p className="starboard__popover-item-type">
                  {
                    notifications[key][0].companyName
                      ? notifications[key][0].companyName
                      : 'Не указано'
                  }
                </p>
                <p className="starboard__popover-item-company">
                  {
                    `В этом чате ${notifications[key].length} новых сообщений`
                  }
                </p>
              </div>
            </div>
          </div>
        )
      }
    })
    
    return sRows
  } 

  // * отображение выпадающих элементов
  const renderPopoverPanels = () => {
    return (
      <>

        {/* Account menu */}
        <Menu
          open={accountPanel.visible}
          anchorEl={accountPanel.anchor}
          onClose={() => { setAccountPanel({ visible: false, anchor: null }) }}
          onClick={() => { setAccountPanel({ visible: false, anchor: null }) }}
          className='starboard__popover'
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        >
          <MenuItem data-link='account' onClick={handleRedirect}>
            Мой аккаунт
          </MenuItem>
          <Divider />
          <MenuItem>
            <ListItemIcon>
              <Settings fontSize="small" />
            </ListItemIcon>
            Настройки
          </MenuItem>
          <MenuItem onClick={handleLogout}>
            <ListItemIcon>
              <Logout fontSize="small" />
            </ListItemIcon>
            Выйти
          </MenuItem>
        </Menu>

        {/* Notification popover */}
        <Popover
          open={notificationPanel.visible && userNotifications.length > 0}
          anchorEl={notificationPanel.anchor}
          className="starboard__popover"
          onClose={() => { setNotificationPanel({ visible: false, anchor: null }) }}
          transformOrigin={{ 
            vertical: 'top', 
            horizontal: 
              smScreen
                ? 'center'
                : 'right' 
          }}
          anchorOrigin={{ 
            horizontal: 'center',
            vertical:
              smScreen
                ? 'bottom'
                : 'center'
          }}
        >

          {/* Ico */}
          <div className="starboard__popover-ico">
            <Badge 
              color='info'
              badgeContent={
                userNotifications.filter(item => 
                  compareAsc(new Date(item.expires), new Date()) === 1
                ).length
              }
            >
              <SvgIcon>
                <path fill="currentColor" d="M10 21H14C14 22.1 13.1 23 12 23S10 22.1 10 21M21 19V20H3V19L5 17V11C5 7.9 7 5.2 10 4.3V4C10 2.9 10.9 2 12 2S14 2.9 14 4V4.3C17 5.2 19 7.9 19 11V17L21 19M17 11C17 8.2 14.8 6 12 6S7 8.2 7 11V18H17V11Z" />
              </SvgIcon>
            </Badge>
          </div>

          <div className="starboard__popover-main">

            {/* Header */}
            <div className="starboard__popover-header">
              <p>Уведомления</p>
              {/* Header controls */}
              <div 
                className="starboard__popover-header-controls"
              >
                <p 
                  onClick={() => {
                    const ids = userNotifications.reduce((prev, item) => {
                      prev.push(item._id)
                      return prev
                    }, [])
                    request(
                      '/api/user/readnotification',
                      'POST',
                      {
                        id: ids
                      }, {
                        Authorization: `Bearer ${auth.token}`
                      }
                    ).then(() => {
                      listenerGetNotifications()
                    })
                  }}
                >
                  Пометить все как прочитанные
                </p>
              </div>
            </div>
            
            {/* Items */}
            <div className="starboard__popover-items">
              {
                renderUserNotifications()
              }
            </div>

            <div className="starboard__popover-footer">
              <p onClick={() => navigate('/account?section=notifications&filter=all')}>Показать все</p>
            </div>
          </div>
        </Popover>

        {/* Message popover */}
        <Popover
          open={messagePanel.visible && messageNotifications.length > 0}
          anchorEl={messagePanel.anchor}
          className="starboard__popover"
          onClose={() => { setMessagePanel({ visible: false, anchor: null }) }}
          transformOrigin={{ 
            vertical: 'top', 
            horizontal: 
              smScreen
                ? 'center'
                : 'right' 
          }}
          anchorOrigin={{ 
            horizontal: 'center',
            vertical:
              smScreen
                ? 'bottom'
                : 'center'
          }}
        >

          {/* Ico */}
          <div className="starboard__popover-ico">
            <Badge 
              color='info'
              badgeContent={
                messageNotifications.filter(item => 
                  compareAsc(new Date(item.expires), new Date()) === 1
                ).length
              }
            >
              <SvgIcon>
                <path fill="currentColor" d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2M20 16H5.2L4 17.2V4H20V16Z" />
              </SvgIcon>
            </Badge>
          </div>

          <div className="starboard__popover-main">

            {/* Header */}
            <div className="starboard__popover-header">
              <p>Уведомления</p>
              {/* Header controls */}
            </div>
            
            {/* Items */}
            <div className="starboard__popover-items">
              {
                renderMessageNotifications()
              }
            </div>

            <div className="starboard__popover-footer">
              <p onClick={() => navigate('/account?section=notifications&filter=messages')}>Показать все</p>
            </div>
          </div>
        </Popover>
      </>
    )
  }

  return (
    <div className="starboard">

      {/* Menu */}
      {
        mdScreen 
          ? (
            <>
              {
                menuVisible
                  ? (
                    <div 
                      className="starboard__emptiness" 
                      onClick={ () => setMenuVisible(false)}
                    />
                  )
                  : <></>
              }
              <div 
                className={
                  menuVisible
                    ? "starboard__menu starboard__menu_visible"
                    : "starboard__menu starboard__menu_hide"
                }
              >
                <div className="starboard__menu-header">
                  <div className="starboard__menu-logo">
                    <svg width="235" height="37" viewBox="0 0 235 37" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M11.308 36.3519C9.16667 36.3519 7.26 35.9852 5.588 35.2519C3.916 34.5186 2.596 33.5212 1.628 32.2599C0.66 30.9692 0.117333 29.5319 0 27.9479H7.436C7.524 28.7986 7.92 29.4879 8.624 30.0159C9.328 30.5439 10.1933 30.8079 11.22 30.8079C12.1587 30.8079 12.8773 30.6319 13.376 30.2799C13.904 29.8986 14.168 29.4146 14.168 28.8279C14.168 28.1239 13.8013 27.6106 13.068 27.2879C12.3347 26.9359 11.1467 26.5546 9.504 26.1439C7.744 25.7332 6.27733 25.3079 5.104 24.8679C3.93067 24.3986 2.91867 23.6799 2.068 22.7119C1.21733 21.7146 0.792 20.3799 0.792 18.7079C0.792 17.2999 1.17333 16.0239 1.936 14.8799C2.728 13.7066 3.872 12.7826 5.368 12.1079C6.89333 11.4333 8.69733 11.0959 10.78 11.0959C13.86 11.0959 16.28 11.8586 18.04 13.3839C19.8293 14.9093 20.856 16.9333 21.12 19.4559H14.168C14.0507 18.6053 13.6693 17.9306 13.024 17.4319C12.408 16.9333 11.5867 16.6839 10.56 16.6839C9.68 16.6839 9.00533 16.8599 8.536 17.2119C8.06667 17.5346 7.832 17.9893 7.832 18.5759C7.832 19.2799 8.19867 19.8079 8.932 20.1599C9.69467 20.5119 10.868 20.8639 12.452 21.2159C14.2707 21.6852 15.752 22.1546 16.896 22.6239C18.04 23.0639 19.0373 23.7972 19.888 24.8239C20.768 25.8212 21.2227 27.1706 21.252 28.8719C21.252 30.3093 20.8413 31.5999 20.02 32.7439C19.228 33.8586 18.0693 34.7386 16.544 35.3839C15.048 36.0292 13.3027 36.3519 11.308 36.3519Z" fill="#161A1E"/>
                      <path d="M38.592 29.6199V35.9999H35.4912C32.7632 35.9999 30.6365 35.3399 29.1112 34.0199C27.5858 32.6706 26.592 30.4852 26.592 27.4639V18.9999H23.592V12.9999H26.592V5.99998H33.592V12.4479V18.9999V27.5519C33.592 28.2853 33.768 28.8133 34.12 29.1359C34.472 29.4586 35.8138 29.6199 36.6352 29.6199H38.592Z" fill="#161A1E"/>
                      <path d="M86.592 15.5399C86.592 15.5399 86.592 13.5639 86.592 24.6039V35.9999H78.592V12.9999H86.592V15.5399Z" fill="#161A1E"/>
                      <path d="M141.5 36C134.873 36 129.5 30.6274 129.5 24C129.5 17.3726 134.873 12 141.5 12C148.127 12 153.5 17.3726 153.5 24C153.5 30.6274 148.127 36 141.5 36ZM141.5 29.5C144.403 29.5 146.5 26.9028 146.5 24C146.5 21.0972 144.403 18.5 141.5 18.5C138.597 18.5 136.5 21.0972 136.5 24C136.5 26.9028 138.597 29.5 141.5 29.5Z" fill="#161A1E"/>
                      <path d="M157.592 24C157.592 17.8998 161.592 12 167.592 12C169.592 12 170.592 12 172.092 12.5C173.151 12.8531 174.592 14 174.592 14V12.9999H182.592V35.9999H174.592V33.9999C174.592 33.9999 173.172 35.14 172.092 35.5C170.592 36 169.592 36 167.592 36C161.592 35.9999 157.592 30.1002 157.592 24ZM174.592 23.9999C174.592 21.0972 172.495 18.5 169.592 18.5C166.689 18.5 164.592 21.0972 164.592 24C164.592 26.9028 166.689 29.5 169.592 29.5C172.495 29.5 174.592 26.9027 174.592 23.9999Z" fill="#161A1E"/>
                      <path d="M195.592 15.5399C195.592 15.5399 195.592 13.5639 195.592 24.6039V35.9999H187.592V12.9999H195.592V15.5399Z" fill="#161A1E"/>
                      <path d="M226.592 14C226.592 14 225.041 12.8162 224.092 12.5C222.592 12 221.592 12 219.592 12C213.592 12 209.592 17.8998 209.592 24C209.592 30.1002 213.592 35.9999 219.592 35.9999C221.592 35.9999 222.592 35.9999 224.092 35.5C225.172 35.14 226.592 33.9999 226.592 33.9999V35.9999H234.592V0H226.592V14ZM216.592 24C216.592 21.0972 218.689 18.5 221.592 18.5C224.495 18.5 226.592 21.0972 226.592 23.9999C226.592 26.9027 224.495 29.5 221.592 29.5C218.689 29.5 216.592 26.9028 216.592 24Z" fill="#161A1E"/>
                      <path d="M201.592 12.9999C204.792 12.9999 205.592 15.6666 205.592 16.9999C205.592 18.3332 204.792 20.9999 201.592 20.9999C198.392 20.9999 197.592 18.3332 197.592 16.9999C197.592 15.6666 198.392 12.9999 201.592 12.9999Z" fill="#487DFF"/>
                      <path d="M40.592 12.9999C43.792 12.9999 44.592 15.6666 44.592 16.9999C44.592 18.3332 43.792 20.9999 40.592 20.9999C37.392 20.9999 36.592 18.3332 36.592 16.9999C36.592 15.6666 37.392 12.9999 40.592 12.9999Z" fill="#487DFF"/>
                      <path d="M92.592 12.9999C95.792 12.9999 96.592 15.6666 96.592 16.9999C96.592 18.3332 95.792 20.9999 92.592 20.9999C89.392 20.9999 88.592 18.3332 88.592 16.9999C88.592 15.6666 89.392 12.9999 92.592 12.9999Z" fill="#487DFF"/>
                      <path d="M108.592 14C108.592 14 110.032 12.9147 111.092 12.5C112.739 11.856 113.592 12 115.592 12C121.592 12 125.592 17.8998 125.592 24C125.592 30.1002 121.592 35.9999 115.592 35.9999C113.592 35.9999 112.739 36.144 111.092 35.5C110.032 35.0853 108.592 33.9999 108.592 33.9999V35.9999H100.592V0H108.592V14ZM118.592 24C118.592 21.0972 116.495 18.5 113.592 18.5C110.689 18.5 108.592 21.0972 108.592 23.9999C108.592 26.9027 110.689 29.5 113.592 29.5C116.495 29.5 118.592 26.9028 118.592 24Z" fill="#161A1E"/>
                      <path d="M157.592 24C157.592 17.8998 161.592 12 167.592 12C169.592 12 170.592 12 172.092 12.5C173.151 12.8531 174.592 14 174.592 14V12.9999H182.592V35.9999H174.592V33.9999C174.592 33.9999 173.172 35.14 172.092 35.5C170.592 36 169.592 36 167.592 36C161.592 35.9999 157.592 30.1002 157.592 24ZM174.592 23.9999C174.592 21.0972 172.495 18.5 169.592 18.5C166.689 18.5 164.592 21.0972 164.592 24C164.592 26.9028 166.689 29.5 169.592 29.5C172.495 29.5 174.592 26.9027 174.592 23.9999Z" fill="#161A1E"/>
                      <path d="M48.592 24C48.592 17.8998 52.592 12 58.592 12C60.592 12 61.592 12 63.092 12.5C64.1512 12.8531 65.592 14 65.592 14V12.9999H73.592V35.9999H65.592V33.9999C65.592 33.9999 64.1722 35.14 63.092 35.5C61.592 36 60.592 36 58.592 36C52.592 35.9999 48.592 30.1002 48.592 24ZM65.592 23.9999C65.592 21.0972 63.4948 18.5 60.592 18.5C57.6892 18.5 55.592 21.0972 55.592 24C55.592 26.9028 57.6892 29.5 60.592 29.5C63.4948 29.5 65.5921 26.9027 65.592 23.9999Z" fill="#161A1E"/>
                    </svg>
                  </div>
                  {
                    renderMenuLinks()
                  }
                </div>
                <div className="starboard__menu-footer">
                  <p>Powered by Starboard</p>
                </div>
              </div>
            </>
          )
          : (
            <div className="starboard__menu">
              <div className="starboard__menu-header">
                <div className="starboard__menu-logo">
                  <svg width="235" height="37" viewBox="0 0 235 37" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M11.308 36.3519C9.16667 36.3519 7.26 35.9852 5.588 35.2519C3.916 34.5186 2.596 33.5212 1.628 32.2599C0.66 30.9692 0.117333 29.5319 0 27.9479H7.436C7.524 28.7986 7.92 29.4879 8.624 30.0159C9.328 30.5439 10.1933 30.8079 11.22 30.8079C12.1587 30.8079 12.8773 30.6319 13.376 30.2799C13.904 29.8986 14.168 29.4146 14.168 28.8279C14.168 28.1239 13.8013 27.6106 13.068 27.2879C12.3347 26.9359 11.1467 26.5546 9.504 26.1439C7.744 25.7332 6.27733 25.3079 5.104 24.8679C3.93067 24.3986 2.91867 23.6799 2.068 22.7119C1.21733 21.7146 0.792 20.3799 0.792 18.7079C0.792 17.2999 1.17333 16.0239 1.936 14.8799C2.728 13.7066 3.872 12.7826 5.368 12.1079C6.89333 11.4333 8.69733 11.0959 10.78 11.0959C13.86 11.0959 16.28 11.8586 18.04 13.3839C19.8293 14.9093 20.856 16.9333 21.12 19.4559H14.168C14.0507 18.6053 13.6693 17.9306 13.024 17.4319C12.408 16.9333 11.5867 16.6839 10.56 16.6839C9.68 16.6839 9.00533 16.8599 8.536 17.2119C8.06667 17.5346 7.832 17.9893 7.832 18.5759C7.832 19.2799 8.19867 19.8079 8.932 20.1599C9.69467 20.5119 10.868 20.8639 12.452 21.2159C14.2707 21.6852 15.752 22.1546 16.896 22.6239C18.04 23.0639 19.0373 23.7972 19.888 24.8239C20.768 25.8212 21.2227 27.1706 21.252 28.8719C21.252 30.3093 20.8413 31.5999 20.02 32.7439C19.228 33.8586 18.0693 34.7386 16.544 35.3839C15.048 36.0292 13.3027 36.3519 11.308 36.3519Z" fill="#161A1E"/>
                    <path d="M38.592 29.6199V35.9999H35.4912C32.7632 35.9999 30.6365 35.3399 29.1112 34.0199C27.5858 32.6706 26.592 30.4852 26.592 27.4639V18.9999H23.592V12.9999H26.592V5.99998H33.592V12.4479V18.9999V27.5519C33.592 28.2853 33.768 28.8133 34.12 29.1359C34.472 29.4586 35.8138 29.6199 36.6352 29.6199H38.592Z" fill="#161A1E"/>
                    <path d="M86.592 15.5399C86.592 15.5399 86.592 13.5639 86.592 24.6039V35.9999H78.592V12.9999H86.592V15.5399Z" fill="#161A1E"/>
                    <path d="M141.5 36C134.873 36 129.5 30.6274 129.5 24C129.5 17.3726 134.873 12 141.5 12C148.127 12 153.5 17.3726 153.5 24C153.5 30.6274 148.127 36 141.5 36ZM141.5 29.5C144.403 29.5 146.5 26.9028 146.5 24C146.5 21.0972 144.403 18.5 141.5 18.5C138.597 18.5 136.5 21.0972 136.5 24C136.5 26.9028 138.597 29.5 141.5 29.5Z" fill="#161A1E"/>
                    <path d="M157.592 24C157.592 17.8998 161.592 12 167.592 12C169.592 12 170.592 12 172.092 12.5C173.151 12.8531 174.592 14 174.592 14V12.9999H182.592V35.9999H174.592V33.9999C174.592 33.9999 173.172 35.14 172.092 35.5C170.592 36 169.592 36 167.592 36C161.592 35.9999 157.592 30.1002 157.592 24ZM174.592 23.9999C174.592 21.0972 172.495 18.5 169.592 18.5C166.689 18.5 164.592 21.0972 164.592 24C164.592 26.9028 166.689 29.5 169.592 29.5C172.495 29.5 174.592 26.9027 174.592 23.9999Z" fill="#161A1E"/>
                    <path d="M195.592 15.5399C195.592 15.5399 195.592 13.5639 195.592 24.6039V35.9999H187.592V12.9999H195.592V15.5399Z" fill="#161A1E"/>
                    <path d="M226.592 14C226.592 14 225.041 12.8162 224.092 12.5C222.592 12 221.592 12 219.592 12C213.592 12 209.592 17.8998 209.592 24C209.592 30.1002 213.592 35.9999 219.592 35.9999C221.592 35.9999 222.592 35.9999 224.092 35.5C225.172 35.14 226.592 33.9999 226.592 33.9999V35.9999H234.592V0H226.592V14ZM216.592 24C216.592 21.0972 218.689 18.5 221.592 18.5C224.495 18.5 226.592 21.0972 226.592 23.9999C226.592 26.9027 224.495 29.5 221.592 29.5C218.689 29.5 216.592 26.9028 216.592 24Z" fill="#161A1E"/>
                    <path d="M201.592 12.9999C204.792 12.9999 205.592 15.6666 205.592 16.9999C205.592 18.3332 204.792 20.9999 201.592 20.9999C198.392 20.9999 197.592 18.3332 197.592 16.9999C197.592 15.6666 198.392 12.9999 201.592 12.9999Z" fill="#487DFF"/>
                    <path d="M40.592 12.9999C43.792 12.9999 44.592 15.6666 44.592 16.9999C44.592 18.3332 43.792 20.9999 40.592 20.9999C37.392 20.9999 36.592 18.3332 36.592 16.9999C36.592 15.6666 37.392 12.9999 40.592 12.9999Z" fill="#487DFF"/>
                    <path d="M92.592 12.9999C95.792 12.9999 96.592 15.6666 96.592 16.9999C96.592 18.3332 95.792 20.9999 92.592 20.9999C89.392 20.9999 88.592 18.3332 88.592 16.9999C88.592 15.6666 89.392 12.9999 92.592 12.9999Z" fill="#487DFF"/>
                    <path d="M108.592 14C108.592 14 110.032 12.9147 111.092 12.5C112.739 11.856 113.592 12 115.592 12C121.592 12 125.592 17.8998 125.592 24C125.592 30.1002 121.592 35.9999 115.592 35.9999C113.592 35.9999 112.739 36.144 111.092 35.5C110.032 35.0853 108.592 33.9999 108.592 33.9999V35.9999H100.592V0H108.592V14ZM118.592 24C118.592 21.0972 116.495 18.5 113.592 18.5C110.689 18.5 108.592 21.0972 108.592 23.9999C108.592 26.9027 110.689 29.5 113.592 29.5C116.495 29.5 118.592 26.9028 118.592 24Z" fill="#161A1E"/>
                    <path d="M157.592 24C157.592 17.8998 161.592 12 167.592 12C169.592 12 170.592 12 172.092 12.5C173.151 12.8531 174.592 14 174.592 14V12.9999H182.592V35.9999H174.592V33.9999C174.592 33.9999 173.172 35.14 172.092 35.5C170.592 36 169.592 36 167.592 36C161.592 35.9999 157.592 30.1002 157.592 24ZM174.592 23.9999C174.592 21.0972 172.495 18.5 169.592 18.5C166.689 18.5 164.592 21.0972 164.592 24C164.592 26.9028 166.689 29.5 169.592 29.5C172.495 29.5 174.592 26.9027 174.592 23.9999Z" fill="#161A1E"/>
                    <path d="M48.592 24C48.592 17.8998 52.592 12 58.592 12C60.592 12 61.592 12 63.092 12.5C64.1512 12.8531 65.592 14 65.592 14V12.9999H73.592V35.9999H65.592V33.9999C65.592 33.9999 64.1722 35.14 63.092 35.5C61.592 36 60.592 36 58.592 36C52.592 35.9999 48.592 30.1002 48.592 24ZM65.592 23.9999C65.592 21.0972 63.4948 18.5 60.592 18.5C57.6892 18.5 55.592 21.0972 55.592 24C55.592 26.9028 57.6892 29.5 60.592 29.5C63.4948 29.5 65.5921 26.9027 65.592 23.9999Z" fill="#161A1E"/>
                  </svg>
                </div>
                {
                  renderMenuLinks()
                }
              </div>
              <div className="starboard__menu-footer">
                <p>Powered by Starboard</p>
              </div>
            </div>
          )
      }

      {/* Header */}
      <div className="starboard__header">
        
        <div className="starboard__header-burger">
          {
            mdScreen
              ? (
                <Button 
                  onClick={ () => { 
                    setMenuVisible((value) => !value)
                  }}
                >
                  <SvgIcon>
                    <path fill="currentColor" d="M3,6H21V8H3V6M3,11H21V13H3V11M3,16H21V18H3V16Z" />
                  </SvgIcon>
                </Button>
              )
              : <></>
          }
        </div>
        
        {/* Header items */}
        {
          
          <div className="starboard__header-items">
            <div className="starboard__header-item">
              <Button 
                onClick={ ({ currentTarget }) => { 
                  setMessagePanel({ visible: true, anchor: currentTarget }) 
                }}
              >
                <Badge 
                  color='info'
                  variant={
                    xsScreen
                      ? 'dot'
                      : 'standart'
                  }
                  badgeContent={
                    messageNotifications.filter(item => 
                      compareAsc(new Date(item.expires), new Date()) === 1
                    ).length
                  }
                >
                  <SvgIcon>
                    <path fill="currentColor" d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2M20 16H5.2L4 17.2V4H20V16Z" />
                  </SvgIcon>
                </Badge>
            </Button>
            </div>
            <div className="starboard__header-item">
              <Button 
                onClick={ ({ currentTarget }) => { 
                  setNotificationPanel({ visible: true, anchor: currentTarget }) 
                }}
              >
                <Badge 
                  color='info'
                  variant={
                    xsScreen
                      ? 'dot'
                      : 'standart'
                  }
                  badgeContent={
                    userNotifications.filter(item => 
                      compareAsc(new Date(item.expires), new Date()) === 1
                    ).length
                  }
                >
                  <SvgIcon>
                    <path fill="currentColor" d="M10 21H14C14 22.1 13.1 23 12 23S10 22.1 10 21M21 19V20H3V19L5 17V11C5 7.9 7 5.2 10 4.3V4C10 2.9 10.9 2 12 2S14 2.9 14 4V4.3C17 5.2 19 7.9 19 11V17L21 19M17 11C17 8.2 14.8 6 12 6S7 8.2 7 11V18H17V11Z" />
                  </SvgIcon>
                </Badge>
              </Button>
            </div>
            <div className="starboard__header-item starboard__header-profile">
              {
                !xsScreen
                  ? (
                    <Button 
                      disableRipple
                      startIcon={<Avatar/>} 
                      endIcon={
                        <SvgIcon>
                          <path fill="currentColor" d="M7.41,8.58L12,13.17L16.59,8.58L18,10L12,16L6,10L7.41,8.58Z" />
                        </SvgIcon>
                      }
                      onClick={({ currentTarget }) => {
                        setAccountPanel({ visible: true, anchor: currentTarget })
                      }}
                    >
                      {
                        user
                          ? `${user.firstName} ${user.lastName}`
                          : ''
                      }
                    </Button>
                  )
                  : (
                    <Button 
                      disableRipple
                      onClick={({ currentTarget }) => {
                        setAccountPanel({ visible: true, anchor: currentTarget })
                      }}
                    >
                      <SvgIcon>
                        <path fill="currentColor" d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M7.07,18.28C7.5,17.38 10.12,16.5 12,16.5C13.88,16.5 16.5,17.38 16.93,18.28C15.57,19.36 13.86,20 12,20C10.14,20 8.43,19.36 7.07,18.28M18.36,16.83C16.93,15.09 13.46,14.5 12,14.5C10.54,14.5 7.07,15.09 5.64,16.83C4.62,15.5 4,13.82 4,12C4,7.59 7.59,4 12,4C16.41,4 20,7.59 20,12C20,13.82 19.38,15.5 18.36,16.83M12,6C10.06,6 8.5,7.56 8.5,9.5C8.5,11.44 10.06,13 12,13C13.94,13 15.5,11.44 15.5,9.5C15.5,7.56 13.94,6 12,6M12,11A1.5,1.5 0 0,1 10.5,9.5A1.5,1.5 0 0,1 12,8A1.5,1.5 0 0,1 13.5,9.5A1.5,1.5 0 0,1 12,11Z" />
                      </SvgIcon>
                    </Button>
                  )
              }
            </div>
            {
              renderPopoverPanels()
            }
          </div>
        }
        
      </div>

      {/* Content */}
      <div className="starboard__content">
        {
          children
        }
      </div>
    </div>
  )
}