
import { useEffect, useState, useContext } from 'react'

import { useSearchParams, useNavigate } from 'react-router-dom'

import { useHttp } from '../hooks/http.hook'

import { AuthContext } from '../context/AuthContext'
import { SocketContext } from '../context/SocketContext'

import { Button, Checkbox, Typography, Dialog, SvgIcon, Tooltip, TextField, Snackbar, Alert } from '@mui/material'

import AdapterDateFns from '@mui/lab/AdapterDateFns';
import LocalizationProvider from '@mui/lab/LocalizationProvider';
import MobileDatePicker  from '@mui/lab/MobileDatePicker'

import { format, compareAsc, sub } from 'date-fns'

import ruLocale from 'date-fns/locale/ru'

import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';

import './AccountPage.css'

export const AccountPage = () => {

  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const { request, error, clearError } = useHttp()
  const auth = useContext(AuthContext)
  const socket = useContext(SocketContext)

  const theme = useTheme()
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'))

  const [notifications, setNotifications] = useState([])
  const [searchNotifications, setSearchNotifications] = useState([])

  // ? вкладка
  const [statement, setStatement] = useState()

  // ? фильтр уведомлений
  const [filter, setFilter] = useState('all')

  const [dialogInvite, setDialogInvite] = useState({ visible: false, notification: '' })

  const [profile, setProfile] = useState(null)

  const [editMode, setEditMode] = useState(false)

  const [snack, setSnack] = useState({
    text: '', severity: 'warning', visibility: false
  })

  // * получение списка уведомлений
  const listenerGetNotifications = () => {
    request(
      '/api/user/getnotifications',
      'POST',
      {
        userId: auth.userId
      }, 
      {
        Authorization: `Bearer ${auth.token}`
      }
    ).then(data => {
      setNotifications(data)
    })
  }

  // * получение информации о пользователе
  const listenerGetProfile = () => {
    request(
      '/api/user/userinfo',
      'POST',
      {
        userId: auth.userId
      }, 
      {
        Authorization: `Bearer ${auth.token}`
      }
    ).then(data => {
      setProfile({ ...data })
    })
  }

  // * получение списка уведомлений и информации о пользователе при первой загрузке 
  useEffect(() => {
    if (auth.userId) {
      listenerGetProfile()
      listenerGetNotifications()
    }
  }, [])

  // * подключение слушателей сокета
  useEffect(() => {
    socket.socket.on('notification-get', listenerGetNotifications)
    return () => {
      socket.socket.removeListener('notification-get', listenerGetNotifications)
    }
  }, [auth])

  // * работа с поисковой строкой
  useEffect(() => {

    const section = searchParams.get('section')

    // если вкладка указана, выставляем, если нет переадресация на вкладку
    if (section) {

      switch (section) {
        case 'profile':
          setStatement('profile')
          break
        case 'notifications':
          setStatement('notifications')
          break
      
        default:
          return navigate(`/account?section=profile`)
      }

    } else {
      return navigate(`/account?section=profile`)
    }

  }, [searchParams])

  // * вкладка уведомления
  useEffect(() => {

    const section = searchParams.get('section')

    if (section === 'notifications') {
      const filter = searchParams.get('filter') 

      if (filter) {
        switch (filter) {
          case 'all':
            setFilter('all')
            break
          case 'invites':
            setFilter('invites')
            break
          case 'events': 
            setFilter('events')
            break
          case 'messages':
            setFilter('messages')
            break
          default:
            navigate('/account?section=notifications&filter=all')
            break
        }
      } else {
        navigate('/account?section=notifications&filter=all')
      }
    }

  }, [searchParams])

  // * фильтрация уведомлений согласно выбранному фильтру
  useEffect(() => {
    
    let filtered = []

    // получение списка уведомлений согласно выбранному фильтру
    switch (filter) {
      case 'all':
        filtered = notifications
        break
      case 'invites':
        filtered = notifications.filter(item => 
          item.type === 'invite' 
          || item.type === 'invite-director'
        )
        break
      case 'events':
        filtered = notifications.filter(item => 
          item.type === 'event-new' 
          || item.type === 'event-delete' 
          || item.type === 'event-remember'
        )
        break
      case 'messages':
        filtered = notifications.filter(item => item.type === 'message-notification')
        break
      default:
        filtered = []
        break
    }

    const sRows = []

    // добавление к каждому объекту поле 
    filtered.forEach(item => {
      sRows.push({ ...item, checked: false })
    })

    setSearchNotifications(sRows.filter(item => compareAsc(new Date(), new Date(item.creation)) === 1))

  }, [filter, notifications])

  // * Вывод ошибок
  useEffect(() => {
    if (error) {
      setSnack({ text: error, severity: 'error', visibility: true})
    }
    clearError()
  }, [error, clearError]);

  // * нажатие на уведомление
  const handleItemClick = ({ currentTarget }) => {

    if (filter !== 'messages') {
      const id = currentTarget.parentNode.parentNode.getAttribute('data-id')

      const item = notifications.find(item => item._id === id)

      switch (item.type) {
        case 'invite':
        case 'invite-director':
          setDialogInvite({ visible: true, notification: item })
          break
        case 'event-remember': 
          request(
            '/api/user/readnotification',
            'POST',
            {
              id: id
            }, {
              Authorization: `Bearer ${auth.token}`
            }
          ).then(() => {
            listenerGetNotifications()
            if (auth.userMembership === 'client') {
              return navigate(`/client?section=events&date=${new Date(item.creation).toLocaleDateString()}`)
            }
            if (auth.userMembership === 'company') {
              return navigate(`/events`)
            }
          })
          break
        case 'event-delete':
        case 'event-new':
          request(
            '/api/user/readnotification',
            'POST',
            {
              id: id
            }, {
              Authorization: `Bearer ${auth.token}`
            }
          ).then(() => listenerGetNotifications())
          break
      
        default:
          break;
      }
    } else {

      const id = currentTarget.parentNode.parentNode.getAttribute('data-id')

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
        listenerGetNotifications()
        navigate(`/messages?chat=${id}`)
      })
    }
  }

  // * присоединение к компании
  const handleJoinCompany = () => {

    request(
      '/api/user/joincompany', 
      'POST', 
      { 
        notificationId: dialogInvite.notification._id
      }, 
      {
        Authorization: `Bearer ${auth.token}`
      }
    ).then(data => {

      // отправка по сообщения о присоединении пользователя
      if (dialogInvite.notification.type === 'invite') {
        socket.socket.emit('company-join', { id: data.id })
      } else {
        socket.socket.emit('director-join', { id: `/clients/${data.id}` })
      }

      // валидация пользователя
      auth.validateUser()

    })
  }

  // * отметить все записи
  const handleCheckAll = () => {
    
    // если записей нет, выход
    if (searchNotifications.length === 0 || filter === 'messages') {
      return
    }

    let value = !searchNotifications[0].checked

    const rows = [ ...searchNotifications ]

    rows.forEach(item => {
      item.checked = value
    })

    setSearchNotifications(rows)

  }

  // * прочитать выбранные записи
  const handleReadNotifications = () => {
    
    // если записей нет, выход
    if (searchNotifications.length === 0 || filter === 'messages') {
      return
    }

    // список id уведомлений
    const ids = searchNotifications.reduce((prev, item) => {
      if (item.checked) {
        prev.push(item._id)
      }
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

  }

  // * удаленить выбранные записи 
  const handleDeleteNotifications = () => {
    
    // если записей нет, выход
    if (searchNotifications.length === 0 || filter === 'messages') {
      return
    }

    // список id уведомлений
    const ids = searchNotifications.reduce((prev, item) => {
      if (item.checked) {
        prev.push(item._id)
      }
      return prev
    }, [])

    request(
      '/api/user/deletenotifications',
      'POST',
      {
        id: ids
      }, {
        Authorization: `Bearer ${auth.token}`
      }
    ).then(() => {
      listenerGetNotifications()
    })

  }

  // * сохранить 
  const handleSaveProfile = () => {

    if (profile.oldPassword && profile.oldPassword.trim()) {

      if (!profile.newPassword || !profile.newPassword.trim()) {
        return setSnack({ visibility: true, severity: 'warning', text: 'Введите новый пароль' })
      }

      if (profile.newPassword.length < 6) {
        return setSnack({ visibility: true, severity: 'warning', text: 'Пароль должен содержать 6 и более символов' })
      }

    }

    if (profile.newPassword && profile.proofPassword !== profile.newPassword) {
      return setSnack({ visibility: true, severity: 'warning', text: 'Подтвердите пароль' })
    }

    if (!profile.firstName || !profile.firstName.trim()) {
      return setSnack({ visibility: true, severity: 'warning', text: 'Поле Имя обязательно для заполнения' })
    }

    if (!profile.lastName || !profile.lastName.trim()) {
      return setSnack({ visibility: true, severity: 'warning', text: 'Поле Имя обязательно для заполнения' })
    }

    const phoneRegexp = /^(\s*)?(\+)?([- _():=+]?\d[- _():=+]?){10,14}(\s*)?$/
    if (profile.phoneNumber && profile.phoneNumber.trim() && !profile.phoneNumber.match(phoneRegexp)) {
      return setSnack({ visibility: true, severity: 'warning', text: 'Некорректный номер телефона' })
    }
    
    request(
      '/api/user/saveuser',
      'POST',
      {
        userId: auth.userId,
        profile: { ...profile }
      }, 
      {
        Authorization: `Bearer ${auth.token}`
      }
    ).then(data => {
      setEditMode(false)
      listenerGetProfile()
      setSnack({ visibility: true, severity: 'success', text: 'Данные успешно изменены' })
    })

  }

  // * отображение списка уведомлений
  const renderNotificationsList = () => {

    const sRows = []

    if (filter !== 'messages') {

      if (searchNotifications.length === 0) {
        return (
          <div className='account__empty-list'>
            <p>Нет уведомлений</p>
          </div>
        )
      }

      searchNotifications
        .sort((a, b) => compareAsc(new Date(b.creation), new Date(a.creation)))
        .forEach((item, index) => {
          if (item.type !== 'message-notification') {
            sRows.push(
              <div 
                className={
                  item.status === 'active' && compareAsc(new Date(item.expires), new Date()) === 1
                    ? "account__notifications-item account__notifications-item_active"
                    : "account__notifications-item"
                }
                data-id={item._id}
                key={index}
              >
                <div className='account__notifications-item-header'>
                  <div className="account__notifications-item-checkmark">
                    <Checkbox
                      checked={item.checked}
                      data-index={index}
                      onChange={({ target }) => {
                        const rows = searchNotifications.sort((a, b) => compareAsc(new Date(b.creation), new Date(a.creation)))
                        const index = target.parentNode.getAttribute('data-index')
                        rows[index] = { ...rows[index], checked: target.checked }
                        setSearchNotifications([ ...rows ])
                      }}
                    />
                  </div>
                  <Typography 
                    className="account__notifications-item-message" 
                    noWrap
                    onClick={handleItemClick}
                  >
                    {
                      item.type === 'invite' || item.type === 'invite-director'
                        ? item.type === 'invite'
                          ? `Вас пригласили присоединиться к компании ${item.companyName}`
                          : `Вас пригласили на должность ${item.params.post} в компанию ${item.companyName}`
                        : item.type !== 'message-notification'
                          ? item.message
                          : ''
                    }
                  </Typography>
                </div>
                <div className='account__notifications-item-footer'>
                  <Typography className="account__notifications-item-status" noWrap>
                    {
                      item.status === 'active' && compareAsc(new Date(item.expires), new Date()) === 1
                        ? 'активно'
                        : 'неактивно'
                    }
                  </Typography>
                  <Typography className="account__notifications-item-date" noWrap>
                    {
                      format(new Date(item.creation), 'HH:mm dd.MM.yyyy')
                    }
                  </Typography>
                </div>
              </div>
            )
          }
        })

    } else {

      // группировка сообщений по id чата
      const messages = searchNotifications
        .sort((a, b) => compareAsc(new Date(b.creation), new Date(a.creation)))
        .reduce((prev, item) => {
          if (item.params) {
            const chatId = item.params.chatId
            prev[chatId] = prev[chatId] || []
            prev[chatId].push(item)
          }
          return prev
        }, { })

      if (Object.keys(messages).length === 0) {
        return (
          <div className='account__empty-list'>
            <p>Нет уведомлений</p>
          </div>
        )
      }
        
      Object.keys(messages).forEach((item, index) => {
        if (item) {

          // если в списке есть хоть одна активная запись, все они считаются активными
          const status = 
            messages[item].find(item => 
              item.status === 'active' && compareAsc(new Date(item.expires), new Date()) === 1
            )
              ? 'active'
              : 'done'
          
          // дата последнего сообщения
          const lastDate = messages[item].sort((a, b) => compareAsc(new Date(a.creation), new Date(b.creation)))[messages[item].length - 1].creation

          sRows.push(
            <div 
              className={
                status === 'active'
                  ? "account__notifications-item account__notifications-item_active"
                  : "account__notifications-item"
              }
              data-id={item}
              key={index}
            >
              <div className='account__notifications-item-header'>
                <div></div>
                <Typography 
                  className="account__notifications-item-message" 
                  noWrap
                  onClick={handleItemClick}
                >
                  {
                    `В чате ${messages[item][0].companyName} есть новые сообщения (${messages[item].length})`
                  }
                </Typography>
              </div>
              <div className='account__notifications-item-footer'>
                <Typography className="account__notifications-item-status" noWrap>
                  {
                    status === 'active'
                      ? 'активно'
                      : 'неактивно'
                  }
                </Typography>
                <Typography className="account__notifications-item-date" noWrap>
                  {
                    format(new Date(lastDate), 'HH:mm dd.MM.yyyy')
                  }
                </Typography>
              </div>
            </div>
          )
        }
      })
    }

    return sRows
  }

  // * отображение страницы Уведомления
  const renderNotifications = () => {

    return (
      <div className="account__wrapper-notifications">
  
        {/* Header */}
        <div className="account__notifications-header">

          <div className="account__notifications-header-filters">
            <Button
              disableRipple
              className={
                filter === 'all' 
                  ? 'account__notifications-header-filter account__notifications-header-filter_active'
                  : 'account__notifications-header-filter'
              }
              onClick={() => {
                navigate('/account?section=notifications&filter=all')
              }}
            >
              Все
            </Button>
            <Button
              disableRipple
              className={
                filter === 'invites' 
                  ? 'account__notifications-header-filter account__notifications-header-filter_active'
                  : 'account__notifications-header-filter'
              }
              onClick={() => {
                navigate('/account?section=notifications&filter=invites')
              }}
            >
              Приглашения
            </Button>
            <Button
              disableRipple
              className={
                filter === 'events' 
                  ? 'account__notifications-header-filter account__notifications-header-filter_active'
                  : 'account__notifications-header-filter'
              }
              onClick={() => {
                navigate('/account?section=notifications&filter=events')
              }}
            >
              События
            </Button>
            <Button
              disableRipple
              className={
                filter === 'messages' 
                  ? 'account__notifications-header-filter account__notifications-header-filter_active'
                  : 'account__notifications-header-filter'
              }
              onClick={() => {
                navigate('/account?section=notifications&filter=messages')
              }}
            >
              Сообщения
            </Button>
          </div>

          <div className="account__notifications-header-controls">
            <Button
              disableRipple
              className='company__users-btn'
              onClick={handleCheckAll}
            >
              <Tooltip title='Отметить все'>
                <SvgIcon>
                  <path fill="currentColor" d="M20,16V10H22V16A2,2 0 0,1 20,18H8C6.89,18 6,17.1 6,16V4C6,2.89 6.89,2 8,2H16V4H8V16H20M10.91,7.08L14,10.17L20.59,3.58L22,5L14,13L9.5,8.5L10.91,7.08M16,20V22H4A2,2 0 0,1 2,20V7H4V20H16Z" />
                </SvgIcon>
              </Tooltip>
            </Button>
            <Button
              disableRipple
              className='company__users-btn'
              onClick={handleReadNotifications}
            >
              <Tooltip title='Пометить как прочитанные'>
                <SvgIcon>
                  <path fill="currentColor" d="M19 1L14 6V17L19 12.5V1M21 5V18.5C19.9 18.15 18.7 18 17.5 18C15.8 18 13.35 18.65 12 19.5V6C10.55 4.9 8.45 4.5 6.5 4.5C4.55 4.5 2.45 4.9 1 6V20.65C1 20.9 1.25 21.15 1.5 21.15C1.6 21.15 1.65 21.1 1.75 21.1C3.1 20.45 5.05 20 6.5 20C8.45 20 10.55 20.4 12 21.5C13.35 20.65 15.8 20 17.5 20C19.15 20 20.85 20.3 22.25 21.05C22.35 21.1 22.4 21.1 22.5 21.1C22.75 21.1 23 20.85 23 20.6V6C22.4 5.55 21.75 5.25 21 5M10 18.41C8.75 18.09 7.5 18 6.5 18C5.44 18 4.18 18.19 3 18.5V7.13C3.91 6.73 5.14 6.5 6.5 6.5C7.86 6.5 9.09 6.73 10 7.13V18.41Z" />
                </SvgIcon>
              </Tooltip>
            </Button>
            <Button
              disableRipple
              className='company__users-btn'
              onClick={handleDeleteNotifications}
            >
              <Tooltip title='Удалить уведомление'>
                <SvgIcon>
                  <path fill="currentColor" d="M9,3V4H4V6H5V19A2,2 0 0,0 7,21H17A2,2 0 0,0 19,19V6H20V4H15V3H9M7,6H17V19H7V6M9,8V17H11V8H9M13,8V17H15V8H13Z" />
                </SvgIcon>
              </Tooltip>
            </Button>
          </div>

        </div>

        <div className="account__notifications-list">
          {
            renderNotificationsList()
          }
        </div>

      </div>
    )

  }

  // * отображение сведений об учетной записи
  const renderAccountSettings = () => {
    
    if (!profile) {
      return (<div></div>)
    }

    return (
      <div className="account__wrapper-profile">
        <div className="account__profile-form">
          {
            editMode
              ? (
                <>
                <div className="account__profile-header">
                    <div className="account__profile-item">
                      <p className="account__profile-label">
                        Текущий пароль
                      </p>
                      <TextField 
                        fullWidth
                        type='password'
                        className="account__profile-input" 
                        onChange={({ currentTarget: { value } }) => {
                          setProfile({ ...profile, oldPassword: value })
                        }}
                      />
                    </div>
                    <div className='account__profile-subitem'>
                      <div className="account__profile-item">
                        <p className="account__profile-label">
                          Новый пароль
                        </p>
                        <TextField 
                          fullWidth
                          type='password'
                          className="account__profile-input" 
                          onChange={({ currentTarget: { value } }) => {
                            setProfile({ ...profile, newPassword: value })
                          }}
                        />
                      </div>
                      <div className="account__profile-item">
                        <p className="account__profile-label">
                          Подтверждение пароля
                        </p>
                        <TextField 
                          fullWidth
                          type='password'
                          className="account__profile-input" 
                          onChange={({ currentTarget: { value } }) => {
                            setProfile({ ...profile, proofPassword: value })
                          }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="account__profile-divider" />
                  <div className="account__profile-footer">
                    <div className="account__profile-item">
                      <p className="account__profile-label">
                        Имя
                      </p>
                      <TextField 
                        fullWidth
                        className="account__profile-input" 
                        value={profile.firstName}
                        onChange={({ currentTarget: { value } }) => {
                          setProfile({ ...profile, firstName: value })
                        }}
                      />
                    </div>
                    <div className="account__profile-item">
                      <p className="account__profile-label">
                        Фамилия
                      </p>
                      <TextField 
                        fullWidth
                        className="account__profile-input" 
                        value={profile.lastName}
                        onChange={({ currentTarget: { value } }) => {
                          setProfile({ ...profile, lastName: value })
                        }}
                      />
                    </div>
                    <div className="account__profile-item">
                      <p className="account__profile-label">
                        Дата рождения
                      </p>
                      <LocalizationProvider dateAdapter={AdapterDateFns} locale={ruLocale}>
                        <MobileDatePicker
                          clearable
                          minDate={new Date('01-01-1900')}
                          maxDate={sub(new Date(), { years: 18 })}
                          value={ profile.birthDate ? new Date(profile.birthDate) : null}
                          onChange={(value) => setProfile({ ...profile, birthDate: value })}
                          renderInput={
                            (params) => 
                              <TextField 
                                {...params} 
                                fullWidth 
                                className='account__profile-input' 
                              />
                          }
                        />
                      </LocalizationProvider>
                    </div>
                    <div className="account__profile-item">
                      <p className="account__profile-label">
                        Телефон
                      </p>
                      <TextField 
                        fullWidth
                        className="account__profile-input" 
                        value={profile.phoneNumber}
                        onChange={({ currentTarget: { value } }) => {
                          setProfile({ ...profile, phoneNumber: value })
                        }}
                      />
                    </div>
                  </div>
                </>
              )
              : (
                <>
                  <div className="account__profile-header">
                    <div className="account__profile-item">
                      <p className="account__profile-label">
                        Email
                      </p>
                      <p className="account__profile-value">
                        {
                          profile.email
                        }
                      </p>
                    </div>
                  </div>
                  <div className="account__profile-divider" />
                  <div className="account__profile-footer">
                    <div className="account__profile-item">
                      <p className="account__profile-label">
                        Имя
                      </p>
                      <p className="account__profile-value">
                        {
                          profile.firstName
                        }
                      </p>
                    </div>
                    <div className="account__profile-item">
                      <p className="account__profile-label">
                        Фамилия
                      </p>
                      <p className="account__profile-value">
                        {
                          profile.lastName
                        }
                      </p>
                    </div>
                    <div className="account__profile-item">
                      <p className="account__profile-label">
                        Дата рождения
                      </p>
                      <p className="account__profile-value">
                        {
                          profile.birthDate
                            ? new Date(profile.birthDate).toLocaleDateString()
                            : 'Не указана'
                        }
                      </p>
                    </div>
                    <div className="account__profile-item">
                      <p className="account__profile-label">
                        Телефон
                      </p>
                      <p className="account__profile-value">
                        {
                          profile.phoneNumber
                            ? profile.phoneNumber
                            : 'Не указан'
                        }
                      </p>
                    </div>
                  </div>
                </>
              )
          }
          {/* <div className="account__profile-item">
            <p className="account__profile-label">
              Email
            </p>
            <TextField
              fullWidth
              type='email'
              className='account__profile-input'
            />
          </div>
          {
            editMode
              ? (
                <div className="account__profile-item">
                  <p className="account__profile-label">
                    Предыдущий пароль
                  </p>
                  <TextField
                    fullWidth
                    type='password'
                    className='account__profile-input'
                  />
                </div>
              )
              : <></>
          }
          <div className="account__profile-item">
            <p className="account__profile-label">
              Пароль
            </p>
            <TextField
              fullWidth
              type='password'
              className='account__profile-input'
            />
          </div>
          <div className="account__profile-divider" />
          <div className="account__profile-item">
            <p className="account__profile-label">
              Имя
            </p>
            <TextField
              fullWidth
              className='account__profile-input'
            />
          </div>
          <div className="account__profile-item">
            <p className="account__profile-label">
              Фамилия
            </p>
            <TextField
              fullWidth
              className='account__profile-input'
            />
          </div>
          <div className="account__profile-item">
            <p className="account__profile-label">
              Дата рождения
            </p>
            <TextField
              fullWidth
              className='account__profile-input'
            />
          </div>
          <div className="account__profile-item">
            <p className="account__profile-label">
              Телефон
            </p>
            <TextField
              fullWidth
              className='account__profile-input'
            />
          </div> */}
        </div>

        <div className="account__profile-actions">
        {
          editMode
            ? (
              <>
                <Button
                  disableRipple
                  className='account__profile-btn'
                  onClick={() => { setEditMode(false) }}
                > 
                  Отменить
                </Button>
                <Button
                  disableRipple
                  className='account__profile-btn account__profile-btn_contained'
                  onClick={handleSaveProfile}
                > 
                  Сохранить
                </Button>
              </>
            )
            : (
              <Button
                disableRipple
                className='account__profile-btn account__profile-btn_contained'
                onClick={() => { setEditMode(true) }}
              > 
                Изменить
              </Button>
            )
        }
          
        </div>
      </div>
    )
    
  }

  const renderComponent = () => {
    switch (statement) {
      case 'profile':
        return renderAccountSettings()
      case 'notifications':
        return renderNotifications()
      
      default:
        return <div>404</div>
    }
  }

  const renderDialogs = () => {

    return (
      <>
        {/* приглашение в компанию */}
        <Dialog
          className="customer__dialog"
          fullScreen={fullScreen}
          open={dialogInvite.visible}
          onClose={ () => { setDialogInvite({ visible: false, notification: '' }) } }
        >
          {/* Title */}
          <div className="customer__dialog-title">
            <p>Приглашение</p>
            <div className="customer__dialog-controls">
              <Button 
                className='company__users-btn' 
                disableRipple 
                onClick={ () => { setDialogInvite({ visible: false, notification: '' }) } }
              >
                <SvgIcon>
                  <path fill="currentColor" d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
                </SvgIcon>
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="customer__dialog-content">
            <div className="customer__dialog-items">
              <div className="customer__dialog-item">
                <p className="customer__dialog-label">
                  Вас пригласили присоединиться к компании
                </p>
              </div>
              <div className="customer__dialog-item">
                <div className="customer__dialog-label">
                  Компания
                </div>
                <p className="customer__dialog-value">
                  {
                    dialogInvite.notification.companyName
                  }
                </p>
              </div>
              {
                dialogInvite.notification.type === 'invite-director' 
                  ? (
                    <div className="customer__dialog-item">
                      <div className="customer__dialog-label">
                        Должность
                      </div>
                      <p className="customer__dialog-value">
                        {
                          dialogInvite.notification.params.post
                        }
                      </p>
                    </div>
                  )
                  : <></>
              }
              <div className="customer__dialog-item">
                <div className="customer__dialog-label">
                  Сообщение
                </div>
                <div className="customer__dialog-value">
                  {
                    dialogInvite.notification.message
                  }
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          {
            dialogInvite.notification.status === 'active' 
            && compareAsc(new Date(dialogInvite.notification.expires), new Date()) === 1
              ? (
                <div className="customer__dialog-controls">
                  <Button 
                    className='customer__dialog-btn customer__dialog-btn_cancel' 
                    onClick={ () => { setDialogInvite({ visible: false, notification: '' }) } } 
                    autoFocus
                  >
                    Пометить как прочитанное
                  </Button>
                  <Button 
                    className='customer__dialog-btn' 
                    onClick={handleJoinCompany}
                  >
                    Присоединиться
                  </Button>
                </div>
              )
              : <></>
          }
          
        </Dialog>
      </>
    )
    
  }

  return (
    <div className="account">

      {/* Nav */}
      <div className="account__nav">
        <div className="account__nav-controls">
          <Button
            disableRipple
            className={
              statement === 'profile'
                ? 'account__nav-btn account__nav-btn_active'
                : 'account__nav-btn'
            }
            onClick={() => {
              navigate('/account?section=profile')
            }}
          >
            Профиль
          </Button>
          <Button
            disableRipple
            className={
              statement === 'notifications'
                ? 'account__nav-btn account__nav-btn_active'
                : 'account__nav-btn'
            }
            onClick={() => {
              navigate('/account?section=notifications')
            }}
          >
            Уведомления
          </Button>
        </div>
      </div>
      
      {/* Content */}
      <div className='account__content'>
        {
          renderComponent()
        }
      </div>
      
      {/* Dialogs */}
      {
        renderDialogs()
      }

      {/* Snacks */}
      <Snackbar open={snack.visibility} autoHideDuration={3000} onClose={ () => { setSnack({ ...snack, visibility: false }) } }>
        <Alert severity={snack.severity} variant='filled' onClose={ () => { setSnack({ ...snack, visibility: false }) } }>
          {snack.text}
        </Alert>
      </Snackbar>

    </div>
  )
}