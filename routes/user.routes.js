const { Router } = require('express')
const Company = require('../models/Company')
const auth = require('../middleware/auth.middleware')
const config = require('config')
const { check } = require('express-validator')
const User = require('../models/User')
const Notifications = require('../models/Notifications')
const Director = require('../models/Director')
const Message = require('../models/Message')
const Client = require('../models/Client')
const Chat = require('../models/Chat')
const EventModel = require('../models/Event')
const router = Router()
const { Types } = require('mongoose')
const bcrypt = require('bcryptjs')


// /api/user/userInfo
router.post('/userinfo',
  [
    check('userId', 'Неудалось получить данные о пользователе').exists()
  ],
  async (req, res) => {
    try {
      const { userId } = req.body
      const user = await User.findOne({ _id: userId })
      res.json({ email: user.email, firstName: user.firstName, lastName: user.lastName, birthDate: user.birthDate, phoneNumber: user.phoneNumber })
    } catch (e) {
      res.status(500).json({ data: [{msg: 'Что-то пошло не так, попробуйте снова'}] })
    }
  }
)

router.post('/userslist',
  auth,
  async (req, res) => {
    try {
      const { usersList } = req.body

      const users = await User.find({ _id: { $in: usersList } }, { password: false })
      
      res.json({ users })
    } catch (e) {
      res.status(500).json({ data: [{msg: 'Что-то пошло не так, попробуйте снова'}] })
    }
  }
)

// * изменение информации о пользователе
// ? принимает: profile - объект
router.post('/saveuser',
  auth,
  async (req, res) => {
    try {
      
      const { userId, profile } = req.body

      const user = await User.findOne({ userId: userId })

      if (!user) {
        res.status(400).json({ data: [{ msg: 'Пользователь не найден' }] })
      }

      if (profile.oldPassword && profile.oldPassword.trim()) {

        const passwordMatch = await bcrypt.compare(profile.oldPassword, user.password) 

        if (!passwordMatch) {
          return res.status(400).json({ data: [{ msg: 'Неверный пароль' }] })
        }

        if (!profile.newPassword || !profile.newPassword.trim()) {
          return res.status(400).json({ data: [{ msg: 'Введите новый пароль' }] })
        }

        if (profile.proofPassword && profile.newPassword !== profile.proofPassword) {
          return res.status(400).json({ data: [{ msg: 'Пароли не совпадают' }] })
        }

        const hashedPassword = await bcrypt.hash(profile.newPassword, 15)

        await User.updateOne({ _id: user._id }, { password: hashedPassword })

      }

      if (!profile.firstName || !profile.firstName.trim()) {
        return res.status(400).json({ data: [{ msg: 'Поле Имя обязательно для заполнения' }] })
      }

      if (!profile.lastName || !profile.lastName.trim()) {
        return res.status(400).json({ data: [{ msg: 'Поле Фамилия обязательно для заполнения' }] })
      }

      await User.updateOne({ _id: user._id }, { firstName: profile.firstName, lastName: profile.lastName, birthDate: profile.birthDate, phoneNumber: profile.phoneNumber })

      return res.status(200).json({ msg: 'Данные успешно изменены' })

    } catch (e) {
      res.status(500).json({ data: [{ msg: 'Что-то пошло не так, попробуйте снова' }] })
    }
  }
)

router.post('/notificationslist',
  auth,
  async (req, res) => {
    const { userId } = req.body
    const notifications = await Notifications.find({ to: userId, status: 'active' })
    res.json(notifications)
  }
)

router.post('/joincompany',
  auth,
  async (req, res) => {
    try {
      const { notificationId } = req.body

      const notification = await Notifications.findOne({ _id: notificationId })
      
      // если такого приглашения не существует, отмена
      if (!notification) {
        return res.status(400).json({ data: [{ msg: 'Приглашение не найдено' }] })
      }

      if (notification.status === 'done' || new Date(notification.expires).getTime() < new Date().getTime()) {
        return res.status(400).json({ data: [{ msg: 'Время действия данного приглашения вышло' }] })
      }

      await Notifications.updateOne({ _id: notification._id }, { $set: { status: 'done' } })

      switch (notification.type) {
        case 'invite':
          await Company.updateOne({ _id: notification.from }, { $push: { users: notification.to } })
          return res.status(200).json({ id: notification.from })
          break
        case 'invite-director':
          const director = new Director({ userId: notification.to, client: notification.from, post: notification.params.post })
          await director.save()
          await Client.updateOne({ _id: notification.from }, { $push: { directors: director._id } })
          return res.status(200).json({ id: notification.from })
          break
      
        default:
          return res.status(400).json({ data: [{ msg: 'Невозможно присоединиться к компании' }] })
      }

    }
    catch(e) {
      res.status(500).json({ data: [{msg: 'Что-то пошло не так, попробуйте снова'}] })
    }
  }
)

