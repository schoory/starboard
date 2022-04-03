
import { useContext, useState, useEffect, useCallback, useRef } from "react"
import { useNavigate, useSearchParams } from "react-router-dom";

import { useHttp } from "../hooks/http.hook"

import { AuthContext } from "../context/AuthContext"
import { CompanyContext } from "../context/CompanyContext"
import { SocketContext } from "../context/SocketContext"
import { ClientContext } from "../context/ClientContext";

import { compareDesc } from "date-fns"

import { CircularProgress, Typography, Stack, Breadcrumbs, TextField, Button, Checkbox, Tooltip, InputAdornment } from "@mui/material"
import { Dialog, DialogContent, DialogActions, SvgIcon, Accordion, AccordionSummary, AccordionDetails } from "@mui/material"

import useMediaQuery from '@mui/material/useMediaQuery';

import './MessagesPage.css'


export const MessagesPage = () => {
  const navigate = useNavigate()

  const { request, loading, error, clearError } = useHttp()
  
  const auth = useContext(AuthContext)
  const company = useContext(CompanyContext)
  const socket = useContext(SocketContext)
  const client = useContext(ClientContext)

  const smScreen = useMediaQuery('(max-width: 900px)')

  const MESSAGE_LIMIT = 100 // лимит сообщений на одну загрузку

  // ? детали чата
  const [chatDetail, setChatDetail] = useState({ 
    visible: false, id: '', chatName: '', users: [], messages: [], page: 1, reachedEnd: false
  })

  // ? диалоговое окно создания нового чата
  const [newChat, setNewChat] = useState({
    visible: false, companies: []
  })
  const [leaveChat, setLeaveChat] = useState({ 
    visible: false, id: ''
  })

  // ? новое сообщения чата
  const [newMessage, setNewMessage] = useState('')

  // ? параметры url
  const [searchParams, setSearchParams] = useSearchParams();

  // ? поиск чата
  const [search, setSearch] = useState('')
  
  // ? список печатающих пользователей
  const [typing, setTyping] = useState(new Array()) 
  const [typingMessage, setTypingMessage] = useState('')
  
  // ? список чатов
  const [chats, setChats] = useState([])
  const [allChats, setAllChats] = useState([])

  // ? загрузочный экран при первой прогрузке страницы
  const [pageLoading, setPageLoading] = useState(true)

  // ? загрузочный экран при первой загрузке чата
  const [historyLoading, setHistoryLoading] = useState(false)

  // ? для загрузки большего количества сообщений при прокрутке
  const [scroll, setScroll] = useState({
    ref: useRef(null), scrollLoading: false
  })

  const breadcrumbs = [
    <Typography 
      key='3' 
      className='client__bread client__bread_active' 
    >
      Сообщения
    </Typography>,
    chatDetail.visible ? 
      <Typography 
        key='3' 
        className='client__bread client__bread_active'
      >
        { chatDetail.chatName }
      </Typography> : null,
  ]

  // * добавление в список печатающих пользователей
  const handleTyping = useCallback((sender) => {
    
    // если уже есть такая запись, отмена
    const exactRecord = typing.find(item => item.id === sender.id && item.chatId === sender.chatId)
    if (exactRecord) {
      return
    }

    const typingUsers = [ ...typing ]
    typingUsers.push({ id: sender.id, firstName: sender.firstName, lastName: sender.lastName, chatId: sender.chatId })

    setTyping(typingUsers)

  }, [typing])

  // * удаление из списка печатающих пользователей
  const handleEndTyping = useCallback((sender) => {
    
    const typingUsers = [ ...typing ]
    const exactRecord = typingUsers.find(item => item.id === sender.id && item.chatId === sender.chatId)
    
    if (exactRecord) {
      typingUsers.splice(typingUsers.indexOf(exactRecord), 1)
      setTyping(typingUsers)
    }

  }, [typing])

  // * загрузка сообщений чата
  const handleGetMessages = (id, users, chatName) => {
    // загрузка сообщений чата
    request('/api/user/getmessages', 'POST', { 
      chatId: id ? id : chatDetail.id, messageSkip: 0, messageLimit: MESSAGE_LIMIT 
    }, {
      Authorization: `Bearer ${auth.token}`
    }).then(data => {
      setChatDetail({ 
        visible: true, 
        id: id ? id : chatDetail.id, 
        users: users ? users : chatDetail.users,
        chatName: chatName ? chatName : chatDetail.chatName,
        messages: data.messages, 
        page: 1, 
        reachedEnd: false 
      })

      setHistoryLoading(false)

      const sRows = data.messages.filter(item => !item.readed)

      // если есть не прочитанные сообщения, прочитываем
      if (sRows.length > 0) {

        // прочитать все сообщения при загрузке чата
        request('/api/user/readallmessages', 'POST', { chatId: id ? id : chatDetail.id, senderId: auth.userId, messageLimit: 100 }, {
          Authorization: `Bearer ${auth.token}`
        }).then(data => {
          socket.socket.emit('notification-update', { id: `/messages:${auth.userId}` })
          if (data.read) {
            chatDetail.users.forEach(user => {
              if (user.id !== auth.userId) {
                socket.socket.emit('chat-update', { id: `/messages:${user.id}` })
              }
            })
          }
          setChatDetail({ 
            visible: true, 
            id: id ? id : chatDetail.id, 
            users: users ? users : chatDetail.users,
            chatName: chatName ? chatName : chatDetail.chatName,
            messages: data.messages, 
            page: 1, 
            reachedEnd: false 
          })
        })

      }

      // установка прокрутки по вертикали на 0
      if (scroll.ref.current) {
        scroll.ref.current.scrollTo(0, 0)
      }
    })

  }

  // * загрузка чата при изменении другими пользователями
  const handleLoadChats = useCallback(() => {
    request('/api/user/getchats', 'POST', { userId: auth.userId }, {
      Authorization: `Bearer ${auth.token}`
    }).then(data => {
      setChats(data.chats)
      setAllChats(data.chats)
      setPageLoading(false)
      if (chatDetail.visible && chatDetail.id) {
        handleGetMessages()
      }
    })
  }, [chatDetail])

  // * загрузка большего количества сообщений
  const handleLoadMoreMessages = () => {
    if (chatDetail && chatDetail.messages.length > 0 && !chatDetail.reachedEnd && !scroll.scrollLoading) {
      setScroll({ ...scroll, scrollLoading: true })
      request('/api/user/getmessages', 'POST', { chatId: chatDetail.id, messageSkip: (chatDetail.page + 1 - 1) * MESSAGE_LIMIT, messageLimit: MESSAGE_LIMIT }, {
        Authorization: `Bearer ${auth.token}`
      }).then(data => {
        if (data.messages.length > 0) {
          const messages = chatDetail.messages.concat(data.messages)
          setChatDetail({ ...chatDetail, messages: messages, page: chatDetail.page + 1 })
        } else {
          setChatDetail({ ...chatDetail, reachedEnd: true })
        }
        setScroll({ ...scroll, scrollLoading: false })
      })
    }
  }

  // * сообщение о печатающих пользователях 
  const handleGetTypingMessage = useCallback(() => {

    // если чат не выбран, отмена
    if (!chatDetail.visible) {
      return setTypingMessage('')
    }
    
    const typingUsers = typing.filter(item => item.chatId === chatDetail.id)

    // если никто в этом чате не печатает, отмена
    if (typingUsers.length === 0) {
      return setTypingMessage('')
    }

    const message = typingUsers.reduce((prev, current, index, array) => {
      if (index > 1) {
        if (prev.indexOf(` и еще ${array.length - 2} печатают`) === -1) {
          return prev + ` и еще ${array.length - 2} печатают`
        } else {
          return prev
        }
      }
      if (prev === '') {
        return `${current.firstName} ${current.lastName}${index === array.length - 1 ? " печатает" : ""}`
      } else {
        return prev + `, ${current.firstName} ${current.lastName}${index === array.length - 1 ? " печатают" : ""}`
      }
    }, '')

    setTypingMessage(message)

  }, [typing, chatDetail])

  // * получение id чата из параметра url 
  useEffect(() => {

    const chatParam = searchParams.get('chat') // id чата, при переходе к чату
    const newchatParam = searchParams.get('newchat') // id пользователя, при переходе с других страниц

    const data = [ ...allChats ]

    // если переход с других страниц
    if (newchatParam) {

      const chat = data.find(chat => 
        chat.users.length === 2 && 
        chat.users.every(item => [auth.userId, newchatParam].includes(item.id))
      )
      
      // если чат с пользователем уже существует переход к нему, иначе создание
      if (chat) {
        return navigate(`/messages?chat=${chat.id}`)
      } else {
        request('/api/user/newchat', 'POST', { 
          users: new Array(newchatParam), senderId: auth.userId 
        }, {
          Authorization: `Bearer ${auth.token}`
        }).then(data => {
          handleLoadChats()
        })
      }
    }

    // если чатов нет, отмена
    if (data.length === 0) {
      return
    }

    // если переход к чату
    if (chatParam && (!chatDetail.visible || chatDetail.id !== chatParam)) {
      setHistoryLoading(true)

      const chat = data.find(chat => chat.id === chatParam)

      if (chat) {
        
        // название чата по фамилии участников
        const chatName = chat.users.reduce((prev, current, index, users) => {
          if (index > 1) {
            if (prev.indexOf(` и еще ${users.length - 2}`) === -1) {
              return prev + ` и еще ${users.length - 2}`
            } else {
              return prev
            }
          }
          if (prev === '') {
            return `${current.firstName[0]}. ${current.lastName}`
          } else {
            return prev + `, ${current.firstName[0]}. ${current.lastName}`
          }
        }, '')

        setChatDetail({ ...chatDetail, visible: true, id: chatParam, chatName: chatName, users: chat.users, page: 1, reachedEnd: false })

        handleGetMessages(chatParam, chat.users, chatName)
      }

    }   
  }, [searchParams, allChats])
  
  // * вход в комнату 
  useEffect(() => {
    socket.socket.emit('join-room', `/messages:${auth.userId}`)
  }, []);

  // * загрузка чатов при заходе на страницу 
  useEffect(() => {
    handleLoadChats()
  }, [])

  // * подключение слушателя сокета 'chats-get' 
  useEffect(() => {
    socket.socket.on('chats-get', handleLoadChats)
    return () => { 
      socket.socket.removeListener('chats-get', handleLoadChats) 
    }
  }, [chatDetail])

  // * подключение слушателей сокета 'message-typing', 'message-typing-ends' 
  useEffect(() => {
    socket.socket.on('message-typing', handleTyping)
    socket.socket.on('message-typing-ends', handleEndTyping)
    return () => { 
      socket.socket.removeListener('message-typing', handleTyping) 
      socket.socket.removeListener('message-typing-ends', handleEndTyping) 
    }
  }, [typing])

  // * вывод сообщения о печатающих пользователях при смене чата 
  useEffect(() => {
    handleGetTypingMessage()
  }, [chatDetail])

  // * вывод сообщения о печатающих пользователях 
  useEffect(() => {
    handleGetTypingMessage()
  }, [typing])

  // * открытие диалога для создания нового чата 
  const dialogNewChat = () => {
    setNewChat({ visible: true, companies: [] })
    request('/api/user/getclients', 'POST', { 
      companyId: auth.userMembership === 'company' 
        ? company.companyId 
        : client.variables.company._id
    }, {
      Authorization: `Bearer ${auth.token}`
    }).then(data => {
      console.log('data', data)
      setNewChat({ visible: true, companies: data.data })
    })
  }

  // * отправка сообщений 
  const handleSendMessage = () => {
    
    if (newMessage.trim()) {

      // добавление сообщения до загрузки
      const messages = [ ...chatDetail.messages ]
      messages.push({ chatId: chatDetail.id, senderId: auth.userId, message: newMessage, delivered: false, readed: false, date: new Date() })
      setChatDetail({ ...chatDetail, messages: messages, page: 1, reachedEnd: false })
      
      // отправка сообщения
      request('/api/user/sendmessage', 'POST', { messageText: newMessage, chatId: chatDetail.id, senderId: auth.userId }, {
        Authorization: `Bearer ${auth.token}`
      }).then(data => {
        handleLoadChats()
      })

      chatDetail.users.forEach(user => {
        if (user.id !== auth.userId) {
          // создание уведомления о новом сообщении
          request('/api/user/createmessagenotification', 'POST', { userId: user.id, senderId: auth.userId, chatName: chatDetail.chatName, chatId: chatDetail.id }, {
            Authorization: `Bearer ${auth.token}`
          }).then(data => {
            socket.socket.emit('notification-push')
          })

          // отправка событий пользователям через сокет
          socket.socket.emit('message-user-typing-ends', { id: `/messages:${user.id}` }, { id: auth.userId, chatId: chatDetail.id })
          socket.socket.emit('chat-update', { id: `/messages:${user.id}` })
        }
      })

      setNewMessage('')
    }

  }

  // * ввод сообщения 
  const handleInputTyping = ({ key }) => {
    chatDetail.users.forEach(user => {
      if (user.id !== auth.userId) {
        const sender = chatDetail.users.find(item => item.id === auth.userId)
        socket.socket.emit('message-user-typing', { id: `/messages:${user.id}` }, { id: auth.userId, firstName: sender.firstName, lastName: sender.lastName, chatId: chatDetail.id })
      }
    })
    if (key === 'Enter') {
      handleSendMessage()
    }
  }

  // * прекращает вывод сообщения о печатающем пользователе 
  const handleInputKeyDown = ({ key }) => {
    if (key === 'Backspace') {
      chatDetail.users.forEach(user => {
        if (user.id !== auth.userId) {
          socket.socket.emit('message-user-typing-ends', { id: `/messages:${user.id}` }, { id: auth.userId, chatId: chatDetail.id })
        }
      })
    }
  }

  // * поиск в списке чатов 
  const handleSearchChat = ({ currentTarget: { value } }) => {

    if (!value) {
      return setChats(allChats)
    }

    const sRows = allChats.filter(chat => 
      chat.users.find(user => 
        user.firstName.toLowerCase().indexOf(value.toLowerCase()) !== -1 || 
        user.lastName.toLowerCase().indexOf(value.toLowerCase()) !== -1
      )
    )

    setChats(sRows)
  }

  // * создание нового чата 
  const handleCreateNewChat = () => {

    const companies = newChat.companies // список компаний
    const users = new Array() // список выбранных пользователей

    companies.forEach(item => {
      if (item.users.length > 0) {
        users.push(
          ...item.users
            .filter((user) => user.selected === true)
            .reduce((prev, item) => {
              prev.push(item.id)
              return prev
            }, [])
        )
      }
    })

    // если не выбран ни один пользователь, отмена
    if (users.length === 0) {
      return
    }

    // проверка не существует ли чата с такими пользователями
    const compareChats = chats.filter((chat) =>
      chat.users.every((item) =>
        item.id === auth.userId 
          ? true 
          : users.includes(item.id)
      ) 
      && chat.users.length === users.length + 1
    );
    // если существует, перенаправляет на чат
    if (compareChats.length > 0) {
      setNewChat({ visible: false, companies: [] })
      navigate(`/messages?chat=${compareChats[0].id}`)
      return
    }

    request('/api/user/newchat', 'POST', {
      users: users, senderId: auth.userId
    }, {
      Authorization: `Bearer ${auth.token}`
    }).then(data => {

      // отправка события создания чата всем причастным пользоватлям
      users.forEach(user => {
        socket.socket.emit('chat-created', { id: `/messages:${user.id}` })
      })
      
      setNewChat({ visible: false, companies: [] })
      handleLoadChats()
    })

  }

  // * выбор пользователя для нового чата 
  const handleSelectUserNewChat = ({ currentTarget }) => {
    const userId = currentTarget.parentNode.parentNode.getAttribute('data-user-id')
    const companies = newChat.companies
    const user = companies.find(company => company.users.find(user => user.id === userId)).users.find(user => user.id === userId)
    user.selected = !user.selected
    setNewChat({ ...newChat, companies: companies })
  }

  // * прокрутка сообщений
  const handleScrollMessages = ({ currentTarget }) => {
    if (currentTarget.scrollHeight - currentTarget.clientHeight !== 0 && chatDetail.messages.length >= 100) {
      if (Math.abs(currentTarget.scrollTop) >= currentTarget.scrollHeight - currentTarget.clientHeight - 50) {
        handleLoadMoreMessages()
      }
    }
  }

  // * пользователь покидает чат
  const handleLeaveChat = () => {
    request('/api/user/leavechat', 'POST', {
      chatId: leaveChat.id, userId: auth.userId
    }, {
      Authorization: `Bearer ${auth.token}`
    }).then(data => {
      setChatDetail({ visible: false, id: '', chatName: '', users: [], messages: [], page: 1, reachedEnd: false })

      handleLoadChats()
      chatDetail.users.forEach(user => {
          // отправка событий пользователям через сокет
          socket.socket.emit('message-user-typing-ends', { id: `/messages:${user.id}` }, { id: auth.userId, chatId: leaveChat.id })
          socket.socket.emit('chat-update', { id: `/messages:${user.id}` })
      })

      setLeaveChat({ visible: false, id: '' })
    })
  }

  // * отрисовка загрузочного экрана
  const renderLoadingScreen = () => {
    return (
      <div className="message__loading">
        <CircularProgress />
      </div>
    )
  }

  // * отрисовка списка чатов
  const renderChatList = () => {

    // если не добавлено ни одного чата, вывод заглушки
    if (chats.length === 0) {
      return (
        <div className="message__chat-nochat">
          <p>У вас еще нет бесед</p>
          <Button
            disableRipple
            onClick={ () => { dialogNewChat() } }
          >
            создайте новую
          </Button>
        </div>
      )
    }

    const sRows = new Array() // элементы для отображения
    const sortedChats = chats.sort((prev, current) => {
      if (!current.lastMessage) {
        return -1
      }
      if (!prev.lastMessage) {
        return 1
      }
      return compareDesc(
        new Date(prev.lastMessage.date),
        new Date(current.lastMessage.date)
      )
    }) // отсортированый массив чатов по дате последнего сообщения

    sortedChats.forEach((chat, index) => {
      const todayDate = new Date().setHours(0,0,0,0)
      const messageDate = chat.lastMessage
        ? new Date(chat.lastMessage.date)
        : null
      
      // дата или время последнего сообщения
      let messageDateString = ''
      if (messageDate) {
        if (new Date(messageDate).setHours(0,0,0,0) === todayDate) {
          messageDateString = `${(messageDate.getHours() < 10 ? "0" : "") + messageDate.getHours()}:${(messageDate.getMinutes() < 10 ? "0" : "") + messageDate.getMinutes()}`
        } else {
          messageDateString = `${(messageDate.getDate() < 10 ? "0" : "") + messageDate.getDate()}.${(messageDate.getMonth() < 10 ? "0" : "") + messageDate.getMonth()}.${messageDate.getFullYear()}`
        }
      }

      // название чата по фамилии участников
      const chatName = chat.users.reduce((prev, current, index, users) => {
        if (index > 1) {
          if (prev.indexOf(` и еще ${users.length - 2}`) === -1) {
            return prev + ` и еще ${users.length - 2}`
          } else {
            return prev
          }
        }
        if (prev === '') {
          return `${current.firstName[0]}. ${current.lastName}`
        } else {
          return prev + `, ${current.firstName[0]}. ${current.lastName}`
        }
      }, '')

      sRows.push(
        <div
          className={
            chatDetail.id === chat.id
              ? "message__chat message__chat_active"
              : "message__chat"
          }
          onClick={({ currentTarget }) => {
            navigate(
              `/messages?chat=${currentTarget.getAttribute("data-chat-id")}`
            )
          }}
          data-chat-id={chat.id}
          key={index}
        >
          {/* Иконка чата */}
          <div className="message__chat-ico">
            <SvgIcon>
            {
              chat.users.length > 2
                ? <path fill="currentColor" d="M12,5A3.5,3.5 0 0,0 8.5,8.5A3.5,3.5 0 0,0 12,12A3.5,3.5 0 0,0 15.5,8.5A3.5,3.5 0 0,0 12,5M12,7A1.5,1.5 0 0,1 13.5,8.5A1.5,1.5 0 0,1 12,10A1.5,1.5 0 0,1 10.5,8.5A1.5,1.5 0 0,1 12,7M5.5,8A2.5,2.5 0 0,0 3,10.5C3,11.44 3.53,12.25 4.29,12.68C4.65,12.88 5.06,13 5.5,13C5.94,13 6.35,12.88 6.71,12.68C7.08,12.47 7.39,12.17 7.62,11.81C6.89,10.86 6.5,9.7 6.5,8.5C6.5,8.41 6.5,8.31 6.5,8.22C6.2,8.08 5.86,8 5.5,8M18.5,8C18.14,8 17.8,8.08 17.5,8.22C17.5,8.31 17.5,8.41 17.5,8.5C17.5,9.7 17.11,10.86 16.38,11.81C16.5,12 16.63,12.15 16.78,12.3C16.94,12.45 17.1,12.58 17.29,12.68C17.65,12.88 18.06,13 18.5,13C18.94,13 19.35,12.88 19.71,12.68C20.47,12.25 21,11.44 21,10.5A2.5,2.5 0 0,0 18.5,8M12,14C9.66,14 5,15.17 5,17.5V19H19V17.5C19,15.17 14.34,14 12,14M4.71,14.55C2.78,14.78 0,15.76 0,17.5V19H3V17.07C3,16.06 3.69,15.22 4.71,14.55M19.29,14.55C20.31,15.22 21,16.06 21,17.07V19H24V17.5C24,15.76 21.22,14.78 19.29,14.55M12,16C13.53,16 15.24,16.5 16.23,17H7.77C8.76,16.5 10.47,16 12,16Z" />
                : <path d="M16.5 13c-1.2 0-3.07.34-4.5 1-1.43-.67-3.3-1-4.5-1C5.33 13 1 14.08 1 16.25V19h22v-2.75c0-2.17-4.33-3.25-6.5-3.25zm-4 4.5h-10v-1.25c0-.54 2.56-1.75 5-1.75s5 1.21 5 1.75v1.25zm9 0H14v-1.25c0-.46-.2-.86-.52-1.22.88-.3 1.96-.53 3.02-.53 2.44 0 5 1.21 5 1.75v1.25zM7.5 12c1.93 0 3.5-1.57 3.5-3.5S9.43 5 7.5 5 4 6.57 4 8.5 5.57 12 7.5 12zm0-5.5c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm9 5.5c1.93 0 3.5-1.57 3.5-3.5S18.43 5 16.5 5 13 6.57 13 8.5s1.57 3.5 3.5 3.5zm0-5.5c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2z" />
            }
            </SvgIcon>
          </div>
          
          {/* Информация о чате */}
          <div className="message__chat-content">
            <div className="message__chat-title">
              <Tooltip title={chatName}>
                <Typography noWrap>
                  {
                    chatName
                  }
                </Typography>
              </Tooltip>
              <p className="message__chat-date">
                {
                  messageDateString
                }
              </p>
            </div>
            <div 
              className={
                chat.lastMessage && !chat.lastMessage.readed && chat.lastMessage.senderId !== auth.userId
                  ? "message__chat-message message__chat-message_unread"
                  : "message__chat-message"
              }
            >
              <Typography noWrap>
                {
                  !chat.lastMessage 
                    ? 'Нет сообщений' 
                    : chat.users.find(user => user.id === chat.lastMessage.senderId)
                      ? `${chat.users.find(user => user.id === chat.lastMessage.senderId).firstName}: ${chat.lastMessage.message}` 
                      : 'Пользователь вышел с чата'
                }
              </Typography>
            </div>
          </div>
        </div>
      )
      
    })

    sRows.push(
      <div className="message__chat-nochat" key={sRows.length + 1}>
        <Button
          disableRipple
          onClick={() => { dialogNewChat() }}
        >
          Создать новую беседу
        </Button>
      </div>
    )

    return sRows
  }

  // * отрисовка списка компаний
  const renderCompaniesList = () => {
    
    // если нет ни одной компании, вывод заглушки
    if (newChat.companies.length === 0) {
      return (
        <div className="message__dialog-companies message__dialog-companies_empty">
          <p>У вашей компании нет ни одного сотрудника или клиента, с которым можно завести беседу</p>
        </div>
      )
    }

    const companyId = auth.userMembership === 'company'
      ? company.companyId
      : client.variables.company._id
    
    const userCompany = newChat.companies.find(item => item.id === companyId) // компания пользователя
    // если в компании нет других сотрудников, кроме пользователя, вывод заглушки
    if (userCompany.users.length === 1 && userCompany.users[0].id === auth.userId) {
      return (
        <div className="message__dialog-companies message__dialog-companies_empty">
          <p>У вашей компании нет ни одного сотрудника или клиента, с которым можно завести беседу</p>
        </div>
      )
    }

    const sRows = new Array() // элементы для отображения

    newChat.companies.forEach((item, index) => {

      const aRows = new Array() // элементы для отображения

      // занесение сотрудников компании для отображения
      item.users.forEach((item, index) => {
        if (item.id !== auth.userId) {
          aRows.push(
            <div
              className="message__dialog-user"
              data-user-id={item.id}
              key={+('9' + index.toString())}
            >
              <Checkbox
                disableRipple
                value={item.selected}
                onChange={handleSelectUserNewChat}
              />
              <Tooltip title={item.name}>
                <Typography noWrap>
                  {
                    item.name
                  }
                </Typography>
              </Tooltip>
            </div>
          )
        }
      })

      sRows.push(
        <Accordion key={index}>
          <AccordionSummary>
            <Tooltip title={item.name}>
              <Typography noWrap>
                {
                  item.name
                }
              </Typography>
            </Tooltip>
          </AccordionSummary>
          <AccordionDetails>
            {
              aRows
            }
          </AccordionDetails>
        </Accordion>
      )

    })

    return sRows
  }

  // * отрисовка сообщений чата 
  const renderHistoryMessage = () => {

    // если нет сообщений, вывод заглушки
    if (chatDetail.messages.length === 0) {
      return (
        <div className="message__history-messages message__history-messages_empty">
          <p>В этом чате еще нет сообщений</p>
        </div>
      )
    }

    let lastDate = ''
    const sRows = new Array() // элементы для отображения
    
    chatDetail.messages.forEach((message, index) => {
      const messageDate = message.date 
        ? new Date(message.date)
        : new Date()

      // добавление разделителя по дням 
      if (lastDate !== messageDate.toLocaleDateString()) {
        lastDate = messageDate.toLocaleDateString()
        const cryptoIndex = window.crypto.getRandomValues(new Uint16Array(1))[0] // случайный индекс для отображения
        sRows.push(
          <div className="message__history-messages-divider" key={messageDate.getTime() + cryptoIndex}>
            {
              lastDate
            }
          </div>
        )
      }

      sRows.push(
        <div
          className={
            message.senderId === auth.userId
              ? "message__history-message message__history-message_sender"
              : "message__history-message"
          }
          key={index}
        >
          <h3>
            {
              chatDetail.users.find(user => user.id === message.senderId) 
                ? chatDetail.users.find(user => user.id === message.senderId).firstName + ' ' + chatDetail.users.find(user => user.id === message.senderId).lastName
                : 'Пользователь вышел из чата'
            }
          </h3>
          <h2>
            {
              message.message
            }
          </h2>
          <Tooltip 
            title={
              `${(messageDate.getHours()<10?'0':'') + messageDate.getHours()}:${(messageDate.getMinutes()<10?'0':'') + messageDate.getMinutes()} ` +
              messageDate.toLocaleDateString()
            }
          >
            <p>
              {
                `${(messageDate.getHours()<10?'0':'') + messageDate.getHours()}:${(messageDate.getMinutes()<10?'0':'') + messageDate.getMinutes()}`
              }
            </p>
          </Tooltip>
          {
            !message.delivered 
              ? (
                <SvgIcon className="message__history-message-checkmark">
                  <path fill="currentColor" d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z" />
                </SvgIcon>
              )
              : (
                <Tooltip title={message.readed ? 'Прочитано' : 'Доставлено'}>
                  <SvgIcon 
                    className={ 
                      message.readed 
                        ? "message__history-message-checkmark message__history-message-checkmark_readed" 
                        : "message__history-message-checkmark" 
                    }
                  >
                    <path fill="currentColor" d="M0.41,13.41L6,19L7.41,17.58L1.83,12M22.24,5.58L11.66,16.17L7.5,12L6.07,13.41L11.66,19L23.66,7M18,7L16.59,5.58L10.24,11.93L11.66,13.34L18,7Z" />
                  </SvgIcon>
                </Tooltip>
              )
          }
        </div>
      )

    })

    return (
      <div 
        className="message__history-messages"
        ref={scroll.ref}
        onScroll={handleScrollMessages} 
      >
        {
          sRows
        }
      </div>
    )
  }

  // * отрисовка загрузочного экрана при первом открытии страницы
  if (pageLoading) {
    return (
      <div className="message__loading">
        <CircularProgress />
      </div>
    )
  }

  return (
    <div className="message">

      {/* Header */}
      <div className="message__nav">
        <Stack spacing={2}>
          <Breadcrumbs separator="›">
            {
              breadcrumbs
            }
          </Breadcrumbs>
        </Stack>
      </div>

      <div className="message__content">
        <div className="message__wrapper">

          {/* Список чатов */}
          {
            !smScreen || (smScreen && !chatDetail.visible)
              ? (
                <div className="message__menu">
                  <div className="message__search">
                    <TextField
                      className="message__input"
                      placeholder="Поиск по имени пользователя"
                      fullWidth
                      onChange={handleSearchChat}
                    />
                  </div>
                  <div className="message__chats">
                    {
                      renderChatList()
                    }
                  </div>
                </div>
              )
              : <></>
          }
          

          {/* История сообщений */}
          {
            !chatDetail.visible 
              ? <></>
              : (
                <div className="message__history" ref={scroll.ref}>
                  
                  {/* Header */}
                  <div className="message__history-title">
                    {
                      smScreen
                        ? (
                          <Button
                            disableRipple
                            className="message__btn"
                            onClick={() => { 
                              setChatDetail({ visible: false, id: '', chatName: '', users: [], messages: [], page: 1, reachedEnd: false }) 
                              navigate('/messages')
                            }}
                          >
                            <Tooltip title='Перейти к списку чатов'>
                              <SvgIcon>
                                <path fill="currentColor" d="M15.41,16.58L10.83,12L15.41,7.41L14,6L8,12L14,18L15.41,16.58Z" />
                              </SvgIcon>
                            </Tooltip>
                          </Button>
                        )
                        : <></>
                    }
                    <Typography noWrap>
                      {
                        chatDetail.chatName
                      }
                    </Typography>
                    <div className="message__history-title-controls">
                      <Button
                        disableRipple
                        className="message__btn"
                        onClick={() => { setLeaveChat({ visible: true, id: chatDetail.id }) }}
                      >
                        <Tooltip title='Покинуть беседу'>
                          <SvgIcon>
                            <path fill="currentColor" d="M19,3H5C3.89,3 3,3.89 3,5V9H5V5H19V19H5V15H3V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5C21,3.89 20.1,3 19,3M10.08,15.58L11.5,17L16.5,12L11.5,7L10.08,8.41L12.67,11H3V13H12.67L10.08,15.58Z" />
                          </SvgIcon>
                        </Tooltip>
                      </Button>
                    </div>
                  </div>

                  {/* Список печатающих людей */}
                  <div
                    className={
                      typingMessage
                        ? "message__history-messages-typing"
                        : "message__history-messages-typing message__history-messages-typing_empty"
                    }
                  >
                    <p>
                      {
                        typingMessage
                      }
                    </p>
                  </div>

                  {/* Список сообщений */}
                  {
                    historyLoading
                      ? renderLoadingScreen()
                      : renderHistoryMessage()
                  }

                  {/* Ввод сообщения */}
                  <div className="message__history-input">
                    <TextField
                      className="message__input"
                      placeholder="Напишите сообщение"
                      fullWidth
                      value={newMessage}
                      onKeyPress={handleInputTyping}
                      onKeyDown={handleInputKeyDown}
                      onChange={({ currentTarget: { value } }) => {
                        setNewMessage(value)
                      }}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <SvgIcon onClick={handleSendMessage}>
                              <path
                                fill="currentColor"
                                d="M2,21L23,12L2,3V10L17,12L2,14V21Z"
                              />
                            </SvgIcon>
                          </InputAdornment>
                        ),
                      }}
                    />
                  </div>
                </div>
              )
          }
          
        </div>
      </div>

      {/* Dialogs */}

      {/* Диалоговое окно создания нового чата */}
      <Dialog
        open={newChat.visible}
        className="message__dialog dialog"
        onClose={() => {
          setNewChat({ visible: false, companies: [] })
        }}
      >
        <div className="dialog__title">
          <h1>Выберите пользователей для чата</h1>
          <SvgIcon
            onClick={() => {
              setNewChat({ visible: false, companies: [] })
            }}
          >
            <path
              fill="currentColor"
              d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z"
            />
          </SvgIcon>
        </div>
        {
          loading
            ? renderLoadingScreen() // отображение во время загрузки списка компаний
            : (
              <>
                <DialogContent className="dialog__content">
                  <div className="message__dialog-invite">
                    {/* Поиск */}
                    <div className="message__search">
                      <TextField
                        className="message__input"
                        placeholder="Поиск"
                        fullWidth
                        value={search}
                        onChange={({ currentTarget: { value } }) => {
                          setSearch(value.trim())
                        }}
                      />
                    </div>
                    {/* Список компаний */}
                    <div className="message__companies">
                      {
                        renderCompaniesList()
                      }
                    </div>
                  </div>
                </DialogContent>
                <DialogActions className="dialog__actions">
                  <Button
                    disableElevation
                    disabled={newChat.companies.length === 0}
                    variant="container"
                    className="dialog__btn"
                    onClick={handleCreateNewChat}
                  >
                    Создать беседу
                  </Button>
                </DialogActions>
              </>
            )
        }
      </Dialog>

      {/* Диалоговое окно покидания чата */}
      <Dialog
        open={leaveChat.visible}
        className="message__dialog dialog"
        onClose={() => {
          setLeaveChat({ visible: false, id: '' })
        }}
      >
        <div className="dialog__title">
          <h1></h1>
          <SvgIcon
            onClick={() => {
              setLeaveChat({ visible: false, id: '' })
            }}
          >
            <path
              fill="currentColor"
              d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z"
            />
          </SvgIcon>
        </div>
        <DialogContent className="dialog__content">
          <h2 className="dialog__question">
            Вы действительно хотите покинуть эту беседу?
          </h2>
        </DialogContent>
        <DialogActions className="dialog__actions">
          <Button
            disableElevation
            variant="container"
            className="dialog__btn dialog__btn_cancel"
            onClick={() => { 
              setLeaveChat({ visible: false, id: '' })
            }}
          >
            Отмена
          </Button>
          <Button
            disableElevation
            variant="container"
            className="dialog__btn"
            onClick={handleLeaveChat}
          >
            Покинуть
          </Button>
        </DialogActions>
      </Dialog>

    </div>
  );
}