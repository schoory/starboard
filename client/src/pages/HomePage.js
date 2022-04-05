
import { useContext, useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

import { Typography, InputAdornment, Tooltip, SvgIcon, CircularProgress, Button, Dialog, DialogContent, DialogActions, TextField, Snackbar, Alert } from '@mui/material'
import { AuthContext } from '../context/AuthContext'
import { CompanyContext } from '../context/CompanyContext'
import { SocketContext } from '../context/SocketContext'
import { useHttp } from '../hooks/http.hook';

import useMediaQuery from '@mui/material/useMediaQuery';

import './HomePage.css'

export const HomePage = () => {
  const { loading, request, error, clearError } = useHttp()

  const navigate = useNavigate()

  const company = useContext(CompanyContext)  
  const auth = useContext(AuthContext)          
  const socket = useContext(SocketContext)

  // ? Маркер загрузки страницы
  const [pageLoading, setPageLoading] = useState(true)

  // ? Диалоговые окна
  const [dialogDeleteUser, setDialogDeleteUser] = useState({ visible: false, id: '' })
  const [dialogNewUser, setDialogNewUser] = useState({ visible: false, email: '', message: '' })

  // ? Информация о сотрудниках компании
  const [companyUsers, setCompanyUsers] = useState([])
  const [allUsers, setAllUsers] = useState([])

  // ? Информация о приглашениях компании
  const [invites, setInvites] = useState([])
  const [allInvites, setAllInvites] = useState([])

  // ? Поля с информацией о компании
  const [fields, setFields] = useState({
    companyAddress: { disabled: true, ref: useRef(null), text: company.companyAddress }, 
    companyEmail: { disabled: true, ref: useRef(null), text: company.companyEmail }, 
    companyPhone: { disabled: true, ref: useRef(null), text: company.companyPhone }, 
    companyWeb: { disabled: true, ref: useRef(null), text: company.companyWeb }
  })

  const mdScreen = useMediaQuery('(max-width: 1024px)')

  const [snack, setSnack] = useState({
    text: '', severity: 'warning', visibility: false
  })
  
  // * Получение сведений о пользователях 
  // ? список id пользователей 
  const getUsersInfo = (users) => {
    request('/api/user/userslist', 'POST', { usersList: users }, {
      'Authorization': `Bearer ${auth.token}`
    }).then(data => {
      setCompanyUsers(data.users)
      setAllUsers(data.users)
    })
  }

  // * Обновление информации о компании
  const handleGetCompanyInfo = () => {
    company.getCompanyInfo(auth.token, auth.userId).then(data => {
      getUsersInfo(data)
    })
  }

  // * Получение сведений о приглашениях
  const handleGetInvites = () => {
    request('/api/company/getinvites', 'POST', { companyId: company.companyId }, {
      Authorization: `Bearer ${auth.token}`
    }).then(data => {
      setInvites(data.invites)
      setAllInvites(data.invites)
    })
  }

  // * Подключение слушателей сокета
  useEffect(() => {
    socket.socket.on('company-update', handleGetCompanyInfo)
    socket.socket.on('invites-update', handleGetInvites)
    if (company.companyId) {
      socket.socket.emit('join-room', company.companyId)
    }
    return () => {
      socket.socket.removeListener('company-update', handleGetCompanyInfo)
      socket.socket.removeListener('invites-update', handleGetInvites)
    }
  }, [company])

  // * Получение сведений о пользователях
  useEffect(() => {
    if (company.companyId) {
      if (pageLoading) {
        setPageLoading(false)
      }
      if (fields.companyAddress.ref.current) {
        const nodes = fields.companyAddress.ref.current.childNodes[0].childNodes
        const input = Array.from(nodes).find(node => node.name === 'companyAddress')
        input.style.width = ((input.value.length + 1) * 8) + 'px';
      }
      if (fields.companyEmail.ref.current) {
        const nodes = fields.companyEmail.ref.current.childNodes[0].childNodes
        const input = Array.from(nodes).find(node => node.name === 'companyEmail')
        input.style.width = ((input.value.length + 1) * 8.5) + 'px';
      }
      if (fields.companyPhone.ref.current) {
        const nodes = fields.companyPhone.ref.current.childNodes[0].childNodes
        const input = Array.from(nodes).find(node => node.name === 'companyPhone')
        input.style.width = ((input.value.length + 1) * 8.5) + 'px';
      }
      if (fields.companyWeb.ref.current) {
        const nodes = fields.companyWeb.ref.current.childNodes[0].childNodes
        const input = Array.from(nodes).find(node => node.name === 'companyWeb')
        input.style.width = ((input.value.length + 1) * 8.5) + 'px';
      }
      setFields({
        companyAddress: { ...fields.companyAddress, disabled: true, text: company.companyAddress },
        companyEmail: { ...fields.companyEmail, disabled: true, text: company.companyEmail },
        companyPhone: { ...fields.companyPhone, disabled: true, text: company.companyPhone },
        companyWeb: { ...fields.companyWeb, disabled: true, text: company.companyWeb }
      })
    }
    if (invites && invites.length === 0) {
      handleGetInvites()
    }
    if (companyUsers && companyUsers.length === 0) {
      getUsersInfo(company.users)
    }
  }, [company])

  // * Вывод ошибок
  useEffect(() => {
    if (error) {
      setSnack({ text: error, severity: 'error', visibility: true})
    }
    clearError()
  }, [error, clearError]);

  // * Редирект на сайт google maps
  const handleViewMap = () => {
    const address = company.companyAddress
    if (address) {
      let win = window.open(`https://www.google.ru/maps/search/${address.replace(/ /g, '+')}`)
      win.focus()
    }
  }
  
  // * Удаление пользователя
  const handleDeleteUser = () => {
    const userId = dialogDeleteUser.id
    setDialogDeleteUser({ visible: false, id: '' })
    request('/api/user/deletefromcompany', 'POST', { userId: userId, companyId: company.companyId, senderId: auth.userId }, {
      'Authorization': `Bearer ${auth.token}`
    }).then(data => {
      handleGetCompanyInfo()
      socket.socket.emit('company-changed', { id: company.companyId })
      setSnack({
        text: data.msg, severity: 'success', visibility: true
      })
    })
  }
  
  // * Приглашение пользователя
  const handleInviteUser = () => {
    request('/api/company/inviteuser', 'POST', { email: dialogNewUser.email, companyId: company.companyId, companyName: company.companyName, message: dialogNewUser.message }, {
      'Authorization': `Bearer ${auth.token}`
    }).then(data => {
      socket.socket.emit('notification-push')
      setDialogNewUser({ visible: false, email: '', message: '' })
    })
  }
  
  // * Отправка запроса на сервер о назначении администратором пользователя
  // ? id пользователя
  const handleAssignAdmin = (id) => {
    request('/api/user/assignasadmin', 'POST', { userId: id, companyId: company.companyId, senderId: auth.userId }, {
      'Authorization': `Bearer ${auth.token}`
    }).then(data => {
      handleGetCompanyInfo()
      socket.socket.emit('company-changed', { id: company.companyId })
      setSnack({ visibility: true, severity: 'success', text: data.msg })
    })
  }

  // * Удаление администратора
  // ? id пользователя
  const handleDemoteAdmin = (id) => {
    request('/api/user/demoteadmin', 'POST', { userId: id, companyId: company.companyId, senderId: auth.userId }, {
      'Authorization': `Bearer ${auth.token}`
    }).then(data => {
      handleGetCompanyInfo()
      socket.socket.emit('company-changed', { id: company.companyId })
      setSnack({ text: data.msg, severity: 'success', visibility: true })
    })
  }

  // * Показывать только администраторов в списке пользователей
  const handleOnlyAdmins = ({ currentTarget }) => {
    const state = currentTarget.getAttribute('data-active') === 'true'
    if (state) {
      setCompanyUsers(allUsers)
      currentTarget.setAttribute('data-active', !state)
    } else {
      setCompanyUsers(allUsers.filter(user => company.admins.includes(user._id)))
      currentTarget.setAttribute('data-active', !state)
    }
  }

  // * Поиск пользователей
  const handleSearchUsers = ({ currentTarget }) => {
    const value = currentTarget.value.toLowerCase()
    if (!value) {
      setCompanyUsers(allUsers)
    }
    setCompanyUsers(allUsers.filter(user => 
      `${user.firstName} ${user.lastName}`.toLowerCase().indexOf(value) !== -1 || user.email.toLowerCase().indexOf(value) !== -1 || user.phoneNumber.indexOf(value) !== -1
    ))
  }

  // * Переключение режима изменения
  const handleAwailableToEdit = ({ currentTarget }) => {
    const parent = currentTarget.parentNode.parentNode
    const input = Array.from(parent.childNodes).find(node => node.name)
    const name = input.name
    const field = fields[name]
    if (!field.disabled) {
      request('/api/company/changeinfo', 'POST', { companyId: company.companyId, field: { name: name, value: field.text } }, {
        Authorization: `Bearer ${auth.token}`
      }).then(data => {
        handleGetCompanyInfo()
        socket.socket.emit('company-changed', { id: company.companyId })
        setSnack({ visibility: true, severity: 'success', text: data.msg })
      })
    }
    setFields({ ...fields, [name]: { disabled: !field.disabled, ref: field.ref, text: field.text } })
  }

  // * удаление приглашения
  const handleDeleteInvite = ({ currentTarget: { parentNode } }) => {
    const id = parentNode.getAttribute('data-id')
    request('/api/company/deleteinvite', 'POST', { id: id }, {
      Authorization: `Bearer ${auth.token}`
    }).then(data => {
      handleGetInvites()
      socket.socket.emit('invites-changed', { id: company.companyId })
      setSnack({ text: data.msg, severity: 'success', visibility: true })
    })
  }

  // * поиск приглашений
  const handleSearchInvites = ({ currentTarget }) => {
    const value = currentTarget.value.toLowerCase()
    if (!value) {
      setInvites(allInvites)
    }
    setInvites(allInvites.filter(invite => 
      invite.to ? 
        invite.to.toLowerCase().indexOf(value) !== -1 :
        'не указано'.indexOf(value) !== -1
    ))
  }

  // * отображение загрузки
  const renderLoadingScreen = () => {
    return (
      <div className="company__loading">
        <CircularProgress />
      </div>
    )
  }

  return (
    <div className="company">
      <div className="company__nav">
        <h2 className="company__nav-title">Компания</h2>
      </div>
      <div className="company__content">
        <div className="cards">
          <div className="cards__card cards__card_users">
            <div className="cards__card-icon">
              <SvgIcon>
                <path fill="currentColor" d="M12,5A3.5,3.5 0 0,0 8.5,8.5A3.5,3.5 0 0,0 12,12A3.5,3.5 0 0,0 15.5,8.5A3.5,3.5 0 0,0 12,5M12,7A1.5,1.5 0 0,1 13.5,8.5A1.5,1.5 0 0,1 12,10A1.5,1.5 0 0,1 10.5,8.5A1.5,1.5 0 0,1 12,7M5.5,8A2.5,2.5 0 0,0 3,10.5C3,11.44 3.53,12.25 4.29,12.68C4.65,12.88 5.06,13 5.5,13C5.94,13 6.35,12.88 6.71,12.68C7.08,12.47 7.39,12.17 7.62,11.81C6.89,10.86 6.5,9.7 6.5,8.5C6.5,8.41 6.5,8.31 6.5,8.22C6.2,8.08 5.86,8 5.5,8M18.5,8C18.14,8 17.8,8.08 17.5,8.22C17.5,8.31 17.5,8.41 17.5,8.5C17.5,9.7 17.11,10.86 16.38,11.81C16.5,12 16.63,12.15 16.78,12.3C16.94,12.45 17.1,12.58 17.29,12.68C17.65,12.88 18.06,13 18.5,13C18.94,13 19.35,12.88 19.71,12.68C20.47,12.25 21,11.44 21,10.5A2.5,2.5 0 0,0 18.5,8M12,14C9.66,14 5,15.17 5,17.5V19H19V17.5C19,15.17 14.34,14 12,14M4.71,14.55C2.78,14.78 0,15.76 0,17.5V19H3V17.07C3,16.06 3.69,15.22 4.71,14.55M19.29,14.55C20.31,15.22 21,16.06 21,17.07V19H24V17.5C24,15.76 21.22,14.78 19.29,14.55M12,16C13.53,16 15.24,16.5 16.23,17H7.77C8.76,16.5 10.47,16 12,16Z" />
              </SvgIcon>
            </div>
            <h3>{ company.usersCount }</h3>
            <p>Сотрудники</p>
          </div>
          <div className="cards__card cards__card_clickable cards__card_clients" onClick={ () => { navigate('/clients') } }>
            <div className="cards__card-icon">
              <SvgIcon>
              <path fill="currentColor" d="M13.07 10.41A5 5 0 0 0 13.07 4.59A3.39 3.39 0 0 1 15 4A3.5 3.5 0 0 1 15 11A3.39 3.39 0 0 1 13.07 10.41M5.5 7.5A3.5 3.5 0 1 1 9 11A3.5 3.5 0 0 1 5.5 7.5M7.5 7.5A1.5 1.5 0 1 0 9 6A1.5 1.5 0 0 0 7.5 7.5M16 17V19H2V17S2 13 9 13 16 17 16 17M14 17C13.86 16.22 12.67 15 9 15S4.07 16.31 4 17M15.95 13A5.32 5.32 0 0 1 18 17V19H22V17S22 13.37 15.94 13Z" />
              </SvgIcon>
            </div>
            <h3>{ company.clientsCount }</h3>
            <p>Клиенты</p>
          </div>
        </div>

        <div className="company__main">
          <div className="company__title">
            <h2>{company.companyName}</h2>
          </div>
          <div className="company__wrapper">
            <div className="company__data">
              <div className="company__item">
                <h5 className="company__label">Адрес компании</h5>
                <TextField
                  className="company__field"
                  name='companyAddress'
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        {
                          company.owner === auth.userId ?
                          <Button className='company__users-btn' onClick={handleAwailableToEdit}>
                            <SvgIcon>
                              {
                                fields.companyAddress.disabled ?
                                  <path fill="currentColor" d="M14.06,9L15,9.94L5.92,19H5V18.08L14.06,9M17.66,3C17.41,3 17.15,3.1 16.96,3.29L15.13,5.12L18.88,8.87L20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18.17,3.09 17.92,3 17.66,3M14.06,6.19L3,17.25V21H6.75L17.81,9.94L14.06,6.19Z" /> :
                                  <path fill="currentColor" d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z" />
                              }
                            </SvgIcon>
                          </Button> : <></>
                        }
                        {
                          company.companyAddress ? 
                            <Button className='company__users-btn' disableRipple onClick={handleViewMap}>
                              <SvgIcon>
                                <path fill="currentColor" d="M18.27 6C19.28 8.17 19.05 10.73 17.94 12.81C17 14.5 15.65 15.93 14.5 17.5C14 18.2 13.5 18.95 13.13 19.76C13 20.03 12.91 20.31 12.81 20.59C12.71 20.87 12.62 21.15 12.53 21.43C12.44 21.69 12.33 22 12 22H12C11.61 22 11.5 21.56 11.42 21.26C11.18 20.53 10.94 19.83 10.57 19.16C10.15 18.37 9.62 17.64 9.08 16.93L18.27 6M9.12 8.42L5.82 12.34C6.43 13.63 7.34 14.73 8.21 15.83C8.42 16.08 8.63 16.34 8.83 16.61L13 11.67L12.96 11.68C11.5 12.18 9.88 11.44 9.3 10C9.22 9.83 9.16 9.63 9.12 9.43C9.07 9.06 9.06 8.79 9.12 8.43L9.12 8.42M6.58 4.62L6.57 4.63C4.95 6.68 4.67 9.53 5.64 11.94L9.63 7.2L9.58 7.15L6.58 4.62M14.22 2.36L11 6.17L11.04 6.16C12.38 5.7 13.88 6.28 14.56 7.5C14.71 7.78 14.83 8.08 14.87 8.38C14.93 8.76 14.95 9.03 14.88 9.4L14.88 9.41L18.08 5.61C17.24 4.09 15.87 2.93 14.23 2.37L14.22 2.36M9.89 6.89L13.8 2.24L13.76 2.23C13.18 2.08 12.59 2 12 2C10.03 2 8.17 2.85 6.85 4.31L6.83 4.32L9.89 6.89Z" />
                              </SvgIcon>
                            </Button> :
                            <></>
                        }
                      </InputAdornment>
                    ),
                  }}
                  value={fields.companyAddress.text ? fields.companyAddress.text : 'Нет информации'} 
                  disabled={fields.companyAddress.disabled}
                  ref={fields.companyAddress.ref}
                  onChange={( ({ currentTarget: { value, name } }) => { setFields({ ...fields, [name]: { disabled: fields[name].disabled, ref: fields[name].ref, text: value } }) } )}
                />
                
              </div>
              <div className="company__item">
                <h5 className="company__label">Email</h5>
                <TextField
                  className="company__field"
                  name='companyEmail'
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        {
                          company.owner === auth.userId ?
                          <Button className='company__users-btn' onClick={handleAwailableToEdit}>
                            <SvgIcon>
                              {
                                fields.companyEmail.disabled ?
                                  <path fill="currentColor" d="M14.06,9L15,9.94L5.92,19H5V18.08L14.06,9M17.66,3C17.41,3 17.15,3.1 16.96,3.29L15.13,5.12L18.88,8.87L20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18.17,3.09 17.92,3 17.66,3M14.06,6.19L3,17.25V21H6.75L17.81,9.94L14.06,6.19Z" /> :
                                  <path fill="currentColor" d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z" />
                              }
                            </SvgIcon>
                          </Button> : <></>
                        }
                      </InputAdornment>
                    ),
                  }}
                  value={fields.companyEmail.text ? fields.companyEmail.text : 'Нет информации'} 
                  disabled={fields.companyEmail.disabled}
                  ref={fields.companyEmail.ref}
                  onChange={( ({ currentTarget: { value, name } }) => { setFields({ ...fields, [name]: { disabled: fields[name].disabled, ref: fields[name].ref, text: value } }) } )}
                />
              </div>
              <div className="company__item">
                <h5 className="company__label">Телефон</h5>
                <TextField
                  className="company__field"
                  name='companyPhone'
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        {
                          company.owner === auth.userId ?
                          <Button className='company__users-btn' onClick={handleAwailableToEdit}>
                            <SvgIcon>
                              {
                                fields.companyPhone.disabled ?
                                  <path fill="currentColor" d="M14.06,9L15,9.94L5.92,19H5V18.08L14.06,9M17.66,3C17.41,3 17.15,3.1 16.96,3.29L15.13,5.12L18.88,8.87L20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18.17,3.09 17.92,3 17.66,3M14.06,6.19L3,17.25V21H6.75L17.81,9.94L14.06,6.19Z" /> :
                                  <path fill="currentColor" d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z" />
                              }
                            </SvgIcon>
                          </Button> : <></>
                        }
                      </InputAdornment>
                    ),
                  }}
                  value={fields.companyPhone.text ? fields.companyPhone.text : 'Нет информации'} 
                  disabled={fields.companyPhone.disabled}
                  ref={fields.companyPhone.ref}
                  onChange={( ({ currentTarget: { value, name } }) => { setFields({ ...fields, [name]: { disabled: fields[name].disabled, ref: fields[name].ref, text: value } }) } )}
                />
              </div>
              <div className="company__item">
                <h5 className="company__label">Сайт</h5>
                <TextField
                  className="company__field"
                  name='companyWeb'
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                       {
                          company.owner === auth.userId ?
                          <Button className='company__users-btn' onClick={handleAwailableToEdit}>
                            <SvgIcon>
                              {
                                fields.companyWeb.disabled ?
                                  <path fill="currentColor" d="M14.06,9L15,9.94L5.92,19H5V18.08L14.06,9M17.66,3C17.41,3 17.15,3.1 16.96,3.29L15.13,5.12L18.88,8.87L20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18.17,3.09 17.92,3 17.66,3M14.06,6.19L3,17.25V21H6.75L17.81,9.94L14.06,6.19Z" /> :
                                  <path fill="currentColor" d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z" />
                              }
                            </SvgIcon>
                          </Button> : <></>
                        }
                      </InputAdornment>
                    ),
                  }}
                  value={fields.companyWeb.text ? fields.companyWeb.text : 'Нет информации'} 
                  disabled={fields.companyWeb.disabled}
                  ref={fields.companyWeb.ref}
                  onChange={( ({ currentTarget: { value, name } }) => { setFields({ ...fields, [name]: { disabled: fields[name].disabled, ref: fields[name].ref, text: value } }) } )}
                />
              </div>
            </div>
            <div className="company__users">
              <div className="company__users-search">
                <TextField
                  className="company__input"
                  placeholder="Поиск пользователя"
                  fullWidth
                  onChange={handleSearchUsers}
                />
                {
                  company.admins && company.admins.includes(auth.userId) ? 
                    <>
                      <Button className='company__users-btn' disableRipple onClick={ () => { setDialogNewUser({ visible: true, email: '', message: '' }) } }>
                        <Tooltip title='Пригласить пользователя'>
                          <SvgIcon> 
                            <path fill="currentColor" d="M15,4A4,4 0 0,0 11,8A4,4 0 0,0 15,12A4,4 0 0,0 19,8A4,4 0 0,0 15,4M15,5.9C16.16,5.9 17.1,6.84 17.1,8C17.1,9.16 16.16,10.1 15,10.1A2.1,2.1 0 0,1 12.9,8A2.1,2.1 0 0,1 15,5.9M4,7V10H1V12H4V15H6V12H9V10H6V7H4M15,13C12.33,13 7,14.33 7,17V20H23V17C23,14.33 17.67,13 15,13M15,14.9C17.97,14.9 21.1,16.36 21.1,17V18.1H8.9V17C8.9,16.36 12,14.9 15,14.9Z" />
                          </SvgIcon>
                        </Tooltip>
                      </Button>
                      <Button className='company__users-btn' data-active='false' disableRipple onClick={handleOnlyAdmins}>
                        <Tooltip title='Показать только администраторов'>
                          <SvgIcon> 
                            <path fill="currentColor" d="M10 12C12.21 12 14 10.21 14 8S12.21 4 10 4 6 5.79 6 8 7.79 12 10 12M10 6C11.11 6 12 6.9 12 8S11.11 10 10 10 8 9.11 8 8 8.9 6 10 6M9.27 20H2V17C2 14.33 7.33 13 10 13C11.04 13 12.5 13.21 13.86 13.61C13 13.95 12.2 14.42 11.5 15C11 14.94 10.5 14.9 10 14.9C7.03 14.9 3.9 16.36 3.9 17V18.1H9.22C9.2 18.15 9.17 18.2 9.14 18.25L8.85 19L9.14 19.75C9.18 19.83 9.23 19.91 9.27 20M17 18C17.56 18 18 18.44 18 19S17.56 20 17 20 16 19.56 16 19 16.44 18 17 18M17 15C14.27 15 11.94 16.66 11 19C11.94 21.34 14.27 23 17 23S22.06 21.34 23 19C22.06 16.66 19.73 15 17 15M17 21.5C15.62 21.5 14.5 20.38 14.5 19S15.62 16.5 17 16.5 19.5 17.62 19.5 19 18.38 21.5 17 21.5Z" />
                          </SvgIcon>
                        </Tooltip>
                      </Button> 
                    </>:
                    <></>
                }
              </div>
              <div className="company__users-wrapper">
                {
                  allUsers && allUsers.length > 0 ?
                    <div className="company__users-list">
                      {
                        companyUsers.map((user, index) => {
                          return (
                            <div 
                              className="company__users-item" 
                              key={index}
                              onClick={({ currentTarget }) => {
                                if (mdScreen) {
                                  const attribute = currentTarget.getAttribute('data-toggle')
                                  if (attribute) {
                                    const toggled = (attribute === 'true')
                                    if (toggled) {
                                      currentTarget.setAttribute('data-toggle', 'false')
                                    } else {
                                      currentTarget.setAttribute('data-toggle', 'true')
                                    }
                                  } else {
                                    currentTarget.setAttribute('data-toggle', 'true')
                                  }
                                }
                              }}
                            >
                              <div>
                                <p>Имя</p>
                                <Tooltip title={`${user.firstName} ${user.lastName}`}>
                                  <Typography noWrap>
                                    { `${user.firstName} ${user.lastName}` }
                                  </Typography>
                                </Tooltip>
                              </div>
                              <div>
                                <p>Email</p>
                                <Tooltip title={user.email ? user.email : 'не указано'}>
                                  <Typography noWrap>
                                    { user.email ? user.email : 'не указано' }
                                  </Typography>
                                </Tooltip>
                              </div>
                              <div>
                                <p>Телефон</p>
                                <Tooltip title={user.phoneNumber ? user.phoneNumber : 'не указано'}>
                                  <Typography noWrap>
                                    { user.phoneNumber ? user.phoneNumber : 'не указано' }
                                  </Typography>
                                </Tooltip>
                              </div>
                              <div className="company__users-item-controls" data-id={user._id}>
                                {
                                  user._id !== auth.userId ?
                                    <Button className='company__users-btn' disableRipple onClick={ ({ currentTarget: { parentNode } }) => { navigate(`/messages?newchat=${parentNode.getAttribute('data-id')}`) } }>
                                      <Tooltip title='Написать сообщение'>
                                        <SvgIcon> 
                                          <path fill="currentColor" d="M22 6C22 4.9 21.1 4 20 4H4C2.9 4 2 4.9 2 6V18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V6M20 6L12 11L4 6H20M20 18H4V8L12 13L20 8V18Z" />
                                        </SvgIcon>
                                      </Tooltip>
                                    </Button> : 
                                    <></>
                                }
                                {
                                  company.owner && company.owner === auth.userId ? 
                                    <Button 
                                      className='company__users-btn' 
                                      disableRipple 
                                      onClick={ ({ currentTarget: { parentNode } }) => { company.admins.includes(parentNode.getAttribute('data-id')) ? handleDemoteAdmin(parentNode.getAttribute('data-id')) : handleAssignAdmin(parentNode.getAttribute('data-id')) } }
                                    >
                                      <Tooltip title={ company.admins.includes(user._id) ? 'Снять права администратора' : 'Назначить администратором'}>
                                        <SvgIcon> 
                                          {
                                            company.admins.includes(user._id) ? 
                                              <path fill="currentColor" d="M10 13C7.33 13 2 14.33 2 17V20H13.09C13.07 19.86 13.05 19.73 13.04 19.59C13 19.4 13 19.2 13 19C13 18.69 13.03 18.39 13.08 18.1C13.21 17.21 13.54 16.38 14 15.66C14.21 15.38 14.42 15.12 14.65 14.88L14.67 14.85C14.9 14.61 15.16 14.39 15.43 14.19C14.76 13.88 14 13.64 13.26 13.45C12.07 13.15 10.89 13 10 13M11.05 18.1H3.9V17C3.9 16.36 7.03 14.9 10 14.9C10.68 14.9 11.36 15 12 15.11C11.5 16 11.18 17 11.05 18.1M10 12C12.21 12 14 10.21 14 8S12.21 4 10 4 6 5.79 6 8 7.79 12 10 12M10 6C11.11 6 12 6.9 12 8S11.11 10 10 10 8 9.11 8 8 8.9 6 10 6M22 20L19 23L16 20H18V16H20V20H22Z" /> :
                                              <path fill="currentColor" d="M10 12C12.21 12 14 10.21 14 8S12.21 4 10 4 6 5.79 6 8 7.79 12 10 12M10 6C11.11 6 12 6.9 12 8S11.11 10 10 10 8 9.11 8 8 8.9 6 10 6M10 13C7.33 13 2 14.33 2 17V20H13.09C13.07 19.86 13.05 19.73 13.04 19.59C13 19.4 13 19.2 13 19C13 18.69 13.03 18.39 13.08 18.1C13.21 17.21 13.54 16.38 14 15.66C14.21 15.38 14.42 15.12 14.65 14.88L14.67 14.85C14.9 14.61 15.16 14.39 15.43 14.19C14.76 13.88 14 13.64 13.26 13.45C12.07 13.15 10.89 13 10 13M11.05 18.1H3.9V17C3.9 16.36 7.03 14.9 10 14.9C10.68 14.9 11.36 15 12 15.11C11.5 16 11.18 17 11.05 18.1M22 18H20V22H18V18H16L19 15L22 18Z" /> 
                                          }
                                        </SvgIcon>
                                      </Tooltip>
                                    </Button> :
                                    <></>
                                }
                                {
                                  company.admins && company.admins.includes(auth.userId) ? 
                                    <Button 
                                      className='company__users-btn' 
                                      disableRipple 
                                      onClick={ ({ currentTarget: { parentNode } }) => { setDialogDeleteUser({ visible: true, id: parentNode.getAttribute('data-id') }) } }
                                    >
                                      <Tooltip title='Удалить пользователя'>
                                        <SvgIcon> 
                                          <path fill="currentColor" d="M9,3V4H4V6H5V19A2,2 0 0,0 7,21H17A2,2 0 0,0 19,19V6H20V4H15V3H9M7,6H17V19H7V6M9,8V17H11V8H9M13,8V17H15V8H13Z" />
                                        </SvgIcon>
                                      </Tooltip>
                                    </Button> :
                                    <></>
                                }
                              </div>
                            </div>
                          )
                        })
                      }
                    </div> : 
                    renderLoadingScreen()
                }
              </div>
            </div>
            <div className="company__invites">
              <div className="company__invites-title">
                <p>Приглашения ожидающие принятия</p>
                <TextField
                  className="company__input"
                  placeholder="Поиск по email"
                  onChange={handleSearchInvites}
                />
              </div>
              <div className="company__invites-wrapper">
                {
                  invites.length === 0 ?
                    <div className="company__invites-list company__invites-list_empty">
                      <p>У компании нет приглашений ожидающих принятия</p>
                    </div> :
                    <div className="company__invites-list">
                      {
                        invites.map((item, index) => {
                          return (
                            <div 
                              className="company__invites-item" 
                              key={index}
                              onClick={({ currentTarget }) => {
                                if (mdScreen) {
                                  const attribute = currentTarget.getAttribute('data-toggle')
                                  if (attribute) {
                                    const toggled = (attribute === 'true')
                                    if (toggled) {
                                      currentTarget.setAttribute('data-toggle', 'false')
                                    } else {
                                      currentTarget.setAttribute('data-toggle', 'true')
                                    }
                                  } else {
                                    currentTarget.setAttribute('data-toggle', 'true')
                                  }
                                }
                              }}
                            >
                              <div>
                                <p>Приглашение</p>
                                <Typography noWrap>
                                  {
                                    item.to ? item.to : 'Не указано'
                                  }
                                </Typography>
                              </div>
                              <div>
                                <p>Ссылка доступа</p>
                                <Typography noWrap>
                                  {
                                    item.link ? item.link : 'Не указано'
                                  }
                                </Typography>
                              </div>
                              {
                                company.admins.includes(auth.userId) ? 
                                  <div className="company__invites-item-controls" data-id={item._id}>
                                    <Button className='company__users-btn' disableRipple onClick={handleDeleteInvite}>
                                      <Tooltip title='Удалить приглашение'>
                                        <SvgIcon> 
                                          <path fill="currentColor" d="M9,3V4H4V6H5V19A2,2 0 0,0 7,21H17A2,2 0 0,0 19,19V6H20V4H15V3H9M7,6H17V19H7V6M9,8V17H11V8H9M13,8V17H15V8H13Z" />
                                        </SvgIcon>
                                      </Tooltip>
                                    </Button>
                                  </div> : 
                                  <></>
                              }
                            </div>
                          )
                        })
                      }
                    </div>
                }
              </div>
            </div>
          </div>
        </div>
        </div>
        

      {/* Dialogs */}

      <Dialog
        open={dialogDeleteUser.visible}
        onClose={ () => { setDialogDeleteUser({ visible: false, id: '' }) } }
        className='dialog'
      >
        <div className='dialog__title'>
          <h1>Исключение пользователя</h1>
          <SvgIcon 
            onClick={ () => { setDialogDeleteUser({ visible: false, id: '' }) } }
          >
            <path fill="currentColor" d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
          </SvgIcon>
        </div>
        <DialogContent className='dialog__content'>
          <p>Вы уверены, что хотите исключить этого пользователя из компании?</p>
        </DialogContent>
        <DialogActions className='company__dialog-actions'>
          <Button 
            disableElevation 
            variant="contained" 
            className='dialog__btn'
            onClick={handleDeleteUser}
          >
            Исключить
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={dialogNewUser.visible}
        onClose={ () => { setDialogNewUser({ visible: false, email: '', message: '' }) } }
        className='dialog'
      >
        <div className='dialog__title'>
          <h1>Приглашение пользователя</h1>
          <SvgIcon 
            onClick={ () => { setDialogNewUser({ visible: false, email: '', message: '' }) } }
          >
            <path fill="currentColor" d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
          </SvgIcon>
        </div>
        <DialogContent className='dialog__content'>
          <p className='dialog__label'>Электронная почта пользователя</p>
          <TextField
            className='dialog__input'
            value={dialogNewUser.email}
            fullWidth
            onChange={({ target: { value } }) => setDialogNewUser({ ...dialogNewUser, email: value })}
          />
          <p className='dialog__label'>Сообщение для пользователя</p>
          <TextField
            className='dialog__input'
            multiline
            fullWidth
            rows={4}
            value={dialogNewUser.message}
            onChange={({ target: { value } }) => setDialogNewUser({ ...dialogNewUser, message: value })}
          />
        </DialogContent>
        <DialogActions className='company__dialog-actions'>
          <Button 
            disableElevation 
            variant="contained" 
            className='dialog__btn'
            onClick={handleInviteUser}
          >
            Пригласить
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