router.post('/assignasadmin',
  auth,
  async (req, res) => {
    try {
      
      const { userId, companyId, senderId } = req.body 

      const user = await User.findOne({ _id: userId })
      
      if (!user) {
        return res.status(500).json({ data: [{ msg: 'Что-то пошло не так, попробуйте снова' }] })
      }
      
      const company = await Company.findOne({ _id: companyId })
      
      if (!company) {
        return res.status(500).json({ data: [{ msg: 'Что-то пошло не так, попробуйте снова' }] })
      }

      if (company.owner != senderId) {
        return res.status(400).json({ data: [{ msg: 'Вы не обладаете нужными правами, чтобы назначить пользователя администратором' }] })
      }

      if (!company.users.includes(user._id)) {
        return res.status(400).json({ data: [{ msg: 'Этот пользователь не находится в этой компании' }] })
      }

      if (company.admins.includes(user._id)) {
        return res.status(400).json({ data: [{ msg: 'Этот пользователь уже является администратором в этой компании' }] })
      }

      await Company.updateOne({ _id: companyId }, { $push: { admins: user._id } })

      res.status(200).json({ msg: 'Пользователь назначен администратором' })

    } catch (e) {
      res.status(500).json({ data: [{msg: 'Что-то пошло не так, попробуйте снова'}] })
    }
  }
)

router.post('/deletefromcompany',
  auth,
  async (req, res) => {
    try {
      
      const { userId, companyId, senderId } = req.body 

      const user = await User.findOne({ _id: userId })
      
      if (!user) {
        return res.status(500).json({ data: [{ msg: 'Что-то пошло не так, попробуйте снова' }] })
      }

      if (user._id.toString() === senderId.toString()) {
        return res.status(400).json({ data: [{ msg: 'Вы не можете удалить себя' }] })
      }
      
      const company = await Company.findOne({ _id: companyId })
      
      if (!company) {
        return res.status(500).json({ data: [{ msg: 'Что-то пошло не так, попробуйте снова' }] })
      }

      if (company.owner.toString() == user._id.toString()) {
        return res.status(400).json({ data: [{ msg: 'Вы не можете удалить создателя компании' }] })
      }

      if (!company.users.includes(user._id)) {
        return res.status(400).json({ data: [{ msg: 'Этот пользователь не находится в этой компании' }] })
      }

      if (company.admins.includes(user._id) && company.owner != senderId) {
        return res.status(400).json({ data: [{ msg: 'Вы не обладаете нужными правами, чтобы удалить администратора' }] })
      }      

      if (company.admins.includes(user._id)) {
        await Company.updateOne({ _id: companyId }, { $pull: { admins: user._id } })
      }
       
      await Company.updateOne({ _id: companyId }, { $pull: { users: user._id } })

      res.status(200).json({ msg: 'Пользователь удален из компании' })

    } catch (e) {
      res.status(500).json({ data: [{msg: 'Что-то пошло не так, попробуйте снова'}] })
    }
  }
)

