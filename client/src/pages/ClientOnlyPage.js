
import { useContext, useState, useEffect } from "react"

import { useNavigate, useSearchParams } from "react-router-dom"

import { useHttp } from "../hooks/http.hook"

import { AuthContext } from "../context/AuthContext"
import { SocketContext } from "../context/SocketContext"
import { ClientContext } from "../context/ClientContext"

import { Typography, Tooltip, Button, SvgIcon, Snackbar, Alert } from '@mui/material'
import { Dialog, TextField, Chip, Popover, Badge, FormControlLabel, Checkbox } from '@mui/material'
import MobileDatePicker from '@mui/lab/MobileDatePicker';
import MonthPicker from '@mui/lab/MonthPicker';
import YearPicker from '@mui/lab/YearPicker';

import AdapterDateFns from '@mui/lab/AdapterDateFns';
import LocalizationProvider from '@mui/lab/LocalizationProvider';

import { saveAs } from 'file-saver'

import { format, add, sub, lastDayOfMonth, isEqual, compareAsc, compareDesc } from 'date-fns'
import ruLocale from 'date-fns/locale/ru'

import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';

import './ClientOnlyPage.css'

// * форматирование цифрового формата
const formatNumber = (number) => {
  let divider = ' ',
      stringNumber = Math.max(0, number).toFixed(0),
      length = stringNumber.length,
      end = /^\d{4,}$/.test(stringNumber) ? length % 3 : 0

  return (
    end 
      ? stringNumber.slice(0, end) + divider 
      : ''
  ) + stringNumber.slice(end).replace(/(\d{3})(?=\d)/g, '$1' + divider)
}

