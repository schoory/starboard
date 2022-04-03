
import { useContext, useState, useEffect, useRef, useCallback } from "react"

import { Link, useNavigate, useSearchParams } from 'react-router-dom'

import { AuthContext } from "../context/AuthContext"
import { CompanyContext } from "../context/CompanyContext"
import { SocketContext } from "../context/SocketContext"
import { useHttp } from "../hooks/http.hook"

import { InputAdornment, Alert, Snackbar, Typography, Stack, Breadcrumbs, CircularProgress, Tab, Button, SvgIcon, Dialog, DialogContent, DialogActions, TextField, Autocomplete, Switch, Chip, Box, Popover, Tooltip, Menu, MenuItem, Divider } from "@mui/material"
import { TabList, TabPanel, TabContext } from '@mui/lab'
import DatePicker from '@mui/lab/DatePicker'
import MobileDatePicker from '@mui/lab/MobileDatePicker'
import AdapterDateFns from '@mui/lab/AdapterDateFns'
import LocalizationProvider from '@mui/lab/LocalizationProvider'

import ruLocale from 'date-fns/locale/ru';

import { saveAs } from 'file-saver'

import { Stargrid } from "../components/Stargrid"

import { useMediaQuery } from "@mui/material"

import './ClientPage.css'

export const ClientPage = () => {

  const { loading, request, requestUploadFile, requestFile, error, clearError } = useHttp()

  const auth = useContext(AuthContext)
  const company = useContext(CompanyContext)
  const socket = useContext(SocketContext)

  const navigate = useNavigate()

  // ? параметры адресной строки
  const [searchParams, setSearchParams] = useSearchParams()

  // ? активная вкладка
  const [tab, setTab] = useState('info')

  // ? поля со сведениями о клиенте
  const [fields, setFields] = useState({
    registeredAddress: { disabled: true, value: '' },
    email: { disabled: true, value: '' },
    UEN: { disabled: true, value: '' },
    UENStatus: { disabled: true, value: '' },
    UENDate: { disabled: true, value: '' },
    lastAGM: { disabled: true, value: '' },
    lastARFilled: { disabled: true, value: '' },
    capital: { disabled: true, value: '' },
    shareCapital: { disabled: true, value: '' },
    numOfShares: { disabled: true, value: '' }
  })

  // ? информация о клиенте
  const [client, setClient] = useState(null)
  // ? приглашения отправленные клиентом
  const [invites, setInvites] = useState([])
  const [allInvites, setAllInvites] = useState([])
  
  // ? документы клиента
  const [documents, setDocuments] = useState({ 
    sections: [],
    docs: [],
    activeSection: 0
  })
  const [allDocuments, setAllDocuments] = useState([])

  // ? колонки для таблицы директоров
  const [dirColumns, setDirColumns] = useState([
    { name: 'check',        type: 'boolean',    label: '', width: 50, checked: false },
    { name: 'id',           type: 'index',      label: '', visible: false, width: 0},
    { name: 'post',         type: 'title',     label: 'Занимаемая должность'},
    { name: 'firstName',    type: 'title',     label: 'Имя' },
    { name: 'lastName',     type: 'title',     label: 'Фамилия' },
    { name: 'birthDate',    type: 'date',       label: 'Дата рождения' },
    { name: 'email',        type: 'string',     label: 'Электронная почта' },
    { name: 'phoneNumber',  type: 'string',     label: 'Номер телефона' }
  ])
  // ? колонки для таблицы акционеров
  const [shareColumns, setShareColumns] = useState([
    { name: 'check',              type: 'boolean',    label: '', width: 50, checked: false },
    { name: 'id',                 type: 'index',      label: '', visible: false, width: 0},
    { name: 'name',               type: 'title',     label: 'Наименование/ФИО акционера'},
    { name: 'shareholderDate',    type: 'date',       label: 'Дата акционерного соглашения' },
    { name: 'numOfShares',        type: 'title',     label: 'Количество акций' },
    { name: 'percentage',         type: 'title',     label: '%', width: 100 },
  ])

  // ? Строки для таблицы директоров
  const [dirRows, setDirRows] = useState([])
  // ? Строки для таблицы акционеров
  const [shareRows, setShareRows] = useState([])

  // ? меню файла
  const [documentMenu, setDocumentMenu] = useState({
    visible: false, anchor: null, id: '', fileName: ''
  })

  // ? диалоговое окно Новая должность
  const [dialogPost, setDialogPost] = useState({
    visible: false, id: '', firstName: '', lastName: '', newPost: ''
  })
  // ? диалоговое окно Приглашение директору 
  const [dialogInvite, setDialogInvite] = useState({
    visible: false, email: '', post: '', msg: ''
  })
  // ? диалоговое окно удаление директора
  const [dialogDelDirector, setDialogDelDirector] = useState({
    visible: false, id: ''
  })
  // ? диалоговое окно добавление/изменение акционера
  const [dialogShareholder, setDialogShareholder] = useState({ 
    type: 'add', visible: false, name: '', shareDate: '', numOfShares: '', person: false, id: ''
  })
  // ? диалоговое окно удаление акционера
  const [dialogDelShareholder, setDialogDelShareholder] = useState({
    visible: false, id: ''
  })
  // ? диалоговое окно добавления документа
  const [newDocument, setNewDocument] = useState({
    visible: false, file: '', name: '', description: '', section: '', tags: new Array(), tagPopover: false, tagAnchor: null, add: ''
  })
  // ? диалоговое окно подробной информации о файле
  const [documentDetail, setDocumentDetail] = useState({
    visible: false, id: '', title: '', description: '', dateOfCreation: null, owner: '', section: '', tags: []
  })
  // ? диалоговое окно изменения документа
  const [documentUpdate, setDocumentUpdate] = useState({
    visible: false, id: '', title: '', description: '', dateOfCreation: null, owner: '', section: '', tags: []
  })
  // ? диалоговое окно удаления документа
  const [documentDelete, setDocumentDelete] = useState({ visible: false, id: '' })

  // ? поиск по тэгам
  const [tagSearch, setTagSearch] = useState({
    tags: [], add: '', anchor: null, visible: false
  })

  const [snack, setSnack] = useState({
    text: '', severity: 'warning', visibility: false
  })

  const smScreen = useMediaQuery('(max-width: 900px)')

  const breadcrumbs = [
    <Link key='3' className='client__bread' to="/clients">Клиенты</Link>,
    <Typography 
      key='3' 
      className={tab === '1' ? 'client__bread client__bread_active' : 'client__bread'} 
      onClick={() => { setTab('1') }}
    >
      { client ? client.client.clientName : null }
    </Typography>,
    tab === '2' ? 
      <Typography 
        key='3' 
        className='client__bread client__bread_active'
        onClick={() => { setTab('2') }}
      >
        Директора
      </Typography> : null,
    tab === '3' ? 
      <Typography 
        key='3' 
        className='client__bread client__bread_active'
        onClick={() => { setTab('3') }}
      >
        Акционеры
      </Typography> : null,
    tab === '4' ? 
      <Typography 
        key='3' 
        className='client__bread client__bread_active'
        onClick={() => { setTab('4') }}
      >
        Документы
      </Typography> : null
  ]

  // * создание набора данных для таблицы директоров
  const makeDirectorsDataSet = (data) => {
    let rows = new Array()
    data.map(row => {
      rows.push({
        check: { type: 'boolean', value: false, width: 50, label: '' },
        id: { type: 'index', value: row._id, visible: false, width: 0 },
        post: { type: 'title', value: row.post ? row.post : '' },
        firstName: { type: 'title', value: row.firstName },
        lastName: { type: 'title', value: row.lastName },
        birthDate: { type: 'date', value: row.birthDate },
        email: { type: 'string', value: row.email },
        phoneNumber: { type: 'string', value: row.phoneNumber },
      })
    })
    setDirRows(rows)
  }

  // * создание набора данных для таблицы акционеров
  const makeShareholderDataSet = (data) => {
    let rows = new Array()
    const summary = data.reduce((prev, item) => {
      return prev + (+item.numOfShares)
    }, 0)
    data.map(row => {
      rows.push({
        check: { type: 'boolean', value: false, width: 50, label: '' },
        id: { type: 'index', value: row._id, visible: false, width: 0 },
        name: { type: 'title', value: row.name },
        shareholderDate: { type: 'date', value: row.shareholderDate },
        numOfShares: { type: 'title', value: row.numOfShares },
        percentage: { type: 'title', value: `${Math.round(row.numOfShares / summary * 100)}%`, width: 100 }
      })
    })
    rows = rows.sort((a, b) => {
      return Math.round(b.numOfShares.value / summary * 100) - Math.round(a.numOfShares.value / summary * 100)
    })
    setShareRows(rows)
  }

  // * получение данных о приглашениях
  const handleGetInvites = () => {
    const location = document.location.pathname.replace('/client/', '')
    const clientId = client ? client.client._id : location.substring(0, location.indexOf('/') !== -1 ? location.indexOf('/') : location.length)
    request('/api/client/getinvites', 'POST', { clientId: clientId }, {
      Authorization: `Bearer ${auth.token}`
    }).then(data => {
      setAllInvites(data.invites)
      setInvites(data.invites)
    })
  }
  
  // * получение данных о документах клиента
  const handleGetDocuments = useCallback(() => {
    const location = document.location.pathname.replace('/client/', '')
    const clientId = client ? client.client._id : location.substring(0, location.indexOf('/') !== -1 ? location.indexOf('/') : location.length)
    request('/api/client/getdocuments', 'POST', { clientId: clientId, companyId: company.companyId }, {
      Authorization: `Bearer ${auth.token}`
    }).then(data => { 

      // ? секции документов
      const sections = data.data.reduce((prev, current) => {
        if (!prev.includes(current.section)) {
          prev.push(current.section)
        }
        return prev
      }, [])

      setAllDocuments( data.data )
      setDocuments({ ...documents, sections: sections, docs: data.data })
    })
  }, [documents])

  // * получения данных о клиенте
  const handleGetClient = () => {
    const location = document.location.pathname.replace('/client/', '')
    const clientId = client ? client.client._id : location.substring(0, location.indexOf('/') !== -1 ? location.indexOf('/') : location.length)
    request('/api/client/getclientinfo', 'POST', { clientId: clientId }, {
      Authorization: `Bearer ${auth.token}`
    }).then(data => {
      setClient(data)
      handleGetDocuments()
      handleGetInvites()
    })
  }

  // * подключение слушателей сокета
  useEffect(() => {
    socket.socket.on('client-update', handleGetClient)
    socket.socket.on('client-documents-get', handleGetDocuments)
    socket.socket.on('client-invites-update', handleGetInvites)
    return () => {
      socket.socket.removeListener('client-update', handleGetClient)
      socket.socket.removeListener('client-documents-get', handleGetDocuments)
      socket.socket.removeListener('client-invites-update', handleGetInvites)
    }
  }, [company])
  
  // * подключение сокета к комнате
  useEffect(() => {
    if (client) {
      socket.socket.emit('join-room', `/clients/${client.client._id}`)
    }
  }, [client])

  // * получение информации о клиенте
  useEffect(() => {
    if (company.companyId && !client) {
      handleGetClient()
    }
  }, [company])

  // * установка полей со сведениями о клиентах
  useEffect(() => {
    if (client) {
      setFields({
        registeredAddress: { ...fields.registeredAddress, disabled: true, value: client.client.registeredAddress },
        email: { ...fields.email, disabled: true, value: client.client.email },
        UEN: { ...fields.UEN, disabled: true, value: client.client.UEN },
        UENStatus: { ...fields.UENStatus, disabled: true, value: client.client.UENStatus },
        UENDate: { ...fields.UENDate, disabled: true, value: client.client.UENDate },
        lastAGM: { ...fields.lastAGM, disabled: true, value: client.client.lastAGM },
        lastARFilled: { ...fields.lastARFilled, disabled: true, value: client.client.lastARFilled },
        capital: { ...fields.capital, disabled: true, value: client.client.capital },
        shareCapital: { ...fields.shareCapital, disabled: true, value: client.client.shareCapital },
        numOfShares: { ...fields.numOfShares, disabled: true, value: client.client.numOfShares }
      })
    }
  }, [client])

  // * установка вкладки при передачи через адресную строку
  useEffect(() => {
    let tab = searchParams.get('tab')
    if (tab) {
      if (!['info', 'directors', 'shareholders', 'documents'].includes(tab)) {
        tab = 'info'
      }
      setTab(tab)
    } else {
      setTab('info')
    }
  }, [searchParams])

  // * поиск файлов по тэгам
  useEffect(() => {

    if (tagSearch.tags.length > 0) {

      const sRows = allDocuments.filter(item => tagSearch.tags.every(tag => item.tags.includes(tag)))
      setDocuments({ ...documents, docs: sRows })

    }

  }, [tagSearch])

  // * Подготовка наборов данных для таблиц
  useEffect(() => {
    if (client) {
      if (client.directors && client.directors.length > 0) {
        makeDirectorsDataSet(client.directors)
      }
      if (client.shareholders && client.shareholders.length > 0) {
        makeShareholderDataSet(client.shareholders)
      }
    }
  }, [client])

  // * Вывод ошибок 
  useEffect(() => {
    if (error) {
      setSnack({ text: error, severity: 'error', visibility: true})
    }
    clearError()
  }, [error, clearError])

  // @ Вкладка информация

  // * редирект на сайт google maps
  const handleViewMap = () => {
    const address = client.client.registeredAddress
    if (address) {
      let win = window.open(`https://www.google.ru/maps/search/${address.replace(/ /g, '+')}`)
      win.focus()
    }
  }

  // * валидация полей 
  const handleValidateFields = () => {
    
    for (let key in fields) {
      const value = fields[key].value
      switch (key) {
        case 'email':
          const regexEmail = /^(([^<>()[\]\.,;:\s@\"]+(\.[^<>()[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})$/i;
          if (!value.toLowerCase().match(regexEmail)) {
            return [true, 'Некорректное значение поля email']
          }
          break
        case 'UENDate':
          if (!value) {
            return [true, 'Значение поля является обязательным']
          }
        case 'lastAGM':
        case 'lastARFilled':
          const dateValue = new Date(value)
          if (isNaN(dateValue.getDate())) {
            return [true, 'Значение поля не является датой']
          } else {
            const maxDate = new Date()
            const minDate = new Date('1900-01-01')

            if (dateValue > maxDate) {
              return [true, 'Значение поля больше допустимого значения']
            }
            if (dateValue < minDate) {
              return [true, 'Значение поля меньше допустимого значения']
            }
          }
          break
        case 'UEN':
          if (!value) {
            return [true, 'Значение ИНН является обязательным']
          }
          const regexUEN = new RegExp('(^\\d{12}$)|(^\\d{10}$)')
          if (!regexUEN.test(value)) {
            return [true, 'Некорректное значение поля ИНН']
          }
          break
        case 'UENStatus': 
          if (!value) {
            return [true, 'Статус ИНН является обязательным']
          }
          break
        default:
          break
      }
    }

    return new Array(false, '')
  }

  // * переключение режима изменения
  const handleAwailableEdit = ({ currentTarget: { parentNode } }) => {
    const nodes = parentNode.parentNode.childNodes
    const input = Array.from(nodes).find(node => node.name)
    const name = input.name
    const field = fields[name]

    if (!field.disabled) {
      const [error, errorMessage] = handleValidateFields()
      if (!error) {
        request('/api/client/changeinfo', 'POST', { clientId: client.client._id, field: { name: name, value: field.value } }, {
          Authorization: `Bearer ${auth.token}`
        }).then(data => {
          handleGetClient()
          socket.socket.emit('client-changed', { id: `/clients/${client.client._id}` })
          setSnack({ visibility: true, severity: 'success', text: data.msg })
        })
      } else {
        return setSnack({ visibility: true, severity: 'error', text: errorMessage })
      }
    }
    
    setFields({ ...fields, [name]: { disabled: !field.disabled, value: field.value } })
  }

  // * очищение полей с датами
  const handleClearInput = ({ currentTarget: { parentNode } }) => {
    const nodes = parentNode.parentNode.childNodes
    const input = Array.from(nodes).find(node => node.name)
    const name = input.name
    const field = fields[name]

    setFields({ ...fields, [name]: { disabled: field.disabled, value: null } })
  }

  // * изменение поля информации о клиенте
  const handleEditField = ({ currentTarget: { value, name } }) => {
    setFields({ ...fields, [name]: { disabled: fields[name].disabled, value: value } })
  }

  // * переход к чату с контактным лицом
  const handleMainContactChat = () => {
    navigate(`/messages?newchat=${client.mainContact._id}`)
  }

  // * смена статуса клиента
  const handleClientStatus = ({ currentTarget }) => {
    const value = currentTarget.getAttribute('data-value')
    if (['Active', 'Inactive', 'Archived'].includes(value)) {
      request('/api/client/changeinfo', 'POST', { clientId: client.client._id, field: { name: 'clientStatus', value: value } }, {
        Authorization: `Bearer ${auth.token}`
      }).then(data => {
        handleGetClient()
        socket.socket.emit('client-changed', { id: `/clients/${client.client._id}` })
        setSnack({ visibility: true, severity: 'success', text: data.msg })
      })
    }
  }

  // * вывод средств в денежном формате 
  const handleCapitalFormat = (capital) => {
    const capitalFormat = capital.split('').reduceRight((result, item, index) => {
      const i = ( ( ((capital.length - index) % 3) === 0 ) ? ' ' : '' )
      return (i + item + result)
  }, '');

    return ((capitalFormat[0] === ' ') ? capitalFormat.slice(1) : capitalFormat);
  }

  // * удаление приглашения
  const handleDeleteInvite = ({ currentTarget }) => {
    const id = currentTarget.parentNode.getAttribute('data-id')
    request('/api/client/deleteinvites', 'POST', { id: id }, {
      Authorization: `Bearer ${auth.token}`
    }).then(data => {
      handleGetInvites()
      socket.socket.emit('client-invites-changed', { id: `/clients/${client.client._id}` })
      socket.socket.emit('notification-push')
      setSnack({ text: data.msg, visibility: true, severity: 'success' })
    })
  }

  // * поиск приглашения 
  const handleSearchInvites = ({ currentTarget }) => {
    const value = currentTarget.value.toLowerCase()
    if (!value) {
      setInvites(allInvites)
    }
    setInvites(allInvites.filter(invite => 
      invite.to.email ? 
        invite.to.email.toLowerCase().indexOf(value) !== -1 :
        'не указано'.indexOf(value) !== -1
    ))
  }

  // * отображение статуса клиента
  const renderClientStatus = () => {
    switch (client.client.clientStatus) {
      case 'Active':
        return `Компания активна с `
      case 'Inactive':
        return `Компания неактивна с `
      case 'Archived': 
        return `Компания находится в архиве с `
      default:
        return `Статус неизвестен`
    }
  }

  // * отображения списка приглашений
  const renderClientInvites = () => {
    if (invites.length === 0) {
      return (
        <div className="client__info-invites-list client__info-invites-list_empty">
          <p>У компании нет приглашений ожидающих принятия</p>
        </div>
      )
    } else {
      let sRows = new Array()
      invites.map((item, index) => {
        sRows.push(
          <div className="client__info-invites-item" key={index}>
            <div>
              <Tooltip title='Приглашение'>
                <Typography noWrap>
                  Приглашение
                </Typography>
              </Tooltip>
              <Tooltip title={item.to.email ? item.to.email : 'Не указано'}>
                <Typography noWrap>
                  {
                    item.to.email ? item.to.email : 'Не указано'
                  }
                </Typography>
              </Tooltip>
            </div>
            <div>
              <Tooltip title='Должность'>
                <Typography noWrap>
                  Должность
                </Typography>
              </Tooltip>
              <Tooltip title={item.params && item.params.post ? item.params.post : 'Не указано'}>
                <Typography noWrap>
                  {
                    item.params && item.params.post ? item.params.post : 'Не указано'
                  }
                </Typography>
              </Tooltip>
            </div>
            <div>
              <Tooltip title='Имя'>
                <Typography noWrap>
                  Имя
                </Typography>
              </Tooltip>
              <Tooltip title={item.to ? `${item.to.firstName} ${item.to.lastName}` : 'Не указано'}>
                <Typography noWrap>
                  {
                    item.to ? `${item.to.firstName} ${item.to.lastName}` : 'Не указано'
                  }
                </Typography>
              </Tooltip>
            </div>
            <div>
              <Tooltip title='Дата создания'>
                <Typography noWrap>
                  Дата создания
                </Typography>
              </Tooltip>
              <Tooltip title={item.creation ? new Date(item.creation).toLocaleDateString() : 'Не указано'}>
                <Typography noWrap>
                  {
                    item.creation ? new Date(item.creation).toLocaleDateString() : 'Не указано'
                  }
                </Typography>
              </Tooltip>
            </div>
            {
              company.admins.includes(auth.userId) ? 
                <div className="client__info-invites-item-controls" data-id={item._id}>
                  <Button className='client__btn client__btn-fullWidth' disableRipple onClick={handleDeleteInvite}>
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
      return (
        <div className="client__info-invites-list">
          {
            sRows
          }
        </div>
      )
    }
  }

  // * отображение вкладки информации
  const renderInfoScreen = () => {
    return (
      <div className="client__info">
        <div className="client__info-title">
          <p>
            {
              client.client.clientName
            }
          </p>
          <div className="client__info-title-actions">
            <p data-status={client.client.clientStatus}>
              { renderClientStatus() }
              {
                client.client.statusDate ? 
                  new Date(client.client.statusDate).toLocaleDateString() : 
                  client.client.dateOfReg ? 
                    new Date(client.client.dateOfReg).toLocaleDateString() :
                    'не указано'
              }
            </p>
            {
              client.client.clientStatus === 'Active' ?
                <div>
                  <Button 
                    className='company__users-btn' 
                    disableRipple
                    data-value='Inactive'
                    onClick={handleClientStatus}
                  >
                    <Tooltip title='Пометить компанию как недействующую'>
                      <SvgIcon>
                        <path fill="currentColor" d="M23,12H17V10L20.39,6H17V4H23V6L19.62,10H23V12M15,16H9V14L12.39,10H9V8H15V10L11.62,14H15V16M7,20H1V18L4.39,14H1V12H7V14L3.62,18H7V20Z" />
                      </SvgIcon>
                    </Tooltip>
                  </Button>
                  <Button 
                    className='company__users-btn' 
                    disableRipple
                    data-value='Archived'
                    onClick={handleClientStatus}
                  >
                    <Tooltip title='Поместить компанию в архив'>
                      <SvgIcon>
                        <path fill="currentColor" d="M20 21H4V10H6V19H18V10H20V21M3 3H21V9H3V3M5 5V7H19V5M10.5 17V14H8L12 10L16 14H13.5V17" />
                      </SvgIcon>
                    </Tooltip>
                  </Button> 
                </div> : 
                <></>
            }
            {
              client.client.clientStatus === 'Inactive' ?
                <div>
                  <Button 
                    className='company__users-btn' 
                    disableRipple
                    data-value='Active'
                    onClick={handleClientStatus}
                  >
                    <Tooltip title='Пометить компанию как действующую'>
                      <SvgIcon>
                        <path fill="currentColor" d="M2,5.27L3.28,4L20,20.72L18.73,22L12.73,16H9V14L9.79,13.06L2,5.27M23,12H17V10L20.39,6H17V4H23V6L19.62,10H23V12M9.82,8H15V10L13.54,11.72L9.82,8M7,20H1V18L4.39,14H1V12H7V14L3.62,18H7V20Z" />
                      </SvgIcon>
                    </Tooltip>
                  </Button> 
                  <Button 
                    className='company__users-btn' 
                    disableRipple
                    data-value='Archived'
                    onClick={handleClientStatus}
                  >
                    <Tooltip title='Поместить компанию в архив'>
                      <SvgIcon>
                        <path fill="currentColor" d="M20 21H4V10H6V19H18V10H20V21M3 3H21V9H3V3M5 5V7H19V5M10.5 17V14H8L12 10L16 14H13.5V17" />
                      </SvgIcon>
                    </Tooltip>
                  </Button> 
                </div> : 
                <></>
            }
            {
              client.client.clientStatus === 'Archived' ?
                <div>
                  <Button 
                    className='company__users-btn' 
                    disableRipple
                    data-value='Active'
                    onClick={handleClientStatus}
                  >
                    <Tooltip title='Пометить компанию как действующую'>
                      <SvgIcon>
                        <path fill="currentColor" d="M8.2 5L6.2 3H21V9H12.2L10.2 7H19V5H8.2M20 16.8V10H18V14.8L20 16.8M20 19.35V19.34L18 17.34V17.35L9.66 9H9.66L7.66 7H7.66L6.13 5.47L2.39 1.73L1.11 3L3 4.89V9H7.11L17.11 19H6V10H4V21H19.11L20.84 22.73L22.11 21.46L20 19.35Z" />
                      </SvgIcon>
                    </Tooltip>
                  </Button>
                </div> : 
                <></>
            }
          </div>
        </div>
        <div className="client__info-wrapper">
          <div className="client__info-list">
            <div className="client__info-item">
              <div className="client__info-subitem">
                <p className="client__info-label">Адрес регистрации</p>
                <Tooltip title={client.client.registeredAddress}>
                  <TextField
                    className="client__info-value"
                    name='registeredAddress'
                    disabled={fields.registeredAddress.disabled}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          {
                            company.admins.includes(auth.userId) ?
                            <Button className='company__users-btn' onClick={handleAwailableEdit}>
                              <SvgIcon>
                              {
                                fields.registeredAddress.disabled ? 
                                  <path fill="currentColor" d="M14.06,9L15,9.94L5.92,19H5V18.08L14.06,9M17.66,3C17.41,3 17.15,3.1 16.96,3.29L15.13,5.12L18.88,8.87L20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18.17,3.09 17.92,3 17.66,3M14.06,6.19L3,17.25V21H6.75L17.81,9.94L14.06,6.19Z" /> :
                                  <path fill="currentColor" d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z" />
                              }
                              </SvgIcon>
                            </Button> : <></>
                          }
                          {
                            client.client.registeredAddress ? 
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
                    value={
                      fields.registeredAddress.value ? fields.registeredAddress.value : 'Нет информации'
                    } 
                    onChange={handleEditField}
                  />
                </Tooltip>
              </div>
              <div className="client__info-subitem">
                <p className="client__info-label">Электронная почта</p>
                <Tooltip title={client.client.email}>
                  <TextField
                    className="client__info-value"
                    disabled={fields.email.disabled}
                    name='email'
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          {
                            company.admins.includes(auth.userId) ?
                            <Button className='company__users-btn' onClick={handleAwailableEdit}>
                              <SvgIcon>
                                {
                                  fields.email.disabled ? 
                                    <path fill="currentColor" d="M14.06,9L15,9.94L5.92,19H5V18.08L14.06,9M17.66,3C17.41,3 17.15,3.1 16.96,3.29L15.13,5.12L18.88,8.87L20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18.17,3.09 17.92,3 17.66,3M14.06,6.19L3,17.25V21H6.75L17.81,9.94L14.06,6.19Z" /> :
                                    <path fill="currentColor" d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z" />
                                }  
                              </SvgIcon>
                            </Button> : <></>
                          }
                        </InputAdornment>
                      ),
                    }}
                    value={
                      fields.email.value ? fields.email.value : 'Нет информации'
                    } 
                    onChange={handleEditField}
                  />
                </Tooltip>
              </div>
            </div>
            <div className="client__info-item">
              <div className="client__info-subitem">
                <p className="client__info-label">ИНН</p>
                <Tooltip title={client.client.UEN}>
                  <TextField
                    className="client__info-value"
                    name='UEN'
                    disabled={fields.UEN.disabled}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          {
                            company.admins.includes(auth.userId) ?
                            <Button className='company__users-btn' onClick={handleAwailableEdit}>
                              <SvgIcon>
                                {
                                  fields.UEN.disabled ? 
                                    <path fill="currentColor" d="M14.06,9L15,9.94L5.92,19H5V18.08L14.06,9M17.66,3C17.41,3 17.15,3.1 16.96,3.29L15.13,5.12L18.88,8.87L20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18.17,3.09 17.92,3 17.66,3M14.06,6.19L3,17.25V21H6.75L17.81,9.94L14.06,6.19Z" /> :
                                    <path fill="currentColor" d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z" />
                                }  
                              </SvgIcon>
                            </Button> : <></>
                          }
                        </InputAdornment>
                      ),
                    }}
                    value={
                      fields.UEN.value ? fields.UEN.value : 'Нет информации'
                    } 
                    onChange={handleEditField}
                  />
                </Tooltip>
              </div>
              <div className="client__info-subitem">
                <p className="client__info-label">Статус ИНН</p>
                <Autocomplete
                  disablePortal
                  disableClearable
                  options={[ 'Действующее', 'В стадии ликвидации', 'В стадии реорганизации', 'Ликвидировано', 'В стадии банкротства' ]}
                  disabled={fields.UENStatus.disabled}
                  value={fields.UENStatus.value}
                  inputValue={fields.UENStatus.value}
                  isOptionEqualToValue={ (option, value) => value ? option === value : true }
                  onChange={ (event, value) => { setFields({ ...fields, UENStatus: { disabled: fields.UENStatus.disabled, value: value } }) } }
                  onInputChange={ (event, value) => { setFields({ ...fields, UENStatus: { disabled: fields.UENStatus.disabled, value: value } }) } }
                  renderInput={(params) => 
                    <TextField 
                      {...params} 
                      className="client__info-value"
                      name='UENStatus'
                      InputProps={{
                        ...params.InputProps,
                        endAdornment: (
                          <InputAdornment position="end">
                            {
                              company.admins.includes(auth.userId) ?
                              <Button className='company__users-btn' onClick={handleAwailableEdit}>
                                <SvgIcon>
                                  {
                                    fields.UENStatus.disabled ? 
                                      <path fill="currentColor" d="M14.06,9L15,9.94L5.92,19H5V18.08L14.06,9M17.66,3C17.41,3 17.15,3.1 16.96,3.29L15.13,5.12L18.88,8.87L20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18.17,3.09 17.92,3 17.66,3M14.06,6.19L3,17.25V21H6.75L17.81,9.94L14.06,6.19Z" /> :
                                      <path fill="currentColor" d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z" />
                                  } 
                                </SvgIcon>
                              </Button> : <></>
                            }
                          </InputAdornment>
                        ),
                      }}
                    />
                  }
                />
                {/* <TextField
                  className="client__info-value"
                  name='UENStatus'
                  disabled={fields.UENStatus.disabled}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        {
                          company.admins.includes(auth.userId) ?
                          <Button className='company__users-btn' onClick={handleAwailableEdit}>
                            <SvgIcon>
                              {
                                fields.UENStatus.disabled ? 
                                  <path fill="currentColor" d="M14.06,9L15,9.94L5.92,19H5V18.08L14.06,9M17.66,3C17.41,3 17.15,3.1 16.96,3.29L15.13,5.12L18.88,8.87L20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18.17,3.09 17.92,3 17.66,3M14.06,6.19L3,17.25V21H6.75L17.81,9.94L14.06,6.19Z" /> :
                                  <path fill="currentColor" d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z" />
                              } 
                            </SvgIcon>
                          </Button> : <></>
                        }
                      </InputAdornment>
                    ),
                  }}
                  value={
                    fields.UENStatus.value ? fields.UENStatus.value : 'Нет информации'
                  } 
                  onChange={handleEditField}
                /> */}
              </div>
              <div className="client__info-subitem">
                <p className="client__info-label">Дата постановки</p>
                <LocalizationProvider dateAdapter={AdapterDateFns} locale={ruLocale}>
                  <MobileDatePicker
                    disabled={fields.UENDate.disabled}
                    mask={'__.__.____'}
                    maxDate={new Date()}
                    minDate={new Date('1900-01-01')}
                    value={fields.UENDate.value ? new Date(fields.UENDate.value) : ''}
                    onChange={ (newValue) => { setFields({ ...fields, UENDate: { disabled: fields.UENDate.disabled, value: newValue } }) } }
                    renderInput={(params) => 
                      <TextField 
                        name="UENDate"
                        className="client__info-value"
                        helperText={!fields.UENDate.value ? 'Нет информации' : ''}
                        {...params} 
                        InputProps={{
                          ...params.InputProps,
                          endAdornment: (
                            <InputAdornment position="end">
                              {
                                !fields.UENDate.disabled ?
                                  <Button className='company__users-btn' onClick={handleClearInput}>
                                    <SvgIcon>
                                      <path fill="currentColor" d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
                                    </SvgIcon>
                                  </Button> : 
                                  <></>
                              }
                              {
                                company.admins.includes(auth.userId) ?
                                <Button className='company__users-btn' onClick={handleAwailableEdit}>
                                  <SvgIcon>
                                    {
                                      fields.UENDate.disabled ? 
                                        <path fill="currentColor" d="M14.06,9L15,9.94L5.92,19H5V18.08L14.06,9M17.66,3C17.41,3 17.15,3.1 16.96,3.29L15.13,5.12L18.88,8.87L20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18.17,3.09 17.92,3 17.66,3M14.06,6.19L3,17.25V21H6.75L17.81,9.94L14.06,6.19Z" /> :
                                        <path fill="currentColor" d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z" />
                                    }  
                                  </SvgIcon>
                                </Button> : <></>
                              }
                            </InputAdornment>
                          )
                        }}
                      />
                    }
                  />
                </LocalizationProvider>
              </div>
            </div>
            <div className="client__info-item">
              <div className="client__info-subitem">
                <p className="client__info-label">Дата последней встречи совета директоров</p>
                <LocalizationProvider dateAdapter={AdapterDateFns} locale={ruLocale}>
                  <MobileDatePicker
                    disabled={fields.lastAGM.disabled}
                    mask={'__.__.____'}
                    maxDate={new Date()}
                    minDate={new Date('1900-01-01')}
                    value={fields.lastAGM.value ? new Date(fields.lastAGM.value) : ''}
                    onChange={ (newValue) => { setFields({ ...fields, lastAGM: { disabled: fields.lastAGM.disabled, value: newValue } }) } }
                    renderInput={(params) => 
                      <TextField 
                        name="lastAGM"
                        className="client__info-value"
                        helperText={!fields.lastAGM.value ? 'Нет информации' : ''}
                        {...params} 
                        InputProps={{
                          ...params.InputProps,
                          endAdornment: (
                            <InputAdornment position="end">
                              {
                                !fields.lastAGM.disabled ?
                                  <Button className='company__users-btn' onClick={handleClearInput}>
                                    <SvgIcon>
                                      <path fill="currentColor" d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
                                    </SvgIcon>
                                  </Button> : 
                                  <></>
                              }
                              {
                                company.admins.includes(auth.userId) ?
                                <Button className='company__users-btn' onClick={handleAwailableEdit}>
                                  <SvgIcon>
                                    {
                                      fields.lastAGM.disabled ? 
                                        <path fill="currentColor" d="M14.06,9L15,9.94L5.92,19H5V18.08L14.06,9M17.66,3C17.41,3 17.15,3.1 16.96,3.29L15.13,5.12L18.88,8.87L20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18.17,3.09 17.92,3 17.66,3M14.06,6.19L3,17.25V21H6.75L17.81,9.94L14.06,6.19Z" /> :
                                        <path fill="currentColor" d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z" />
                                    }  
                                  </SvgIcon>
                                </Button> : <></>
                              }
                            </InputAdornment>
                          )
                        }}
                      />
                    }
                  />
                </LocalizationProvider>
              </div>
              <div className="client__info-subitem">
                <p className="client__info-label">Дата последнего декларирования доходов </p>
                <LocalizationProvider dateAdapter={AdapterDateFns} locale={ruLocale}>
                  <MobileDatePicker
                    disabled={fields.lastARFilled.disabled}
                    mask={'__.__.____'}
                    maxDate={new Date()}
                    minDate={new Date('1900-01-01')}
                    value={fields.lastARFilled.value ? new Date(fields.lastARFilled.value) : ''}
                    onChange={ (newValue) => { setFields({ ...fields, lastARFilled: { disabled: fields.lastARFilled.disabled, value: newValue } }) } }
                    renderInput={(params) => 
                      <TextField 
                        name="lastARFilled"
                        className="client__info-value"
                        helperText={!fields.lastARFilled.value ? 'Нет информации' : ''}
                        {...params} 
                        InputProps={{
                          ...params.InputProps,
                          endAdornment: (
                            <InputAdornment position="end">
                              {
                                !fields.lastARFilled.disabled ?
                                  <Button className='company__users-btn' onClick={handleClearInput}>
                                    <SvgIcon>
                                      <path fill="currentColor" d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
                                    </SvgIcon>
                                  </Button> : 
                                  <></>
                              }
                              {
                                company.admins.includes(auth.userId) ?
                                <Button className='company__users-btn' onClick={handleAwailableEdit}>
                                  <SvgIcon>
                                    {
                                      fields.lastARFilled.disabled ? 
                                        <path fill="currentColor" d="M14.06,9L15,9.94L5.92,19H5V18.08L14.06,9M17.66,3C17.41,3 17.15,3.1 16.96,3.29L15.13,5.12L18.88,8.87L20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18.17,3.09 17.92,3 17.66,3M14.06,6.19L3,17.25V21H6.75L17.81,9.94L14.06,6.19Z" /> :
                                        <path fill="currentColor" d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z" />
                                    }  
                                  </SvgIcon>
                                </Button> : <></>
                              }
                            </InputAdornment>
                          )
                        }}
                      />
                    }
                  />
                </LocalizationProvider>
              </div>
            </div>
            <div className="client__info-item">
              <div className="client__info-subitem">
                <p className="client__info-label">Оплаченный капитал</p>
                <Tooltip title={client.client.capital ? handleCapitalFormat(client.client.capital) : 'Нет информации'}>
                  <TextField
                    className="client__info-value"
                    name='capital'
                    disabled={fields.capital.disabled}
                    type='number'
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start" data-type='currency'>
                          <SvgIcon>
                            <path fill="currentColor" d="M7,15H9C9,16.08 10.37,17 12,17C13.63,17 15,16.08 15,15C15,13.9 13.96,13.5 11.76,12.97C9.64,12.44 7,11.78 7,9C7,7.21 8.47,5.69 10.5,5.18V3H13.5V5.18C15.53,5.69 17,7.21 17,9H15C15,7.92 13.63,7 12,7C10.37,7 9,7.92 9,9C9,10.1 10.04,10.5 12.24,11.03C14.36,11.56 17,12.22 17,15C17,16.79 15.53,18.31 13.5,18.82V21H10.5V18.82C8.47,18.31 7,16.79 7,15Z" />
                          </SvgIcon>
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          {
                            company.admins.includes(auth.userId) ?
                            <Button className='company__users-btn' onClick={handleAwailableEdit}>
                              <SvgIcon>
                                {
                                  fields.capital.disabled ? 
                                    <path fill="currentColor" d="M14.06,9L15,9.94L5.92,19H5V18.08L14.06,9M17.66,3C17.41,3 17.15,3.1 16.96,3.29L15.13,5.12L18.88,8.87L20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18.17,3.09 17.92,3 17.66,3M14.06,6.19L3,17.25V21H6.75L17.81,9.94L14.06,6.19Z" /> :
                                    <path fill="currentColor" d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z" />
                                }  
                              </SvgIcon>
                            </Button> : <></>
                          }
                        </InputAdornment>
                      ),
                    }}
                    value={
                      fields.capital.value ? fields.capital.value : '0'
                    } 
                    onChange={handleEditField}
                  />
                </Tooltip>
              </div>
              <div className="client__info-subitem">
                <p className="client__info-label">Стоимость акции</p>
                <Tooltip title={client.client.shareCapital ? handleCapitalFormat(client.client.shareCapital) : 'Нет информации'}>
                  <TextField
                    className="client__info-value"
                    name='shareCapital'
                    disabled={fields.shareCapital.disabled}
                    type='number'
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start" data-type='currency'>
                          <SvgIcon>
                            <path fill="currentColor" d="M7,15H9C9,16.08 10.37,17 12,17C13.63,17 15,16.08 15,15C15,13.9 13.96,13.5 11.76,12.97C9.64,12.44 7,11.78 7,9C7,7.21 8.47,5.69 10.5,5.18V3H13.5V5.18C15.53,5.69 17,7.21 17,9H15C15,7.92 13.63,7 12,7C10.37,7 9,7.92 9,9C9,10.1 10.04,10.5 12.24,11.03C14.36,11.56 17,12.22 17,15C17,16.79 15.53,18.31 13.5,18.82V21H10.5V18.82C8.47,18.31 7,16.79 7,15Z" />
                          </SvgIcon>
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          {
                            company.admins.includes(auth.userId) ?
                            <Button className='company__users-btn' onClick={handleAwailableEdit}>
                              <SvgIcon>
                                {
                                  fields.shareCapital.disabled ? 
                                    <path fill="currentColor" d="M14.06,9L15,9.94L5.92,19H5V18.08L14.06,9M17.66,3C17.41,3 17.15,3.1 16.96,3.29L15.13,5.12L18.88,8.87L20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18.17,3.09 17.92,3 17.66,3M14.06,6.19L3,17.25V21H6.75L17.81,9.94L14.06,6.19Z" /> :
                                    <path fill="currentColor" d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z" />
                                }  
                              </SvgIcon>
                            </Button> : <></>
                          }
                        </InputAdornment>
                      ),
                    }}
                    value={
                      fields.shareCapital.value ? fields.shareCapital.value : '0'
                    } 
                    onChange={handleEditField}
                  />
                </Tooltip>
              </div>
              <div className="client__info-subitem">
                <p className="client__info-label">Количество акций</p>
                <Tooltip title={client.client.numOfShares ? handleCapitalFormat(client.client.numOfShares) : 'Нет информации'}>
                  <TextField
                    className="client__info-value"
                    name='numOfShares'
                    disabled={fields.numOfShares.disabled}
                    type='number'
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          {
                            company.admins.includes(auth.userId) ?
                            <Button className='company__users-btn' onClick={handleAwailableEdit}>
                              <SvgIcon>
                                {
                                  fields.numOfShares.disabled ? 
                                    <path fill="currentColor" d="M14.06,9L15,9.94L5.92,19H5V18.08L14.06,9M17.66,3C17.41,3 17.15,3.1 16.96,3.29L15.13,5.12L18.88,8.87L20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18.17,3.09 17.92,3 17.66,3M14.06,6.19L3,17.25V21H6.75L17.81,9.94L14.06,6.19Z" /> :
                                    <path fill="currentColor" d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z" />
                                }
                              </SvgIcon>
                            </Button> : <></>
                          }
                        </InputAdornment>
                      ),
                    }}
                    value={
                      fields.numOfShares.value ? fields.numOfShares.value : '0'
                    } 
                    onChange={handleEditField}
                  />
                </Tooltip>
              </div>
            </div>
          </div>
          <div className="client__info-contact">
            <div className="client__info-contact-title">
              <Button 
                className='company__users-btn client__info-contact-btn' 
                disableRipple
                onClick={handleMainContactChat}
              >
                <SvgIcon>
                  <path fill="currentColor" d="M22 6C22 4.9 21.1 4 20 4H4C2.9 4 2 4.9 2 6V18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V6M20 6L12 11L4 6H20M20 18H4V8L12 13L20 8V18Z" />
                </SvgIcon>
              </Button>
              <p>Контактное лицо</p>
              <p>
                { 
                  `${client.mainContact.firstName} ${client.mainContact.lastName}` 
                }
              </p>
            </div>
            <div className="client__info-contact-list">
              <div className="client__info-contact-subitem">
                <p className="client__info-label">Электронная почта</p>
                <p className="client__info-value">{client.mainContact.email}</p>
              </div>
              <div className="client__info-subitecontact-subitem">
                <p className="client__info-label">Номер телефона</p>
                <p className="client__info-value">{client.mainContact.phoneNumber}</p>
              </div>
            </div>
          </div>
          <div className="client__info-invites">
            <div className="company__invites-title">
              <p>Приглашения ожидающие принятия</p>
              <TextField
                className="company__input"
                placeholder="Поиск по email"
                onChange={handleSearchInvites}
              />
            </div>
            <div className="client__info-invites-wrapper">
              {
                renderClientInvites()
              }
            </div>
          </div>
        </div>
      </div>
    )
  }

  // @ Вкладка Директора

  // * отображение диалогового окна смены должности
  const dialogChangePost = () => {
    const changedUser = dirRows.filter(user => Object.keys(user).find(key => user[key].type === 'boolean' && user[key].value === true))
    
    if (changedUser.length === 0) {
      return setSnack({ text: 'Прежде выберите пользователя', severity: 'warning', visibility: true})
    }
    if (changedUser.length > 1) {
      return setSnack({ text: 'Вы можете изменять только одного пользователя за раз', severity: 'warning', visibility: true})
    }

    const user = changedUser[0]

    setDialogPost({ 
      visible: true, 
      id: user.id.value, 
      firstName: user.firstName.value, 
      lastName: user.lastName.value, 
      newPost: user.post.value 
    })
  }

  // * cмена должности директора
  const handleChangePost = () => {
    request('/api/client/changedirectorpost', 'POST', { newPost: dialogPost.newPost, directorId: dialogPost.id }, {
      Authorization: `Bearer ${auth.token}`
    }).then(data => {
      socket.socket.emit('client-changed', { id: `/clients/${client.client._id}` })
      handleGetClient()
      setSnack({ text: data.msg, severity: 'success', visibility: true })
    })
    setDialogPost({ visible: false, firstName: '', lastName: '', id: '', newPost: '' })
  } 

  // * отправка приглашения для директора
  const handleInviteDirector = () => {
    if (!dialogInvite.email) {
      return setSnack({ text: 'Укажите электронную почту пользователя', severity: 'warning', visibility: true })
    }
    setDialogInvite({ visible: false, email: '', post: '', msg: '' })
    request('/api/client/inviteuser', 'POST', { 
      email: dialogInvite.email, clientId: client.client._id, clientName: client.client.clientName, message: dialogInvite.msg,
      post: dialogInvite.post
    }, {
      'Authorization': `Bearer ${auth.token}`
    }).then((data) => {
      handleGetInvites()
      socket.socket.emit('client-invites-changed', { id: `/clients/${client.client._id}` })
      socket.socket.emit('notification-push')
      setSnack({ text: data.msg, visibility: true, severity: 'success' })
    })
  }

  // * назначение контактным лицом
  const handleSetMainContact = () => {
    const changedUser = dirRows.filter(user => Object.keys(user).find(key => user[key].type === 'boolean' && user[key].value === true))
    
    if (changedUser.length === 0) {
      return setSnack({ text: 'Прежде выберите пользователя', severity: 'warning', visibility: true})
    }
    if (changedUser.length > 1) {
      return setSnack({ text: 'Контактным лицом может быть только один человек', severity: 'warning', visibility: true})
    }

    const user = changedUser[0]

    request('/api/client/setmaincontact', 'POST', { userId: user.id.value, clientId: client.client._id }, {
      Authorization: `Bearer ${auth.token}`
    }).then(data => {
      socket.socket.emit('client-changed', { id: `/clients/${client.client._id}` })
      setSnack({ text: data.msg, severity: 'success', visibility: true})
      handleGetClient()
    })
  }

  // * отображение диалогового окна удаления директора
  const dialogDeleteDirector = () => {
    const changedUser = dirRows.filter(user => Object.keys(user).find(key => user[key].type === 'boolean' && user[key].value === true))
    
    if (changedUser.length === 0) {
      return setSnack({ text: 'Прежде выберите пользователя', severity: 'warning', visibility: true})
    }
    if (changedUser.length > 1) {
      return setSnack({ text: 'Вы можете изменять только одного пользователя за раз', severity: 'warning', visibility: true})
    }

    const user = changedUser[0]

    setDialogDelDirector({ visible: true, id: user.id.value })
  }

  // * удаление директора
  const handleDeleteDirector = () => {
    request('/api/client/deletedirectors', 'POST', { userId: dialogDelDirector.id, clientId: client.client._id }, {
      Authorization: `Bearer ${auth.token}`
    }).then(data => {
      setDialogDelDirector({ visible: false, id: '' })
      socket.socket.emit('client-changed', { id: `/clients/${client.client._id}` })
      setSnack({ text: data.msg, severity: 'success', visibility: true})
      handleGetClient()
    })
  }

  // * отображение вкладки директоров
  const renderDirectorsScreen = () => {
    return (
      <div className="client__directors">
        { 
          company.admins.includes(auth.userId) ? 
            <div className="client__grid-controls">
              <Button className="client__btn client__btn_fullWidth" onClick={dialogChangePost}>
                Указать должность
              </Button>
              <Button className="client__btn client__btn_fullWidth" onClick={ () => setDialogInvite({ visible: true, email: '', post: '', msg: '' }) }>
                Отправить приглашение
              </Button>
              <Button className="client__btn client__btn_fullWidth" onClick={handleSetMainContact}>
                Назначить контактным лицом
              </Button>
              <Button className="client__btn client__btn_fullWidth" onClick={dialogDeleteDirector}>
                Снять с должности
              </Button>
            </div> : 
            <></>
        }
        <Stargrid columns={dirColumns} rows={dirRows} />
      </div>
    )
  }

  // @ Вкладка Акционеры

  // * валидация полей добавления/изменения акционера
  const handleValidateShareInputs = () => {
    if (!dialogShareholder.name.trim()) {
      setSnack({ visibility: true, text: 'Укажите наименование или ФИО акционера', severity: 'warning' })
      return false
    } 
    if (!dialogShareholder.numOfShares) {
      setSnack({ visibility: true, text: 'Укажите количество акций', severity: 'warning' })
      return false
    }
    if (!dialogShareholder.shareDate) {
      setSnack({ visibility: true, text: 'Укажите дату акционерного соглашения', severity: 'warning' })
      return false
    }
    return true
  }

  // * добавление/изменение акционера
  const handleProcessShare = () => {
    if (!handleValidateShareInputs()) {
      return
    }
    if (dialogShareholder.type === 'add') {
      request('/api/client/addshare', 'POST', { share: dialogShareholder, clientId: client.client._id }, {
        Authorization: `Bearer ${auth.token}`
      }).then(data => {
        socket.socket.emit('client-changed', { id: `/clients/${client.client._id}` })
        setSnack({ text: data.msg, severity: 'success', visibility: true })
        handleGetClient()
        setDialogShareholder({ type: 'add', visible: false, name: '', shareDate: '', numOfShares: '', id: '' })
      })
    } else {
      request('/api/client/updateshare', 'POST', { share: dialogShareholder, clientId: client.client._id }, {
        Authorization: `Bearer ${auth.token}`
      }).then(data => {
        socket.socket.emit('client-changed', { id: `/clients/${client.client._id}` })
        setSnack({ text: data.msg, severity: 'success', visibility: true })
        handleGetClient()
        setDialogShareholder({ type: 'add', visible: false, name: '', shareDate: '', numOfShares: '', id: '' })
      })
    }
  }

  // * изменение даты 
  const handleDateChange = (event) => {
    if (!event || isNaN(event.getTime())) { 
      setDialogShareholder({ ...dialogShareholder, shareDate: null })
    } else {
      setDialogShareholder({ ...dialogShareholder, shareDate: event })
    }
  }

  // * отображение диалогового окна изменения акционера
  const dialogUpdateShare = () => {
    const changedUser = shareRows.filter(user => Object.keys(user).find(key => user[key].type === 'boolean' && user[key].value === true))
    
    if (changedUser.length === 0) {
      return setSnack({ text: 'Прежде выберите пользователя', severity: 'warning', visibility: true})
    }
    if (changedUser.length > 1) {
      return setSnack({ text: 'Вы можете изменять только одного пользователя за раз', severity: 'warning', visibility: true})
    }

    const user = changedUser[0]

    setDialogShareholder({ 
      type: 'update', visible: true, name: user.name.value, shareDate: user.shareholderDate.value, 
      numOfShares: user.numOfShares.value, person: false, id: user.id.value
    })
  }

  // * отображение диалогового окна удаления акционера
  const dialogDeleteShare = () => {

    const changedUser = shareRows.filter(user => Object.keys(user).find(key => user[key].type === 'boolean' && user[key].value === true))
    
    if (changedUser.length === 0) {
      return setSnack({ text: 'Прежде выберите пользователя', severity: 'warning', visibility: true})
    }
    if (changedUser.length > 1) {
      return setSnack({ text: 'Вы можете изменять только одного пользователя за раз', severity: 'warning', visibility: true})
    }

    const user = changedUser[0]

    setDialogDelShareholder({ visible: true, id: user.id.value })
  }

  // * удаление акционера
  const handleDeleteShareholder = () => {
    request('/api/client/deleteshareholders', 'POST', { id: dialogDelShareholder.id, clientId: client.client._id }, {
      Authorization: `Bearer ${auth.token}`
    }).then(data => {
      socket.socket.emit('client-changed', { id: `/clients/${client.client._id}` })
      setSnack({ text: data.msg, severity: 'success', visibility: true})
      setDialogDelShareholder({ visible: false, id: '' })
      handleGetClient()
    })
  }

  // * оображение вкладки акционеров
  const renderShareholdersScreen = () => {
    return (
      <div className="client__shareholders">
        { 
          company.admins.includes(auth.userId) ? 
            <div className="client__grid-controls">
              <Button 
                className="client__btn client__btn_fullWidth" 
                onClick={ () => { 
                  setDialogShareholder({ type: 'add', visible: true, name: '', shareDate: '', numOfShares: '', person: false }) } 
                }
              >
                Добавить акционера
              </Button>
              <Button className="client__btn client__btn_fullWidth" onClick={dialogUpdateShare}>
                Изменить информацию
              </Button>
              <Button className="client__btn client__btn_fullWidth" onClick={dialogDeleteShare}>
                Удалить акционера
              </Button>
            </div> : 
            <></>
        }
        <Stargrid columns={shareColumns} rows={shareRows} />
      </div>
    )
  }

  // @ Вкладка Документы

  // * добавление тэга к новому файлу
  const handleAddDialogTag = (event) => {
    if (event.key === "Enter") {
      if (newDocument.add.trim() !== '') {
        if (!newDocument.tags.includes(newDocument.add.toUpperCase())) {
          let tags = newDocument.tags
          tags.push(newDocument.add.toUpperCase())
          setNewDocument({ ...newDocument, tags: tags, add: '' })
        } else {
          setSnack({ visibility: true, text: 'Этот тэг уже используется', severity: 'warning' })
        }
      } else {
        setSnack({ visibility: true, text: 'Введите тэг', severity: 'warning' })
      }
    }
  }

  // * cкачивание документа
  const handleDownloadDocument = () => {
    requestFile('/api/client/downloaddocument', 'POST', { docId: documentMenu.id }, {
      Authorization: `Bearer ${auth.token}`
    }).then(res => {
      res.blob().then(blob => {
        const pdfBlob = new Blob([blob], {type: "charset=utf-8"})
        saveAs(pdfBlob)
      })
    })
  }

  // * удаление тэга при изменении файла
  const handleDeleteTagUpdate = ({ currentTarget }) => {
    const tag = currentTarget.parentNode.getAttribute('data-tag')
    let tags = documentUpdate.tags
    tags.splice(tags.indexOf(tag), 1)
    setDocumentUpdate({ ...documentUpdate, tags: tags })
  }

  // * добавление тэга при изменении файла
  const handleAddTagUpdate = ({ key }) => {
    if (key === 'Enter') {
      if (!documentUpdate.add) {
        return setSnack({ visibility: true, text: 'Введите тэг', severity: 'warning' })
      }
      if (documentUpdate.tags.includes(documentUpdate.add.toUpperCase())) {
        return setSnack({ visibility: true, text: 'Этот тэг уже используется', severity: 'warning' })
      }
      let tags = documentUpdate.tags
      tags.push(documentUpdate.add.toUpperCase())
      setDocumentUpdate({ ...documentUpdate, add: '', tags: tags })
    }
  }

  // * изменение файла
  const handleUpdateFile = (event) => {
    if (!documentUpdate.title) {
      return setSnack({ text: 'Введите имя файла', severity: 'warning', visibility: true })
    }
    if (!documentUpdate.section) {
      return setSnack({ text: 'Укажите раздел файла', severity: 'warning', visibility: true })
    }
    if (documentUpdate.tags.length === 0) {
      return setSnack({ text: 'Укажите хотя бы один тэг для файла', severity: 'warning', visibility: true })
    }
    request('/api/client/updatedocument', 'POST', { id: documentUpdate.id, title: documentUpdate.title, description: documentUpdate.description, section: documentUpdate.section, tags: documentUpdate.tags }, {
      Authorization: `Bearer ${auth.token}`
    }).then(data => {
      socket.socket.emit('document-upload', { id: `/clients/${client.client._id}` })
      handleGetDocuments()
      setSnack({ text: data.msg, severity: 'success', visibility: true })
    })
  }

  // * удаление файла
  const handleDeleteFile = () => {
    request('/api/client/documentdelete', 'POST', { id: documentDelete.id }, {
      Authorization: `Bearer ${auth.token}`
    }).then(data => {
      socket.socket.emit('document-upload', { id: `/clients/${client.client._id}` })
      request('/api/client/getdocuments', 'POST', { clientId: client.client._id, companyId: company.companyId }, {
        Authorization: `Bearer ${auth.token}`
      }).then(data => setDocuments({ sections: [], docs: data.data, activeSection: 0 }))
      setDocumentDelete({ visible: false, id: '' })
      setSnack({ text: data.msg, severity: 'success', visibility: true })
    })
  }

  // * удаление тэга из поиска
  const handleRemoveTag = ({ currentTarget }) => {
    let tags = [ ...tagSearch.tags ]
    let itemIndex = tags.indexOf(currentTarget.parentNode.getAttribute('data-tag'))
    tags.splice(itemIndex, 1)
    setTagSearch({ ...tagSearch, tags: tags })
    
    if (tags.length === 0) {
      setDocuments({ ...documents, docs: allDocuments })
    }
  }

  // * добавление тэга к поиску
  const handleAddTag = (event) => {
    if (event.key === "Enter") {
      if (tagSearch.add.trim() !== '') {
        if (!tagSearch.tags.includes(tagSearch.add.toUpperCase())) {
          let tags = [ ...tagSearch.tags ]
          tags.push(tagSearch.add.toUpperCase())
          setTagSearch({ ...tagSearch, tags: tags, add: '' })
        } else {
          setSnack({ visibility: true, text: 'Этот тэг уже используется', severity: 'warning' })
        }
      } else {
        setSnack({ visibility: true, text: 'Введите тэг', severity: 'warning' })
      }
    }
  }

  // * нажатие на документ
  const handleDocumentClick = ({ currentTarget }) => {
    const id = currentTarget.getAttribute('data-id')
    const fileName = documents.docs.find(item => item.id === id).title
    setDocumentMenu({ id: id, visible: true, anchor: currentTarget, fileName: fileName })
  }

  // * загрузить новый документ
  const handleUploadFile = () => {
    if (!newDocument.name) {
      return setSnack({ text: 'Введите имя файла', severity: 'warning', visibility: true })
    }
    if (!newDocument.section) {
      return setSnack({ text: 'Укажите раздел файла', severity: 'warning', visibility: true })
    }
    if (newDocument.tags.length === 0) {
      return setSnack({ text: 'Укажите хотя бы один тэг для файла', severity: 'warning', visibility: true })
    }
    if (!newDocument.file) {
      return setSnack({ text: 'Выберите файл', severity: 'warning', visibility: true })
    }
    requestUploadFile('/api/client/uploaddocument', 'POST', { 
      file: newDocument.file, title: newDocument.name, description: newDocument.description, section: newDocument.section, tags: newDocument.tags, companyId: company.companyId, clientId: client.client._id, owner: auth.userId
    }, {
      Authorization: `Bearer ${auth.token}`
    }).then(data => {
      socket.socket.emit('document-upload', { id: `/clients/${client.client._id}` })
      handleGetDocuments()
      setSnack({ text: data.msg, severity: 'success', visibility: true })
    })
  }

  // * открытие диалогового окна с информацией о файле
  const dialogDocumentInfo = () => {
    const documentDetail = documents.docs.find(item => item.id === documentMenu.id)
    setDocumentDetail({ visible: true, ...documentDetail })
  }

  // * открытие диалогового окна изменения файла
  const dialogUpdateDocument = () => {
    const documentUpdate = documents.docs.find(item => item.id === documentMenu.id)
    setDocumentUpdate({ visible: true, ...documentUpdate })
  }

  // * открытие диалогового окна удаления файла
  const dialogDeleteFile = () => {
    setDocumentDelete({ visible: true, id: documentMenu.id })
  }

  // * отображение тэгов в поиске
  const renderTagSearch = () => {

    const chips = new Array()

    if (tagSearch.tags.length < 4 && !smScreen) {

      tagSearch.tags.forEach((tag, index) => {
        chips.push(
          <Chip
            className='tagsearch__tag'
            data-tag={tag}
            key={index}
            label={
              <Tooltip title={tag}>
                <Typography noWrap>
                  {
                    tag
                  }
                </Typography>
              </Tooltip>
            }
            deleteIcon={
              <SvgIcon className="tagsearch__tag-ico">
                <path fill="currentColor" d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
              </SvgIcon>
            }
            onDelete={handleRemoveTag}
          />
        )
      })

    } else {

      const popoverChips = new Array()

      tagSearch.tags.forEach((tag, index) => {
        popoverChips.push(
          <Chip
            className='tagsearch__tag'
            data-tag={tag}
            key={index}
            label={
              <Tooltip title={tag}>
                <Typography noWrap>
                  {
                    tag
                  }
                </Typography>
              </Tooltip>
            }
            deleteIcon={
              <SvgIcon className="tagsearch__tag-ico">
                <path fill="currentColor" d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
              </SvgIcon>
            }
            onDelete={handleRemoveTag}
          />
        )
      })

      chips.push(
        <Chip
          label='Тэги'
          className="tagsearch__tag"
          onClick={ 
            ({ currentTarget }) => { setTagSearch({ ...tagSearch, anchor: currentTarget, visible: true }) } 
          }
        />
      )

      chips.push(
        <Popover
          open={tagSearch.visible}
          anchorEl={tagSearch.anchor}
          onClose={ () => { setTagSearch({ ...tagSearch, anchor: null, visible: false }) } }
          // anchorOrigin={{
          //   vertical: 'bottom',
          //   horizontal: 'right',
          // }}
          // transformOrigin={{
          //   vertical: 'top',
          //   horizontal: 'right',
          // }}
        >
          <div className="tagsearch__popover">
            {
              popoverChips
            }
          </div>
        </Popover>
      )
    }

    return (
      <div className="client__documents-search tagsearch">
        <Box className="tagsearch__wrapper">
          <SvgIcon className="tagsearch__search-ico">
            <path fill="currentColor" d="M9.5,3A6.5,6.5 0 0,1 16,9.5C16,11.11 15.41,12.59 14.44,13.73L14.71,14H15.5L20.5,19L19,20.5L14,15.5V14.71L13.73,14.44C12.59,15.41 11.11,16 9.5,16A6.5,6.5 0 0,1 3,9.5A6.5,6.5 0 0,1 9.5,3M9.5,5C7,5 5,7 5,9.5C5,12 7,14 9.5,14C12,14 14,12 14,9.5C14,7 12,5 9.5,5Z" />
          </SvgIcon>
          <Box className="tagsearch__tags">
            {
              chips
            }
          </Box>
          <TextField 
            variant='standard'
            placeholder='Добавьте тэг'
            data-action='search'
            value={tagSearch.add}
            onChange={ ({ target: { value } }) => { setTagSearch({ ...tagSearch, add: value }) } }
            onKeyPress={handleAddTag}
            className="tagsearch__input"
          />
        </Box>
      </div>
    )
  }

  // * отображение секций документов
  const renderDocsMenu = () => {

    const sections = new Array()

    documents.sections.forEach((section, index) => {
      sections.push(
        <Button 
          key={index}
          className={ documents.activeSection === index ? "docs__menu-item docs__menu-item_active" : "docs__menu-item"}
          data-section={index}
          onClick={ ({ currentTarget }) => { setDocuments({ ...documents, activeSection: +currentTarget.getAttribute('data-section') }) } }
        >
          <div className="docs__menu-ico">
            <SvgIcon>
              <path fill="currentColor" d="M4 18H11V20H4C2.9 20 2 19.11 2 18V6C2 4.89 2.89 4 4 4H10L12 6H20C21.1 6 22 6.89 22 8V10.17L20.41 8.59L20 8.17V8H4V18M23 14V21C23 22.11 22.11 23 21 23H15C13.9 23 13 22.11 13 21V12C13 10.9 13.9 10 15 10H19L23 14M21 15H18V12H15V21H21V15Z" />
            </SvgIcon>
          </div>
          <p>
            {
              section
            }
          </p>
        </Button>
      )
    })

    sections.push(
      <Button 
        key={documents.sections.length + 1} 
        className="docs__menu-item" 
        onClick={
          () => setNewDocument({ visible: true, file: '', name: '', description: '', section: '', tags: new Array(), tagPopover: false, tagAnchor: null, add: '' })
        }
      >
        <div className="docs__menu-ico">
          <SvgIcon>
            <path fill="currentColor" d="M17,14H19V17H22V19H19V22H17V19H14V17H17V14M5,3H19C20.11,3 21,3.89 21,5V12.8C20.39,12.45 19.72,12.2 19,12.08V5H5V19H12.08C12.2,19.72 12.45,20.39 12.8,21H5C3.89,21 3,20.11 3,19V5C3,3.89 3.89,3 5,3M7,7H17V9H7V7M7,11H17V12.08C16.15,12.22 15.37,12.54 14.68,13H7V11M7,15H12V17H7V15Z" />
          </SvgIcon>
        </div>
        <p>
          Добавить новый документ
        </p>
      </Button>
    )
    
    return (
      <div className="docs__menu">
        {
          sections
        }
      </div>
    )
  }

  // * отображение файлов 
  const renderDocsFiles = () => {

    const files = new Array()

    const sectionFiles = documents.docs.filter((document) => documents.sections[documents.activeSection] === document.section)

    sectionFiles.forEach((document, index) => {
      files.push(
        <div className="docs__card" 
          key={index} 
          onClick={handleDocumentClick} 
          data-id={document.id}
        >
          <div className="docs__card-header">
            <div className="docs__header-ico">
              <SvgIcon>
                <path fill="currentColor" d="M13,9H18.5L13,3.5V9M6,2H14L20,8V20A2,2 0 0,1 18,22H6C4.89,22 4,21.1 4,20V4C4,2.89 4.89,2 6,2M15,18V16H6V18H15M18,14V12H6V14H18Z" />
              </SvgIcon>
            </div>
            <div className="docs__header">
              <p>ДОКУМЕНТ</p>
              <Tooltip title={document.title}>
                <div className="docs__header-title">
                  <Typography noWrap>
                    {
                      document.title
                    }
                  </Typography>
                </div>
              </Tooltip>
            </div>
          </div>
          <div className="docs__card-footer">
            <div className="docs__creator">
              <p>Загружено</p>
              <p>
                {
                  `${document.owner.firstName} ${document.owner.lastName}`
                }
              </p>
            </div>
            <div className="docs__date">
              <p>
                {
                  document.dateOfCreation ? new Date(document.dateOfCreation).toLocaleDateString() : ''
                }
              </p>
              <p>
                {
                  `${new Date(document.dateOfCreation).getHours()}:${(new Date(document.dateOfCreation).getMinutes()<10?'0':'') + new Date(document.dateOfCreation).getMinutes()}`
                }
              </p>
            </div>
          </div>
        </div>
      )
    })

    return files

  }

  // * отображение вкладки документы
  const renderDocumentsScreen = () => {
    return (
      <div className="client__documents">
        {
          renderTagSearch()
        }
        <div className="client__documents-files docs">
          {
            renderDocsMenu()
          }
          <div className="docs__content">
            {
              renderDocsFiles()
            }

            {/* Меню файлов */}
            <Menu
              anchorEl={documentMenu.anchor}
              open={documentMenu.visible}
              onClose={ () => { setDocumentMenu({ id: '', anchor: null, visible: false, fileName: '' }) } }
              onClick={ () => { setDocumentMenu({ id: '', anchor: null, visible: false, fileName: '' }) } }
              PaperProps={{
                elevation: 0,
                sx: {
                  overflow: 'visible',
                  border: '1px solid var(--border)',
                  borderRadius: 0,
                  height: '135px',
                  overflow: 'auto',
                  padding: '0',
                  justifyContent: 'space-between'
                },
              }}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'right', vertical: 'top' }}
            >
              <MenuItem sx={{ fontSize: '13px', padding: '.2rem 1rem' }} onClick={handleDownloadDocument}>
                Скачать
              </MenuItem>
              <Divider></Divider>
              <MenuItem sx={{ fontSize: '13px', padding: '.2rem 1rem' }} onClick={dialogDocumentInfo}>
                Информация
              </MenuItem>
              <MenuItem sx={{ fontSize: '13px', padding: '.2rem 1rem' }} onClick={dialogUpdateDocument}>
                Изменить
              </MenuItem>
              <MenuItem sx={{ fontSize: '13px', padding: '.2rem 1rem' }} onClick={dialogDeleteFile}>
                Удалить
              </MenuItem>
            </Menu>

            {/* Полная информация о файле */}
            <Dialog
              open={documentDetail.visible}
              onClose={ () => { setDocumentDetail({ visible: false, id: '', title: '', description: '', dateOfCreation: null, owner: '', section: '', tags: [] }) } }
              className='clients__dialog dialog'
            >
              <div className='dialog__title'>
                <h1>Документ</h1>
                <SvgIcon onClick={ () => { setDocumentDetail({ visible: false, id: '', title: '', description: '', dateOfCreation: null, owner: '', section: '', tags: [] }) } }>
                  <path fill="currentColor" d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
                </SvgIcon>
              </div>
              <DialogContent className='dialog__content'>
                <p className="dialog__label">Название</p>
                <p className="dialog__value">{ documentDetail.title }</p>
                <p className="dialog__label">Описание</p>
                <p className="dialog__value">{ documentDetail.description }</p>
                <p className="dialog__label">Раздел</p>
                <p className="dialog__value">{ documentDetail.section }</p>
                <p className="dialog__label">Загружено</p>
                <p className="dialog__value">{ `${documentDetail.owner.firstName} ${documentDetail.owner.lastName} (${documentDetail.dateOfCreation ? new Date(documentDetail.dateOfCreation).toLocaleDateString() : ''})` }</p>
                <p className="dialog__label">Тэги</p>
                <div className="dialog__tag-container">
                  {
                    documentDetail.tags.map((tag, index) => {
                      return (
                        <Chip 
                          key={index}
                          label={
                            <Typography noWrap>
                              {tag}
                            </Typography>
                          }
                          data-tag={tag}
                          className="dialog__tag"
                        />
                      )
                    })
                  }
                </div>
              </DialogContent>
            </Dialog>

            {/* Изменение файла */}
            <Dialog
              open={documentUpdate.visible}
              onClose={ () => { setDocumentUpdate({ visible: false, id: '', title: '', description: '', dateOfCreation: null, owner: '', section: '', tags: [] }) } }
              className='clients__dialog dialog'
            >
              <div className='dialog__title'>
                <h1>Документ</h1>
                <SvgIcon onClick={ () => { setDocumentUpdate({ visible: false, id: '', title: '', description: '', dateOfCreation: null, owner: '', section: '', tags: [] }) } }>
                  <path fill="currentColor" d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
                </SvgIcon>
              </div>
              <DialogContent className='dialog__content'>
                <p className="dialog__label">Название файла</p>
                <TextField 
                  fullWidth
                  value={documentUpdate.title}
                  onChange={ ({ target: { value } }) => { setDocumentUpdate({ ...documentUpdate, title: value }) } }
                  className='dialog__input'
                />
                <p className="dialog__label">Описание файла</p>
                <TextField 
                  fullWidth
                  multiline
                  rows={4}
                  value={documentUpdate.description}
                  onChange={ ({ target: { value } }) => { setDocumentUpdate({ ...newDocument, description: value }) } }
                  className='dialog__input'
                />
                <p className="dialog__label">Раздел к которому файл относится</p>
                <Autocomplete 
                  disablePortal
                  options={documents.sections}
                  fullWidth
                  freeSolo
                  value={documentUpdate.section}
                  onChange={(event, newValue) => { setDocumentUpdate({ ...documentUpdate, section: newValue ? newValue : '' }) }}
                  renderInput={(params) => <TextField {...params} value={documentUpdate.section} className="dialog__input dialog__input_autocomplete" onChange={({ target: { value } }) => { setDocumentUpdate({ ...documentUpdate, section: value }) }} />}
                />
                <div className="dialog__tags">
                  <div className="dialog__tag-input">
                    <p className="dialog__label">Введите тэги</p>
                    <TextField 
                      fullWidth
                      value={documentUpdate.add}
                      onChange={ ({ target: { value } }) => { setDocumentUpdate({ ...documentUpdate, add: value }) } }
                      onKeyPress={handleAddTagUpdate}
                      className="dialog__input"
                    />
                  </div>
                  <div className="dialog__tag-container">
                    {
                      documentUpdate.tags.map((tag, index) => {
                        return (
                          <Chip 
                            key={index}
                            label={
                              <Typography noWrap>
                                {tag}
                              </Typography>
                            }
                            data-tag={tag}
                            onDelete={handleDeleteTagUpdate}
                            className="dialog__tag"
                            deleteIcon={
                              <SvgIcon className="dialog__tag-ico">
                                <path fill="currentColor" d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
                              </SvgIcon>
                            }
                          />
                        )
                      })
                    }
                  </div>
                </div>
              </DialogContent>
              <DialogActions className='dialog__actions'>
                <Button 
                  disableElevation 
                  variant="contained" 
                  className='dialog__btn'
                  onClick={handleUpdateFile}
                >
                  Изменить
                </Button>
              </DialogActions>
            </Dialog>

            {/* Удаление файла */}
            <Dialog
              open={documentDelete.visible}
              onClose={ () => { setDocumentDelete({ visible: false, id: ''}) } }
              className='clients__dialog dialog'
            >
              <div className='dialog__title'>
                <h1>Удаление документа</h1>
                <SvgIcon onClick={ () => { setDocumentDelete({ visible: false, id: ''}) } }>
                  <path fill="currentColor" d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
                </SvgIcon>
              </div>
              <DialogContent>
                <p className="dialog__label">Вы уверены что хотите удалить этот файл?</p>
              </DialogContent>
              <DialogActions className='dialog__actions'>
                <Button 
                  disableElevation 
                  variant="contained" 
                  className='dialog__btn'
                  onClick={handleDeleteFile}
                >
                  Удалить
                </Button>
              </DialogActions>
            </Dialog>

          </div>
        </div>
      </div>
    )
  }

  if (client) {
    return (
      <>
        <div className="client">
          <TabContext value={tab}>
            <div className="client__nav">
              {
                !smScreen
                  ? (
                    <Stack spacing={2}>
                      <Breadcrumbs separator="›" aria-label="breadcrumb">
                        {breadcrumbs}
                      </Breadcrumbs>
                    </Stack>
                  )
                  : <></>
              }
              <TabList onChange={(event, newVal) => { setTab(newVal) }}>
                <Tab label="Информация" value="info" className={ tab === 'info' ? 'client__nav-tab client__nav-tab_selected' : 'client__nav-tab' } />
                <Tab label="Директора" value="directors" className={ tab === 'directors' ? 'client__nav-tab client__nav-tab_selected' : 'client__nav-tab' } />
                <Tab label="Акционеры" value="shareholders" className={ tab === 'shareholders' ? 'client__nav-tab client__nav-tab_selected' : 'client__nav-tab' } />
                <Tab label="Документы" value="documents" className={ tab === 'documents' ? 'client__nav-tab client__nav-tab_selected' : 'client__nav-tab' } />
              </TabList>
            </div>
          
            <TabPanel value="info" className={ tab === 'info' ? 'client__content client__content_selected' : 'client__content' } >
              { renderInfoScreen() }
            </TabPanel>
            <TabPanel value="directors" className={ tab === 'directors' ? 'client__content client__content_selected' : 'client__content' } >
              { renderDirectorsScreen() }
            </TabPanel>
            <TabPanel value="shareholders" className={ tab === 'shareholders' ? 'client__content client__content_selected' : 'client__content' } >
              { renderShareholdersScreen() }
            </TabPanel>
            <TabPanel value="documents" className={ tab === 'documents' ? 'client__content client__content_selected' : 'client__content' } >
              { renderDocumentsScreen() }
            </TabPanel>
          </TabContext>
        </div>

        {/* Dialogs */}

        {/* Диалоговое окно изменения должности */}
        <Dialog
          open={dialogPost.visible}
          onClose={ () => { setDialogPost({ ...dialogPost, visible: false, id: '', firstName: '', lastName: '', newPost: '' }) } }
          className='clients__dialog dialog'
        >

          <div className='dialog__title'>
            <h1>{ `Укажите должность ${dialogPost.firstName} ${dialogPost.lastName}` }</h1>
            <SvgIcon onClick={ () => { setDialogPost({ ...dialogPost, visible: false, id: '', firstName: '', lastName: '', newPost: '' }) } }>
              <path fill="currentColor" d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
            </SvgIcon>
          </div>

          <DialogContent className='dialog__content'>
            <p className="dialog__label">Занимаемая должность</p>
            <TextField 
              fullWidth
              value={dialogPost.newPost}
              onChange={ ({ target: { value } }) => { setDialogPost({ ...dialogPost, newPost: value }) } }
              className='dialog__input'
            />
          </DialogContent>

          <DialogActions className='dialog__actions'>
            <Button 
              disableElevation 
              variant="contained" 
              className='dialog__btn'
              onClick={handleChangePost}
            >
              Изменить
            </Button>
          </DialogActions>

        </Dialog>

        {/* Диалоговое окно приглашения директора */}
        <Dialog
          open={dialogInvite.visible}
          onClose={ () => { setDialogInvite({ visible: false, email: '', post: '', msg: '' }) } }
          className='clients__dialog dialog'
        >

          <div className='dialog__title'>
            <h1>{ `Создание приглашения для директора` } <br /> <small>(оно будет отображаться в разделе уведомлений)</small> </h1>
            <SvgIcon onClick={ () => { setDialogInvite({ visible: false, email: '', post: '', msg: '' }) } }>
              <path fill="currentColor" d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
            </SvgIcon>
          </div>

          <DialogContent className='dialog__content'>
            <p className="dialog__label">Занимаемая должность</p>
            <TextField 
              fullWidth
              value={dialogInvite.post}
              onChange={ ({ target: { value } }) => { setDialogInvite({ ...dialogInvite, post: value }) } }
              className='dialog__input'
            />
            <p className="dialog__label">Электронная почта</p>
            <TextField 
              fullWidth
              value={dialogInvite.email}
              onChange={ ({ target: { value } }) => { setDialogInvite({ ...dialogInvite, email: value }) } }
              className='dialog__input'
            />
            <p className="dialog__label">Сообщение</p>
            <TextField 
              fullWidth
              multiline
              rows={5}
              value={dialogInvite.msg}
              onChange={ ({ target: { value } }) => { setDialogInvite({ ...dialogInvite, msg: value }) } }
              className='dialog__input'
            />
          </DialogContent>

          <DialogActions className='dialog__actions'>
            <Button 
              disableElevation 
              variant="contained" 
              className='dialog__btn'
              onClick={handleInviteDirector}
            >
              Отправить
            </Button>
          </DialogActions>

        </Dialog>

        {/* Диалоговое окно удаления директора */}
        <Dialog
          open={dialogDelDirector.visible}
          onClose={ () => { setDialogDelDirector({ visible: false, id: '' }) } }
          className='clients__dialog dialog'
        >

          <div className='dialog__title'>
            <h1></h1>
            <SvgIcon onClick={ () => { setDialogDelDirector({ visible: false, id: '' }) } }>
              <path fill="currentColor" d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
            </SvgIcon>
          </div>

          <DialogContent className='dialog__content'>
            <p className="dialog__label">Вы уверены что хотите снять этого пользователя с должности директора?</p>
          </DialogContent>

          <DialogActions className='dialog__actions'>
            <Button 
              disableElevation 
              variant="contained" 
              className='dialog__btn'
              onClick={handleDeleteDirector}
            >
              Удалить
            </Button>
          </DialogActions>

        </Dialog>

        {/* Диалоговое окно удаления акционера */}
        <Dialog
          open={dialogDelShareholder.visible}
          onClose={ () => { dialogDelShareholder({ visible: false, id: '' }) } }
          className='clients__dialog dialog'
        >

          <div className='dialog__title'>
            <h1></h1>
            <SvgIcon onClick={ () => { setDialogDelShareholder({ visible: false, id: '' }) } }>
              <path fill="currentColor" d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
            </SvgIcon>
          </div>

          <DialogContent className='dialog__content'>
            <p className="dialog__label">Вы уверены что хотите удалить этого акционера?</p>
          </DialogContent>

          <DialogActions className='dialog__actions'>
            <Button 
              disableElevation 
              variant="contained" 
              className='dialog__btn'
              onClick={handleDeleteShareholder}
            >
              Удалить
            </Button>
          </DialogActions>

        </Dialog>

        {/* Диалоговое окно добавления/изменения акционера */}
        <Dialog
          open={dialogShareholder.visible}
          onClose={ () => { setDialogShareholder({ type: 'add', visible: false, name: '', shareDate: '', numOfShares: '' }) } }
          className='clients__dialog dialog'
        >
          <div className='dialog__title'>
            <h1>Добавление акционера</h1>
            <SvgIcon onClick={ () => { setDialogShareholder({ type: 'add', visible: false, name: '', shareDate: '', numOfShares: '' }) } }>
              <path fill="currentColor" d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
            </SvgIcon>
          </div>
          <DialogContent className='dialog__content'>
            <Stack direction='row' className='dialog__switch-wrapper'>
              <Typography className={ dialogShareholder.person ? 'dialog__switch' : 'dialog__switch dialog__switch_active' }>Юр. лицо</Typography>
              <Switch checked={dialogShareholder.person} onChange={ ({ target: { checked } }) => { setDialogShareholder({ ...dialogShareholder, person: checked }) } }/>
              <Typography className={ !dialogShareholder.person ? 'dialog__switch' : 'dialog__switch dialog__switch_active' }>Физ. лицо</Typography>
            </Stack>
            <p className="dialog__label">Наименование/ФИО акционера</p>
            <TextField 
              fullWidth
              value={dialogShareholder.name}
              onChange={ ({ target: { value } }) => { setDialogShareholder({ ...dialogShareholder, name: value }) } }
              className='dialog__input'
            />
            <p className="dialog__label">Количество акций</p>
            <TextField 
              fullWidth
              type='number'
              value={dialogShareholder.numOfShares}
              onChange={ ({ target: { value } }) => { setDialogShareholder({ ...dialogShareholder, numOfShares: value }) } }
              className='dialog__input'
            />
            <p className="dialog__label">Дата акционерного соглашения</p>
            <LocalizationProvider dateAdapter={AdapterDateFns} locale={ruLocale}>
              <DatePicker
                mask={'__.__.____'}
                value={dialogShareholder.shareDate}
                onChange={handleDateChange}
                renderInput={
                  (params) => 
                    <TextField 
                      {...params} 
                      fullWidth 
                      value={dialogShareholder.shareDate}
                      className="invite__input" 
                    />
                }
                clearable={true}
                minDate={ new Date('1900-01-01') }
                maxDate={ new Date() }
              />
            </LocalizationProvider>
          </DialogContent>
          <DialogActions className='dialog__actions'>
            <Button 
              disableElevation 
              variant="contained" 
              className='dialog__btn'
              onClick={handleProcessShare}
            >
              { 
                dialogShareholder.type === 'add' ? 'Добавить' : 'Изменить'
              }
            </Button>
          </DialogActions>
        </Dialog>

        {/* Добавление нового документа */}
        <Dialog
          open={newDocument.visible}
          onClose={ () => { setNewDocument({ ...newDocument, visible: false }) } }
          className='clients__dialog dialog'
        >
          <div className='dialog__title'>
            <h1>Добавление файла</h1>
            <SvgIcon onClick={ () => { setNewDocument({ ...newDocument, visible: false }) } }>
              <path fill="currentColor" d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
            </SvgIcon>
          </div>
          <DialogContent className='dialog__content'>
            <p className="dialog__label">Название файла</p>
            <TextField 
              fullWidth
              value={newDocument.name}
              onChange={ ({ target: { value } }) => { setNewDocument({ ...newDocument, name: value }) } }
              className='dialog__input'
            />
            <p className="dialog__label">Описание файла</p>
            <TextField 
              fullWidth
              multiline
              rows={4}
              value={newDocument.description}
              onChange={ ({ target: { value } }) => { setNewDocument({ ...newDocument, description: value }) } }
              className='dialog__input'
            />
            <p className="dialog__label">Раздел к которому файл относится</p>
            <Autocomplete 
              disablePortal
              options={documents.sections}
              fullWidth
              freeSolo
              onChange={(event, newValue) => { setNewDocument({ ...newDocument, section: newValue ? newValue : '' }) }}
              renderInput={(params) => <TextField {...params} value={newDocument.section} className="dialog__input dialog__input_autocomplete" onChange={({ target: { value } }) => { setNewDocument({ ...newDocument, section: value }) }} />}
            />
            <p className="dialog__label">Выберите файл</p>
            <TextField 
              fullWidth
              type='file'
              onChange={ ({ target: { files } }) => { setNewDocument({ ...newDocument, file: files[0] }) } }
              className='dialog__input'
            />
            <div className="dialog__tags">
              <div className="dialog__tag-input">
                <p className="dialog__label">Введите тэги</p>
                <TextField 
                  fullWidth
                  value={newDocument.add}
                  onChange={ ({ target: { value } }) => { setNewDocument({ ...newDocument, add: value }) } }
                  onKeyPress={handleAddDialogTag}
                  className="dialog__input"
                />
              </div>
              <div className="dialog__tag-container">
                {
                  newDocument.tags.map((tag, index) => {
                    return (
                      <Chip 
                        key={index}
                        label={
                          <Typography noWrap>
                            {tag}
                          </Typography>
                        }
                        data-tag={tag}
                        onDelete={ () => {} }
                        className="dialog__tag"
                        deleteIcon={
                          <SvgIcon className="dialog__tag-ico">
                            <path fill="currentColor" d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
                          </SvgIcon>
                        }
                      />
                    )
                  })
                }
              </div>
            </div>
          </DialogContent>

          <DialogActions className='dialog__actions'>
            <Button 
              disableElevation 
              variant="contained" 
              className='dialog__btn'
              onClick={handleUploadFile}
            >
              Загрузить
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
      </>
    )
  }

  return <></>
}