router.post('/demoteadmin',
  auth,
  async (req, res) => {
    try {
      
      const { userId, companyId, senderId } = req.body 

      const user = await User.findOne({ _id: userId })
      
      if (!user) {
        return res.status(500).json({ data: [{ msg: 'Что-то пошло не так, попробуйте снова' }] })
      }

      if (user._id.toString() === senderId.toString()) {
        return res.status(400).json({ data: [{ msg: 'Вы не можете снять с себя права администратора' }] })
      }
      
      const company = await Company.findOne({ _id: companyId })
      
      if (!company) {
        return res.status(500).json({ data: [{ msg: 'Что-то пошло не так, попробуйте снова' }] })
      }

      if (company.owner.toString() == user._id.toString()) {
        return res.status(400).json({ data: [{ msg: 'Вы не можете снять права администратора с создателя компании' }] })
      }

      if (!company.users.includes(user._id)) {
        return res.status(400).json({ data: [{ msg: 'Этот пользователь не находится в этой компании' }] })
      }

      if (company.admins.includes(user._id) && company.owner != senderId) {
        return res.status(400).json({ data: [{ msg: 'Вы не обладаете нужными правами, чтобы снять права администратора' }] })
      }      

      await Company.updateOne({ _id: companyId }, { $pull: { admins: user._id } })

      res.status(200).json({ msg: 'С пользователя сняты права администратора' })

    } catch (e) {
      res.status(500).json({ data: [{msg: 'Что-то пошло не так, попробуйте снова'}] })
    }
  }
)

router.post('/joinclient', 
  auth, 
  async (req, res) => {
    try {
      const { notification } = req.body
      
      const director = new Director({ userId: notification.to, client: notification.from, post: notification.params.post })
      await director.save()
      await Client.updateOne({ _id: notification.from }, { $push: { directors: director._id } })
      await Notifications.updateOne({ _id: notification._id }, { status: 'done' })

      res.json({ clientId: notification.from })
    }
    catch(e) {
      res.status(500).json({ data: [{msg: 'Что-то пошло не так, попробуйте снова'}] })
    }
})

// * получение списка сообщений
// ? принимает: usersList
// /api/user/getusersnames
router.post('/getusersnames', 
  auth, 
  async (req, res) => {
    try {

      const { usersList } = req.body

      if (usersList.length === 0) {
        return res.status(400).json({ data: [{ msg: 'Некорректный список пользователей' }] })
      }

      let users = new Array()

      for (let i = 0; i < usersList.length; i++) {
        const user = await User.findOne({ _id: usersList[i] }, { _id: true, firstName: true, lastName: true })
        users.push(user)
      }

      res.status(200).json({ users: users })
    }
    catch(e) {
      res.status(500).json({ data: [{msg: 'Что-то пошло не так, попробуйте снова'}] })
    }
})

// * получение списка сообщений
// ? принимает: userId
// /api/user/getchats
router.post('/getchats', 
  auth,
  async (req,res) => {
    try {
      const { userId } = req.body

      const chats = await Chat.find({ users: userId })

      if (chats.length === 0) {   
        return res.status(200).json({ chats: [] })
      }

      let chatsArray = new Array()

      for (let i = 0; i < chats.length; i++) {
        const lastMessage = await Message.findOne({ _id: chats[i].lastMessage })
        let users = new Array()
        for (let j = 0; j < chats[i].users.length; j++) {
          const userDetails = await User.findOne({ _id: chats[i].users[j]._id })
          users.push({ id: userDetails.id, firstName: userDetails.firstName, lastName: userDetails.lastName })
        }
        const chat = { 
          id: chats[i].id,
          users: users,
          lastMessage: lastMessage ? {
            senderId: lastMessage.senderId,
            message: lastMessage.message,
            delivered: lastMessage.delivered,
            readed: lastMessage.readed,
            date: lastMessage.date
          } : null
        }
        chatsArray.push(chat)
      }
      res.status(200).json({ chats: chatsArray })
    } catch(e) {
      res.status(500).json({ data: [{ msg: 'Что-то пошло не так, попробуйте снова' }] })
    }
  }
)

// * создание нового чата
// ? принимает: messageText, userId, senderId
// /api/user/newchat
router.post('/newchat', 
  auth,
  async (req,res) => {
    try {
      const { users, senderId } = req.body

      if (users.length === 0) {
        return res.status(400).json({ data: [{ msg: 'Вы не выбрали ни одного пользователя' }] })
      }

      let usersId = new Array()

      for (let i = 0; i < users.length; i++) {
        const user = await User.findOne({ _id: users[i] })
        if (user) {
          usersId.push(user._id)
        } else {
          return res.status(400).json({ data: [{ msg: 'Пользователя, с которым вы создаете чат, не существует' }] })
        }
      }

      usersId.push(senderId)

      const chat = new Chat({ users: usersId })
      await chat.save()

      res.status(200).json({ msg: 'Беседа создана' })
    } catch(e) {
      res.status(500).json({ data: [{ msg: 'Что-то пошло не так, попробуйте снова' }] })
    }
  }
)

