
import { useContext, useEffect, useState } from 'react'
import { useNavigate } from "react-router-dom"

import { useHttp } from "../hooks/http.hook"

import { SocketContext } from "../context/SocketContext"

import { TextField, SvgIcon, Button, Tooltip, Typography } from '@mui/material'
import MobileDatePicker from '@mui/lab/MobileDatePicker'
import AdapterDateFns from '@mui/lab/AdapterDateFns'
import LocalizationProvider from '@mui/lab/LocalizationProvider'

import useMediaQuery from '@mui/material/useMediaQuery';

import { compareAsc, sub } from 'date-fns'
import ruLocale from 'date-fns/locale/ru'

import './InvitePage.css'

export const InvitePage = () => {

  const navigate = useNavigate()

  const { socket } = useContext(SocketContext)

  const { request, error, clearError } = useHttp()

  const [inviteStatus, setInviteStatus] = useState(null)

  const [tabIndex, setTabIndex] = useState(1)

  const smScreen = useMediaQuery('(max-width: 600px)')

  const [clientsPreview, setClientsPreview] = useState([])

  const [accountInputs, setAccountInputs] = useState({
    email: {
      value: '',
      error: false,
      errorMsg: ''
    }, 
    password: {
      value: '',
      error: false,
      errorMsg: ''
    }, 
    firstName: {
      value: '',
      error: false,
      errorMsg: ''
    }, 
    lastName: {
      value: '',
      error: false,
      errorMsg: ''
    }, 
    birthDate: {
      value: null,
      error: false,
      errorMsg: ''
    }, 
    phoneNumber: {
      value: '',
      error: false,
      errorMsg: ''
    }, 
  })

  const [companyInputs, setCompanyInputs] = useState({
    name: {
      value: '',
      error: false,
      errorMsg: ''
    },
    uen: {
      value: '',
      error: false,
      errorMsg: ''
    },
    email: {
      value: '',
      error: false,
      errorMsg: ''
    },
    address: {
      value: '',
      error: false,
      errorMsg: ''
    }
  })

  const [shareholdersInputs, setShareholdersInputs] = useState({
    name: '', person: false, numOfShares: '', shareholdersDate: null
  })

  const [shareholders, setShareholders] = useState([])

  const getClientsPreview = (companyName) => {
    request(
      '/api/client/clientpreview', 
      'POST', 
      { 
        clientName: companyName ? companyName : null 
      }
    ).then(data => { 
      setClientsPreview(data.client) 
      if (data.client.length > 0 && companyInputs.name.value) {
        setCompanyInputs({
          ...companyInputs,
          name: {
            ...companyInputs.name,
            error: false,
            errorMsg: 'Уже зарегистрированы компании со схожими названиями, но это все еще возможно'
          }
        })
      }
    })
  }

  // * получение id приглашения из локального хранилища при переадресации
  useEffect(() => {
    
    const invite = JSON.parse(sessionStorage.getItem('invite'))
    
    if (!invite) {
      return navigate('/auth', { replace: true })
    }

    request(
      '/api/invite/verifyinvite',
      'POST',
      {
        inviteId: invite.inviteId
      }
    ).then(data => setInviteStatus(data.status))

    getClientsPreview()

  }, [])

  // * если приглашение не найдено возвращает на страницу аутентификации
  useEffect(() => {
    if (error) {
      if (inviteStatus === null) {
        clearError()
        navigate('/auth', { replace: true })
      }
    }
  }, [error, clearError])

  // * валидация полей формы
  const handleValidateAccountInputs = () => {
    
    // проверка поля email на заполнение
    if (!accountInputs.email.value) { 
      setAccountInputs({ 
        ...accountInputs, 
        email: { 
          ...accountInputs.email, 
          error: true,
          errorMsg: 'Поле обязательно для заполнения'
        } 
      })
      return -1
    }

    // проверка поля email на корректность значения
    if (accountInputs.email.value) { 
      const emailRegexp = /^(([^<>()[\]\.,;:\s@\"]+(\.[^<>()[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})$/i;
      if (!accountInputs.email.value.match(emailRegexp)) {
        setAccountInputs({ 
          ...accountInputs, 
          email: { 
            ...accountInputs.email, 
            error: true,
            errorMsg: 'Некорректное значение'
          } 
        })
        return -1
      }
    }

    // проверка поля password на заполнение
    if (!accountInputs.password.value) {
      setAccountInputs({ 
        ...accountInputs, 
        password: { 
          ...accountInputs.password, 
          error: true,
          errorMsg: 'Поле обязательно для заполнения'
        } 
      })
      return -1
    }

    // проверка поля password на длину значения
    if (accountInputs.password.value.length < 6) {
      setAccountInputs({ 
        ...accountInputs, 
        password: { 
          ...accountInputs.password, 
          error: true,
          errorMsg: 'Пароль должен содержать 6 или более символов'
        } 
      })
      return -1
    }

    // проверка поля firstName на заполнение
    if (!accountInputs.firstName.value) {
      setAccountInputs({ 
        ...accountInputs, 
        firstName: { 
          ...accountInputs.firstName, 
          error: true,
          errorMsg: 'Поле обязательно для заполнения'
        } 
      })
      return -1
    }

    // проверка поля lastName на заполнение
    if (!accountInputs.lastName.value) {
      setAccountInputs({ 
        ...accountInputs, 
        lastName: { 
          ...accountInputs.lastName, 
          error: true,
          errorMsg: 'Поле обязательно для заполнения'
        } 
      })
      return -1
    }

    // проверка поля birthDate на корректность
    if (accountInputs.birthDate.value) {

      // значение невозможно конвертировать в дату
      if (isNaN(new Date(accountInputs.birthDate.value).getTime())) {
        setAccountInputs({ 
          ...accountInputs, 
          birthDate: { 
            ...accountInputs.birthDate, 
            error: true,
            errorMsg: 'Некорректное значение'
          } 
        })
        return -1
      }

      const maxDate = sub(new Date(), { years: 18 })
      const minDate = new Date('1900-01-01')

      // значение больше возможного
      if (compareAsc(new Date(accountInputs.birthDate.value), maxDate) === 1) {
        setAccountInputs({ 
          ...accountInputs, 
          birthDate: { 
            ...accountInputs.birthDate, 
            error: true,
            errorMsg: `Значение больше допустимого значения (${maxDate.toLocaleDateString()})`
          } 
        })
        return -1
      }

      // значение меньше возможного
      if (compareAsc(new Date(accountInputs.birthDate.value), minDate) === -1) {
        setAccountInputs({ 
          ...accountInputs, 
          birthDate: { 
            ...accountInputs.birthDate, 
            error: true,
            errorMsg: `Значение меньше допустимого значения (${minDate.toLocaleDateString()})`
          } 
        })
        return -1
      }

    }

    // проверка поля phoneNumber на корректность значения
    if (accountInputs.phoneNumber.value) {
      const phoneRegexp = /^(\s*)?(\+)?([- _():=+]?\d[- _():=+]?){10,14}(\s*)?$/
      if (!accountInputs.phoneNumber.value.match(phoneRegexp)) {
        setAccountInputs({ 
          ...accountInputs, 
          phoneNumber: { 
            ...accountInputs.phoneNumber, 
            error: true,
            errorMsg: 'Некорректное значение'
          } 
        })
        return -1
      }
    }

  }

  // * проверка на заполненность полей при потере фокуса
  const handleBlurAccountInputs = ({ currentTarget: { name } }) => {
    
    if (!accountInputs[name].value) {
      setAccountInputs({ 
        ...accountInputs, 
        [name]: { 
          ...accountInputs[name], 
          error: true,
          errorMsg: 'Поле обязательно для заполнения'
        } 
      })
    } else {
      setAccountInputs({ 
        ...accountInputs, 
        [name]: { 
          ...accountInputs[name], 
          error: false,
          errorMsg: ''
        } 
      })
    }
    
  }

  // * проверка на заполненность полей с телефонными номерами при потере фокуса
  const handleBlurAccountPhone = ({ currentTarget: { name } }) => {
    if (!accountInputs[name].value) {
      setAccountInputs({ 
        ...accountInputs, 
        [name]: { 
          ...accountInputs[name], 
          error: false,
          errorMsg: ''
        } 
      })
    } else {
      const phoneRegexp = /^(\s*)?(\+)?([- _():=+]?\d[- _():=+]?){10,14}(\s*)?$/
      if (!accountInputs[name].value.match(phoneRegexp)) {
        setAccountInputs({ 
          ...accountInputs, 
          [name]: { 
            ...accountInputs[name], 
            error: true,
            errorMsg: 'Некорректное значение'
          } 
        })
        return
      }

      setAccountInputs({ 
        ...accountInputs, 
        [name]: { 
          ...accountInputs[name], 
          error: false,
          errorMsg: ''
        } 
      })
      return
    }
  }

  const handleChangeAccountInputs = ({ currentTarget: { name, value } }) => {
    setAccountInputs({ 
      ...accountInputs, 
      [name]: { 
        ...accountInputs[name], 
        value: value
      } 
    })
  }

  // * проверка на заполненность поля названия компании при потере фокуса
  const handleBlurCompanyName = ({ currentTarget: { name, value } }) => {
    if (!companyInputs[name].value) {
      setCompanyInputs({ 
        ...companyInputs, 
        [name]: { 
          ...companyInputs[name], 
          error: true,
          errorMsg: 'Поле обязательно для заполнения'
        } 
      })
    } else {
      setCompanyInputs({ 
        ...companyInputs, 
        [name]: { 
          ...companyInputs[name], 
          error: false,
          errorMsg: ''
        } 
      })
    }
    getClientsPreview(value)
  }

  // * проверка на заполненность поля инн при потере фокуса
  const handleBlurCompanyUen = ({ currentTarget: { name } }) => {
    if (!companyInputs[name].value) {
      setCompanyInputs({ 
        ...companyInputs, 
        [name]: { 
          ...companyInputs[name], 
          error: true,
          errorMsg: 'Поле обязательно для заполнения'
        } 
      })
    } else {
      const uenRegexp = /^(\d{10}|\d{12})$/
      if (!companyInputs[name].value.match(uenRegexp)) {
        setCompanyInputs({ 
          ...companyInputs, 
          [name]: { 
            ...companyInputs[name], 
            error: true,
            errorMsg: 'Некорректное значение'
          } 
        })
      } else {
        setCompanyInputs({ 
          ...companyInputs, 
          [name]: { 
            ...companyInputs[name], 
            error: false,
            errorMsg: ''
          } 
        })
      }
    }
  }

  const handleChangeCompanyInputs = ({ currentTarget: { name, value } }) => {
    setCompanyInputs({ 
      ...companyInputs, 
      [name]: { 
        ...companyInputs[name], 
        value: value
      } 
    })
  }

  const handleCreateClient = () => {
    const invite = sessionStorage.getItem('invite')
    const inviteId = JSON.parse(invite).inviteId

    request('/api/client/createclient', 'POST', {
      userEmail: accountInputs.email.value, 
      userPassword: accountInputs.password.value, 
      userFirstName: accountInputs.firstName.value, 
      userLastName: accountInputs.lastName.value, 
      userBirthDate: accountInputs.birthDate.value, 
      userPhoneNumber: accountInputs.phoneNumber.value,
      inviteId: inviteId, 
      companyName: companyInputs.name.value, 
      companyAddress: companyInputs.address.value,
      companyUEN: companyInputs.uen.value, 
      companyEmail: companyInputs.email.value, 
      shareholders: shareholders
    }).then((data) => {
      navigate('/auth')
    })
  }

  // * переключение на следующую страницу
  const handleNextTab = () => {
    switch (tabIndex) {
      case 1:
        if (handleValidateAccountInputs() !== -1) {
          setTabIndex(2)
        }
        break
      case 2:
        if (companyInputs.name.value) {
          setTabIndex(3)
        }
        break
      case 3:
        if (companyInputs.uen.value) {
          const uenRegexp = /^(\d{10}|\d{12})$/
          if (!companyInputs.uen.value.match(uenRegexp)) {
            setCompanyInputs({ 
              ...companyInputs, 
              uen: { 
                ...companyInputs.uen, 
                error: true,
                errorMsg: 'Некорректное значение'
              } 
            })
          } else {
            setTabIndex(4)
          }
        } else {
          setCompanyInputs({
            ...companyInputs,
            uen: {
              ...companyInputs.uen,
              error: true,
              errorMsg: 'Поле обязательно для заполнения'
            }
          })
        }
        break
      case 4:
        setTabIndex(5)
        break
      case 5:
        if (handleValidateAccountInputs() === -1) {
          setTabIndex(1)
        }
        if (!companyInputs.name.value) {
          setTabIndex(2)
        }
        const uenRegexp = /^(\d{10}|\d{12})$/
        if (!companyInputs.uen.value || !companyInputs.uen.value.match(uenRegexp)) {
          setTabIndex(3)
        }
        handleCreateClient()
        break
      default:
        break
    }
  }

  // * отображение формы информации о пользователе
  const renderAccountPanel = () => {
    return (
      <div className='invite__form'>
        <div className="invite__form-item">
          <p className="invite__form-label">Email *</p>
          <TextField
            fullWidth
            name='email'
            className='invite__form-input'
            value={accountInputs.email.value}
            error={accountInputs.email.error}
            helperText={accountInputs.email.errorMsg}
            onBlur={handleBlurAccountInputs}
            onChange={handleChangeAccountInputs}
          />
        </div>
        <div className="invite__form-item">
          <p className="invite__form-label">Пароль *</p>
          <TextField
            fullWidth
            name='password'
            type='password'
            className='invite__form-input'
            value={accountInputs.password.value}
            error={accountInputs.password.error}
            helperText={accountInputs.password.errorMsg}
            onBlur={handleBlurAccountInputs}
            onChange={handleChangeAccountInputs}
          />
        </div>
        <div className="invite__form-item">
          <p className="invite__form-label">Имя *</p>
          <TextField
            fullWidth
            name='firstName'
            className='invite__form-input'
            value={accountInputs.firstName.value}
            error={accountInputs.firstName.error}
            helperText={accountInputs.firstName.errorMsg}
            onBlur={handleBlurAccountInputs}
            onChange={handleChangeAccountInputs}
          />
        </div>
        <div className="invite__form-item">
          <p className="invite__form-label">Фамилия *</p>
          <TextField
            fullWidth
            name='lastName'
            className='invite__form-input'
            value={accountInputs.lastName.value}
            error={accountInputs.lastName.error}
            helperText={accountInputs.lastName.errorMsg}
            onBlur={handleBlurAccountInputs}
            onChange={handleChangeAccountInputs}
          />
        </div>
        <div className="invite__form-item">
          <p className="invite__form-label">Дата рождения</p>
          <LocalizationProvider dateAdapter={AdapterDateFns} locale={ruLocale}>
            <MobileDatePicker
              clearable
              maxDate={sub(new Date(), { years: 18 })}
              minDate={new Date('1900-01-01')}
              value={accountInputs.birthDate.value}
              onChange={(value) => {
                setAccountInputs({ 
                  ...accountInputs, 
                  birthDate: {
                    ...accountInputs.birthDate,
                    value: value
                  }
                })
              }}
              renderInput={(params) => 
                <TextField 
                  {...params} 
                  fullWidth
                  className='invite__form-input'
                />
              }
            />
          </LocalizationProvider>
        </div>
        <div className="invite__form-item">
          <p className="invite__form-label">Номер телефона</p>
          <TextField
            fullWidth
            name='phoneNumber'
            className='invite__form-input'
            value={accountInputs.phoneNumber.value}
            error={accountInputs.phoneNumber.error}
            helperText={accountInputs.phoneNumber.errorMsg}
            onBlur={handleBlurAccountPhone}
            onChange={handleChangeAccountInputs}
          />
        </div>
      </div>
    )
  }

  // * отображение формы названия компании
  const renderCompanyPanel = () => {
    return (
      <div className='invite__company'>
        <p className="invite__company-title">Название вашей компании</p>
        <div className="invite__company-item">
          <TextField
            fullWidth
            name='name'
            className='invite__form-input'
            value={companyInputs.name.value}
            error={companyInputs.name.error}
            helperText={companyInputs.name.errorMsg}
            onBlur={handleBlurCompanyName}
            onChange={handleChangeCompanyInputs}
          />
        </div>
        {
          clientsPreview.length > 0
            ? (
              <div className="invite__grid">
                <div className="invite__grid-columns">
                  <div className="invite__grid-column">Наименование</div>
                  <div className="invite__grid-column">Статус</div>
                </div>
                <div className="invite__grid-rows">
                  {
                    clientsPreview.map((client, index) => {
                      return (
                        <div className="invite__grid-row" key={index}>
                          <Tooltip title={client.clientName}>
                            <Typography noWrap className='invite__grid-value'>
                              { client.clientName }
                            </Typography>
                          </Tooltip>
                          <Tooltip title={client.UENStatus}>
                            <Typography noWrap className='invite__grid-value'>
                              { client.UENStatus }
                            </Typography>
                          </Tooltip>
                        </div>
                      )
                    })
                  }
                </div>
              </div>
            )
            : <></>
        }
      </div>
    )
  }

  // * отображение формы информации о компании
  const renderCompanyDetailsPanel = () => {
    return (
      <div className='invite__form'>
        <div className="invite__form-item">
          <p className="invite__form-label">ИНН *</p>
          <TextField
            fullWidth
            name='uen'
            type='number'
            className='invite__form-input'
            value={companyInputs.uen.value}
            error={companyInputs.uen.error}
            helperText={companyInputs.uen.errorMsg}
            onBlur={handleBlurCompanyUen}
            onChange={handleChangeCompanyInputs}
          />
        </div>
        <div className='invite__form-item_empty' />
        <div className="invite__form-item">
          <p className="invite__form-label">Адрес</p>
          <TextField
            fullWidth
            name='address'
            className='invite__form-input'
            value={companyInputs.address.value}
            error={companyInputs.address.error}
            helperText={companyInputs.address.errorMsg}
            onChange={handleChangeCompanyInputs}
          />
        </div>
        <div className="invite__form-item">
          <p className="invite__form-label">Email</p>
          <TextField
            fullWidth
            name='email'
            className='invite__form-input'
            value={companyInputs.email.value}
            error={companyInputs.email.error}
            helperText={companyInputs.email.errorMsg}
            onChange={handleChangeCompanyInputs}
          />
        </div>
      </div>
    )
  }

  // * отображение формы акционеров компании
  const renderShareholdersPanel = () => {
    return (
      <div className="invite__shareholders">
        <div className="invite__shareholders-form">
          <div className="invite__shareholders-switcher">
            <Button
              disableRipple
              className={
                shareholdersInputs.person
                  ? 'invite__shareholders-switch invite__shareholders-switch_active'
                  : 'invite__shareholders-switch'
              }
              onClick={() => {
                setShareholdersInputs({ ...shareholdersInputs, person: true })
              }}
            >
              Физическое лицо
            </Button>
            <Button
              disableRipple
              className={
                !shareholdersInputs.person
                  ? 'invite__shareholders-switch invite__shareholders-switch_active'
                  : 'invite__shareholders-switch'
              }
              onClick={() => {
                setShareholdersInputs({ ...shareholdersInputs, person: false })
              }}
            >
              Юридическое лицо
            </Button>
          </div>
          <div className="invite__shareholders-item">
            <p className="invite__form-label">Название</p>
            <TextField
              name='name'
              fullWidth
              className='invite__form-input'
              value={shareholdersInputs.name}
              onChange={({ currentTarget: { name, value } }) => {
                setShareholdersInputs({ ...shareholdersInputs, [name]: value })
              }}
            />
          </div>
          <div className="invite__shareholders-item">
            <p className="invite__form-label">Количество акций</p>
            <TextField
              name='numOfShares'
              fullWidth
              type='number'
              className='invite__form-input'
              value={shareholdersInputs.numOfShares}
              onChange={({ currentTarget: { name, value } }) => {
                setShareholdersInputs({ ...shareholdersInputs, [name]: value })
              }}
            />
          </div>
          <div className="invite__shareholders-item">
            <p className="invite__form-label">Дата акционерного соглашения</p>
            <LocalizationProvider dateAdapter={AdapterDateFns} locale={ruLocale}>
              <MobileDatePicker
                clearable
                maxDate={new Date()}
                minDate={new Date('1900-01-01')}
                value={shareholdersInputs.shareholdersDate}
                onChange={(value) => {
                  setShareholdersInputs({ ...shareholdersInputs, shareholdersDate: value })
                }}
                renderInput={(params) => 
                  <TextField 
                    {...params} 
                    fullWidth
                    className='invite__form-input'
                  />
                }
              />
            </LocalizationProvider>
          </div>
          <div className="invite__shareholders-controls">
            <Button
              className='invite__actions-btn'
              onClick={() => {
                const rows = [ ...shareholders ]
                rows.push({ ...shareholdersInputs })
                setShareholders(rows)
              }}
            >
              Добавить
            </Button>
          </div>
        </div>
        <div className="invite__shareholders-rows">
          <div className="invite__shareholders-row">
            <Typography className='invite__shareholders-column' noWrap>
              Название
            </Typography>
            <Typography className='invite__shareholders-column' noWrap>
              Тип
            </Typography>
            <Typography className='invite__shareholders-column' noWrap>
              Количество акций
            </Typography>
            <Typography className='invite__shareholders-column' noWrap>
              Дата соглашения
            </Typography>
          </div>
          {
            shareholders.length === 0
              ? (
                <div className="invite__shareholders-row invite__shareholders-row_empty">
                  <p>
                    Не добавлено ни одного акционера
                    (это не обязательно)
                  </p>
                </div>
              )
              : shareholders.map((item, index) => {
                  return (
                    <div 
                      className="invite__shareholders-row"
                      key={index}
                      data-id={index}
                      onClick={({ currentTarget }) => {
                        const attribute = currentTarget.getAttribute('data-toggle')
                        if (attribute) {
                          const toggle = (attribute === 'true')
                          if (toggle) {
                            currentTarget.setAttribute('data-toggle', 'false')
                          } else {
                            currentTarget.setAttribute('data-toggle', 'true')
                          }
                        } else {
                          currentTarget.setAttribute('data-toggle', 'true')
                        }
                      }}  
                    >
                      <Typography noWrap>
                        { item.name }
                      </Typography>
                      <Typography noWrap>
                        {
                          item.person 
                            ? 'Физ. лицо'
                            : 'Юр. лицо'
                        }
                      </Typography>
                      <Typography noWrap>
                        { item.numOfShares }
                      </Typography>
                      <Typography noWrap>
                        { new Date(item.shareholdersDate).toLocaleDateString() }
                      </Typography>
                      <div className="invite__shareholders-row-controls">
                        <Button
                          className='invite__actions-btn'
                        >
                          Отмена
                        </Button>
                        <Button
                          className='invite__actions-btn'
                          onClick={({ currentTarget }) => {
                            const id = currentTarget.parentNode.parentNode.getAttribute('data-id')
                            const rows = [ ...shareholders ]
                            rows.splice(id, 1)
                            setShareholders(rows)
                          }}
                        >
                          Удалить
                        </Button>
                      </div>
                    </div>
                  )
                })
          }
        </div>
      </div>
    )
  }

  // * отображение форм
  const renderComponent = () => {
    switch (tabIndex) {
      case 1:
        return renderAccountPanel()
      case 2:
        return renderCompanyPanel()
      case 3:
        return renderCompanyDetailsPanel()
      case 4:
        return renderShareholdersPanel()
      case 5:
        return (
          <div className="invite__finish">
            <p>Все готово для создания вашей компании</p>
          </div>
        )
      default:
        setTabIndex(1)
    }
  }

  return (
    <div className="invite">
      <div className="invite__wrapper">

        {/* Stepper */}
        <div className="invite__stepper">
          
          {
            !smScreen || (smScreen && tabIndex === 1)
              ? (
                <div 
                  className={
                    tabIndex === 1
                      ? "invite__stepper-item invite__stepper-item_active"
                      : tabIndex > 1
                        ? "invite__stepper-item invite__stepper-item_passed"
                        : "invite__stepper-item"
                  }
                >
                  <div className="invite__stepper-index">
                    {
                      tabIndex > 1
                        ? (
                          <SvgIcon>
                            <path fill="currentColor" d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z" />
                          </SvgIcon>
                        )
                        : <p>1</p>
                    }
                  </div>
                  <div className="invite__stepper-title">
                    <p>Ваша информация</p>
                  </div>
                </div>
              )
              : <></>
          }

          {
            !smScreen || (smScreen && tabIndex === 2)
              ? (
                <div 
                  className={
                    tabIndex === 2
                      ? "invite__stepper-item invite__stepper-item_active"
                      : tabIndex > 2
                        ? "invite__stepper-item invite__stepper-item_passed"
                        : "invite__stepper-item"
                  }
                >
                  <div className="invite__stepper-index">
                    {
                      tabIndex > 2
                        ? (
                          <SvgIcon>
                            <path fill="currentColor" d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z" />
                          </SvgIcon>
                        )
                        : <p>2</p>
                    }
                  </div>
                  <div className="invite__stepper-title">
                    <p>Название компании</p>
                  </div>
                </div>
              )
              : <></>
          }
          
          {
            !smScreen || (smScreen && tabIndex === 3)
              ? (
                <div 
                  className={
                    tabIndex === 3
                      ? "invite__stepper-item invite__stepper-item_active"
                      : tabIndex > 3
                        ? "invite__stepper-item invite__stepper-item_passed"
                        : "invite__stepper-item"
                  }
                >
                  <div className="invite__stepper-index">
                    {
                      tabIndex > 3
                        ? (
                          <SvgIcon>
                            <path fill="currentColor" d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z" />
                          </SvgIcon>
                        )
                        : <p>3</p>
                    }
                  </div>
                  <div className="invite__stepper-title">
                    <p>Информация о компании</p>
                  </div>
                </div>
              )
              : <></>
          }

          {
            !smScreen || (smScreen && tabIndex === 4)
              ? (
                <div 
                  className={
                    tabIndex === 4
                      ? "invite__stepper-item invite__stepper-item_active"
                      : tabIndex > 4
                        ? "invite__stepper-item invite__stepper-item_passed"
                        : "invite__stepper-item"
                  }
                >
                  <div className="invite__stepper-index">
                    {
                      tabIndex > 4
                        ? (
                          <SvgIcon>
                            <path fill="currentColor" d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z" />
                          </SvgIcon>
                        )
                        : <p>4</p>
                    }
                  </div>
                  <div className="invite__stepper-title">
                    <p>Акционеры</p>
                  </div>
                </div>
              )
              : <></>
          }

          {
            !smScreen || (smScreen && tabIndex === 5)
              ? (
                <div 
                  className={
                    tabIndex === 5
                      ? "invite__stepper-item invite__stepper-item_active"
                      : tabIndex > 5
                        ? "invite__stepper-item invite__stepper-item_passed"
                        : "invite__stepper-item"
                  }
                >
                  <div className="invite__stepper-index">
                    {
                      tabIndex > 5
                        ? (
                          <SvgIcon>
                            <path fill="currentColor" d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z" />
                          </SvgIcon>
                        )
                        : <p>5</p>
                    }
                  </div>
                  <div className="invite__stepper-title">
                    <p>Создание аккаунта</p>
                  </div>
                </div>
              )
              : <></>
          }
          
        </div>
        
        {/* Form */}
        {
          renderComponent()
        }
        
        {/* ! Actions */}
        <div className="invite__actions">
          <Button
            disableRipple
            className='invite__actions-btn'
            onClick={() => {
              setTabIndex(value => value - 1 !== 0 ? value - 1 : 1)
            }}
          >
            Назад
          </Button>
          <Button
            disableRipple
            className='invite__actions-btn invite__actions-btn_contained'
            onClick={handleNextTab}
          >
            {
              tabIndex === 5 
                ? 'Создать'
                : 'Далее'
            }
          </Button>
        </div>

      </div>
    </div>
  )
}

//   const [shareholders, setShareholders] = useState([])

//   // * Проверка не выходил ли значение даты за диапазон возможных дат
//   const handleShareholderDateBlur = (event) => {
//     const eventDateString = event.target.value.split('.')
//     const eventDate = new Date(eventDateString[2], eventDateString[1] - 1, eventDateString[0])
//     if (!event.target.value) {
//       setShareholderError({ ...shareholderError, shareholderDate: { value: false, msg: '' } })
//       return
//     } else {
//       if (isNaN(eventDate.getTime())) {
//         setShareholderError({ ...shareholderError, shareholderDate: { value: true, msg: 'Значение не возможно интерпретировать как дата' } })
//         return
//       }
//       if (eventDate < minDate) {
//         setShareholderError({ ...shareholderError, shareholderDate: { value: true, msg: `Значение поля является меньше возможно допустимого (${minDate.toLocaleDateString()})` } })
//         return
//       }
//       setShareholderError({ ...shareholderError, shareholderDate: { value: false, msg: '' } })
//     }
//   }

//   const handleAddShareholder = (event) => {
//     let result = false
//     if (!row.name) {
//       setShareholderError({ ...shareholderError, name: { value: true, msg: 'Это поле является обязательным для заполнения' } })
//       result = true
//     }
//     if (row.shareholderDate) {
//       if (isNaN(row.shareholderDate.getTime())) {
//         setShareholderError({ ...shareholderError, shareholderDate: { value: true, msg: 'Значение не возможно интерпретировать как дата' } })
//         result = true
//       }
//       if (row.shareholderDate < minDate) {
//         setShareholderError({ ...shareholderError, shareholderDate: { value: true, msg: `Значение поля является меньше возможно допустимого (${minDate.toLocaleDateString()})` } })
//         result = true
//       }
//     }

//     if (result) {
//       return
//     }

//     let newShareholders = shareholders
//     newShareholders.push(row)
//     setShareholders(newShareholders)

//     setRow({ ...row, name: '', numOfShares: '', shareholderDate: null })
//     // forceUpdate()
//   }

//   const handleDeleteShareholder = (event) => {
//     const id = event.target.parentNode.parentNode.getAttribute('data-id')
//     const newShareholders = shareholders

//     newShareholders.splice(id, 1)

//     setShareholders(newShareholders)
//     forceUpdate()
//   }

//   const handleAddClient = (event) => {
    
//     const invite = sessionStorage.getItem('invite')
//     const inviteId = JSON.parse(invite).inviteId

//     request('/api/client/createclient', 'POST', {
//       userEmail: user.email, userPassword: user.password, userFirstName: user.firstName, 
//       userLastName: user.lastName, userBirthDate: user.birthDate, userPhoneNumber: user.phoneNumber,
//       inviteId: inviteId, companyName: company.name, companyAddress: company.address,
//       companyUEN: company.UEN, companyEmail: company.email, shareholders: shareholders
//     }).then((data) => {
//       socket.socket.emit('new-client-add', { id: data.companyId+'/clients' })
//       setSnack({ text: data.msg, severity: 'success', visibility: true })
//       setTimeout(() => {
//         navigate('/auth')
//       }, 2000)
//     })
//   }

//   return (
//     <div className="invite">
//       <div className="invite__form">
//         <TabContext value={step.toString()}>
//           <Stepper activeStep={step} alternativeLabel>
//             <Step>
//               <StepLabel>Ваша информация</StepLabel>
//             </Step>
//             <Step>
//               <StepLabel>Название компании</StepLabel>
//             </Step>
//             <Step>
//               <StepLabel>Информация о компании</StepLabel>
//             </Step>
//             <Step>
//               <StepLabel>Акционеры</StepLabel>
//             </Step>
//             <Step>
//               <StepLabel>Создание аккаунта</StepLabel>
//             </Step>
//           </Stepper>
//           <TabPanel value={'0'}>
//             <div className="invite__wrapper">
//               <div className="invite__item_email">
//                 <h2 className="invite__label">
//                   Адрес электронной почты *
//                 </h2>
//                 <TextField 
//                   fullWidth 
//                   name='email'
//                   value={user.email}
//                   error={errors.email.value}
//                   className="invite__input"
//                   helperText={errors.email.value ? errors.email.msg : null}
//                   onBlur={handleInputBlur}
//                   onChange={handleChange}
//                 />
//               </div>
//               <div className="invite__item_password">
//                 <h2 className="invite__label">
//                   Пароль *
//                 </h2>
//                 <TextField 
//                   fullWidth 
//                   name='password'
//                   value={user.password}
//                   error={errors.password.value}
//                   type="password"
//                   className="invite__input"
//                   helperText={errors.password.value ? errors.password.msg : null}
//                   onBlur={handleInputBlur}
//                   onChange={handleChange}
//                 />
//               </div>
//               <div className="invite__divider"></div>
//               <div className="invite__item_firstName">
//                 <h2 className="invite__label">
//                   Имя *
//                 </h2>
//                 <TextField 
//                   fullWidth 
//                   name='firstName'
//                   value={user.firstName}
//                   error={errors.firstName.value}
//                   className="invite__input"
//                   helperText={errors.firstName.value ? errors.firstName.msg : null}
//                   onBlur={handleInputBlur}
//                   onChange={handleChange}
//                 />
//               </div>
//               <div className="invite__item_lastName">
//                 <h2 className="invite__label">
//                   Фамилия *
//                 </h2>
//                 <TextField 
//                   fullWidth 
//                   name='lastName'
//                   value={user.lastName}
//                   error={errors.lastName.value}
//                   helperText={errors.lastName.value ? errors.lastName.msg : null}
//                   className="invite__input"
//                   onBlur={handleInputBlur}
//                   onChange={handleChange}
//                 />
//               </div>
//               <div className="invite__item_birthDate">
//                 <h2 className="invite__label">Дата рождения</h2>
//                 <LocalizationProvider dateAdapter={AdapterDateFns} locale={ruLocale}>
//                   <DatePicker
//                     name="birthDate"
//                     mask={'__.__.____'}
//                     value={user.birthDate}
//                     onChange={handleDateChange}
//                     renderInput={
//                       (params) => 
//                         <TextField 
//                           {...params} 
//                           fullWidth 
//                           value={user.birthDate}
//                           onBlur={handleDateBlur}
//                           error={ errors.birthDate.value }
//                           helperText={ errors.birthDate.value ? errors.birthDate.msg : null }
//                           className="invite__input" 
//                         />
//                     }
//                     clearable={true}
//                     minDate={minDate}
//                     maxDate={maxDate}
//                   />
//                 </LocalizationProvider>
//               </div>
//               <div className="invite__item_phoneNumber">
//                 <h2 className="invite__label">
//                   Номер телефона
//                 </h2>
//                 <TextField 
//                   fullWidth 
//                   name='phoneNumber'
//                   className="invite__input"
//                   value={user.phoneNumber}
//                   error={errors.phoneNumber.value}
//                   helperText={errors.phoneNumber.value ? errors.phoneNumber.msg : null}
//                   onChange={handleChange}
//                   onBlur={handlePhoneBlur}
//                 />
//               </div>
//             </div>
//             <div className="invite__controls invite__controls_center">
//               <div></div>
//               <Button onClick={handleUserNext} disableElevation variant='contained'>Далее</Button>
//             </div>
//           </TabPanel>
//           <TabPanel value={'1'}>
//             <div className="invite__wrapper invite__wrapper_name">
//               <div className="invite__title">
//                 <h2>Название вашей компании</h2>
//               </div>
//               <div className="invite__item invite__item_name">
//                 <p className="invite__label">Название *</p>
//                 <TextField 
//                   fullWidth 
//                   value={company.name} 
//                   onChange={ (event) => { setCompany({ ...company, name: event.target.value }) } }
//                   onBlur={handleCompanyNameBlur}
//                   className="invite__input"
//                   error={companyErrors.name.value}
//                   helperText={companyErrors.name.value ? companyErrors.name.msg : null}
//                   InputProps={ loading ? {
//                     endAdornment: <InputAdornment position="end"><CircularProgress /></InputAdornment>,
//                   } : null }
//                 />
//                 {
//                   clients.length > 0 ? <p className="invite__similar">Уже зарегистрированы компании с похожими названиями, <br />но это все еще возможно</p> : <p></p>
//                 }
//               </div>
//               {
//                 loading ? 
//                   null :
//                   getClientTable()
//               }
//               <div className="invite__controls invite__controls_center">
//                 <Button disableElevation variant='contained' onClick={() => { setStep(step - 1) }}>Назад</Button>
//                 <Button disableElevation variant='contained' onClick={handleCompanyNameNext}>Далее</Button>
//               </div>
//             </div>
//           </TabPanel>
//           <TabPanel value={'2'}>
//             <div className="invite__wrapper invite__wrapper_normal">
//               <div className="invite__title">
//                 <h2>Расскажите больше о {company.name}</h2>
//               </div>
//               <div className="invite__item">
//                 <p className="invite__label">Адрес *</p>
//                 <TextField 
//                   fullWidth 
//                   value={company.address}
//                   onChange={ (event) => { setCompany({ ...company, address: event.target.value }) } }
//                   onBlur={ (event) => { event.target.value ? setCompanyErrors({ ...companyErrors, address: { value: false, msg: '' } }) : setCompanyErrors({ ...companyErrors, address: { value: true, msg: 'Это поле является обязательным для заполнения' } }) } }
//                   error={companyErrors.address.value}
//                   helperText={companyErrors.address.value ? companyErrors.address.msg : null}
//                   className="invite__input" 
//                 />
//               </div>
//               <div className="invite__item">
//                 <p className="invite__label">ИНН *</p>
//                 <TextField 
//                   fullWidth 
//                   value={company.UEN}
//                   onChange={ (event) => { setCompany({ ...company, UEN: event.target.value }) } }
//                   onBlur={handleUENBlur}
//                   error={companyErrors.UEN.value}
//                   helperText={companyErrors.UEN.value ? companyErrors.UEN.msg : null}
//                   className="invite__input" 
//                 />
//               </div>
//               <div className="invite__item">
//                 <p className="invite__label">Email</p>
//                 <TextField 
//                   fullWidth 
//                   value={company.email}
//                   onChange={ (event) => { setCompany({ ...company, email: event.target.value }) } }
//                   onBlur={handleEmailBlur}
//                   error={companyErrors.email.value}
//                   helperText={companyErrors.email.value ? companyErrors.email.msg : null}
//                   className="invite__input" 
//                 />
//               </div>
//             </div>
//             <div className="invite__controls invite__controls_center">
//               <Button disableElevation variant='contained' onClick={() => { setStep(step - 1) }}>Назад</Button>
//               <Button disableElevation variant='contained' onClick={handleCompanyDetailsNext}>Далее</Button>
//             </div>
//           </TabPanel>
//           <TabPanel value={'3'}>
//             <div className="invite__wrapper invite__wrapper_shareholders">
//               <div className="invite__title">
//                 <h2>Укажите акционеров {company.name}</h2>
//               </div>
//               <div className="invite__content">
//                 <div className="invite__holderform">
//                   <div className="invite__item">
//                     <Stack direction='row' className='invite__check-stack'>
//                       <Typography className={ row.person ? 'invite__check' : 'invite__check invite__check_active' }>Юр. лицо</Typography>
//                       <Switch checked={row.person} onChange={ (event) => { setRow({ ...row, person: event.target.checked }) } }/>
//                       <Typography className={ !row.person ? 'invite__check' : 'invite__check invite__check_active' }>Физ. лицо</Typography>
//                     </Stack>
//                   </div>
//                   <div className="invite__holderwrapper">
//                     <div className="invite__item">
//                       <p className="invite__label">ФИО/Наименование юридического лица</p>
//                       <TextField 
//                         fullWidth
//                         value={row.name}
//                         onChange={ (event) => { setRow({ ...row, name: event.target.value }) } } 
//                         onBlur={ (event) => { event.target.value ? setShareholderError({ ...shareholderError, name: { value: false, msg: '' } }) : setShareholderError({ ...shareholderError, name: { value: true, msg: 'Это поле является обязательным для заполнения' } }) } }
//                         error={ shareholderError.name.value }
//                         helperText={shareholderError.name.value ? shareholderError.name.msg : null}
//                         className='invite__input'
//                       /> 
//                     </div>
//                     <div className="invite__item">
//                       <p className="invite__label">Количество акций</p>
//                       <TextField 
//                         fullWidth
//                         value={row.numOfShares}
//                         type='number'
//                         onChange={ (event) => { setRow({ ...row, numOfShares: event.target.value }) } } 
//                         className='invite__input'
//                       /> 
//                     </div>
//                     <div className="invite__item">
//                       <h2 className="invite__label">Дата акционерного соглашения</h2>
//                       <LocalizationProvider dateAdapter={AdapterDateFns} locale={ruLocale}>
//                         <DatePicker
//                           mask={'__.__.____'}
//                           value={row.shareholderDate}
//                           onChange={handleShareholderDateChange}
//                           maxDate={new Date()}
//                           minDate={minDate}
//                           renderInput={
//                             (params) => 
//                               <TextField 
//                                 {...params}
//                                 fullWidth 
//                                 value={row.shareholderDate}
//                                 onBlur={handleShareholderDateBlur}
//                                 error={ shareholderError.shareholderDate.value }
//                                 helperText={ shareholderError.shareholderDate.value ? shareholderError.shareholderDate.msg : null }
//                                 className="invite__input" 
//                               />
//                           }
//                           clearable={true}
//                         />
//                       </LocalizationProvider>
//                     </div>
//                   </div>
//                   <Button disableElevation variant='contained' onClick={handleAddShareholder}>Добавить</Button>
//                 </div>
//                 <div className="invite__list">
//                   {
//                     shareholders.length < 1 ? 
//                       <p className='invite__similar'>Вы еще не добавили ни одного акционера</p> :
//                       <div className='invite__grid'>
//                         <div className="invite__columns">
//                           <div className="invite__column">ФИО/Наименование лица</div>
//                           <div className="invite__column">Количество акций</div>
//                           <div className="invite__column">Дата акционерного соглашения</div>
//                           <div className="invite__column invite__column_btn"></div>
//                         </div>
//                         <div className="invite__rows">
//                           {
//                             shareholders.map((shareholder, index) => {
//                               return (
//                                 <div className="invite__row" key={index} data-id={index}>
//                                   <Tooltip title={shareholder.name}>
//                                     <Typography noWrap>
//                                       {shareholder.name}
//                                     </Typography>
//                                   </Tooltip>
//                                   <Tooltip title={shareholder.numOfShares}>
//                                     <Typography noWrap>
//                                       {shareholder.numOfShares}
//                                     </Typography>
//                                   </Tooltip>
//                                   <Tooltip title={shareholder.shareholderDate ? shareholder.shareholderDate.toLocaleDateString() : ''}>
//                                     <Typography noWrap>
//                                       {shareholder.shareholderDate ? shareholder.shareholderDate.toLocaleDateString() : ''}
//                                     </Typography>
//                                   </Tooltip>
//                                   <Button onClick={handleDeleteShareholder}>
//                                     <SvgIcon>
//                                     <path fill="currentColor" d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
//                                     </SvgIcon>
//                                   </Button>
//                                 </div>
//                               )
//                             })
//                           }
//                         </div>
//                       </div>
//                   }
//                 </div>
//               </div>
//               <div className="invite__controls invite__controls_center">
//                 <Button disableElevation variant='contained' onClick={ () => { setStep(step - 1) }}>Назад</Button>
//                 <Button disableElevation variant='contained' onClick={ () => { setStep(step + 1) }}>Далее</Button>
//               </div>
//             </div>
//           </TabPanel>
//           <TabPanel value={'4'}>
//             {
//               loading ? 
//                 getLoadingScreen() :
//                 <div className="invite__wrapper invite__wrapper_normal">
//                   <div className="invite__title">
//                     <h2>Теперь все готово, <br /> чтобы создать вашу компанию</h2>
//                   </div>
//                   <div className="invite__controls invite__controls_center">
//                     <Button disableElevation variant='contained' onClick={ () => { setStep(step - 1) }}>Назад</Button>
//                     <Button disableElevation variant='contained' onClick={handleAddClient} >Создать компанию</Button>
//                   </div>
//                 </div>
//             }
//           </TabPanel>
//         </TabContext>
//       </div>
//       <Snackbar open={snack.visibility} autoHideDuration={6000} onClose={ () => { setSnack({ text: '', severity: 'success', visibility: false }) } }>
//         <Alert severity={snack.severity} onClose={ () => { setSnack({ text: '', severity: 'success', visibility: false }) } }>
//           {snack.text}
//         </Alert>
//       </Snackbar>
//     </div>
//   )
// }