export const ClientOnlyPage = () => {

  const { request, requestFile, requestUploadFile } = useHttp()

  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const theme = useTheme()
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'))

  const auth = useContext(AuthContext)
  const socket = useContext(SocketContext)
  const client = useContext(ClientContext)

  // ? для поиска директоров
  const [searchDirectors, setSearchDirectors] = useState([])
  // ? для поиска акционеров
  const [searchShareholders, setSearchShareholders] = useState([])
  // ? для поиска приглашений
  const [searchInvites, setSearchInvites] = useState([])
  // ? для поиска документов
  const [searchDocuments, setSearchDocuments] = useState({
    items: [], tags: [], tagAnchor: null, visible: false
  })

  const [locationHistory, setLocationHistory] = useState('')

  // ? сегодняшняя дата
  const [todayDate, setTodayDate] = useState(new Date())
  // ? текущая дата
  const [currentDate, setCurrentDate] = useState(new Date())
  // ? минимальная и максимальная дата для события
  const maxDate = add(new Date(), { years: 20 })
  const minDate = sub(new Date(), { years: 5 })

  const [monthPicker, setMonthPicker] = useState(false)
  const [yearPicker, setYearPicker] = useState(false)

  // ? диалоговое окно акции
  const [dialogStocks, setDialogStocks] = useState({
    visible: false, mode: 'view', numOfShares: '', capital: '', shareCapital: ''
  })
  // ? диалоговое окно контактное лицо
  const [dialogContact, setDialogContact] = useState({
    visible: false, user: null, title: ''
  })
  // ? диалоговое окно информации о клиенте
  const [dialogInfo, setDialogInfo] = useState({
    visible: false, mode: 'view', title: '',
    clientName: '', registeredAddress: '', email: '', UEN: '', lastAGM: null, lastARFilled: null
  })
  // ? диалоговое окно списка директоров
  const [dialogDirector, setDialogDirector] = useState({
    visible: false, directors: [], mainContact: ''
  })
  // ? диалоговое окно должности директора
  const [dialogDirectorPost, setDialogDirectorPost] = useState({
    visible: false, id: '', post: ''
  })
  // ? диалоговое окно удаления директора
  const [dialogDirectorDelete, setDialogDirectorDelete] = useState({
    visible: false, id: ''
  })
  // ? диалоговое окно приглашения директора
  const [dialogDirectorNew, setDialogDirectorNew] = useState({
    visible: false, email: '', post: '', message: ''
  })
  // ? диалоговое окно создания акционера
  const [dialogShareholderNew, setDialogShareholderNew] = useState({
    visible: false, name: '', person: false, numOfShares: '', shareholderDate: null
  })
  // ? диалоговое окно изменения акционера
  const [dialogShareholderInfo, setDialogShareholderInfo] = useState({
    visible: false, id: '', name: '', person: false, numOfShares: '', shareholderDate: null
  })
  // ? диалоговое окно удаления акционера
  const [dialogShareholderDelete, setDialogShareholderDelete] = useState({
    visible: false, id: ''
  })
  // ? диалоговое окно списка акционеров
  const [dialogShareholder, setDialogShareholder] = useState({
    visible: false, shareholder: []
  })
  // ? диалоговое окно удаления акционера
  const [dialogInviteDelete, setDialogInviteDelete] = useState({
    visible: false, id: ''
  })
  // ? диалоговое окно удаления акционера
  const [dialogInvite, setDialogInvite] = useState({
    visible: false
  })
  // ? диалоговое окно добавления документа
  const [dialogDocumentNew, setDialogDocumentNew] = useState({
    visible: false, title: '', description: '', file: '', section: '', tags: [] 
  })
  // ? диалоговое окно удаления документа
  const [dialogDocumentDelete, setDialogDocumentDelete] = useState({
    visible: false, id: ''
  })
  // ? диалоговое окно добавления документа
  const [dialogDocument, setDialogDocument] = useState({
    visible: false, title: '', description: '', owner: null, section: '', tags: [] 
  })
  // ? диалоговое окно удаления события
  const [dialogEventDelete, setDialogEventDelete] = useState({
    visible: false, id: ''
  })
  // ? диалоговое окно создания события
  const [dialogEventNew, setDialogEventNew] = useState({
    visible: false, title: '', description: '', date: new Date(), company: false, client: false, notification: true
  })


  // ? для переключения вкладок
  const [statement, setStatement] = useState('info')

  const [snack, setSnack] = useState({
    text: '', severity: 'warning', visibility: false
  })

  // * получение информации о клиенте при изменении
  const listenerGetClient = () => {
    client.getData(auth.token, auth.userId)
  }

  // * получение информации о документах клиента при изменении
  const listenerGetDocuments = () => {
    client.getDocuments(auth.token)
  }

  // * получение информации о событиях клиента при изменении
  const listenerGetEvents = () => {
    client.getEvents(auth.token, auth.userId)
  }

  // * получение информации о приглашениях клиента при изменении
  const listenerGetInvites = () => {
    client.getInvites(auth.token)
  }

  // * пользователь был исключен из компании
  const listenerUserDeleted = () => {
    client.clearData()
    auth.validateUser()
  }

  // * подключение слушаталей сокета
  useEffect(() => {
    if (client.variables.id) {
      socket.socket.emit('join-room', `/directors:${auth.userId}`)
      socket.socket.emit('join-room', `/clients/${client.variables.id}`)
      socket.socket.on('client-update', listenerGetClient)
      socket.socket.on('director-join', listenerGetClient)
      socket.socket.on('client-documents-get', listenerGetDocuments)
      socket.socket.on('client-invites-update', listenerGetInvites)
      socket.socket.on('events-get', listenerGetEvents)
      socket.socket.on('client-user-deleted', listenerUserDeleted)
      return () => {
        socket.socket.removeListener('client-update', listenerGetClient)
        socket.socket.removeListener('director-join', listenerGetClient)
        socket.socket.removeListener('client-documents-get', listenerGetDocuments)
        socket.socket.removeListener('client-invites-update', listenerGetInvites)
        socket.socket.removeListener('events-get', listenerGetEvents)
        socket.socket.removeListener('client-user-deleted', listenerUserDeleted)
      }
    }
  }, [client])

  // * 
  useEffect(() => {
    if (client.variables.directors) {
      setSearchDirectors(client.variables.directors)
    }
    if (client.variables.shareholders) {
      setSearchShareholders(client.variables.shareholders)
    }
    if (client.variables.invites) {
      setSearchInvites(client.variables.invites)
    }
    if (client.variables.documents) {
      setSearchDocuments({ items: client.variables.documents, tags: [], tagAnchor: null, visible: false })
    }
  }, [client])

  // * работа с поисковой строкой
  useEffect(() => {
    // переход на вкладку при указании через поисковую строку
    const section = searchParams.get('section')
    if (!section) {
      return navigate('/client?section=info')
    }
    setStatement(section)
  }, [searchParams])

  // * сохранение измененных данных об акциях
  const handleSaveStocks = () => {
    request(
      '/api/client/saveinfo',
      'POST',
      { 
        clientId: client.variables.id,
        options: {
          numOfShares: dialogStocks.numOfShares, shareCapital: dialogStocks.shareCapital, capital: dialogStocks.capital 
        }
      },
      { Authorization: `Bearer ${auth.token}` }
    ).then( () => {
      listenerGetClient()
      socket.socket.emit('client-changed', { id: `/clients/${client.variables.id}` })
      setDialogStocks({ visible: false, mode: 'view', numOfShares: '', capital: '', shareCapital: '' })
    })
  }

  // * валидация полей данных о клиенте
  const validateInfo = () => {
    if (!dialogInfo.clientName.trim()) {
      return [true, 'Название фирмы является обязательным полем']
    }
    if (!dialogInfo.registeredAddress.trim()) {
      return [true, 'Адрес фирмы является обязательным полем']
    }
    const emailRegex = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
    if (dialogInfo.email && !dialogInfo.email.match(emailRegex)) {
      return [true, 'Некорректный email']
    }
    const uenRegex = /^(\d{10}|\d{12})$/
    if (!dialogInfo.UEN || !dialogInfo.UEN.match(uenRegex)) {
      return [true, 'Некорректный ИНН']
    }
    if (dialogInfo.lastAGM) {
      const date = new Date(dialogInfo.lastAGM)
      date.setHours(0, 0, 0, 0)
      if (date.getTime() < new Date(1900, 1, 1).getTime()) {
        return [true, 'Дата последней встречи совета директоров меньше допустимого значения (01.01.1900)']
      }
      if (date.getTime() > new Date().getTime()) {
        return [true, `Дата последней встречи совета директоров больше допустимого значения (${new Date().toLocaleDateString()})`]
      }
    }
    if (dialogInfo.lastARFilled) {
      const date = new Date(dialogInfo.lastARFilled)
      date.setHours(0, 0, 0, 0)
      if (date.getTime() < new Date(1900, 1, 1).getTime()) {
        return [true, 'Дата последнего заполнения декларации меньше допустимого значения (01.01.1900)']
      }
      if (date.getTime() > new Date().getTime()) {
        return [true, `Дата последнего заполнения декларации больше допустимого значения (${new Date().toLocaleDateString()})`]
      }
    }
    return [false, '']
  }

  // * сохранение измененных данных о клиенте
  const handleSaveInfo = () => {
    const [error, errorMessage] = validateInfo()

    if (error) {
      return setSnack({ visibility: true, severity: 'warning', text: errorMessage })
    }

    request(
      '/api/client/saveinfo',
      'POST',
      { 
        clientId: client.variables.id,
        options: {
          clientName: dialogInfo.clientName, registeredAddress: dialogInfo.registeredAddress,
          email: dialogInfo.email, UEN: dialogInfo.UEN, lastAGM: dialogInfo.lastAGM, lastARFilled: dialogInfo.lastARFilled
        }
      },
      { Authorization: `Bearer ${auth.token}` }
    ).then( () => {
      listenerGetClient()
      socket.socket.emit('client-changed', { id: `/clients/${client.variables.id}` })
      setDialogInfo({ visible: false, mode: 'view',  })
    })

  }

  // * сохранение должности директора
  const handleSaveDirectorPost = () => {
    request(
      '/api/client/changedirectorpost', 
      'POST', 
      { 
        newPost: dialogDirectorPost.post, directorId: dialogDirectorPost.id 
      }, {
        Authorization: `Bearer ${auth.token}`
      }
    ).then(data => {
      socket.socket.emit('client-changed', { id: `/clients/${client.variables.id}` })
      listenerGetClient()
      setSnack({ text: data.msg, severity: 'success', visibility: true })
      setDialogDirectorPost({ visible: false, id: '', post: '' })
    })
  }

  // * сохранение контактного лица
  const handleSaveDirectorContact = ({ currentTarget: { parentNode } }) => {
    request('/api/client/setmaincontact', 'POST', { userId: parentNode.getAttribute('data-id'), clientId: client.variables.id }, {
      Authorization: `Bearer ${auth.token}`
    }).then(data => {
      socket.socket.emit('client-changed', { id: `/clients/${client.variables.id}` })
      setSnack({ text: data.msg, severity: 'success', visibility: true })
      listenerGetClient()
    })
  }

  // * удаление директора
  const handleDeleteDirector = () => {
    request('/api/client/deletedirectors', 'POST', { userId: dialogDirectorDelete.id, clientId: client.variables.id }, {
      Authorization: `Bearer ${auth.token}`
    }).then(data => {
      socket.socket.emit('client-changed', { id: `/clients/${client.variables.id}` })
      socket.socket.emit('client-delete-director', { id: `/directors:${dialogDirectorDelete.id}` })
      setDialogDirectorDelete({ visible: false, id: '' })
      setSnack({ text: data.msg, severity: 'success', visibility: true})
      listenerGetClient()
    })
  }

  // * приглашение директора
  const handleNewDirector = () => {
    if (!dialogDirectorNew.email) {
      return setSnack({ text: 'Укажите электронную почту пользователя', severity: 'warning', visibility: true })
    }
    request(
      '/api/client/inviteuser', 
      'POST', 
      { 
        email: dialogDirectorNew.email, clientId: client.variables.id, clientName: client.variables.name, message: dialogDirectorNew.message,
        post: dialogDirectorNew.post
      }, 
      {
        'Authorization': `Bearer ${auth.token}`
      }
      ).then((data) => {
        listenerGetInvites()
        setDialogDirectorNew({ visible: false, email: '', post: '', message: '' })
        socket.socket.emit('notification-push')
        socket.socket.emit('client-invites-changed', { id: `/clients/${client.variables.id}` })
        setSnack({ text: data.msg, visibility: true, severity: 'success' })
    })
  }

  // * поиск директора
  const handleSearchDirector = ({ currentTarget: { value } }) => {
    if (!value && client.variables.directors) {
      return setSearchDirectors(client.variables.directors)
    }

    if (client.variables.directors) {
      const sRows = client.variables.directors.filter(item => 
        `${item.firstName.toLowerCase()} ${item.lastName.toLowerCase()}`.indexOf(value.toLowerCase()) !== -1
        || item.post.toLowerCase().indexOf(value.toLowerCase()) !== -1
        || item.email.toLowerCase().indexOf(value.toLowerCase()) !== -1
        || item.phoneNumber.toLowerCase().indexOf(value.toLowerCase()) !== -1
      )
      
      setSearchDirectors(sRows)
    }
  }

  // * создание акционера
  const handleNewShareholder = () => {
    // проверка полей на корректность
    if (!dialogShareholderNew.name.trim()) {
      return setSnack({ visibility: true, text: 'Укажите наименование или ФИО акционера', severity: 'warning' })
    } 
    if (!dialogShareholderNew.numOfShares.trim()) {
      return setSnack({ visibility: true, text: 'Укажите количество акций', severity: 'warning' })
    }
    if (!dialogShareholderNew.shareholderDate) {
      return setSnack({ visibility: true, text: 'Укажите дату акционерного соглашения', severity: 'warning' })
    } else {
      const date = new Date(dialogShareholderNew.shareholderDate)
      date.setHours(0, 0, 0, 0)
      if (date.getTime() < new Date(1900, 1, 1).getTime()) {
        return setSnack({ visibility: true, text: 'Дата акционерного соглашения меньше допустимого значения (01.01.1900)', severity: 'warning' })
      }
      if (date.getTime() > new Date().getTime()) {
        return setSnack({ visibility: true, text: `Дата акционерного соглашения больше допустимого значения (${new Date().toLocaleDateString()})`, severity: 'warning' })
      }
    }

    request('/api/client/newshareholder', 'POST', 
    { 
      options: { 
        id: dialogShareholderNew.id,
        name: dialogShareholderNew.name,
        person: dialogShareholderNew.person,
        numOfShares: dialogShareholderNew.numOfShares,
        shareholderDate: dialogShareholderNew.shareholderDate
      }, 
      clientId: client.variables.id 
    }, {
      Authorization: `Bearer ${auth.token}`
    }).then(data => {
      socket.socket.emit('client-changed', { id: `/clients/${client.variables.id}` })
      setSnack({ text: data.msg, severity: 'success', visibility: true })
      setDialogShareholderNew({ visible: false, name: '', person: false, numOfShares: '', shareholderDate: null })
      listenerGetClient()
    })
  }

  // * сохранение акционера
  const handleSaveShareholder = () => {

    // проверка полей на корректность
    if (!dialogShareholderInfo.name.trim()) {
      return setSnack({ visibility: true, text: 'Укажите наименование или ФИО акционера', severity: 'warning' })
    } 
    if (!dialogShareholderInfo.numOfShares.trim()) {
      return setSnack({ visibility: true, text: 'Укажите количество акций', severity: 'warning' })
    }
    if (!dialogShareholderInfo.shareholderDate) {
      return setSnack({ visibility: true, text: 'Укажите дату акционерного соглашения', severity: 'warning' })
    } else {
      const date = new Date(dialogShareholderInfo.shareholderDate)
      date.setHours(0, 0, 0, 0)
      if (date.getTime() < new Date(1900, 1, 1).getTime()) {
        return setSnack({ visibility: true, text: 'Дата акционерного соглашения меньше допустимого значения (01.01.1900)', severity: 'warning' })
      }
      if (date.getTime() > new Date().getTime()) {
        return setSnack({ visibility: true, text: `Дата акционерного соглашения больше допустимого значения (${new Date().toLocaleDateString()})`, severity: 'warning' })
      }
    }

    request('/api/client/saveshareholder', 'POST', 
    { 
      options: { 
        id: dialogShareholderInfo.id,
        name: dialogShareholderInfo.name,
        person: dialogShareholderInfo.person,
        numOfShares: dialogShareholderInfo.numOfShares,
        shareholderDate: dialogShareholderInfo.shareholderDate
      }, 
      clientId: client.variables.id 
    }, {
      Authorization: `Bearer ${auth.token}`
    }).then(data => {
      socket.socket.emit('client-changed', { id: `/clients/${client.variables.id}` })
      setSnack({ text: data.msg, severity: 'success', visibility: true })
      setDialogShareholderInfo({ visible: false, name: '', person: false, numOfShares: '', shareholderDate: null })
      listenerGetClient()
    })
  }

  // * удаление директора
  const handleDeleteShareholder = () => {
    request('/api/client/deleteshareholders', 'POST', { id: dialogShareholderDelete.id, clientId: client.variables.id }, {
      Authorization: `Bearer ${auth.token}`
    }).then(data => {
      socket.socket.emit('client-changed', { id: `/clients/${client.variables.id}` })
      setSnack({ text: data.msg, severity: 'success', visibility: true})
      setDialogShareholderDelete({ visible: false, id: '' })
      listenerGetClient()
    })
  }

  // * поиск акционера
  const handleSearchShareholder = ({ currentTarget: { value } }) => {
    if (!value && client.variables.shareholders) {
      return setSearchShareholders(client.variables.shareholders)
    }

    if (client.variables.shareholders) {
      const sRows = client.variables.shareholders.filter(item => 
        item.name.toLowerCase().indexOf(value.toLowerCase()) !== -1
        || (item.person && 'физическое лицо'.indexOf(value.toLowerCase()) !== -1)
        || (!item.person && 'юридическое лицо'.indexOf(value.toLowerCase()) !== -1)
      )
      
      setSearchShareholders(sRows)
    }
  }

  // * сортировка акционеров по количеству акций
  const handleSortShareholder = ({ currentTarget }) => {
    const type = currentTarget.getAttribute('data-sort')
    const sRows = [...searchShareholders]
    
    if (type === 'asc') {
      setSearchShareholders(
        sRows.sort((a, b) => b.numOfShares - a.numOfShares)
      )
      currentTarget.setAttribute('data-sort', 'desc')
    } else {
      setSearchShareholders(
        sRows.sort((a, b) => a.numOfShares - b.numOfShares)
      )
      currentTarget.setAttribute('data-sort', 'asc')
    }
  }

  // * удаление приглашения
  const handleDeleteInvite = () => {
    request('/api/client/deleteinvites', 'POST', { id: dialogInviteDelete.id }, {
      Authorization: `Bearer ${auth.token}`
    }).then(data => {
      listenerGetInvites()
      socket.socket.emit('client-invites-changed', { id: `/clients/${client.variables.id}` })
      socket.socket.emit('notification-push')
      setSnack({ text: data.msg, visibility: true, severity: 'success' })
      setDialogInviteDelete({ visible: false, id: '' })
    })
  }

  // * поиск приглашения
  const handleSearchInvites = ({ currentTarget: { value } }) => {
    if (!value && client.variables.invites) {
      return setSearchInvites(client.variables.invites)
    }

    if (client.variables.invites) {
      const sRows = client.variables.invites.filter(item => 
        `${item.to.firstName} ${item.to.lastName}`.toLowerCase().indexOf(value.toLowerCase()) !== -1
        || item.to.email.toLowerCase().indexOf(value.toLowerCase()) !== -1
        || item.to.phoneNumber.toLowerCase().indexOf(value.toLowerCase()) !== -1
        || item.params.post.toLowerCase().indexOf(value.toLowerCase()) !== -1
      )
      
      setSearchInvites(sRows)
    }
  }

  // * скачивание файла
  const handleDownloadDocument = (fileId) => {
    requestFile(
      '/api/client/downloaddocument', 
      'POST', 
      { 
        docId: fileId 
      }, 
      {
        Authorization: `Bearer ${auth.token}`
      }
    ).then(res => {
      res.blob().then(blob => {
        const pdfBlob = new Blob([blob], {type: "charset=utf-8"})
        saveAs(pdfBlob)
        navigate(locationHistory ? locationHistory : -1)
      })
    })
  }

  // * загрузка файла
  const handleNewDocument = () => {
    if (!dialogDocumentNew.title) {
      return setSnack({ text: 'Введите название файла', severity: 'warning', visibility: true })
    }
    if (!dialogDocumentNew.section) {
      return setSnack({ text: 'Укажите раздел файла', severity: 'warning', visibility: true })
    }
    if (!dialogDocumentNew.file) {
      return setSnack({ text: 'Выберите файл', severity: 'warning', visibility: true })
    }
    if (dialogDocumentNew.tags.length === 0) {
      return setSnack({ text: 'Добавьте хотя бы один тэг', severity: 'warning', visibility: true })
    }
    requestUploadFile(
      '/api/client/uploaddocument',
      'POST',
      {
        file: dialogDocumentNew.file, 
        title: dialogDocumentNew.title,
        description: dialogDocumentNew.description,
        section: dialogDocumentNew.section,
        tags: dialogDocumentNew.tags,
        companyId: client.variables.company._id,
        clientId: client.variables.id,
        owner: auth.userId
      },
      {
        Authorization: `Bearer ${auth.token}`
      }
    ).then(data => {
      socket.socket.emit('document-upload', { id: `/clients/${client.variables.id}` })
      listenerGetDocuments()
      setSnack({ text: data.msg, severity: 'success', visibility: true })
      setDialogDocumentNew({ visible: false, title: '', description: '', file: '', section: '', tags: [] })
      navigate(locationHistory ? locationHistory : `/client?section=documents&division=${dialogDocumentNew.section}`)
    })
  }

  // * удаление файла
  const handleDeleteDocument = () => { 
    request('/api/client/documentdelete', 'POST', { id: dialogDocumentDelete.id }, {
      Authorization: `Bearer ${auth.token}`
    }).then(data => {
      socket.socket.emit('document-upload', { id: `/clients/${client.variables.id}` })
      listenerGetDocuments()
      setDialogDocumentDelete({ visible: false, id: '' })
      setSnack({ text: data.msg, severity: 'success', visibility: true })
    })
  }

  // * поиск документа
  const handleSearchDocument = (tags) => {
    if (tags.length === 0) {
      setSearchDocuments({ ...searchDocuments, 
        items: client.variables.documents,
        tags: tags,
        visible: false,
        anchorEl: null
      })
    } else {
      const sRows = [ ...client.variables.documents ]
      setSearchDocuments({ ...searchDocuments, 
        items: sRows.filter(item => 
          tags.every(tag => item.tags.includes(tag))
        ),
        tags: tags
      })
    }
  }

  // * добавление тэга к поиску
  const handleAppendTag = ({ key, target }) => {
    if (key === 'Enter' && target.value.trim() && !searchDocuments.tags.includes(target.value.toUpperCase())) {
      const tags = [ ...searchDocuments.tags ]
      tags.push(target.value.toUpperCase())
      handleSearchDocument(tags)
    }
  }

  // * создание/удаление оповещения о событии
  const handleEventNotification = ({ currentTarget }) => {
    const id = currentTarget.parentNode.getAttribute('data-id')
    const event = client.variables.events.find(item => item._id === id)
    if (event.notification) {
      request('/api/user/removeeventnotification', 'POST', { id: event.notification._id }, {
        Authorization: `Bearer ${auth.token}`
      }).then(data => { 
        listenerGetEvents() 
      })
    } else {
      request('/api/user/createeventnotification', 'POST', { id: id, userId: auth.userId }, {
        Authorization: `Bearer ${auth.token}`
      }).then(data => { 
        listenerGetEvents() 
      })
    }
    socket.socket.emit('notification-update', { id: `/directors:${auth.userId}` })
  }

  // * удаление события
  const handleDeleteEvent = () => {
    const id = dialogEventDelete.id
    const event = client.variables.events.find(item => item._id === id)
    const eventTitle = event.title

    if (event.client) {
      if (event.creator._id !== auth.userId) {
        return setSnack({ visibility: true, severity: 'warning', text: 'У вас нет прав на удаление этого события' })
      }
    }

    const companyUsers = client.variables.company.users.reduce((prev, item) => {
      prev.push(item._id)
      return prev
    }, [])

    const clientUsers = client.variables.directors.reduce((prev, item) => {
      prev.push(item._id)
      return prev
    }, [])

    request('/api/user/deleteevent', 'POST', { id: id }, {
      Authorization: `Bearer ${auth.token}`
    }).then(data => { 
      listenerGetEvents()
      setDialogEventDelete({ visible: false, id: '' })
      request('/api/user/eventdeletenotification', 'POST', { usersId: [ ...companyUsers, ...clientUsers ], senderId: auth.userId, eventTitle: eventTitle }, {
        Authorization: `Bearer ${auth.token}`
      }).then(data => {
        socket.socket.emit('notification-update', { id: `/clients/${client.variables.id}` })
        socket.socket.emit('notification-push')
        socket.socket.emit('events-update', { id: `/clients/${client.variables.id}` })
        client.variables.company.users.forEach(item => {
          socket.socket.emit('events-update', { id: `/events:${item._id}` })
        })
      })
    })
  }

  // * создание события
  const handleNewEvent = () => {
    request('/api/user/saveevent', 'POST', {
      title: dialogEventNew.title, 
      description: dialogEventNew.description,
      date: dialogEventNew.date,
      notification: dialogEventNew.notification,
      companyId: dialogEventNew.company ? client.variables.company._id : null,
      clientId: dialogEventNew.client ? client.variables.id : null,
      senderId: auth.userId
    }, {
      Authorization: `Bearer ${auth.token}`
    }).then(data => {
      listenerGetEvents()
      setDialogEventNew({ visible: false, title: '', description: '', date: new Date(), company: false, client: false, notification: true })
      socket.socket.emit('notification-update', { id: `/clients/${client.variables.id}` })
      socket.socket.emit('notification-push')
      socket.socket.emit('events-update', { id: `/clients/${client.variables.id}` })
      client.variables.company.users.forEach(item => {
        socket.socket.emit('events-update', { id: `/events:${item._id}` })
      })
      navigate(locationHistory ? locationHistory : `/client?section=events&date=${new Date().toLocaleDateString()}`)
    })
  }

  // * переход на вкладку Документы
  useEffect(() => {
    const section = searchParams.get('section')
    if (section && section === 'documents') {
      const action = searchParams.get('action')
      // если перенаправление с какого-то действия
      if (action) {
        switch (action) {
          case 'add':
            return setDialogDocumentNew({ 
              visible: true, title: '', description: '', file: '', section: '', tags: []  
            })
          case 'view':
            // просмотр информации о файле
            const viewId = searchParams.get('file')
            if (client.variables.documents) {
              const document = client.variables.documents.find(item => item._id === viewId)
              if (document) {
                return setDialogDocument({ 
                  visible: true, title: document.title, owner: document.owner,
                  description: document.description, section: document.section, tags: document.tags 
                })
              } else {
                return navigate(locationHistory ? locationHistory : -1)
              }
            }
            break
          case 'download':
            // скачивание файла
            const donwloadId = searchParams.get('file')
            handleDownloadDocument(donwloadId)
            break
          default:
            return navigate('/client?section=documents')
        }
      }
    }
  }, [searchParams, client])

  // * переход на вкладку События
  useEffect(() => {
    const section = searchParams.get('section')
    if (section && section === 'events') {
      const date = searchParams.get('date')

      // если не была указана дата перенаправляем на сегодняшнюю
      if (!date) {
        return navigate(`/client?section=events&date=${new Date().toLocaleDateString()}`)
      }

      const dateChunks = date.split('.')

      // проверка корректности даты переданной через поисковый запрос
      if (dateChunks.length !== 3) {
        return navigate(`/client?section=events&date=${new Date().toLocaleDateString()}`)
      }
      if (isNaN(Date.parse(dateChunks[2] + '-' + dateChunks[1] + '-' + dateChunks[0]))) {
        return navigate(`/client?section=events&date=${new Date().toLocaleDateString()}`)
      }

      // установка дат
      let currentDate = new Date(`${dateChunks[2]}-${dateChunks[1]}-${dateChunks[0]}`)
      currentDate.setHours(0, 0, 0, 0)

      // проверка на попадание в диапазон дат
      if (compareAsc(currentDate, maxDate) === 1) {
        currentDate = new Date(maxDate)
        currentDate.setHours(0, 0, 0, 0)
      }
      if (compareAsc(minDate, currentDate) === 1) {
        currentDate = new Date(minDate)
        currentDate.setHours(0, 0, 0, 0)
      }

      const todayDate = new Date()
      todayDate.setHours(0, 0, 0, 0)
      setTodayDate(todayDate)
      setCurrentDate(currentDate)

      const action = searchParams.get('action')
      // если перенаправление с какого-то действия
      if (action) {
        switch (action) {
          case 'add':
            return setDialogEventNew({ visible: true, title: '', description: '', date: currentDate, company: false, client: false, notification: true })
          default:
            return navigate(`/client?section=events&date=${new Date().toLocaleDateString()}`)
        }
      }

      if (dialogEventNew.visible) {
        setDialogEventNew({ visible: false, title: '', description: '', date: new Date(), company: false, client: false, notification: true })
      }
    }
  }, [searchParams, client])

  if (!client.variables.id) {
    return <div></div>
  }

  // * отображение списка директоров
  const renderDirectorsList = () => {

    const sRows = [] // элементы для отображения

    searchDirectors.forEach((item, index) => {

      // добавление подсветки на строку текущего пользователя и контактного лица
      let classes = 'customer__directors-item'
      if (item.directorId === client.variables.mainContact) {
        classes += ' customer__directors-item_contact'
      }
      if (item._id === auth.userId) {
        classes += ' customer__directors-item_self'
      }

      sRows.push(

        <div 
          className={classes}
          key={index}
        >
          <div>
            <Typography noWrap>
              Должность
            </Typography>
            <Tooltip title={
              item.post
                ? item.post
                : 'Не указано'
            }>
              <Typography noWrap>
                {
                  item.post
                    ? item.post
                    : 'Не указано'
                }
              </Typography>
            </Tooltip>
          </div>
          <div>
            <Typography noWrap>
              Имя
            </Typography>
            <Tooltip title={
              `${item.firstName} ${item.lastName}` 
            }>
              <Typography noWrap>
                {
                  `${item.firstName} ${item.lastName}` 
                }
              </Typography>
            </Tooltip>
          </div>
          <div className="customer__list-item-burger">
            {
              <Button 
                className='company__users-btn' 
                disableRipple 
                onClick={ ({ currentTarget }) => {
                  const attrExsts = currentTarget.parentNode.getAttribute('data-visible')
                  if (attrExsts) {
                    const active = (attrExsts === 'true')
                    if (active) {
                      currentTarget.parentNode.setAttribute('data-visible', false)
                    } else {
                      currentTarget.parentNode.setAttribute('data-visible', true)
                    }
                  } else {
                    currentTarget.parentNode.setAttribute('data-visible', true)
                  }
                }}
              >
                <SvgIcon> 
                  <path fill="currentColor" d="M12,16A2,2 0 0,1 14,18A2,2 0 0,1 12,20A2,2 0 0,1 10,18A2,2 0 0,1 12,16M12,10A2,2 0 0,1 14,12A2,2 0 0,1 12,14A2,2 0 0,1 10,12A2,2 0 0,1 12,10M12,4A2,2 0 0,1 14,6A2,2 0 0,1 12,8A2,2 0 0,1 10,6A2,2 0 0,1 12,4Z" /> 
                </SvgIcon>
              </Button>
            }
          </div>
          <div className="customer__directors-item-controls" data-id={item._id} data-director-id={item.directorId}>
            {
              item._id === auth.userId || client.variables.directors.find(item => item.directorId === client.variables.mainContact)._id === auth.userId
                ? (
                  <Button 
                    className='company__users-btn' 
                    disableRipple 
                    onClick={ ({ currentTarget: { parentNode } }) => {
                      setDialogDirectorPost({ visible: true, id: parentNode.getAttribute('data-id'), post: client.variables.directors.find(item => item.directorId === parentNode.getAttribute('data-director-id')).post })
                    } }
                  >
                    <Tooltip title='Сменить должность'>
                      <SvgIcon> 
                        <path fill="currentColor" d="M21.04 12.13C21.18 12.13 21.31 12.19 21.42 12.3L22.7 13.58C22.92 13.79 22.92 14.14 22.7 14.35L21.7 15.35L19.65 13.3L20.65 12.3C20.76 12.19 20.9 12.13 21.04 12.13M19.07 13.88L21.12 15.93L15.06 22H13V19.94L19.07 13.88M11 19L9 21H5C3.9 21 3 20.1 3 19V5C3 3.9 3.9 3 5 3H9.18C9.6 1.84 10.7 1 12 1C13.3 1 14.4 1.84 14.82 3H19C20.1 3 21 3.9 21 5V9L19 11V5H17V7H7V5H5V19H11M12 3C11.45 3 11 3.45 11 4C11 4.55 11.45 5 12 5C12.55 5 13 4.55 13 4C13 3.45 12.55 3 12 3Z" />
                      </SvgIcon>
                    </Tooltip>
                  </Button>
                )
                : <></>
            }
            {
              client.variables.directors.find(item => item.directorId === client.variables.mainContact)._id === auth.userId 
              && item._id !== auth.userId
                ? (
                  <>
                    <Button 
                      className='company__users-btn' 
                      disableRipple 
                      onClick={handleSaveDirectorContact}
                    >
                      <Tooltip title='Назначить контактным лицом'>
                        <SvgIcon> 
                          <path fill="currentColor" d="M10 12C12.21 12 14 10.21 14 8S12.21 4 10 4 6 5.79 6 8 7.79 12 10 12M10 6C11.11 6 12 6.9 12 8S11.11 10 10 10 8 9.11 8 8 8.9 6 10 6M10 13C7.33 13 2 14.33 2 17V20H13.09C13.07 19.86 13.05 19.73 13.04 19.59C13 19.4 13 19.2 13 19C13 18.69 13.03 18.39 13.08 18.1C13.21 17.21 13.54 16.38 14 15.66C14.21 15.38 14.42 15.12 14.65 14.88L14.67 14.85C14.9 14.61 15.16 14.39 15.43 14.19C14.76 13.88 14 13.64 13.26 13.45C12.07 13.15 10.89 13 10 13M11.05 18.1H3.9V17C3.9 16.36 7.03 14.9 10 14.9C10.68 14.9 11.36 15 12 15.11C11.5 16 11.18 17 11.05 18.1M22 18H20V22H18V18H16L19 15L22 18Z" /> 
                        </SvgIcon>
                      </Tooltip>
                    </Button>
                    <Button 
                      className='company__users-btn' 
                      disableRipple 
                      onClick={ ({ currentTarget: { parentNode } }) => {
                        setDialogDirectorDelete({ visible: true, id: parentNode.getAttribute('data-id') })
                      } }
                    >
                      <Tooltip title='Удалить директора'>
                        <SvgIcon> 
                          <path fill="currentColor" d="M9,3V4H4V6H5V19A2,2 0 0,0 7,21H17A2,2 0 0,0 19,19V6H20V4H15V3H9M7,6H17V19H7V6M9,8V17H11V8H9M13,8V17H15V8H13Z" /> 
                        </SvgIcon>
                      </Tooltip>
                    </Button>
                  </>
                )
                : <></>
            }
            {
              item._id !== auth.userId
                ? (
                  <Button className='company__users-btn' 
                    disableRipple 
                    onClick={ ({ currentTarget: { parentNode } }) => { navigate(`/messages?newchat=${parentNode.getAttribute('data-id')}`) } }
                  >
                    <Tooltip title='Написать сообщение'>
                      <SvgIcon> 
                        <path fill="currentColor" d="M22 6C22 4.9 21.1 4 20 4H4C2.9 4 2 4.9 2 6V18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V6M20 6L12 11L4 6H20M20 18H4V8L12 13L20 8V18Z" />
                      </SvgIcon>
                    </Tooltip>
                  </Button>
                )
                : <></>
            }
          </div>
        </div>
        
      )
    })

    return sRows
  }

  // * отображение списка акционеров
  const renderShareholdersList = () => {

    if (!client.variables.shareholders || client.variables.shareholders.length === 0) {
      return (
        <div className="customer__empty-list">
          <p>У вашей компании еще нет акционеров</p>
        </div>
      )
    }

    if (searchShareholders.length === 0) {
      return (
        <div className="customer__empty-list">
          <p>Акционеров не найдено</p>
        </div>
      )
    }

    const sRows = [] // элементы для отображения

    const summary = searchShareholders.reduce((prev, item) => {
      return prev + (+item.numOfShares)
    }, 0)

    searchShareholders.forEach((item, index) => {

      sRows.push(

        <div 
          className='customer__shareholders-item'
          key={index}
        >
          <div>
            <Typography noWrap>
              Акционер
            </Typography>
            <Tooltip title={
              item.name
                ? item.name
                : 'Не указано'
            }>
              <Typography noWrap>
                {
                  item.name
                    ? item.name
                    : 'Не указано'
                }
              </Typography>
            </Tooltip>
          </div>
          <div>
            <Typography noWrap>
              Тип
            </Typography>
            <Tooltip title={
              item.person
                ? 'Физическое лицо'
                : 'Юридическое лицо'
            }>
              <Typography noWrap>
                {
                  item.person
                    ? 'Физ. лицо'
                    : 'Юр. лицо'
                }
              </Typography>
            </Tooltip>
          </div>
          <div>
            <Typography noWrap>
              Количество акций
            </Typography>
            <Tooltip title={
              item.numOfShares
                ? item.numOfShares
                : 'Не указано'
            }>
              <Typography noWrap>
                {
                  item.numOfShares
                    ? item.numOfShares
                    : 'Не указано'
                }
              </Typography>
            </Tooltip>
          </div>
          <div>
            <Typography noWrap>
              %
            </Typography>
            <Tooltip title={
              Math.round((+item.numOfShares) * 100 / summary) + '%'
            }>
              <Typography noWrap>
                {
                  Math.round((+item.numOfShares) * 100 / summary) + '%'
                }
              </Typography>
            </Tooltip>
          </div>
          <div className="customer__list-item-burger">
            <Button 
              className='company__users-btn' 
              disableRipple 
              onClick={ ({ currentTarget }) => {
                const attrExsts = currentTarget.parentNode.getAttribute('data-visible')
                if (attrExsts) {
                  const active = (attrExsts === 'true')
                  if (active) {
                    currentTarget.parentNode.setAttribute('data-visible', false)
                  } else {
                    currentTarget.parentNode.setAttribute('data-visible', true)
                  }
                } else {
                  currentTarget.parentNode.setAttribute('data-visible', true)
                }
              }}
            >
              <SvgIcon> 
                <path fill="currentColor" d="M12,16A2,2 0 0,1 14,18A2,2 0 0,1 12,20A2,2 0 0,1 10,18A2,2 0 0,1 12,16M12,10A2,2 0 0,1 14,12A2,2 0 0,1 12,14A2,2 0 0,1 10,12A2,2 0 0,1 12,10M12,4A2,2 0 0,1 14,6A2,2 0 0,1 12,8A2,2 0 0,1 10,6A2,2 0 0,1 12,4Z" /> 
              </SvgIcon>
            </Button>
          </div>
          <div className="customer__shareholders-item-controls" data-id={item._id}>
            <Button 
              className='company__users-btn' 
              disableRipple 
              onClick={({ currentTarget: { parentNode } }) => {
                setDialogShareholderInfo({ 
                  visible: true, 
                  id: client.variables.shareholders.find(item => item._id === parentNode.getAttribute('data-id'))._id,
                  name: client.variables.shareholders.find(item => item._id === parentNode.getAttribute('data-id')).name,
                  person: client.variables.shareholders.find(item => item._id === parentNode.getAttribute('data-id')).person,
                  numOfShares: client.variables.shareholders.find(item => item._id === parentNode.getAttribute('data-id')).numOfShares,
                  shareholderDate: client.variables.shareholders.find(item => item._id === parentNode.getAttribute('data-id')).shareholderDate
                })
              }}
            >
              <Tooltip title='Изменить данные акционера'>
                <SvgIcon> 
                  <path fill="currentColor" d="M14.06,9L15,9.94L5.92,19H5V18.08L14.06,9M17.66,3C17.41,3 17.15,3.1 16.96,3.29L15.13,5.12L18.88,8.87L20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18.17,3.09 17.92,3 17.66,3M14.06,6.19L3,17.25V21H6.75L17.81,9.94L14.06,6.19Z" />
                </SvgIcon>
              </Tooltip>
            </Button>
            <Button 
              className='company__users-btn' 
              disableRipple 
              onClick={({ currentTarget: { parentNode } }) => {
                setDialogShareholderDelete({ visible: true, id: parentNode.getAttribute('data-id') })
              }}
            >
              <Tooltip title='Удалить акционера'>
                <SvgIcon> 
                  <path fill="currentColor" d="M9,3V4H4V6H5V19A2,2 0 0,0 7,21H17A2,2 0 0,0 19,19V6H20V4H15V3H9M7,6H17V19H7V6M9,8V17H11V8H9M13,8V17H15V8H13Z" /> 
                </SvgIcon>
              </Tooltip>
            </Button>
          </div>
        </div>
        
      )

    })

    return sRows
  }

  // * отображение списка приглашений
  const renderInvitesList = () => {

    if (!client.variables.invites || client.variables.invites.length === 0) {
      return (
        <div className="customer__empty-list">
          <p>У вашей компании нет отправленных приглашений</p>
        </div>
      )
    }

    if (searchInvites.length === 0) {
      return (
        <div className="customer__empty-list">
          <p>Приглашений не найдено</p>
        </div>
      )
    }

    const sRows = [] // элементы для отображения

    searchInvites.forEach((item, index) => {

      sRows.push(

        <div 
          className='customer__invites-item'
          style={{
            gridTemplateColumns: 
              client.variables.directors.find(item => item.directorId === client.variables.mainContact)._id === auth.userId
               ? 'minmax(80px, 1fr) minmax(80px, 1fr) minmax(80px, 1fr) 32px'
               : 'minmax(80px, 1fr) minmax(80px, 1fr) minmax(80px, 1fr)'
          }}
          key={index}
        >
          <div>
            <Typography noWrap>
              Пользователь
            </Typography>
            <Tooltip title={
              `${item.to.firstName} ${item.to.lastName}`
            }>
              <Typography noWrap>
                {
                  `${item.to.firstName} ${item.to.lastName}`
                }
              </Typography>
            </Tooltip>
          </div>
          <div>
            <Typography noWrap>
              Должность
            </Typography>
            <Tooltip title={
              item.params.post 
                ? item.params.post
                : 'Не указана'
            }>
              <Typography noWrap>
                {
                  item.params.post 
                    ? item.params.post
                    : 'Не указана'
                }
              </Typography>
            </Tooltip>
          </div>
          <div>
            <Typography noWrap>
              Активно до
            </Typography>
            <Tooltip title={
              item.expires && !isNaN(new Date(item.expires).getTime())
                ? new Date(item.expires).toLocaleDateString()
                : 'Не указано'
            }>
              <Typography noWrap>
                {
                  item.expires && !isNaN(new Date(item.expires).getTime())
                    ? new Date(item.expires).toLocaleDateString()
                    : 'Не указано'
                }
              </Typography>
            </Tooltip>
          </div>
          <div className="customer__list-item-burger">
            {
              client.variables.directors.find(item => item.directorId === client.variables.mainContact)._id === auth.userId
                ? (
                  <Button 
                    className='company__users-btn' 
                    disableRipple 
                    onClick={ ({ currentTarget }) => {
                      const attrExsts = currentTarget.parentNode.getAttribute('data-visible')
                      if (attrExsts) {
                        const active = (attrExsts === 'true')
                        if (active) {
                          currentTarget.parentNode.setAttribute('data-visible', false)
                        } else {
                          currentTarget.parentNode.setAttribute('data-visible', true)
                        }
                      } else {
                        currentTarget.parentNode.setAttribute('data-visible', true)
                      }
                    }}
                  >
                    <SvgIcon> 
                      <path fill="currentColor" d="M12,16A2,2 0 0,1 14,18A2,2 0 0,1 12,20A2,2 0 0,1 10,18A2,2 0 0,1 12,16M12,10A2,2 0 0,1 14,12A2,2 0 0,1 12,14A2,2 0 0,1 10,12A2,2 0 0,1 12,10M12,4A2,2 0 0,1 14,6A2,2 0 0,1 12,8A2,2 0 0,1 10,6A2,2 0 0,1 12,4Z" /> 
                    </SvgIcon>
                  </Button>
                )
                : <></>
            }
          </div>
          <div className="customer__shareholders-item-controls" data-id={item._id}>
            {
              client.variables.directors.find(item => item.directorId === client.variables.mainContact)._id === auth.userId
                ? (
                  <>
                    <Button 
                      className='company__users-btn' 
                      disableRipple 
                      onClick={({ currentTarget }) => {
                        setDialogInviteDelete({ visible: true, id: currentTarget.parentNode.getAttribute('data-id') })
                      }}
                    >
                      <Tooltip title='Удалить приглашение'>
                        <SvgIcon> 
                          <path fill="currentColor" d="M9,3V4H4V6H5V19A2,2 0 0,0 7,21H17A2,2 0 0,0 19,19V6H20V4H15V3H9M7,6H17V19H7V6M9,8V17H11V8H9M13,8V17H15V8H13Z" /> 
                        </SvgIcon>
                      </Tooltip>
                    </Button>
                  </>
                )
                : <></>
            }
          </div>
        </div>
        
      )

    })

    return sRows

  }

  // * отображение диалоговых окон
  const renderDialogs = () => {

    // закрытие окна добавления файла
    const handleCloseDocumentNew = () => {
      setDialogDocumentNew({ visible: false, title: '', description: '', file: '', section: '', tags: [] })
      navigate(locationHistory ? locationHistory : '/client?section=documents')
    }

    // закрытие окна информации о файле
    const handleCloseDocument = () => {
      setDialogDocument({ visible: false, title: '', description: '', owner: null, section: '', tags: [] })
      navigate(locationHistory ? locationHistory : '/client?section=documents')
    }

    // закрытие окна информации о файле
    const handleCloseEventNew = () => {
      setDialogEventNew({ visible: false, title: '', description: '', date: new Date(), company: false, client: false, notification: true })
      navigate(locationHistory ? locationHistory : `/client?section=events&date=${currentDate.toLocaleDateString()}`)
    }

    return (
      <>
        {/* акции */}
        <Dialog
          className="customer__dialog"
          fullScreen={fullScreen}
          open={dialogStocks.visible}
          onClose={ () => { setDialogStocks({ visible: false, mode: 'view', title: '', numOfShares: '', capital: '', shareCapital: '' }) } }
        >
          {/* Title */}
          <div className="customer__dialog-title">
            <p>{ dialogStocks.title }</p>
            <div className="customer__dialog-controls">
              <Button 
                className='company__users-btn' 
                disableRipple 
                onClick={ () => { setDialogStocks({ visible: false, mode: 'view', title: '', numOfShares: '', capital: '', shareCapital: '' }) } }
              >
                <SvgIcon>
                  <path fill="currentColor" d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
                </SvgIcon>
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="customer__dialog-content">
            {
              dialogStocks.mode === 'view'
                ? (
                  // mode: view
                  <div className="customer__dialog-items customer__dialog-items_view">
                    <div className="customer__dialog-item">
                      <p className="customer__dialog-label">
                        Количество акций
                      </p>
                      <p className="customer__dialog-value">
                        {
                          client.variables.numOfShares
                          ? formatNumber(client.variables.numOfShares)
                          : 'Не указано'
                        }
                      </p>
                    </div>
                    <div className="customer__dialog-item">
                      <p className="customer__dialog-label">
                        Стоимость акции
                      </p>
                      <p className="customer__dialog-value">
                        {
                          client.variables.shareCapital
                          ? '$ ' + formatNumber(client.variables.shareCapital)
                          : 'Не указано'
                        }
                      </p>
                    </div>
                    <div className="customer__dialog-item">
                      <p className="customer__dialog-label">
                        Оплаченный капитал
                      </p>
                      <p className="customer__dialog-value">
                        {
                          client.variables.capital
                          ? '$ ' + formatNumber(client.variables.capital)
                          : 'Не указано'
                        }
                      </p>
                    </div>
                  </div>
                )
                : (
                  // mode: edit
                  <div className="customer__dialog-items customer__dialog-items_edit">
                    <div className="customer__dialog-item">
                      <p className="customer__dialog-label">
                        Количество акций
                      </p>
                      <TextField
                        fullWidth
                        className="customer__dialog-input"
                        name="numOfShares"
                        type='number'
                        value={dialogStocks.numOfShares}
                        onChange={ ({ currentTarget: { name, value } }) => {
                          setDialogStocks({ ...dialogStocks, [name]: value })
                        } }
                      />
                    </div>
                    <div className="customer__dialog-item">
                      <p className="customer__dialog-label">
                        Стоимость акции
                      </p>
                      <TextField
                        fullWidth
                        className="customer__dialog-input"
                        name="shareCapital"
                        type='number'
                        value={dialogStocks.shareCapital}
                        onChange={ ({ currentTarget: { name, value } }) => {
                          setDialogStocks({ ...dialogStocks, [name]: value })
                        } }
                      />
                    </div>
                    <div className="customer__dialog-item">
                      <p className="customer__dialog-label">
                        Оплаченный капитал
                      </p>
                      <TextField
                        fullWidth
                        className="customer__dialog-input"
                        name="capital"
                        type='number'
                        value={dialogStocks.capital}
                        onChange={ ({ currentTarget: { name, value } }) => {
                          setDialogStocks({ ...dialogStocks, [name]: value })
                        } }
                      />
                    </div>
                  </div>
                )
            }
          </div>
          {/* Actions */}
          {
            dialogStocks.mode === 'edit'
              ? (
                <div className="customer__dialog-controls">
                  <Button 
                    className='customer__dialog-btn customer__dialog-btn_cancel' 
                    onClick={ () => { setDialogStocks({ visible: false, mode: 'view', title: '', numOfShares: '', capital: '', shareCapital: '' }) } } 
                    autoFocus
                  >
                    Отмена
                  </Button>
                  <Button 
                    className='customer__dialog-btn' 
                    onClick={handleSaveStocks} 
                    autoFocus
                  >
                    Сохранить
                  </Button>
                </div>
              )
              : <></>
          }
        </Dialog>

        {/* контактное лицо */}
        <Dialog
          className="customer__dialog"
          fullScreen={fullScreen}
          open={dialogContact.visible}
          onClose={ () => { setDialogContact({ visible: false, user: null, title: '' }) } }
        >
          {/* Title */}
          <div className="customer__dialog-title">
            <p>{ dialogContact.title }</p>
            <div className="customer__dialog-controls">
              <Button 
                className='company__users-btn' 
                disableRipple 
                onClick={ () => { setDialogContact({ visible: false, user: null, title: '' }) } }
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
                  Имя
                </p>
                <p className="customer__dialog-value">
                  {
                    dialogContact.user && dialogContact.user.firstName && dialogContact.user.lastName
                      ? `${dialogContact.user.firstName} ${dialogContact.user.lastName}`
                      : 'Не указано'
                  }
                </p>
              </div>
              <div className="customer__dialog-item">
                <p className="customer__dialog-label">
                  Должность
                </p>
                <p className="customer__dialog-value">
                  {
                    dialogContact.user && dialogContact.user.post
                      ? dialogContact.user.post
                      : 'Не указана'
                  }
                </p>
              </div>
              <div className="customer__dialog-item">
                <p className="customer__dialog-label">
                  Электронная почта
                </p>
                <p className="customer__dialog-value">
                  {
                    dialogContact.user && dialogContact.user.email
                      ? dialogContact.user.email
                      : 'Не указана'
                  }
                </p>
              </div>
              <div className="customer__dialog-item">
                <p className="customer__dialog-label">
                  Телефон
                </p>
                <p className="customer__dialog-value">
                  {
                    dialogContact.user && dialogContact.user.phoneNumber
                      ? dialogContact.user.phoneNumber
                      : 'Не указан'
                  }
                </p>
              </div>
            </div>
          </div>
          {
            dialogContact.user && dialogContact.user._id
              ? (
                <div className="customer__dialog-controls">
                    <Button 
                    className='customer__dialog-btn customer__dialog-btn_cancel' 
                    onClick={ () => { setDialogStocks({ visible: false, mode: 'view', title: '', numOfShares: '', capital: '', shareCapital: '' }) } } 
                    autoFocus
                  >
                    Написать сообщение
                  </Button>
                </div>
              )
              : <></>
          }
        </Dialog>

        {/* информация о клиенте */}
        <Dialog
          className="customer__dialog"
          fullScreen={fullScreen}
          open={dialogInfo.visible}
          onClose={ () => { setDialogInfo({ 
            visible: false, mode: 'view', title: '', 
            clientName: '', registeredAddress: '', email: '', UEN: '', 
            lastAGM: '', lastARFilled: '' 
          }) } }
        >
          {/* Title */}
          <div className="customer__dialog-title">
            <p>{ dialogInfo.title }</p>
            <div className="customer__dialog-controls">
              <Button 
                className='company__users-btn' 
                disableRipple 
                onClick={ () => { setDialogInfo({ 
                  visible: false, mode: 'view', title: '', 
                  clientName: '', registeredAddress: '', email: '', UEN: '', 
                  lastAGM: '', lastARFilled: '' 
                }) } }
              >
                <SvgIcon>
                  <path fill="currentColor" d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
                </SvgIcon>
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="customer__dialog-content">
            {
              dialogInfo.mode === 'view'
                ? (
                  // mode: view
                  <div className="customer__dialog-items customer__dialog-items_view">
                    <div className="customer__dialog-item">
                      <p className="customer__dialog-label">
                        Название компании
                      </p>
                      <p className="customer__dialog-value">
                        {
                          client.variables.name
                            ? client.variables.name
                            : 'Не указано'
                        }
                      </p>
                    </div>
                    <div className="customer__dialog-item">
                      <p className="customer__dialog-label">
                        Адрес
                      </p>
                      <p className="customer__dialog-value">
                        {
                          client.variables.address
                            ? client.variables.address
                            : 'Не указан'
                        }
                      </p>
                    </div>
                    <div className="customer__dialog-item">
                      <p className="customer__dialog-label">
                        Электронная почта
                      </p>
                      <p className="customer__dialog-value">
                        {
                          client.variables.email
                            ? client.variables.email
                            : 'Не указана'
                        }
                      </p>
                    </div>
                    <div className="customer__dialog-item">
                      <p className="customer__dialog-label">
                        Дата регистрации
                      </p>
                      <p className="customer__dialog-value">
                        {
                          client.variables.regDate && !isNaN(new Date(client.variables.regDate).getTime())
                            ? new Date(client.variables.regDate).toLocaleDateString()
                            : 'Не указана'
                        }
                      </p>
                    </div>
                    <div className="customer__dialog-item">
                      <p className="customer__dialog-label">
                        ИНН
                      </p>
                      <p className="customer__dialog-value">
                        {
                          client.variables.uen
                            ? client.variables.uen
                            : 'Не указан'
                        }
                      </p>
                    </div>
                    <div className="customer__dialog-item">
                      <p className="customer__dialog-label">
                        Статус ИНН
                      </p>
                      <p className="customer__dialog-value">
                        {
                          client.variables.uenStatus
                            ? client.variables.uenStatus
                            : 'Не указан'
                        }
                      </p>
                    </div>
                    <div className="customer__dialog-item">
                      <p className="customer__dialog-label">
                        Дата постановки
                      </p>
                      <p className="customer__dialog-value">
                        {
                          client.variables.uenDate && !isNaN(new Date(client.variables.uenDate).getTime())
                            ? new Date(client.variables.uenDate).toLocaleDateString()
                            : 'Не указана'
                        }
                      </p>
                    </div>
                    <div className="customer__dialog-item">
                      <p className="customer__dialog-label">
                        Дата последней встречи совета директоров
                      </p>
                      <p className="customer__dialog-value">
                        {
                          client.variables.lastAGM && !isNaN(new Date(client.variables.lastAGM).getTime())
                            ? new Date(client.variables.lastAGM).toLocaleDateString()
                            : 'Не указана'
                        }
                      </p>
                    </div>
                    <div className="customer__dialog-item">
                      <p className="customer__dialog-label">
                        Дата последнего заполнения декларации
                      </p>
                      <p className="customer__dialog-value">
                        {
                          client.variables.lastARFilled && !isNaN(new Date(client.variables.lastARFilled).getTime())
                            ? new Date(client.variables.lastARFilled).toLocaleDateString()
                            : 'Не указана'
                        }
                      </p>
                    </div>
                  </div>
                )
                : (
                  // mode: edit
                  <div className="customer__dialog-items customer__dialog-items_edit">
                    <LocalizationProvider dateAdapter={AdapterDateFns}>
                      <div className="customer__dialog-item">
                        <p className="customer__dialog-label">
                          Название
                        </p>
                        <TextField
                          fullWidth
                          className="customer__dialog-input"
                          name="clientName"
                          value={dialogInfo.clientName}
                          onChange={ ({ currentTarget: { name, value } }) => {
                            setDialogInfo({ ...dialogInfo, [name]: value })
                          } }
                        />
                      </div>
                      <div className="customer__dialog-item">
                        <p className="customer__dialog-label">
                          Адрес
                        </p>
                        <TextField
                          fullWidth
                          className="customer__dialog-input"
                          name="registeredAddress"
                          value={dialogInfo.registeredAddress}
                          onChange={ ({ currentTarget: { name, value } }) => {
                            setDialogInfo({ ...dialogInfo, [name]: value })
                          } }
                        />
                      </div>
                      <div className="customer__dialog-item">
                        <p className="customer__dialog-label">
                          Электронная почта
                        </p>
                        <TextField
                          fullWidth
                          className="customer__dialog-input"
                          name="email"
                          value={dialogInfo.email}
                          onChange={ ({ currentTarget: { name, value } }) => {
                            setDialogInfo({ ...dialogInfo, [name]: value })
                          } }
                        />
                      </div>
                      <div className="customer__dialog-item">
                        <p className="customer__dialog-label">
                          ИНН
                        </p>
                        <TextField
                          fullWidth
                          className="customer__dialog-input"
                          name="UEN"
                          type='number'
                          value={dialogInfo.UEN}
                          onChange={ ({ currentTarget: { name, value } }) => {
                            setDialogInfo({ ...dialogInfo, [name]: value })
                          } }
                        />
                      </div>
                      <div className="customer__dialog-item">
                        <p className="customer__dialog-label">
                          Дата последней встречи совета директоров
                        </p>
                        <MobileDatePicker
                          value={dialogInfo.lastAGM}
                          clearable
                          minDate={new Date(1900, 1, 1)}
                          maxDate={new Date()}
                          onChange={(value) => {
                            setDialogInfo({ ...dialogInfo, lastAGM: value })
                          }}
                          renderInput={(params) => <TextField {...params} className='customer__dialog-input'/>}
                        />
                      </div>
                      <div className="customer__dialog-item">
                        <p className="customer__dialog-label">
                          Дата последнего заполнения декларации
                        </p>
                        <MobileDatePicker
                          value={dialogInfo.lastARFilled}
                          clearable
                          minDate={new Date(1900, 1, 1)}
                          maxDate={new Date()}
                          onChange={(value) => {
                            setDialogInfo({ ...dialogInfo, lastARFilled: value })
                          }}
                          renderInput={(params) => <TextField {...params} className='customer__dialog-input'/>}
                        />
                      </div>
                    </LocalizationProvider>
                  </div>
                )
            }
          </div>
          {/* Actions */}
          {
            dialogInfo.mode === 'edit'
              ? (
                <div className="customer__dialog-controls">
                  <Button 
                    className='customer__dialog-btn customer__dialog-btn_cancel' 
                    onClick={ () => { setDialogInfo({ 
                      visible: false, mode: 'view', title: '', 
                      clientName: '', registeredAddress: '', email: '', UEN: '', 
                      lastAGM: '', lastARFilled: '' 
                    }) } } 
                    autoFocus
                  >
                    Отмена
                  </Button>
                  <Button 
                    className='customer__dialog-btn' 
                    onClick={handleSaveInfo} 
                    autoFocus
                  >
                    Сохранить
                  </Button>
                </div>
              )
              : <></>
          }
        </Dialog>

        {/* смена должности директора */}
        <Dialog
          className="customer__dialog"
          fullScreen={fullScreen}
          open={dialogDirectorPost.visible}
          onClose={ () => { setDialogDirectorPost({ visible: false, id: '', post: ''}) } }
        >
          {/* Title */}
          <div className="customer__dialog-title">
            <p>Изменение должности</p>
            <div className="customer__dialog-controls">
              <Button 
                className='company__users-btn' 
                disableRipple 
                onClick={ () => { setDialogDirectorPost({ visible: false, id: '', post: ''}) } }
              >
                <SvgIcon>
                  <path fill="currentColor" d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
                </SvgIcon>
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="customer__dialog-content">
            <div className="customer__dialog-items customer__dialog-items_edit">
              <div className="customer__dialog-item">
                <p className="customer__dialog-label">
                  Должность
                </p>
                <TextField
                  fullWidth
                  className="customer__dialog-input"
                  value={dialogDirectorPost.post}
                  onChange={ ({ currentTarget: { value } }) => {
                    setDialogDirectorPost({ ...dialogDirectorPost, post: value })
                  } }
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="customer__dialog-controls">
            <Button 
              className='customer__dialog-btn customer__dialog-btn_cancel' 
              onClick={ () => { setDialogDirectorPost({ visible: false, id: '', post: ''}) } } 
              autoFocus
            >
              Отмена
            </Button>
            <Button 
              className='customer__dialog-btn' 
              onClick={handleSaveDirectorPost} 
              autoFocus
            >
              Сохранить
            </Button>
          </div>
        </Dialog>

        {/* удаление директора */}
        <Dialog
          className="customer__dialog"
          fullScreen={fullScreen}
          open={dialogDirectorDelete.visible}
          onClose={ () => { setDialogDirectorDelete({ visible: false, id: '' }) } }
        >
          {/* Title */}
          <div className="customer__dialog-title">
            <p>Удаление</p>
            <div className="customer__dialog-controls">
              <Button 
                className='company__users-btn' 
                disableRipple 
                onClick={ () => { setDialogDirectorDelete({ visible: false, id: '' }) } }
              >
                <SvgIcon>
                  <path fill="currentColor" d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
                </SvgIcon>
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="customer__dialog-content">
            <div className="customer__dialog-alert">
              <p>Вы уверены что хотите удалить этого директора?</p>
            </div>
          </div>

          {/* Actions */}
          <div className="customer__dialog-controls">
            <Button 
              className='customer__dialog-btn customer__dialog-btn_cancel' 
              onClick={ () => { setDialogDirectorDelete({ visible: false, id: '' }) } } 
              autoFocus
            >
              Отмена
            </Button>
            <Button 
              className='customer__dialog-btn' 
              onClick={handleDeleteDirector} 
              autoFocus
            >
              Удалить
            </Button>
          </div>
        </Dialog>

        {/* приглашение директора */}
        <Dialog
          className="customer__dialog"
          fullScreen={fullScreen}
          open={dialogDirectorNew.visible}
          onClose={ () => { setDialogDirectorNew({ visible: false, email: '', post: '', message: '' }) } }
        >
          {/* Title */}
          <div className="customer__dialog-title">
            <p>Создание приглашения</p>
            <div className="customer__dialog-controls">
              <Button 
                className='company__users-btn' 
                disableRipple 
                onClick={ () => { setDialogDirectorNew({ visible: false, email: '', post: '', message: '' }) } }
              >
                <SvgIcon>
                  <path fill="currentColor" d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
                </SvgIcon>
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="customer__dialog-content">
            <div className="customer__dialog-items customer__dialog-items_edit">
              <div className="customer__dialog-item">
                <p className="customer__dialog-label">
                  Электронная почта
                </p>
                <TextField
                  fullWidth
                  className="customer__dialog-input"
                  value={dialogDirectorNew.email}
                  onChange={ ({ currentTarget: { value } }) => {
                    setDialogDirectorNew({ ...dialogDirectorNew, email: value })
                  } }
                />
              </div>
              <div className="customer__dialog-item">
                <p className="customer__dialog-label">
                  Должность
                </p>
                <TextField
                  fullWidth
                  className="customer__dialog-input"
                  value={dialogDirectorNew.post}
                  onChange={ ({ currentTarget: { value } }) => {
                    setDialogDirectorNew({ ...dialogDirectorNew, post: value })
                  } }
                />
              </div>
              <div className="customer__dialog-item">
                <p className="customer__dialog-label">
                  Сообщение для пользователя
                </p>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  className="customer__dialog-input"
                  value={dialogDirectorNew.message}
                  onChange={ ({ currentTarget: { value } }) => {
                    setDialogDirectorNew({ ...dialogDirectorNew, message: value })
                  } }
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="customer__dialog-controls">
            <Button 
              className='customer__dialog-btn customer__dialog-btn_cancel' 
              onClick={ () => { setDialogDirectorNew({ visible: false, email: '', post: '', message: '' }) } } 
              autoFocus
            >
              Отмена
            </Button>
            <Button 
              className='customer__dialog-btn' 
              onClick={handleNewDirector} 
              autoFocus
            >
              Отправить
            </Button>
          </div>
        </Dialog>

        {/* список директоров */}
        <Dialog
          className="customer__dialog"
          fullScreen={fullScreen}
          open={dialogDirector.visible}
          onClose={ () => { setDialogDirector({ visible: false, directors: [], mainContact: '' }) } }
        >
          {/* Title */}
          <div className="customer__dialog-title">
            <p>Список директоров компании</p>
            <div className="customer__dialog-controls">
              <Button 
                className='company__users-btn' 
                disableRipple 
                onClick={ () => { setDialogDirector({ visible: false, directors: [], mainContact: '' }) } }
              >
                <SvgIcon>
                  <path fill="currentColor" d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
                </SvgIcon>
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="customer__dialog-content">
            {/* Список директоров компании */}
            <div className="customer__directors">
              <div className="customer__directors-title">
                <div className="customer__directors-controls">
                  <TextField 
                    fullWidth
                    className="customer__input"
                    placeholder="Поиск директора"
                    onChange={handleSearchDirector}
                  />
                </div>
              </div>

              <div className="customer__directors-list">
                {
                  renderDirectorsList()
                }
              </div>

              <div className="customer__directors-legend">
                <div className="customer__directors-legend_self">
                  <p>Вы</p>
                </div>
                <div className="customer__directors-legend_contact">
                  <p>Контактное лицо</p>
                </div>
              </div>

            </div>
          </div>
          
          {
            client.variables.directors.find(item => item.directorId === client.variables.mainContact)._id === auth.userId
              ? (
                <div className="customer__dialog-controls">
                  <Button 
                    className='customer__dialog-btn' 
                    onClick={ () => {
                      setDialogDirectorNew({ 
                        visible: true, email: '', post: '', message: ''
                      }) 
                    }} 
                    autoFocus
                  >
                    Пригласить директора
                  </Button>
                </div>
              )
              : <></>
          }
        </Dialog>

        {/* создание акционера */}
        <Dialog
          className="customer__dialog"
          fullScreen={fullScreen}
          open={dialogShareholderNew.visible}
          onClose={ () => { setDialogShareholderNew({ visible: false, name: '', person: false, numOfShares: '', shareholderDate: null }) } }
        >
          {/* Title */}
          <div className="customer__dialog-title">
            <p>Создание акционера</p>
            <div className="customer__dialog-controls">
              <Button 
                className='company__users-btn' 
                disableRipple 
                onClick={ () => { setDialogShareholderNew({ visible: false, name: '', person: false, numOfShares: '', shareholderDate: null }) } }
              >
                <SvgIcon>
                  <path fill="currentColor" d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
                </SvgIcon>
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="customer__dialog-content">
            <LocalizationProvider dateAdapter={AdapterDateFns} locale={ruLocale}>
              <div className="customer__dialog-items customer__dialog-items_edit">
                <div className="customer__dialog-item customer__dialog-switch">
                  <Button
                    disableRipple
                    className={
                      dialogShareholderNew.person
                        ? 'customer__dialog-switch_active'
                        : ''
                    }
                    onClick={() => {
                      setDialogShareholderNew({ ...dialogShareholderNew, person: true })
                    }}
                  >
                    Физическое лицо
                  </Button>
                  <Button
                    disableRipple
                    className={
                      !dialogShareholderNew.person
                        ? 'customer__dialog-switch_active'
                        : ''
                    }
                    onClick={() => {
                      setDialogShareholderNew({ ...dialogShareholderNew, person: false })
                    }}
                  >
                    Юридическое лицо
                  </Button>
                </div>
                <div className="customer__dialog-item">
                  <p className="customer__dialog-label">
                    Название
                  </p>
                  <TextField
                    fullWidth
                    className="customer__dialog-input"
                    name="name"
                    value={dialogShareholderNew.name}
                    onChange={ ({ currentTarget: { name, value } }) => {
                      setDialogShareholderNew({ ...dialogShareholderNew, [name]: value })
                    } }
                  />
                </div>
                <div className="customer__dialog-item">
                  <p className="customer__dialog-label">
                    Количество акций
                  </p>
                  <TextField
                    fullWidth
                    className="customer__dialog-input"
                    name="numOfShares"
                    type='number'
                    value={dialogShareholderNew.numOfShares}
                    onChange={ ({ currentTarget: { name, value } }) => {
                      setDialogShareholderNew({ ...dialogShareholderNew, [name]: value })
                    } }
                  />
                </div>
                <div className="customer__dialog-item">
                  <p className="customer__dialog-label">
                    Дата акционерного соглашения
                  </p>
                  <MobileDatePicker
                    value={dialogShareholderNew.shareholderDate}
                    minDate={new Date(1900, 1, 1)}
                    maxDate={new Date()}
                    onChange={(value) => {
                      setDialogShareholderNew({ ...dialogShareholderNew, shareholderDate: value })
                    }}
                    renderInput={(params) => <TextField {...params} className='customer__dialog-input'/>}
                  />
                </div>
              </div>
            </LocalizationProvider>
          </div>
          {/* Actions */}
          <div className="customer__dialog-controls">
            <Button 
              className='customer__dialog-btn customer__dialog-btn_cancel' 
              onClick={ () => { setDialogShareholderNew({ visible: false, name: '', person: false, numOfShares: '', shareholderDate: null }) } } 
              autoFocus
            >
              Отмена
            </Button>
            <Button 
              className='customer__dialog-btn' 
              onClick={handleNewShareholder} 
              autoFocus
            >
              Сохранить
            </Button>
          </div>
        </Dialog>

        {/* изменение акционера */}
        <Dialog
          className="customer__dialog"
          fullScreen={fullScreen}
          open={dialogShareholderInfo.visible}
          onClose={ () => { setDialogShareholderInfo({ visible: false, id: '', name: '', person: false, numOfShares: '', shareholderDate: null }) } }
        >
          {/* Title */}
          <div className="customer__dialog-title">
            <p>Изменение акционера</p>
            <div className="customer__dialog-controls">
              <Button 
                className='company__users-btn' 
                disableRipple 
                onClick={ () => { setDialogShareholderInfo({ visible: false, id: '', name: '', person: false, numOfShares: '', shareholderDate: null }) } }
              >
                <SvgIcon>
                  <path fill="currentColor" d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
                </SvgIcon>
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="customer__dialog-content">
            <LocalizationProvider dateAdapter={AdapterDateFns} locale={ruLocale}>
              <div className="customer__dialog-items customer__dialog-items_edit">
                <div className="customer__dialog-item customer__dialog-switch">
                  <Button
                    disableRipple
                    className={
                      dialogShareholderInfo.person
                        ? 'customer__dialog-switch_active'
                        : ''
                    }
                    onClick={() => {
                      setDialogShareholderInfo({ ...dialogShareholderInfo, person: true })
                    }}
                  >
                    Физическое лицо
                  </Button>
                  <Button
                    disableRipple
                    className={
                      !dialogShareholderInfo.person
                        ? 'customer__dialog-switch_active'
                        : ''
                    }
                    onClick={() => {
                      setDialogShareholderInfo({ ...dialogShareholderInfo, person: false })
                    }}
                  >
                    Юридическое лицо
                  </Button>
                </div>
                <div className="customer__dialog-item">
                  <p className="customer__dialog-label">
                    Название
                  </p>
                  <TextField
                    fullWidth
                    className="customer__dialog-input"
                    name="name"
                    value={dialogShareholderInfo.name}
                    onChange={ ({ currentTarget: { name, value } }) => {
                      setDialogShareholderInfo({ ...dialogShareholderInfo, [name]: value })
                    } }
                  />
                </div>
                <div className="customer__dialog-item">
                  <p className="customer__dialog-label">
                    Количество акций
                  </p>
                  <TextField
                    fullWidth
                    className="customer__dialog-input"
                    name="numOfShares"
                    type='number'
                    value={dialogShareholderInfo.numOfShares}
                    onChange={ ({ currentTarget: { name, value } }) => {
                      setDialogShareholderInfo({ ...dialogShareholderInfo, [name]: value })
                    } }
                  />
                </div>
                <div className="customer__dialog-item">
                  <p className="customer__dialog-label">
                    Дата акционерного соглашения
                  </p>
                  <MobileDatePicker
                    value={dialogShareholderInfo.shareholderDate}
                    minDate={new Date(1900, 1, 1)}
                    maxDate={new Date()}
                    onChange={(value) => {
                      setDialogShareholderInfo({ ...dialogShareholderInfo, shareholderDate: value })
                    }}
                    renderInput={(params) => <TextField {...params} className='customer__dialog-input'/>}
                  />
                </div>
              </div>
            </LocalizationProvider>
          </div>
          {/* Actions */}
          <div className="customer__dialog-controls">
            <Button 
              className='customer__dialog-btn customer__dialog-btn_cancel' 
              onClick={ () => { setDialogShareholderInfo({ visible: false, id: '', name: '', person: false, numOfShares: '', shareholderDate: null }) } } 
              autoFocus
            >
              Отмена
            </Button>
            <Button 
              className='customer__dialog-btn' 
              onClick={handleSaveShareholder} 
              autoFocus
            >
              Сохранить
            </Button>
          </div>
        </Dialog>

        {/* удаление акционера */}
        <Dialog
          className="customer__dialog"
          fullScreen={fullScreen}
          open={dialogShareholderDelete.visible}
          onClose={ () => { setDialogShareholderDelete({ visible: false, id: '' }) } }
        >
          {/* Title */}
          <div className="customer__dialog-title">
            <p>Удаление</p>
            <div className="customer__dialog-controls">
              <Button 
                className='company__users-btn' 
                disableRipple 
                onClick={ () => { setDialogShareholderDelete({ visible: false, id: '' }) } }
              >
                <SvgIcon>
                  <path fill="currentColor" d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
                </SvgIcon>
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="customer__dialog-content">
            <div className="customer__dialog-alert">
              <p>Вы уверены что хотите удалить этого акционера?</p>
            </div>
          </div>

          {/* Actions */}
          <div className="customer__dialog-controls">
            <Button 
              className='customer__dialog-btn customer__dialog-btn_cancel' 
              onClick={ () => { setDialogShareholderDelete({ visible: false, id: '' }) } } 
              autoFocus
            >
              Отмена
            </Button>
            <Button 
              className='customer__dialog-btn' 
              onClick={handleDeleteShareholder} 
              autoFocus
            >
              Удалить
            </Button>
          </div>
        </Dialog>

        {/* список акционеров */}
        <Dialog
          className="customer__dialog"
          fullScreen={fullScreen}
          open={dialogShareholder.visible}
          onClose={ () => { setDialogShareholder({ visible: false, shareholders: [] }) } }
        >
          {/* Title */}
          <div className="customer__dialog-title">
            <p>Список акционеров компании</p>
            <div className="customer__dialog-controls">
              <Button 
                className='company__users-btn' 
                disableRipple 
                onClick={ () => { setDialogShareholder({ visible: false, shareholders: [] }) } }
              >
                <SvgIcon>
                  <path fill="currentColor" d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
                </SvgIcon>
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="customer__dialog-content">
            {/* Список акционеров компании */}
            <div className="customer__shareholders">
            <div className="customer__shareholders-title">
              <div className="customer__shareholders-controls">
                <TextField 
                  className="customer__input"
                  fullWidth
                  placeholder="Поиск акционера"
                  onChange={handleSearchShareholder}
                />
                <Button 
                  className='company__users-btn' 
                  disableRipple 
                  data-sort='asc'
                  onClick={handleSortShareholder}
                >
                  <Tooltip title='Сортировать по количеству акций'>
                    <SvgIcon> 
                      <path fill="currentColor" d="M18 21L14 17H17V7H14L18 3L22 7H19V17H22M2 19V17H12V19M2 13V11H9V13M2 7V5H6V7H2Z" />
                    </SvgIcon>
                  </Tooltip>
                </Button>
              </div>
            </div>

            <div className="customer__shareholders-list">
              {
                renderShareholdersList()
              }
            </div>
          </div>
          </div>
          <div className="customer__dialog-controls">
            <Button 
              className='customer__dialog-btn' 
              onClick={ () => {
                setDialogShareholderNew({ 
                  visible: true, name: '', person: false, numOfShares: '', shareholderDate: new Date()
                }) 
              }} 
              autoFocus
            >
              Создать акционера
            </Button>
          </div>
        </Dialog>
        
        {/* удаление приглашения */}
        <Dialog
          className="customer__dialog"
          fullScreen={fullScreen}
          open={dialogInviteDelete.visible}
          onClose={ () => { setDialogInviteDelete({ visible: false, id: '' }) } }
        >
          {/* Title */}
          <div className="customer__dialog-title">
            <p>Удаление</p>
            <div className="customer__dialog-controls">
              <Button 
                className='company__users-btn' 
                disableRipple 
                onClick={ () => { setDialogInviteDelete({ visible: false, id: '' }) } }
              >
                <SvgIcon>
                  <path fill="currentColor" d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
                </SvgIcon>
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="customer__dialog-content">
            <div className="customer__dialog-alert">
              <p>Вы уверены что хотите удалить это приглашение?</p>
            </div>
          </div>

          {/* Actions */}
          <div className="customer__dialog-controls">
            <Button 
              className='customer__dialog-btn customer__dialog-btn_cancel' 
              onClick={ () => { setDialogInviteDelete({ visible: false, id: '' }) } } 
              autoFocus
            >
              Отмена
            </Button>
            <Button 
              className='customer__dialog-btn' 
              onClick={handleDeleteInvite} 
              autoFocus
            >
              Удалить
            </Button>
          </div>
        </Dialog>

        {/* список приглашений */}
        <Dialog
          className="customer__dialog"
          fullScreen={fullScreen}
          open={dialogInvite.visible}
          onClose={ () => { setDialogInvite({ visible: false }) } }
        >
          {/* Title */}
          <div className="customer__dialog-title">
            <p>Список приглашений</p>
            <div className="customer__dialog-controls">
              <Button 
                className='company__users-btn' 
                disableRipple 
                onClick={ () => { setDialogInvite({ visible: false }) } }
              >
                <SvgIcon>
                  <path fill="currentColor" d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
                </SvgIcon>
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="customer__dialog-content">
            {/* Список приглашений */}
            <div className="customer__invites">
              <div className="customer__invites-title">
                <div className="customer__invites-controls">
                  <TextField 
                    fullWidth
                    className="customer__input"
                    placeholder="Поиск приглашения"
                    onChange={handleSearchInvites}
                  />
                </div>
              </div>

              <div className="customer__invites-list">
                {
                  renderInvitesList()
                }
              </div>
            </div>
          </div>
        </Dialog>

        {/* добавление файла */}
        <Dialog
          className="customer__dialog"
          fullScreen={fullScreen}
          open={dialogDocumentNew.visible}
          onClose={handleCloseDocumentNew}
        >
          {/* Title */}
          <div className="customer__dialog-title">
            <p>Загрузить файл</p>
            <div className="customer__dialog-controls">
              <Button 
                className='company__users-btn' 
                disableRipple 
                onClick={handleCloseDocumentNew}
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
                <p className="customer__dialog-label">Название</p>
                <TextField
                  className="customer__dialog-input"
                  name='title'
                  value={dialogDocumentNew.title}
                  onChange={({ currentTarget: { name, value } }) => {
                    setDialogDocumentNew({ ...dialogDocumentNew, [name]: value })
                  }}
                />
              </div>
              <div className="customer__dialog-item">
                <p className="customer__dialog-label">Описание</p>
                <TextField
                  className="customer__dialog-input"
                  name='description'
                  multiline
                  rows={4}
                  value={dialogDocumentNew.description}
                  onChange={({ currentTarget: { name, value } }) => {
                    setDialogDocumentNew({ ...dialogDocumentNew, [name]: value })
                  }}
                />
              </div>
              <div className="customer__dialog-item">
                <p className="customer__dialog-label">Файл</p>
                <TextField
                  className="customer__dialog-input"
                  type='file'
                  onChange={({ target: { files } }) => {
                    setDialogDocumentNew({ ...dialogDocumentNew, file: files[0] })
                  }}
                />
              </div>
              <div className="customer__dialog-item">
                <p className="customer__dialog-label">Раздел</p>
                <TextField
                  className="customer__dialog-input"
                  name='section'
                  value={dialogDocumentNew.section}
                  onChange={({ currentTarget: { name, value } }) => {
                    setDialogDocumentNew({ ...dialogDocumentNew, [name]: value })
                  }}
                />
              </div>
              <div className="customer__dialog-item">
                <p className="customer__dialog-label">Тэги</p>
                <TextField
                  className="customer__dialog-input"
                  name='tags'
                  onKeyPress={({ target, key }) => {
                    if (key === 'Enter' && target.value && !dialogDocumentNew.tags.includes(target.value.toUpperCase())) {
                      const tags = [...dialogDocumentNew.tags]
                      tags.push(target.value.toUpperCase())
                      setDialogDocumentNew({ ...dialogDocumentNew, tags: tags })
                    }
                  }}
                />
                <div className="customer__dialog-tags">
                  {
                    dialogDocumentNew.tags.map((item, index) => {
                      return (
                        <Chip
                          key={index}
                          data-tag={item}
                          onDelete={({ currentTarget }) => {
                            const tag = currentTarget.parentNode.getAttribute('data-tag')
                            const tags = [...dialogDocumentNew.tags]
                            tags.splice(tags.indexOf(tag), 1)
                            setDialogDocumentNew({ ...dialogDocumentNew, tags: tags })
                          }}
                          className="customer__dialog-tag"
                          label={item}
                        />
                      )
                    })
                  }
                </div>
              </div>
            </div>
          </div>

          <div className="customer__dialog-controls">
            <Button 
              className='customer__dialog-btn customer__dialog-btn_cancel' 
              onClick={handleCloseDocumentNew} 
              autoFocus
            >
              Отмена
            </Button>
            <Button 
              className='customer__dialog-btn' 
              onClick={handleNewDocument} 
              autoFocus
            >
              Сохранить
            </Button>
          </div>
        </Dialog>

        {/* просмотр информации о файле */}
        <Dialog
          className="customer__dialog"
          fullScreen={fullScreen}
          open={dialogDocument.visible}
          onClose={handleCloseDocument}
        >
          {/* Title */}
          <div className="customer__dialog-title">
            <p>Просмотр</p>
            <div className="customer__dialog-controls">
              <Button 
                className='company__users-btn' 
                disableRipple 
                onClick={handleCloseDocument}
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
                <p className="customer__dialog-label">Название</p>
                <p className="customer__dialog-value">
                  {
                    dialogDocument.title
                  }
                </p>
              </div>
              <div className="customer__dialog-item">
                <p className="customer__dialog-label">Описание</p>
                <p className="customer__dialog-value">
                  {
                    dialogDocument.description
                  }
                </p>
              </div>
              <div className="customer__dialog-item">
                <p className="customer__dialog-label">Загрузил</p>
                <p className="customer__dialog-value">
                  {
                    dialogDocument.owner
                      ? `${dialogDocument.owner.firstName} ${dialogDocument.owner.lastName}`
                      : 'Не указано'
                  }
                </p>
              </div>
              <div className="customer__dialog-item">
                <p className="customer__dialog-label">Раздел</p>
                <p className="customer__dialog-value">
                  {
                    dialogDocument.section
                  }
                </p>
              </div>
              <div className="customer__dialog-item">
                <p className="customer__dialog-label">Тэги</p>
                <div className="customer__dialog-tags">
                  {
                    dialogDocument.tags.map((item, index) => {
                      return (
                        <Chip
                          key={index}
                          className="customer__dialog-tag"
                          label={item}
                        />
                      )
                    })
                  }
                </div>
              </div>
            </div>
          </div>
        </Dialog>

        {/* удаление файла */}
        <Dialog
          className="customer__dialog"
          fullScreen={fullScreen}
          open={dialogDocumentDelete.visible}
          onClose={ () => { setDialogDocumentDelete({ visible: false, id: '' }) } }
        >
          {/* Title */}
          <div className="customer__dialog-title">
            <p>Удаление</p>
            <div className="customer__dialog-controls">
              <Button 
                className='company__users-btn' 
                disableRipple 
                onClick={ () => { setDialogDocumentDelete({ visible: false, id: '' }) } }
              >
                <SvgIcon>
                  <path fill="currentColor" d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
                </SvgIcon>
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="customer__dialog-content">
            <div className="customer__dialog-alert">
              <p>Вы уверены что хотите удалить этот файл?</p>
            </div>
          </div>

          {/* Actions */}
          <div className="customer__dialog-controls">
            <Button 
              className='customer__dialog-btn customer__dialog-btn_cancel' 
              onClick={ () => { setDialogDocumentDelete({ visible: false, id: '' }) } } 
              autoFocus
            >
              Отмена
            </Button>
            <Button 
              className='customer__dialog-btn' 
              onClick={handleDeleteDocument} 
              autoFocus
            >
              Удалить
            </Button>
          </div>
        </Dialog>

        {/* установка месяца */}
        <Dialog
          className="customer__dialog"
          fullScreen={fullScreen}
          open={monthPicker}
          onClose={ () => { setMonthPicker(false) } }
        >
          {/* Title */}
          <div className="customer__dialog-title">
            <p>Выбор месяца</p>
            <div className="customer__dialog-controls">
              <Button 
                className='company__users-btn' 
                disableRipple 
                onClick={ () => { setMonthPicker(false) } }
              >
                <SvgIcon>
                  <path fill="currentColor" d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
                </SvgIcon>
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="customer__dialog-content">
            <LocalizationProvider dateAdapter={AdapterDateFns} locale={ruLocale}>
              <MonthPicker
                className="customer__dialog-picker"
                date={currentDate}
                minDate={minDate}
                maxDate={maxDate}
                onChange={(date) => {
                  setMonthPicker(false)
                  navigate(`/client?section=events&date=${date.toLocaleDateString()}`)
                }}
              />
            </LocalizationProvider>
          </div>
        </Dialog>

        {/* установка года */}
        <Dialog
          className="customer__dialog"
          fullScreen={fullScreen}
          open={yearPicker}
          onClose={ () => { setYearPicker(false) } }
        >
          {/* Title */}
          <div className="customer__dialog-title">
            <p>Выбор года</p>
            <div className="customer__dialog-controls">
              <Button 
                className='company__users-btn' 
                disableRipple 
                onClick={ () => { setYearPicker(false) } }
              >
                <SvgIcon>
                  <path fill="currentColor" d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
                </SvgIcon>
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="customer__dialog-content">
            <LocalizationProvider dateAdapter={AdapterDateFns} locale={ruLocale}>
              <YearPicker
                className="customer__dialog-picker customer__dialog-picker_year"
                date={currentDate}
                isDateDisabled={() => false}
                minDate={minDate}
                maxDate={maxDate}
                onChange={(date) => {
                  setYearPicker(false)
                  navigate(`/client?section=events&date=${date.toLocaleDateString()}`)
                }}
              />
            </LocalizationProvider>
          </div>
        </Dialog>

        {/* удаление файла */}
        <Dialog
          className="customer__dialog"
          fullScreen={fullScreen}
          open={dialogEventDelete.visible}
          onClose={ () => { setDialogEventDelete({ visible: false, id: '' }) } }
        >
          {/* Title */}
          <div className="customer__dialog-title">
            <p>Удаление</p>
            <div className="customer__dialog-controls">
              <Button 
                className='company__users-btn' 
                disableRipple 
                onClick={ () => { setDialogEventDelete({ visible: false, id: '' }) } }
              >
                <SvgIcon>
                  <path fill="currentColor" d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
                </SvgIcon>
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="customer__dialog-content">
            <div className="customer__dialog-alert">
              <p>Вы уверены что хотите удалить это событие?</p>
            </div>
          </div>

          {/* Actions */}
          <div className="customer__dialog-controls">
            <Button 
              className='customer__dialog-btn customer__dialog-btn_cancel' 
              onClick={ () => { setDialogEventDelete({ visible: false, id: '' }) } } 
              autoFocus
            >
              Отмена
            </Button>
            <Button 
              className='customer__dialog-btn' 
              onClick={handleDeleteEvent} 
              autoFocus
            >
              Удалить
            </Button>
          </div>
        </Dialog>

        {/* создание события */}
        <Dialog
          className="customer__dialog"
          fullScreen={fullScreen}
          open={dialogEventNew.visible}
          onClose={handleCloseEventNew}
        >
          {/* Title */}
          <div className="customer__dialog-title">
            <p>Создание события</p>
            <div className="customer__dialog-controls">
              <Button 
                className='company__users-btn' 
                disableRipple 
                onClick={handleCloseEventNew}
              >
                <SvgIcon>
                  <path fill="currentColor" d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
                </SvgIcon>
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="customer__dialog-content">
            <div className="customer__dialog-items customer__dialog-items_edit">
              <div className="customer__dialog-item">
                <p className="customer__dialog-label">
                  Название
                </p>
                <TextField
                  fullWidth
                  className="customer__dialog-input"
                  value={dialogEventNew.title}
                  onChange={ ({ currentTarget: { value } }) => {
                    setDialogEventNew({ ...dialogEventNew, title: value })
                  } }
                />
              </div>
              <div className="customer__dialog-item">
                <p className="customer__dialog-label">
                  Описание
                </p>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  className="customer__dialog-input"
                  value={dialogEventNew.description}
                  onChange={ ({ currentTarget: { value } }) => {
                    setDialogEventNew({ ...dialogEventNew, description: value })
                  } }
                />
              </div>
              <div className="customer__dialog-item">
                <FormControlLabel 
                  control={
                    <Checkbox 
                      checked={dialogEventNew.client} 
                      onChange={ ({ target: { checked } }) => { 
                        setDialogEventNew({ ...dialogEventNew, client: checked }) 
                      }} 
                    />
                  }
                  label="Открыть видимость для вашей компании"
                />
                <FormControlLabel 
                  control={
                    <Checkbox 
                      checked={dialogEventNew.company} 
                      onChange={ ({ target: { checked } }) => { 
                        setDialogEventNew({ ...dialogEventNew, company: checked }) 
                      }} 
                    />
                  }
                  label="Открыть видимость для обслуживающей компании"
                />
                <FormControlLabel 
                  control={
                    <Checkbox 
                      checked={dialogEventNew.notification} 
                      onChange={ ({ target: { checked } }) => { 
                        setDialogEventNew({ ...dialogEventNew, notification: checked }) 
                      }} 
                    />
                  }
                  label="Напомнить о событии"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="customer__dialog-controls">
            <Button 
              className='customer__dialog-btn customer__dialog-btn_cancel' 
              onClick={handleCloseEventNew} 
              autoFocus
            >
              Отмена
            </Button>
            <Button 
              className='customer__dialog-btn' 
              onClick={handleNewEvent} 
              autoFocus
            >
              Создать
            </Button>
          </div>
        </Dialog>
      </>
    )
  }

  // * отображение секций файла
  const renderDocumentsSections = () => {
    if (client.variables.documents) {

      const sRows = []

      const sections = client.variables.documents.reduce((prev, item) => {
        if (!prev.includes(item.section)) {
          prev.push(item.section)
        }
        return prev
      }, [])

      sections.forEach((item, index) => {
        sRows.push(
          <Button 
            key={index}
            disableRipple 
            data-division={item}
            data-active={searchParams.get('division') && searchParams.get('division') === item}
            onClick={ ({ currentTarget }) => { 
              navigate(`/client?section=documents&division=${currentTarget.getAttribute('data-division')}`)
            }}
          >
            {
              item
            }
          </Button>
        )
      })

      return (
        <div className="customer__documents-sections">
          {
            sRows
          }
        </div>
      )
    }
  }

  // * отображение списка файлов
  const renderDocumentsList = () => {

    if (!client.variables.documents || client.variables.documents.length === 0) {
      return (
        <div className="customer__empty-list">
          <p>У вашей компании нет добавленных документов</p>
        </div>
      )
    }

    const division = searchParams.get('division')
    if (!division) {
      return (
        <div className="customer__empty-list">
          <SvgIcon>
            <path fill="currentColor" d="M12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22M12,7L7,12H10V16H14V12H17L12,7Z" />
          </SvgIcon>
          <p>Выберите интересующий вас раздел</p>
        </div>
      )
    }

    const items = searchDocuments.items.filter(item => item.section === division)

    if (items.length === 0) {
      return (
        <div className="customer__empty-list">
          <p>Файлов не найдено</p>
        </div>
      )
    }

    const sRows = []

    items.forEach((item, index) => {
      // дата и время создания файла
      let dateOfCreation = '',
          timeOfCreation = ''
      if (item.dateOfCreation) {
        dateOfCreation = new Date(item.dateOfCreation).toLocaleDateString()
        timeOfCreation = `${(new Date(item.dateOfCreation).getHours()<10?'0':'') + new Date(item.dateOfCreation).getHours()}:${(new Date(item.dateOfCreation).getMinutes()<10?'0':'') + new Date(item.dateOfCreation).getMinutes()}`
      }

      sRows.push(
        <div 
          key={index}
          data-id={item._id}
          data-visible='false'
          className="customer__documents-item"
          onClick={({ currentTarget }) => {
            const attrExsts = currentTarget.getAttribute('data-visible')
            if (attrExsts) {
              const active = (attrExsts === 'true')
              if (active) {
                currentTarget.setAttribute('data-visible', false)
              } else {
                currentTarget.setAttribute('data-visible', true)
              }
            } else {
              currentTarget.setAttribute('data-visible', true)
            }
          }}
        > 
          {/* Header */}
          <div className="customer__documents-item-header">
            <div className="customer__documents-item-ico">
              <SvgIcon>
                <path fill="currentColor" d="M13,9H18.5L13,3.5V9M6,2H14L20,8V20A2,2 0 0,1 18,22H6C4.89,22 4,21.1 4,20V4C4,2.89 4.89,2 6,2M15,18V16H6V18H15M18,14V12H6V14H18Z" />
              </SvgIcon>
            </div>
            <div className="customer__documents-item-title">
              <Typography noWrap>ДОКУМЕНТ</Typography>
              <Tooltip title={item.title}>
                <Typography noWrap>
                  {
                    item.title
                  }
                </Typography>
              </Tooltip>
            </div>
          </div>
          {/* Footer */}
          <div className="customer__documents-item-footer">
            <div className="customer__documents-item-creator">
              <Typography noWrap>Загружено</Typography>
              <Typography noWrap>
                {
                  `${item.owner.firstName} ${item.owner.lastName}`
                }
              </Typography>
            </div>
            <div className="customer__documents-item-date">
              <Typography noWrap>
                {
                  dateOfCreation
                }
              </Typography>
              <Typography noWrap>
                {
                  timeOfCreation
                }
              </Typography>
            </div>
          </div>
          <div className="customer__documents-item-menu">
            <Button 
              className='company__users-btn' 
              disableRipple 
              onClick={({ currentTarget }) => { 
                const id = currentTarget.parentNode.parentNode.getAttribute('data-id')
                setLocationHistory(document.location.pathname + document.location.search)
                navigate(`/client?section=documents&action=download&file=${id}`)
              }}
            >
              <Tooltip title='Скачать файл'>
                <SvgIcon> 
                  <path fill="currentColor" d="M14,2L20,8V20A2,2 0 0,1 18,22H6A2,2 0 0,1 4,20V4A2,2 0 0,1 6,2H14M18,20V9H13V4H6V20H18M12,19L8,15H10.5V12H13.5V15H16L12,19Z" />
                </SvgIcon>
              </Tooltip>
            </Button>
            <Button 
              className='company__users-btn' 
              disableRipple 
              onClick={({ currentTarget }) => { 
                const id = currentTarget.parentNode.parentNode.getAttribute('data-id')
                setLocationHistory(document.location.pathname + document.location.search)
                navigate(`/client?section=documents&action=view&file=${id}`)
              }}
            >
              <Tooltip title='Просмотреть информацию о файле'>
                <SvgIcon> 
                  <path fill="currentColor" d="M17,18C17.56,18 18,18.44 18,19C18,19.56 17.56,20 17,20C16.44,20 16,19.56 16,19C16,18.44 16.44,18 17,18M17,15C14.27,15 11.94,16.66 11,19C11.94,21.34 14.27,23 17,23C19.73,23 22.06,21.34 23,19C22.06,16.66 19.73,15 17,15M17,21.5A2.5,2.5 0 0,1 14.5,19A2.5,2.5 0 0,1 17,16.5A2.5,2.5 0 0,1 19.5,19A2.5,2.5 0 0,1 17,21.5M9.27,20H6V4H13V9H18V13.07C18.7,13.15 19.36,13.32 20,13.56V8L14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H10.5C10,21.41 9.59,20.73 9.27,20Z" />
                </SvgIcon>
              </Tooltip>
            </Button>
            <Button 
              className='company__users-btn' 
              disableRipple 
              onClick={({ currentTarget }) => {
                setDialogDocumentDelete({ visible: true, id: currentTarget.parentNode.parentNode.getAttribute('data-id') })
              }}
            >
              <Tooltip title='Удалить файл'>
                <SvgIcon> 
                  <path fill="currentColor" d="M9,3V4H4V6H5V19A2,2 0 0,0 7,21H17A2,2 0 0,0 19,19V6H20V4H15V3H9M7,6H17V19H7V6M9,8V17H11V8H9M13,8V17H15V8H13Z" /> 
                </SvgIcon>
              </Tooltip>
            </Button>
          </div>
        </div>
      )
    })

    return (
      <div className="customer__documents-list">
        {
          sRows
        }
      </div>
    )

  }

  // * отображение календаря
  const renderEventsCalendar = () => {

    const lastDay = lastDayOfMonth(currentDate).getDate()

    const sRows = []

    // вывод дней месяца
    for (let i = 0; i < lastDay; i++) {
      const date = new Date(`${currentDate.getFullYear()}-${currentDate.getMonth() + 1}-${i+1}`)
      sRows.push(
        <div 
          className={
            compareAsc(date, maxDate.setHours(0, 0, 0, 0)) === 1 || compareAsc(minDate.setHours(0, 0, 0, 0), date) === 1
              ? "customer__events-calendar-date customer__events-calendar-date_disabled"
              : isEqual(date, currentDate)
                  ? "customer__events-calendar-date customer__events-calendar-date_current"
                  : isEqual(date, todayDate)
                    ? "customer__events-calendar-date customer__events-calendar-date_today"
                    : "customer__events-calendar-date"
          }
          data-date={i+1}
          key={i}
        >
          <Button
            disableRipple
            onClick={({ currentTarget }) => {
              const day = currentTarget.parentNode.getAttribute('data-date')
              const date = new Date(`${currentDate.getFullYear()}-${currentDate.getMonth() + 1}-${day}`)
              return navigate(`/client?section=events&date=${date.toLocaleDateString()}`)
            }}
          >
            <Badge
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'right'
              }}
              color='primary'
              data-color={
                client.variables.events.find(event =>
                  compareAsc(date, todayDate) === -1)
                    ? "dark" 
                    : "primary"
              }
              variant="dot"
              badgeContent={
                client.variables.events.filter(event => 
                  isEqual(new Date(event.date).setHours(0,0,0,0), date)
                ).length
              }
            >
              {
                i + 1
              }
            </Badge>
          </Button>
        </div>
      )
    }

    return sRows
  }

  // * отображение близжайших событий
  const renderNearestEvents = () => {

    // отсортированный список близжайших дат
    const nearestDates = client.variables.events
      .filter(
        (item) =>
          compareAsc(new Date(item.date).setHours(0, 0, 0, 0), todayDate) !== -1
      )
      .sort((a, b) => compareAsc(new Date(a.date), new Date(b.date)))

    if (nearestDates.length === 0) {
      return (
        <div className="customer__empty-list">
          <p>Нет близжайших событий</p>
        </div>
      )
    }
    
    const sRows = []

    nearestDates.forEach((item, index) => {
      sRows.push(
        <div 
          className="customer__events-item"
          key={index}
        >
          <div className="customer__events-item-header">
            <div className="customer__events-item-ico">
              <SvgIcon>
                {
                  item.client || item.company
                    ? <path fill="currentColor" d="M18,15H16V17H18M18,11H16V13H18M20,19H12V17H14V15H12V13H14V11H12V9H20M10,7H8V5H10M10,11H8V9H10M10,15H8V13H10M10,19H8V17H10M6,7H4V5H6M6,11H4V9H6M6,15H4V13H6M6,19H4V17H6M12,7V3H2V21H22V7H12Z" />
                    : <path fill="currentColor" d="M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,6A2,2 0 0,0 10,8A2,2 0 0,0 12,10A2,2 0 0,0 14,8A2,2 0 0,0 12,6M12,13C14.67,13 20,14.33 20,17V20H4V17C4,14.33 9.33,13 12,13M12,14.9C9.03,14.9 5.9,16.36 5.9,17V18.1H18.1V17C18.1,16.36 14.97,14.9 12,14.9Z" />
                }
              </SvgIcon>
            </div>
            <div className="customer__events-item-title">
              <Typography noWrap>
                {
                  item.title
                }
              </Typography>
              <Typography noWrap>
                {
                  item.description
                }
              </Typography>
            </div>
          </div>
          <div className="customer__events-item-footer">
            <div className="customer__events-item-creator">
              <Typography noWrap>
                {
                  !item.creator 
                    ? ''
                    : item.creator === auth.userId
                      ? `Создано вами`
                      : `Создано ${item.creator.firstName} ${item.creator.lastName}`
                }
              </Typography>
              <Typography 
                noWrap
                data-date={new Date(item.date).toLocaleDateString()}
                onClick={({ currentTarget }) => {
                  const date = currentTarget.getAttribute('data-date')
                  navigate(`/client?section=events&date=${date}`)
                }}
              >
                {
                  new Date(item.date).toLocaleDateString()
                }
              </Typography>
            </div>
            <div className="customer__events-item-company">
              {
                item.company 
                  ? (
                    <Typography noWrap>
                      {
                        `Событие связано с компанией ${client.variables.company.companyName}`
                      }
                    </Typography>
                  )
                  : <></>
              }
            </div>
          </div>
          <div 
            className="customer__events-item-controls" 
            data-id={item._id}
          >
            <Button 
              className='company__users-btn' 
              disableRipple 
              onClick={handleEventNotification}
            >
              <Tooltip 
                title={
                  item.notification
                    ? 'Не присылать уведомление'
                    : 'Прислать уведомление'
                }
              >
                <SvgIcon> 
                  {
                    item.notification
                      ? <path fill="currentColor" d="M22.11,21.46L2.39,1.73L1.11,3L5.83,7.72C5.29,8.73 5,9.86 5,11V17L3,19V20H18.11L20.84,22.73L22.11,21.46M7,18V11C7,10.39 7.11,9.79 7.34,9.23L16.11,18H7M10,21H14A2,2 0 0,1 12,23A2,2 0 0,1 10,21M8.29,5.09C8.82,4.75 9.4,4.5 10,4.29C10,4.19 10,4.1 10,4A2,2 0 0,1 12,2A2,2 0 0,1 14,4C14,4.1 14,4.19 14,4.29C16.97,5.17 19,7.9 19,11V15.8L17,13.8V11A5,5 0 0,0 12,6C11.22,6 10.45,6.2 9.76,6.56L8.29,5.09Z" />
                      : <path fill="currentColor" d="M10,21H14A2,2 0 0,1 12,23A2,2 0 0,1 10,21M21,19V20H3V19L5,17V11C5,7.9 7.03,5.17 10,4.29C10,4.19 10,4.1 10,4A2,2 0 0,1 12,2A2,2 0 0,1 14,4C14,4.1 14,4.19 14,4.29C16.97,5.17 19,7.9 19,11V17L21,19M17,11A5,5 0 0,0 12,6A5,5 0 0,0 7,11V18H17V11M19.75,3.19L18.33,4.61C20.04,6.3 21,8.6 21,11H23C23,8.07 21.84,5.25 19.75,3.19M1,11H3C3,8.6 3.96,6.3 5.67,4.61L4.25,3.19C2.16,5.25 1,8.07 1,11Z" />
                  }
                </SvgIcon>
              </Tooltip>
            </Button>
          </div>
        </div>
      )
    })

    return sRows
  }

  // * отображение событий конкретного дня
  const renderDayEvents = () => {
    const dayEvents = client.variables.events.filter(item => isEqual(new Date(item.date).setHours(0, 0, 0, 0), currentDate))

    if (dayEvents.length === 0) {
      return (
        <div className="customer__empty-list">
          <p>На этот день не назначено событий</p>
        </div>
      )
    }

    const sRows = []
    dayEvents.forEach((item, index) => {
      sRows.push(
        <div 
          className="customer__events-item"
          key={index}
        >
          <div className="customer__events-item-header">
            <div className="customer__events-item-ico">
              <SvgIcon>
                {
                  item.client || item.company
                    ? <path fill="currentColor" d="M18,15H16V17H18M18,11H16V13H18M20,19H12V17H14V15H12V13H14V11H12V9H20M10,7H8V5H10M10,11H8V9H10M10,15H8V13H10M10,19H8V17H10M6,7H4V5H6M6,11H4V9H6M6,15H4V13H6M6,19H4V17H6M12,7V3H2V21H22V7H12Z" />
                    : <path fill="currentColor" d="M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,6A2,2 0 0,0 10,8A2,2 0 0,0 12,10A2,2 0 0,0 14,8A2,2 0 0,0 12,6M12,13C14.67,13 20,14.33 20,17V20H4V17C4,14.33 9.33,13 12,13M12,14.9C9.03,14.9 5.9,16.36 5.9,17V18.1H18.1V17C18.1,16.36 14.97,14.9 12,14.9Z" />
                }
              </SvgIcon>
            </div>
            <div className="customer__events-item-title">
              <Typography noWrap>
                {
                  item.title
                }
              </Typography>
              <Typography noWrap>
                {
                  item.description
                }
              </Typography>
            </div>
          </div>
          <div className="customer__events-item-footer">
            <div className="customer__events-item-creator">
              <Typography noWrap>
                {
                  !item.creator 
                    ? ''
                    : item.creator === auth.userId
                      ? `Создано вами`
                      : `Создано ${item.creator.firstName} ${item.creator.lastName}`
                }
              </Typography>
              <Typography 
                noWrap
                data-date={new Date(item.date).toLocaleDateString()}
                onClick={({ currentTarget }) => {
                  const date = currentTarget.getAttribute('data-date')
                  navigate(`/client?section=events&date=${date}`)
                }}
              >
                {
                  new Date(item.date).toLocaleDateString()
                }
              </Typography>
            </div>
            <div className="customer__events-item-company">
              {
                item.company 
                  ? (
                    <Typography noWrap>
                      {
                        `Событие связано с компанией ${client.variables.company.companyName}`
                      }
                    </Typography>
                  )
                  : <></>
              }
            </div>
          </div>
          <div 
            className="customer__events-item-controls" 
            data-id={item._id}
          >
            <Button 
              className='company__users-btn' 
              disableRipple 
              onClick={handleEventNotification}
            >
              <Tooltip 
                title={
                  item.notification
                    ? 'Не присылать уведомление'
                    : 'Прислать уведомление'
                }
              >
                <SvgIcon> 
                  {
                    item.notification
                      ? <path fill="currentColor" d="M22.11,21.46L2.39,1.73L1.11,3L5.83,7.72C5.29,8.73 5,9.86 5,11V17L3,19V20H18.11L20.84,22.73L22.11,21.46M7,18V11C7,10.39 7.11,9.79 7.34,9.23L16.11,18H7M10,21H14A2,2 0 0,1 12,23A2,2 0 0,1 10,21M8.29,5.09C8.82,4.75 9.4,4.5 10,4.29C10,4.19 10,4.1 10,4A2,2 0 0,1 12,2A2,2 0 0,1 14,4C14,4.1 14,4.19 14,4.29C16.97,5.17 19,7.9 19,11V15.8L17,13.8V11A5,5 0 0,0 12,6C11.22,6 10.45,6.2 9.76,6.56L8.29,5.09Z" />
                      : <path fill="currentColor" d="M10,21H14A2,2 0 0,1 12,23A2,2 0 0,1 10,21M21,19V20H3V19L5,17V11C5,7.9 7.03,5.17 10,4.29C10,4.19 10,4.1 10,4A2,2 0 0,1 12,2A2,2 0 0,1 14,4C14,4.1 14,4.19 14,4.29C16.97,5.17 19,7.9 19,11V17L21,19M17,11A5,5 0 0,0 12,6A5,5 0 0,0 7,11V18H17V11M19.75,3.19L18.33,4.61C20.04,6.3 21,8.6 21,11H23C23,8.07 21.84,5.25 19.75,3.19M1,11H3C3,8.6 3.96,6.3 5.67,4.61L4.25,3.19C2.16,5.25 1,8.07 1,11Z" />
                  }
                </SvgIcon>
              </Tooltip>
            </Button>
            <Button 
              className='company__users-btn' 
              disableRipple 
              onClick={({ currentTarget }) => {
                setDialogEventDelete({ visible: true, id: currentTarget.parentNode.getAttribute('data-id') })
              }}
            >
              <Tooltip title='Удалить событие'>
                <SvgIcon> 
                  <path fill="currentColor" d="M9,3V4H4V6H5V19A2,2 0 0,0 7,21H17A2,2 0 0,0 19,19V6H20V4H15V3H9M7,6H17V19H7V6M9,8V17H11V8H9M13,8V17H15V8H13Z" />
                </SvgIcon>
              </Tooltip>
            </Button>
          </div>
        </div>
      )
    })

    return sRows
  }

  // * отображение данных для страницы
  const renderComponent = () => {
    switch (statement) {
      case 'info':
        return (
          <div className="customer__wrapper-info">

            {/* Основная информация о компании */}
            <div className="customer__info">
              <div className="customer__info-title">
                <Typography noWrap>Основная информация о вашей фирме</Typography>
                {/* Header controls */}
                <div className="customer__info-controls">
                  <Button 
                    className='company__users-btn' 
                    disableRipple 
                    onClick={ () => { 
                      setDialogInfo({ 
                        visible: true, mode: 'view', title: 'Просмотр'
                      }) 
                    }}
                  >
                    <Tooltip title='Открыть для просмотра'>
                      <SvgIcon> 
                        <path fill="currentColor" d="M5,5H10V7H7V10H5V5M14,5H19V10H17V7H14V5M17,14H19V19H14V17H17V14M10,17V19H5V14H7V17H10Z" />
                      </SvgIcon>
                    </Tooltip>
                  </Button>
                  <Button 
                    className='company__users-btn' 
                    disableRipple 
                    onClick={ () => { 
                      setDialogInfo({ 
                        visible: true, mode: 'edit', title: 'Редактирование', 
                        clientName: client.variables.name, registeredAddress: client.variables.address, email: client.variables.email, 
                        UEN: client.variables.uen, lastAGM: client.variables.lastAGM, lastARFilled: client.variables.lastARFilled
                      }) 
                    }}
                  >
                    <Tooltip title='Редактировать'>
                      <SvgIcon> 
                        <path fill="currentColor" d="M14.06,9L15,9.94L5.92,19H5V18.08L14.06,9M17.66,3C17.41,3 17.15,3.1 16.96,3.29L15.13,5.12L18.88,8.87L20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18.17,3.09 17.92,3 17.66,3M14.06,6.19L3,17.25V21H6.75L17.81,9.94L14.06,6.19Z" />
                      </SvgIcon>
                    </Tooltip>
                  </Button>
                </div>
              </div>
              {/*  */}
              <div className="customer__item">
                <Typography noWrap className="customer__label">
                  Адрес
                </Typography>
                <Tooltip title={ 
                  client.variables.address 
                    ? client.variables.address
                    : 'Не указан'
                }>
                  <Typography noWrap className="customer__value">
                    {
                      client.variables.address 
                        ? client.variables.address 
                        : 'Не указан'
                    }
                  </Typography>
                </Tooltip>
              </div>
              <div className="customer__item">
                <Typography noWrap className="customer__label">
                  Электронная почта
                </Typography>
                <Tooltip title={ 
                  client.variables.email 
                    ? client.variables.email
                    : 'Не указана'
                }>
                  <Typography noWrap className="customer__value">
                    {
                      client.variables.email 
                        ? client.variables.email 
                        : 'Не указана'
                    }
                  </Typography>
                </Tooltip>
              </div>
              <div className="customer__item">
                <Typography noWrap className="customer__label">
                  ИНН
                </Typography>
                <Tooltip title={ 
                  client.variables.uen 
                    ? client.variables.uen
                    : 'Не указан'
                }>
                  <Typography noWrap className="customer__value">
                    {
                      client.variables.uen 
                        ? client.variables.uen 
                        : 'Не указан'
                    }
                  </Typography>
                </Tooltip>
              </div>
              <div className="customer__item customer__info-company">
                <div className="customer__info-company-title">
                  <Typography noWrap>Обслуживающая компания</Typography>
                  <Tooltip title={client.variables.company.companyName}>
                    <Typography noWrap>
                      { client.variables.company.companyName }
                    </Typography>
                  </Tooltip>
                </div>
                <div className="customer__item">
                  <Typography noWrap className="customer__label">
                    Адрес
                  </Typography>
                  <Tooltip title={ 
                    client.variables.company.companyAddress 
                      ? client.variables.company.companyAddress
                      : 'Не указан'
                  }>
                    <Typography noWrap className="customer__value">
                      {
                        client.variables.company.companyAddress 
                          ? client.variables.company.companyAddress
                          : 'Не указан'
                      }
                    </Typography>
                  </Tooltip>
                </div>
                <div className="customer__item">
                  <Typography noWrap className="customer__label">
                    Электронная почта
                  </Typography>
                  <Tooltip title={ 
                    client.variables.company.companyEmail 
                      ? client.variables.company.companyEmail
                      : 'Не указан'
                  }>
                    <Typography noWrap className="customer__value">
                      {
                        client.variables.company.companyEmail 
                          ? client.variables.company.companyEmail
                          : 'Не указан'
                      }
                    </Typography>
                  </Tooltip>
                </div>
                <div className="customer__item">
                  <Typography noWrap className="customer__label">
                    Телефон
                  </Typography>
                  <Tooltip title={ 
                    client.variables.company.companyPhone 
                      ? client.variables.company.companyPhone
                      : 'Не указан'
                  }>
                    <Typography noWrap className="customer__value">
                      {
                        client.variables.company.companyPhone 
                          ? client.variables.company.companyPhone
                          : 'Не указан'
                      }
                    </Typography>
                  </Tooltip>
                </div>
              </div>
            </div>    

            {/* Контактное лицо компании */}
            <div className="customer__contact">
              {/* Header */}
              <div className="customer__contact-title">
                <div className="customer__contact-title-info">
                  <Typography noWrap>Контактное лицо</Typography>
                  <Tooltip title={
                    `${client.variables.directors.find(item => item.directorId === client.variables.mainContact).firstName} 
                    ${client.variables.directors.find(item => item.directorId === client.variables.mainContact).lastName}` 
                  }>
                    <Typography noWrap>
                      { 
                        `${client.variables.directors.find(item => item.directorId === client.variables.mainContact).firstName} 
                        ${client.variables.directors.find(item => item.directorId === client.variables.mainContact).lastName}` 
                      }
                    </Typography>
                  </Tooltip>
                </div>
                {/* Header controls */}
                <div className="customer__contact-controls">
                  <Button 
                    className='company__users-btn' 
                    disableRipple 
                    onClick={ () => { 
                      setDialogContact({ 
                        visible: true, title: 'Просмотр', user: client.variables.directors.find(item => item.directorId === client.variables.mainContact)
                      }) 
                    }}
                  >
                    <Tooltip title='Открыть для просмотра'>
                      <SvgIcon> 
                        <path fill="currentColor" d="M5,5H10V7H7V10H5V5M14,5H19V10H17V7H14V5M17,14H19V19H14V17H17V14M10,17V19H5V14H7V17H10Z" />
                      </SvgIcon>
                    </Tooltip>
                  </Button>
                </div>
              </div>
              {/*  */}
              <div className="customer__item">
                <Typography noWrap className="customer__label">Электронная почта</Typography>
                <Tooltip title={
                  client.variables.directors.find(item => item.directorId === client.variables.mainContact).email
                }>
                  <Typography noWrap className="customer__value">
                    {
                      client.variables.directors.find(item => item.directorId === client.variables.mainContact).email
                    }
                  </Typography>
                </Tooltip>
              </div>
              <div className="customer__item">
                <Typography noWrap className="customer__label">Номер телефона</Typography>
                <Tooltip title={
                  client.variables.directors.find(item => item.directorId === client.variables.mainContact).phoneNumber 
                    ? client.variables.directors.find(item => item.directorId === client.variables.mainContact).phoneNumber 
                    : 'Не указан'
                }>
                  <Typography noWrap className="customer__value">
                    {
                      client.variables.directors.find(item => item.directorId === client.variables.mainContact).phoneNumber
                        ? client.variables.directors.find(item => item.directorId === client.variables.mainContact).phoneNumber 
                        : 'Не указан'
                    }
                  </Typography>
                </Tooltip>
              </div>
            </div>
            
            {/* Список директоров компании */}
            <div className="customer__directors">
              <div className="customer__directors-title">
                <Typography noWrap>
                  Список директоров
                </Typography>
                <div className="customer__directors-controls">
                  <TextField 
                    fullWidth
                    className="customer__input"
                    placeholder="Поиск директора"
                    onChange={handleSearchDirector}
                  />
                  {
                    client.variables.directors.find(item => item.directorId === client.variables.mainContact)._id === auth.userId
                      ? (
                        <Button 
                          className='company__users-btn' 
                          disableRipple 
                          onClick={ () => { 
                            setDialogDirectorNew({ 
                              visible: true, email: '', post: '', message: ''
                            }) 
                          }}
                        >
                          <Tooltip title='Пригласить директора'>
                            <SvgIcon> 
                              <path fill="currentColor" d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z" />
                            </SvgIcon>
                          </Tooltip>
                        </Button>
                      )
                      : <></>
                  }
                  <Button 
                    className='company__users-btn' 
                    disableRipple 
                    onClick={ () => { 
                      setDialogDirector({ 
                        visible: true, directors: client.variables.directors, mainContact: client.variables.mainContact
                      }) 
                    }}
                  >
                    <Tooltip title='Открыть для просмотра'>
                      <SvgIcon> 
                        <path fill="currentColor" d="M5,5H10V7H7V10H5V5M14,5H19V10H17V7H14V5M17,14H19V19H14V17H17V14M10,17V19H5V14H7V17H10Z" />
                      </SvgIcon>
                    </Tooltip>
                  </Button>
                </div>
              </div>

              <div className="customer__directors-list">
                {
                  renderDirectorsList()
                }
              </div>
            </div>

            {/* Акции компании */}
            <div className="customer__stocks">
              {/* Header */}
              <div className="customer__stocks-title">
                <Typography noWrap>Акции компании</Typography>
                {/* Header controls */}
                <div className="customer__stocks-controls">
                  <Button 
                    className='company__users-btn' 
                    disableRipple 
                    onClick={ () => { 
                      setDialogStocks({ 
                        visible: true, mode: 'view', title: 'Просмотр', 
                        numOfShares: client.variables.numOfShares, capital: client.variables.capital, shareCapital: client.variables.shareCapital 
                      }) 
                    }}
                  >
                    <Tooltip title='Открыть для просмотра'>
                      <SvgIcon> 
                        <path fill="currentColor" d="M5,5H10V7H7V10H5V5M14,5H19V10H17V7H14V5M17,14H19V19H14V17H17V14M10,17V19H5V14H7V17H10Z" />
                      </SvgIcon>
                    </Tooltip>
                  </Button>
                  <Button 
                    className='company__users-btn' 
                    disableRipple 
                    onClick={ () => { 
                      setDialogStocks({ 
                        visible: true, mode: 'edit', title: 'Редактирование', 
                        numOfShares: client.variables.numOfShares, capital: client.variables.capital, shareCapital: client.variables.shareCapital 
                      }) 
                    }}
                  >
                    <Tooltip title='Редактировать'>
                      <SvgIcon> 
                        <path fill="currentColor" d="M14.06,9L15,9.94L5.92,19H5V18.08L14.06,9M17.66,3C17.41,3 17.15,3.1 16.96,3.29L15.13,5.12L18.88,8.87L20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18.17,3.09 17.92,3 17.66,3M14.06,6.19L3,17.25V21H6.75L17.81,9.94L14.06,6.19Z" />
                      </SvgIcon>
                    </Tooltip>
                  </Button>
                </div>
              </div>
              {/*  */}
              <div className="customer__item">
                <Typography noWrap className="customer__label">Количество акций</Typography>
                <Tooltip title={
                  formatNumber(client.variables.numOfShares)
                }>
                  <Typography noWrap className="customer__value">
                    {
                      formatNumber(client.variables.numOfShares)
                    }
                  </Typography>
                </Tooltip>
              </div>
              <div className="customer__item">
                <Typography noWrap className="customer__label">Стоимость акции</Typography>
                <Tooltip title={
                  formatNumber(client.variables.shareCapital)
                }>
                  <Typography noWrap className="customer__value">
                    {
                      '$ ' + formatNumber(client.variables.shareCapital)
                    }
                  </Typography>
                </Tooltip>
              </div>
              <div className="customer__item">
                <Typography noWrap className="customer__label">Оплаченный капитал</Typography>
                <Tooltip title={
                  formatNumber(client.variables.capital)
                }>
                  <Typography noWrap className="customer__value">
                    {
                      '$ ' + formatNumber(client.variables.capital)
                    }
                  </Typography>
                </Tooltip>
              </div>
            </div>

            {/* Список акционеров компании */}
            <div className="customer__shareholders">
              <div className="customer__shareholders-title">
                <Typography noWrap>
                  Список акционеров
                </Typography>
                <div className="customer__shareholders-controls">
                  <TextField 
                    fullWidth
                    className="customer__input"
                    placeholder="Поиск акционера"
                    onChange={handleSearchShareholder}
                  />
                  <Button 
                    className='company__users-btn' 
                    disableRipple 
                    onClick={ () => { 
                      setDialogShareholderNew({
                        visible: true, name: '', person: false, numOfShares: '', shareholderDate: new Date()
                      })
                    }}
                  >
                    <Tooltip title='Добавить акционера'>
                      <SvgIcon> 
                        <path fill="currentColor" d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z" />
                      </SvgIcon>
                    </Tooltip>
                  </Button>
                  <Button 
                    className='company__users-btn' 
                    disableRipple 
                    data-sort='asc'
                    onClick={handleSortShareholder}
                  >
                    <Tooltip title='Сортировать по количеству акций'>
                      <SvgIcon> 
                        <path fill="currentColor" d="M18 21L14 17H17V7H14L18 3L22 7H19V17H22M2 19V17H12V19M2 13V11H9V13M2 7V5H6V7H2Z" />
                      </SvgIcon>
                    </Tooltip>
                  </Button>
                  <Button 
                    className='company__users-btn' 
                    disableRipple 
                    onClick={ () => { 
                      setDialogShareholder({ 
                        visible: true, shareholders: client.variables.shareholders
                      }) 
                    }}
                  >
                    <Tooltip title='Открыть для просмотра'>
                      <SvgIcon> 
                        <path fill="currentColor" d="M5,5H10V7H7V10H5V5M14,5H19V10H17V7H14V5M17,14H19V19H14V17H17V14M10,17V19H5V14H7V17H10Z" />
                      </SvgIcon>
                    </Tooltip>
                  </Button>
                </div>
              </div>

              <div className="customer__shareholders-list">
                {
                  renderShareholdersList()
                }
              </div>
            </div>
            
            {/* Список приглашений компании */}
            <div className="customer__invites">
              <div className="customer__invites-title">
                <Typography noWrap>
                  Список приглашений
                </Typography>
                <div className="customer__invites-controls">
                  <TextField 
                    fullWidth
                    className="customer__input"
                    placeholder="Поиск приглашения"
                    onChange={handleSearchInvites}
                  />
                  <Button 
                    className='company__users-btn' 
                    disableRipple 
                    onClick={ () => { 
                      setDialogInvite({ 
                        visible: true
                      }) 
                    }}
                  >
                    <Tooltip title='Открыть для просмотра'>
                      <SvgIcon> 
                        <path fill="currentColor" d="M5,5H10V7H7V10H5V5M14,5H19V10H17V7H14V5M17,14H19V19H14V17H17V14M10,17V19H5V14H7V17H10Z" />
                      </SvgIcon>
                    </Tooltip>
                  </Button>
                </div>
              </div>

              <div className="customer__invites-list">
                {
                  renderInvitesList()
                }
              </div>
            </div>

          </div>
        )
      case 'documents':
        return (
          <div className="customer__wrapper-documents customer__documents">
            {/* Header */}
            <div className="customer__documents-header">
              {/* Sections */}
              {
                renderDocumentsSections()
              }
              <div className="customer__documents-header-controls">
                <div className="customer__documents-tagsearch">
                  <TextField
                    fullWidth
                    placeholder="Добавьте тэг к поиску"
                    onKeyPress={handleAppendTag}
                  />
                  <SvgIcon 
                    style={
                      searchDocuments.tags.length === 0
                        ? { display: 'none' }
                        : { display: 'block' }
                    }
                    onClick={({ currentTarget }) => {
                      setSearchDocuments({ ...searchDocuments, visible: true, tagAnchor: currentTarget })
                    }}
                  >
                    <path fill="currentColor" d="M7.41,8.58L12,13.17L16.59,8.58L18,10L12,16L6,10L7.41,8.58Z" />
                  </SvgIcon>
                  <Popover
                    open={searchDocuments.visible}
                    anchorEl={searchDocuments.tagAnchor}
                    className='customer__documents-tag-paper'
                    onClose={() => {
                      setSearchDocuments({ ...searchDocuments, visible: false, tagAnchor: null })
                    }}
                    anchorOrigin={{
                      vertical: 'bottom',
                      horizontal: 'right',
                    }}
                    transformOrigin={{
                      vertical: 'top',
                      horizontal: 'right',
                    }}
                  >
                    {
                      searchDocuments.tags.map((item, index) => {
                        return (
                          <Chip
                            key={index}
                            data-tag={item}
                            onDelete={({ currentTarget }) => {
                              const tag = currentTarget.parentNode.getAttribute('data-tag')
                              const tags = [...searchDocuments.tags]
                              tags.splice(tags.indexOf(tag), 1)
                              handleSearchDocument(tags)
                            }}
                            className="customer__documents-tag"
                            label={item}
                          />
                        )
                      })
                    }
                  </Popover>
                </div>
                <Button 
                  className='company__users-btn' 
                  disableRipple 
                  onClick={ () => { 
                    navigate('/client?section=documents&action=add')
                  }}
                >
                  <Tooltip title='Добавить документ'>
                    <SvgIcon> 
                      <path fill="currentColor" d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z" />
                    </SvgIcon>
                  </Tooltip>
                </Button>
              </div>
            </div>

            {/* Files */}
            {
              renderDocumentsList()
            }
          </div>
        )
      case 'events': 
        return (
          <div className="customer__wrapper-events">

            {/* Близжайшие события */}
            <div className="customer__events-nearest"> 
              {/* Header */}
              <div className="customer__events-header">
                <Typography noWrap>
                  Близжайшие события
                </Typography>
              </div>
              {/* Items */}
              <div className="customer__events-list">
                {
                  renderNearestEvents()
                }
              </div>
            </div>

            {/* Календарь */}
            <div className="customer__events-calendar">
              {/* Header */}
              <div className="customer__events-header">
                <Typography noWrap>
                  Календарь
                </Typography>
                <div className="customer__events-header-controls customer__events-header-controls_calendar">
                  <Button
                    disableRipple
                    className='company__users-btn' 
                    onClick={() => {
                      const date = sub(currentDate, { months: 1 })
                      return navigate(`/client?section=events&date=${date.toLocaleDateString()}`)
                    }}
                  >
                    <SvgIcon>
                      <path fill="currentColor" d="M15.41,16.58L10.83,12L15.41,7.41L14,6L8,12L14,18L15.41,16.58Z" />
                    </SvgIcon>
                  </Button>
                  <div className="customer__events-header-controls-date">
                    <Typography noWrap>
                      {
                        format(currentDate, 'dd', { locale: ruLocale })
                      }
                    </Typography>
                    <Typography 
                      noWrap
                      style={{
                        cursor: 'pointer'
                      }}
                      onClick={() => {setMonthPicker(true)}}
                    >
                      {
                        format(currentDate, 'MMMM', { locale: ruLocale })
                      }
                    </Typography>
                    <Typography 
                      noWrap
                      style={{
                        cursor: 'pointer'
                      }}
                      onClick={() => {setYearPicker(true)}}
                    >
                      {
                        format(currentDate, 'yyyy', { locale: ruLocale })
                      }
                    </Typography>
                  </div>
                  <Button
                    disableRipple
                    className='company__users-btn' 
                    onClick={() => {
                      const date = add(currentDate, { months: 1 })
                      return navigate(`/client?section=events&date=${date.toLocaleDateString()}`)
                    }}
                  >
                    <SvgIcon>
                      <path fill="currentColor" d="M8.59,16.58L13.17,12L8.59,7.41L10,6L16,12L10,18L8.59,16.58Z" />
                    </SvgIcon>
                  </Button>
                </div>
              </div>
              <div className="customer__events-calendar-main">
                {
                  renderEventsCalendar()
                }
              </div>
            </div>

            {/* События в день */}
            <div className="customer__events-footer">
              {/* Header */}
              <div className="customer__events-header">
                <Typography noWrap>
                  События в этот день
                </Typography>
                <div className="customer__events-header-controls">
                  <Button 
                    className='company__users-btn' 
                    disableRipple 
                    onClick={ () => {
                      setLocationHistory(document.location.pathname+document.location.search)
                      navigate(`/client?section=events&date=${currentDate.toLocaleDateString()}&action=add`)
                    }}
                  >
                    <Tooltip title='Создать событие'>
                      <SvgIcon> 
                        <path fill="currentColor" d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z" /> 
                      </SvgIcon>
                    </Tooltip>
                  </Button>
                </div>
              </div>
              {/* Items */}
              <div className="customer__events-list">
                {
                  renderDayEvents()
                }
              </div>
            </div>

          </div>
        )
      default:
        navigate('/client?section=info')
        break;
    }
  }

  return (
    <div className="customer">
      <div className="customer__nav">
        <h2 className="customer__nav-title">
          { client.variables.name }
        </h2>
        <div className="customer__nav-controls">
          <Button
            disableRipple
            className={
              statement === 'info'
                ? "customer__nav-btn customer__nav-btn_active"
                : "customer__nav-btn"
            }
            onClick={() => {
              if (statement !== 'info') {
                navigate('/client?section=info')
              }
            }}
          >
            Информация
          </Button>
          <Button
            disableRipple
            className={
              statement === 'documents'
                ? "customer__nav-btn customer__nav-btn_active"
                : "customer__nav-btn"
            }
            onClick={() => {
              if (statement !== 'documents') {
                navigate('/client?section=documents')
              }
            }}
          >
            Документы
          </Button>
          <Button
            disableRipple
            className={
              statement === 'events'
                ? "customer__nav-btn customer__nav-btn_active"
                : "customer__nav-btn"
            }
            onClick={() => {
              if (statement !== 'events') {
                navigate('/client?section=events')
              }
            }}
          >
            События
          </Button>
        </div>
      </div>
      <div className="customer__content">
        {
          renderComponent()
        }
      </div>

      {
        renderDialogs()
      }

      <Snackbar open={snack.visibility} autoHideDuration={3000} onClose={ () => { setSnack({ ...snack, visibility: false }) } }>
        <Alert severity={snack.severity} variant='filled' onClose={ () => { setSnack({ ...snack, visibility: false }) } }>
          {snack.text}
        </Alert>
      </Snackbar>

    </div>
  )
}