// * получение списка сообщений 
// ? принимает: chatId, messageLimit
router.post('/getmessages', 
  auth,
  async (req,res) => {
    try {
      const { chatId, messageLimit, messageSkip } = req.body
      
      const messages = await Message.find({ chatId: chatId }).sort({ date: -1 }).skip(messageSkip).limit(messageLimit)
      res.json({ messages: messages })
    } catch(e) {
      res.status(500).json({ data: [{ msg: 'Что-то пошло не так, попробуйте снова' }] })
    }
  }
)

// * помечает все сообщения чата прочитаными
// ? принимает: chatId, messageLimit
router.post('/readallmessages', 
  auth,
  async (req,res) => {
    try {
      const { chatId, senderId, messageLimit } = req.body
      let read = false
      let messages = await Message.find({ chatId: chatId, delivered: true, readed: false, senderId: { $ne: senderId } }, { id: true })
      if (messages.length > 0) {
        read = true
        for (let i = 0; i < messages.length; i++) {
          await Message.updateOne({ _id: messages[i].id }, { readed: true })
        }
      }
      await Notifications.updateMany({ to: senderId, params: { chatId: chatId } }, { status: 'done' })
      messages = await Message.find({ chatId: chatId }).sort({ date: -1 }).limit(messageLimit)
      res.json({ messages: messages, read: read })
    } catch(e) {
      res.status(500).json({ data: [{ msg: 'Что-то пошло не так, попробуйте снова' }] })
    }
  }
)

// * отправка сообщения пользователю
// ? принимает: messageText, userId, senderId
// /api/user/sendmessage
router.post('/sendmessage', 
  auth,
  async (req,res) => {
    try {
      const { messageText, chatId, senderId } = req.body
      
      const chat = await Chat.findOne({ _id: chatId })

      if (!chat) {
        return res.status(500).json({ data: [{ msg: 'Диалог не найден' }] })
      }

      const message = new Message({ 
        chatId: chat._id, senderId: senderId, message: messageText, delivered: true, readed: false, date: new Date()
      })

      await message.save()

      await Chat.updateOne({ _id: chatId }, { lastMessage: message._id })

      res.status(200).json({ msg: 'Сообщение отправлено' })
    } catch(e) {
      res.status(500).json({ data: [{ msg: 'Что-то пошло не так, попробуйте снова' }] })
    }
  }
)

// * получение списка компаний для создания чата
// ? принимает: companyId
// /api/user/getclients
router.post('/getclients', 
  auth,
  async (req,res) => {
    try {
      const { companyId } = req.body

      if (!companyId) {
        return res.status(500).json({ data: [{ msg: 'Что-то пошло не так, попробуйте снова' }] })
      }

      let data = new Array()
      
      const company = await Company.findOne({ _id: companyId }, { companyName: true, users: true, clients: true })

      let users = new Array()

      for (let i = 0; i < company.users.length; i++) {
        const user = await User.findOne({ _id: company.users[i] }, { firstName: true, lastName: true })
        users.push({ id: user._id, name: `${user.firstName} ${user.lastName}`, selected: false })
      }

      data.push({ id: company._id, name: company.companyName, users: users })

      for (let i = 0; i < company.clients.length; i++) {
        const client = await Client.findOne({ _id: company.clients[i] }, { directors: true, clientName: true })
        users = new Array()
        for (let j = 0; j < client.directors.length; j++) {
          const director = await Director.findOne({ _id: client.directors[j] })
          const user = await User.findOne({ _id: director.userId })
          users.push({ id: user._id, name: `${user.firstName} ${user.lastName}`, selected: false })
        }
        data.push({ id: client._id, name: client.clientName, users: users })
      }

      res.json({ data })
    } catch(e) {
      res.status(500).json({ data: [{ msg: 'Что-то пошло не так, попробуйте снова' }] })
    }
  }
)

// * создание оповещения о новом сообщении
// ? принимает: userId, senderId, chatName, chatId
// /api/user/createmessagenotification
router.post('/createmessagenotification', 
  auth,
  async (req,res) => {
    try {

      const { userId, senderId, chatName, chatId } = req.body

      const type = 'message-notification'
      const creation = new Date()
      const expires = new Date(creation.getFullYear(), creation.getMonth() + 6, creation.getDate())
      
      const notification = new Notifications({ 
        type: type, to: userId, from: senderId, companyName: chatName, 
        message: '', params: { chatId: chatId }, creation: creation,
        expires: expires, status: 'active'
      })

      await notification.save()
      
      res.status(200).json({ })

    } catch(e) {
      res.status(500).json({ data: [{ msg: 'Что-то пошло не так, попробуйте снова' }] })
    }
  }
)

// * пользователь покидает чат
// ? принимает: userId, senderId, chatName, chatId
// /api/user/createmessagenotification
router.post('/leavechat',
  auth,
  async (req,res) => {
    try {
      const { chatId, userId } = req.body

      const chat = await Chat.findOne({ _id: chatId })

      if (!chat) {
        return res.status(400).json({ data: [{ msg: 'Данного чата не существует' }] })
      }

      if (chat.users.length > 1) {
        await Chat.updateOne({ _id: chat._id }, { $pull: { users: userId } })
      } else {
        await Chat.deleteOne({ _id: chat._id })
      }

      res.status(200).json({ msg: 'Успешный выход из чата' })

    } catch(e) {
      res.status(500).json({ data: [{ msg: 'Что-то пошло не так, попробуйте снова' }] })
    }
  }
)

// * получение списка событий
// ? принимает: userId, companyId
// /api/user/getevents 
router.post('/getevents', 
  auth,
  async (req,res) => {
    try {

      const { userId, companyId } = req.body

      const events = await EventModel.find({ $or: [ { creator: userId }, { company: companyId } ] })
      
      res.status(200).json({ events: events })
    } catch(e) {
      res.status(500).json({ data: [{ msg: 'Что-то пошло не так, попробуйте снова' }] })
    }
  }
)

// * получение списка уведомлений о событии
// ? принимает: userId
// /api/user/geteventsnotification 
router.post('/geteventsnotification', 
  auth,
  async (req,res) => {
    try {

      const { userId } = req.body

      const notifications = await Notifications.find({ type: 'event-remember', to: userId })
      
      res.status(200).json({ notifications: notifications })
    } catch(e) {
      res.status(500).json({ data: [{ msg: 'Что-то пошло не так, попробуйте снова' }] })
    }
  }
)

// * создание события
// ? принимает: title, description, date, shared, companyId, client, notify, senderId
// /api/user/createevent
router.post('/createevent', 
  auth,
  async (req,res) => {
    try {

      let { title, description, date, shared, companyId, client, notify, senderId } = req.body

      if (client) {
        shared = true
      } 

      date = new Date(date)

      const event = new EventModel({ title, description, date, creator: senderId, company: shared ? companyId : null, client: client ? client.id : null })
      await event.save()

      if (notify) {
        const expires = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)
        const notification = new Notifications({ 
          type: 'event-remember', to: senderId, companyName: '', message: `Сегодня состоится событие ${title}`, params: { eventId: event._id, eventTitle: title }, creation: date, expires: expires, status: 'active'
        })
        await notification.save()
      }

      if (shared) {
        const company = await Company.findOne({ _id: companyId })
        const user = await User.findOne({ _id: senderId }, { firstName: true, lastName: true })
        const today = new Date()
        const expires = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7)

        for (let i = 0; i < company.users.length; i++) {
          const notification = new Notifications({ 
            type: 'event-new', to: company.users[i], companyName: '', message: `${user.firstName} ${user.lastName} создает новое событие ${title} назначенное на ${date.toLocaleDateString()}`, params: { eventId: event._id, eventTitle: title }, creation: today, expires: expires, status: 'active'
          })
          await notification.save()
        }
      }

      const events = await EventModel.find({ $or: [ { creator: senderId }, { company: companyId } ] })
      
      res.status(200).json({ events: events })
    } catch(e) {
      res.status(500).json({ data: [{ msg: 'Что-то пошло не так, попробуйте снова' }] })
    }
  }
)

// * помечает уведомление как прочитанное
// ? принимает: id
// /api/user/readnotification
router.post('/readnotification', 
  auth,
  async (req,res) => {
    try {

      let { id } = req.body

      if (typeof id === 'string') {
        id = [id]
      }

      for (let i = 0; i < id.length; i++) {
        await Notifications.updateOne({ _id: id[i] }, { status: 'done' })
      }

      return res.status(200).json({ msg: 'Уведомление помечено как прочитанное' })
      
    } catch(e) {
      res.status(500).json({ data: [{ msg: 'Что-то пошло не так, попробуйте снова' }] })
    }
  }
)

// * помечает уведомление как прочитанное
// ? принимает: id
// /api/user/removeeventnotification
router.post('/removeeventnotification', 
  auth,
  async (req,res) => {
    try {

      const { id } = req.body

      await Notifications.deleteOne({ _id: id })

      return res.status(200).json({ msg: 'Уведомление удалено' })
      
    } catch(e) {
      res.status(500).json({ data: [{ msg: 'Что-то пошло не так, попробуйте снова' }] })
    }
  }
)

// * помечает уведомление как прочитанное
// ? принимает: id, userId
// /api/user/createeventnotification
router.post('/createeventnotification', 
  auth,
  async (req,res) => {
    try {

      const { id, userId } = req.body

      const event = await EventModel.findOne({ _id: id })

      const eventDate = new Date(event.date)

      const expires = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate() + 1)

      const notification = new Notifications({ 
        type: 'event-remember', to: userId, companyName: '', message: `Сегодня состоится событие ${event.title}`,
        params: { eventId: event._id, eventTitle: event.title }, creation: event.date, expires: expires, status: 'active'
      })

      await notification.save()

      return res.status(200).json({ msg: 'Уведомление создано' })
      
    } catch(e) {
      res.status(500).json({ data: [{ msg: 'Что-то пошло не так, попробуйте снова' }] })
    }
  }
)

// * удаляет событие
// ? принимает: usersId, senderId, eventTitle
// /api/user/eventdeletenotification
router.post('/eventdeletenotification', 
  auth,
  async (req,res) => {
    try {

      const { usersId, senderId, eventTitle } = req.body

      if (usersId.length === 0) {
        return res.status(400).json({ data: [{ msg: 'Некорректный список пользователей' }] })
      }

      const user = await User.findOne({ _id: senderId }, { _id: true, firstName: true, lastName: true })

      const today = new Date()
      const expires = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7)

      for (let i = 0; i < usersId.length; i++) {
        const notifications = new Notifications({ 
          type: 'event-delete', to: usersId[i], companyName: '', message: `Событие ${eventTitle} было удалено пользователем ${user.firstName} ${user.lastName}`,
          params: { userId: user._id, userName: { firstName: user.firstName, lastName: user.lastName } }, creation: today, expires: expires, status: 'active'
        })
        await notifications.save()
      }

      return res.status(200).json({ msg: 'Уведомления созданы' })
      
    } catch(e) {
      res.status(500).json({ data: [{ msg: 'Что-то пошло не так, попробуйте снова' }] })
    }
  }
)

// * удаляет событие
// ? принимает: id
// /api/user/createeventnotification
router.post('/deleteevent', 
  auth,
  async (req,res) => {
    try {

      const { id } = req.body

      const notifications = await Notifications.find({ 'params.eventId': { $exists: true, $eq: Types.ObjectId(id) } })

      if (notifications.length > 0) {
        for (let i = 0; i < notifications.length; i++) {
          await Notifications.deleteOne({ _id: notifications[i]._id })          
        }
      }
      
      await EventModel.deleteOne({ _id: id })

      return res.status(200).json({ msg: 'Событие удалено' })
      
    } catch(e) {
      res.status(500).json({ data: [{ msg: 'Что-то пошло не так, попробуйте снова' }] })
    }
  }
)


// * создание события
// ? принимает: title, description, date, shared, companyId, client, notify, senderId
// /api/user/saveevent
router.post('/saveevent', 
  auth,
  async (req,res) => {
    try {
      const { 
        title, description, date, companyId, clientId, notification, senderId 
      } = req.body

      const eventDate = new Date(date)

      const event = new EventModel({ 
        title: title, description: description, date: eventDate, 
        company: companyId ? companyId : null,
        client: clientId ? clientId : null,
        creator: senderId 
      })
      await event.save()

      if (notification) {
        const expires = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate() + 1)
        const notification = new Notifications({ 
          type: 'event-remember', to: senderId, companyName: '', message: `Сегодня состоится событие ${title}`, params: { eventId: event._id, eventTitle: title }, creation: eventDate, expires: expires, status: 'active'
        })
        await notification.save()
      }

      if (companyId) {
        const company = await Company.findOne({ _id: companyId })
        const user = await User.findOne({ _id: senderId }, { firstName: true, lastName: true })
        const today = new Date()
        const expires = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7)

        for (let i = 0; i < company.users.length; i++) {
          const notification = new Notifications({ 
            type: 'event-new', to: company.users[i], companyName: '', message: `${user.firstName} ${user.lastName} создает новое событие ${title} назначенное на ${eventDate.toLocaleDateString()}`, params: { eventId: event._id, eventTitle: title }, creation: today, expires: expires, status: 'active'
          })
          await notification.save()
        }
      }

      if (clientId) {
        const client = await Client.findOne({ _id: clientId })
        const user = await User.findOne({ _id: senderId }, { firstName: true, lastName: true })
        const today = new Date()
        const expires = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7)

        for (let i = 0; i < client.directors.length; i++) {
          const clientUser = await User.findOne({ _id: client.directors[i].userId })
          const notification = new Notifications({ 
            type: 'event-new', to: clientUser, companyName: '', message: `${user.firstName} ${user.lastName} создает новое событие ${title} назначенное на ${eventDate.toLocaleDateString()}`, params: { eventId: event._id, eventTitle: title }, creation: today, expires: expires, status: 'active'
          })
          await notification.save()
        }
      }

      const events = await EventModel.find({ $or: [ { creator: senderId }, { company: companyId } ] })
      
      res.status(200).json({ events: events })
    } catch(e) {
      res.status(500).json({ data: [{ msg: 'Что-то пошло не так, попробуйте снова' }] })
    }
  }
)

// * получение списка уведомлений
// ? принимает: title, description, date, shared, companyId, client, notify, senderId
// /api/user/getnotifications
router.post('/getnotifications', 
  auth,
  async (req,res) => {
    try {
      
      const { userId } = req.body

      const user = await User.findOne({ _id: userId }, { _id: true })

      if (!user) {
        return res.status(400).json({ data: [{ msg: 'Пользователь не найден' }] })
      }

      const notifications = await Notifications.find({ to: user._id })

      return res.status(200).json(notifications)

    } catch(e) {
      res.status(500).json({ data: [{ msg: 'Что-то пошло не так, попробуйте снова' }] })
    }
  }
)

// * удаление уведомлений о новых сообщениях
// ? принимает: userId, chatId
// /api/user/deletemessagenotification
router.post('/deletemessagenotification', 
  auth,
  async (req,res) => {
    try {
      
      const { userId, chatId } = req.body

      const user = await User.findOne({ _id: userId }, { _id: true })

      if (!user) {
        return res.status(400).json({ data: [{ msg: 'Пользователь не найден' }] })
      }

      await Notifications.deleteMany({ 
        type: 'message-notification',
        to: user._id, 
        'params.chatId': { 
          $exists: true, 
          $eq: chatId
        }
      })

      return res.status(200).json({ msg: 'Уведомление успешно удалено' })

    } catch(e) {
      res.status(500).json({ data: [{ msg: 'Что-то пошло не так, попробуйте снова' }] })
    }
  }
)

// * удаление уведомлений о новых сообщениях
// ? принимает: userId, chatId
// /api/user/deletenotifications
router.post('/deletenotifications', 
  auth,
  async (req,res) => {
    try {

      let { id } = req.body

      if (typeof id === 'string') {
        id = [id]
      }

      for (let i = 0; i < id.length; i++) {
        await Notifications.deleteOne({ _id: id[i] })
      }

      return res.status(200).json({ msg: 'Уведомление удалено' })
      
    } catch(e) {
      res.status(500).json({ data: [{ msg: 'Что-то пошло не так, попробуйте снова' }] })
    }
  }
)




module.exports = router