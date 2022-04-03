
const { Router } = require('express')
const router = Router()
const Client = require('../models/Client')
const User = require('../models/User')
const Shareholder = require('../models/Shareholder')
const Director = require('../models/Director')
const Document = require('../models/Document')
const Company = require('../models/Company')
const Invite = require('../models/Invites')
const EventModel = require('../models/Event')
const Notifications = require('../models/Notifications')
const { check, validationResult } = require('express-validator')
const shortid = require('shortid')
const bcrypt = require('bcryptjs')
const auth = require('../middleware/auth.middleware')
const upload = require('../middleware/documents.middleware')
const fs = require('fs')
const path = require('path')

const pdfGenerator = require('html-pdf')
const clientTemplate = require('../pdftemplates/ClientTemplate')

router.post('/clientpreview', async (req, res) => {
  try {
    const { clientName } = req.body
    
    if (clientName) {
      const regexp = new RegExp(`${clientName}`, 'i')
      const client = await Client.find({ clientName: regexp }, { clientName: true, UENStatus: true }).limit(6)
      return res.json({ client })
    } else {
      const client = await Client.find({ }, { clientName: true, UENStatus: true }).limit(6)
      return res.json({ client })
    }

  } catch (e) {
    return res.status(500).json({ data: [{ msg: 'Что-то пошло не так, попробуйте снова' }] })
  }
})

router.post(
  '/createclient', 
  [
    check('userEmail', 'Некорректное значение поля Email').exists().isEmail(),
    check('userPassword', 'Длина пароля должна быть не менее 6 символов').exists().isLength({ min: 6 }),
    check('userFirstName', 'Имя пользователя не определено').exists(),
    check('userLastName', 'Фамилия пользователя не определена').exists(),
    check('companyName', 'Название компании не определено').exists(),
    check('companyUEN', 'ИНН компании не определен').exists()
  ],
  async(req, res) => {
    try {

      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ data: errors.array() })
      }

      const { 
        userEmail, userPassword, userFirstName, userLastName,
        userBirthDate, userPhoneNumber, companyName, companyEmail,
        companyAddress, companyUEN, shareholders, inviteId
      } = req.body

      // поиск пользователя с такой электронной почтой и паролем
      let user = await User.findOne({ email: userEmail })

      // если такой пользователь существует - сравниваем пароли, если не сходятся - ошибка
      if (user) {
        const passwordMatched = await bcrypt.compare(userPassword, user.password)
        if (!passwordMatched) {
          return res.status(400).json({ data: [{ msg: 'Такой пользователь уже зарегистрирован' }] })
        }
      }

      // если такого пользователя не существует - создаем
      if (!user) {
        const hashedPassword = await bcrypt.hash(userPassword, 15)
        user = new User({ 
          email: userEmail, password: hashedPassword, firstName: userFirstName,
          lastName: userLastName, birthDate: userBirthDate, phoneNumber: userPhoneNumber
        })
        await user.save()
      }

      // поиск приглашения
      const invite = await Invite.findOne({ _id: inviteId })

      // если приглашения не найдено - ошибка
      if (!invite) {
        return res.status(400).json({ data: [{ msg: 'Приглашение не найдено' }] })
      }

      // если приглашение было уже использовано - ошибка
      if (invite.status === 'done') {
        return res.status(400).json({ data: [{ msg: 'Приглашение не найдено' }] })
      }
      
      // если время работы приглашения вышло - ошибка
      if (new Date(invite.expiresIn).getTime() < new Date().getTime()) {
        await Invite.updateOne({ _id: invite._id }, { status: 'done' })
        return res.status(400).json({ data: [{ msg: 'Приглашение не найдено' }] })
      }

      let client = await Client.findOne({ UEN: companyUEN })

      // если компания с таким ИНН уже зарегистрирована - ошибка
      if (client) {
        return res.status(400).json({ data: [{ msg: 'Компания с таким ИНН уже зарегистрирована' }] })
      }

      // создание компании
      client = new Client({
        clientName: companyName, email: companyEmail, registeredAddress: companyAddress,
        UEN: companyUEN, UENStatus: 'Действующее', 
        UENDate: new Date().setFullYear(2022-Math.floor(Math.random() * 15)),
        clientStatus: 'Active', dateOfReg: new Date(),
        capital: '0', shareCapital: '0', numOfShares: '0',
        lastAGM: null, lastARFilled: null, mainContact: null,
        directors: null, shareholders: null, events: null, 
        documents: null, company: invite.from
      })
      await client.save()

      // создание директора
      const director = new Director({ post: '', userId: user._id, client: client._id })
      await director.save()

      // занесение директора в компанию
      await Client.updateOne(
        { _id: client._id }, 
        { 
          mainContact: director._id, 
          directors: new Array(director._id) 
        }
      )

      // создание акционеров
      for (let i = 0; i < shareholders.length; i++) {
        const shareholder = new Shareholder({ 
          name: shareholders[i].name, person: shareholders[i].person, 
          numOfShares: shareholders[i].numOfShares, shareholderDate: shareholders[i].shareholderDate,
          client: client._id
        })
        await shareholder.save()
      }
      
      // поиск акционеров
      const clientShareholders = await Shareholder.find({ client: client._id }, { _id: true })
      // занесение акционеров в компанию
      await Client.updateOne({ _id: client._id }, { shareholders: clientShareholders })


      const company = await Company.findOne({ _id: invite.from })

      // занесение в клиенты пригласившей компании
      if (company.clients) {
        await Company.updateOne({ _id: company._id }, { $push: { clients: client._id } })
      } else {
        await Company.updateOne({ _id: company._id }, { clients: new Array(client._id) })
      }

      await Invite.updateOne({ _id: invite._id }, { status: 'done' })

      return res.status(200).json({ companyId: company._id })

    } catch(e) {
      console.log('e', e)
      return res.status(500).json({ data: [{ msg: 'Что-то пошло не так, попробуйте снова' }] })
    }
})

router.post('/createclientpdf', auth, async (req, res) => {
  try {
    const { companyId, clientId } = req.body

    const client = await Client.findOne({ _id: clientId })

    let directors = new Array()

    for(let i = 0; i < client.directors.length; i++) {
      const director = await Director.findOne({ _id: client.directors[i] })
      const user = await User.findOne({ _id: director.userId })
      directors.push({ 
        email: user.email, firstName: user.firstName, lastName: user.lastName,  
        phoneNumber: user.phoneNumber, post: director.post
      })
    }

    let shareholders = new Array()

    for(let i = 0; i < client.shareholders.length; i++) {
      const shareholder = await Shareholder.findOne({ _id: client.shareholders[i] })
      shareholders.push(shareholder)
    }
    
    const director = await Director.findOne({ _id: client.mainContact })
    const mainContact = await User.findOne({ _id: director.userId }, { email: true, phoneNumber: true, lastName: true, firstName: true })

    pdfGenerator.create(clientTemplate(client, directors, shareholders, mainContact), {}).toFile(`./files/companies/${companyId}/client.pdf`, (error) => {
      if (error) {
        return res.status(500).json({ data: [{ msg: 'Что-то пошло не так, попробуйте снова' }] })
      }
      return res.json({ created: true })
    })
  } catch(e) {
    return res.status(500).json({ data: [{ msg: 'Что-то пошло не так, попробуйте снова' }] })
  }
})

router.get('/getclientpdf/:id', auth, async (req, res) => {
  try {
    const companyId = req.params.id
    let directory = __dirname.replace(/\\/g, '/') + `/files/companies/${companyId}/client.pdf`
    directory = directory.replace('/routes', '')
    res.type('pdf')
    res.download(directory)
  }
  catch (e) {
    return res.status(500).json({ data: [{ msg: 'Что-то пошло не так, попробуйте снова' }] })
  }
})

router.post('/getclientinfo', auth, async (req, res) => {
  try {
    const { clientId } = req.body

    const client = await Client.findOne({ _id: clientId })

    if (!client) {
      return res.status(404).json({ data: [{ msg: 'Этот клиент не найден' }] })
    }

    let directors = new Array()
    for (let i = 0; i < client.directors.length; i++) {
      const director = await Director.findOne({ _id: client.directors[i] })
      const user = await User.findOne({ _id: director.userId })
      const newDirector = { _id: user._id, email: user.email, firstName: user.firstName, lastName: user.lastName, birthDate: user.birthDate, phoneNumber: user.phoneNumber, post: director.post }
      directors.push(newDirector)
    }

    const shareholders = await Shareholder.find({ client: client._id })
    const director = await Director.findOne({ _id: client.mainContact })
    const mainContact = await User.findOne({ _id: director.userId })

    return res.json({ client: client, directors: directors, shareholders: shareholders, mainContact: mainContact })
  }
  catch (e) {
    return res.status(500).json({ data: [{ msg: 'Что-то пошло не так, попробуйте снова' }] })
  }
})

router.post('/changedirectorpost', auth, async (req, res) => {
  try {
    const { newPost, directorId } = req.body

    await Director.updateOne({ userId: directorId }, { post: newPost })

    return res.json({ msg: 'Должность успешно изменена' })
  }
  catch (e) {
    return res.status(500).json({ data: [{ msg: 'Что-то пошло не так, попробуйте снова' }] })
  }
})

router.post('/inviteuser', auth, async (req, res) => {
  try {
    const { email, clientId, clientName, post, message } = req.body

    let expiresIn = new Date()
    expiresIn.setDate(expiresIn.getDate() + 7)
    const params = { post: post }
    const invitedUser = await User.findOne({ email })
    if (!invitedUser) {
      return res.status(400).json({ data: [{ msg: 'Такой пользователь не зарегистрирован в системе' }] })
    } 
    const notification = new Notifications({
      type: 'invite-director', to: invitedUser._id, from: clientId, companyName: clientName, message: message ? message : '',
      params: params, creation: new Date(), expires: expiresIn, status: 'active'
    })
    await notification.save()
    res.json({ msg: 'Приглашение отправлено' })
  } catch(e) {
    console.log('e', e);
    return res.status(500).json({ data: [{ msg: 'Что-то пошло не так, попробуйте снова' }] })
  }
})

router.post('/deletedirectors', auth, async (req, res) => {
  try {
    const { userId, clientId } = req.body

    const director = await Director.findOne({ userId: userId })

    if (!director || director.client.toString() !== clientId) {
      return res.status(400).json({ data: [{ msg: 'Данный пользователь не является директором этой организации' }] })
    }
    
    const client = await Client.findOne({ _id: clientId })

    if (!client) {
      return res.status(400).json({ data: [{ msg: 'Не удалось получить сведения об организации' }] })
    }

    if (director._id.equals(client.mainContact)) {
      return res.status(400).json({ data: [{ msg: 'Вы не можете снять с должности контактное лицо' }] })
    }

    await Client.updateOne({ _id: client._id }, { $pull: { directors: director._id } })
    await Director.deleteOne({ _id: director._id })

    return res.json({ msg: 'Пользователь успешно снят с должности' })
  }
  catch (e) {
    return res.status(500).json({ data: [{ msg: 'Что-то пошло не так, попробуйте снова' }] })
  }
})

router.post('/deleteshareholders', auth, async (req, res) => {
  try {
    const { id, clientId } = req.body

    const shareholder = await Shareholder.findOne({ _id: id })

    if (!shareholder || shareholder.client.toString() !== clientId) {
      return res.status(400).json({ data: [{ msg: 'Данный акционер не относится к данной организации' }] })
    }
    
    const client = await Client.findOne({ _id: clientId })

    if (!client) {
      return res.status(400).json({ data: [{ msg: 'Не удалось получить сведения об организации' }] })
    }

    await Client.updateOne({ _id: client._id }, { $pull: { shareholders: shareholder._id } })
    await Shareholder.deleteOne({ _id: shareholder._id })

    return res.json({ msg: 'Акционер успешно удален' })
  }
  catch (e) {
    return res.status(500).json({ data: [{ msg: 'Что-то пошло не так, попробуйте снова' }] })
  }
})

router.post('/setmaincontact', auth, async (req, res) => {
  try {
    const { userId, clientId } = req.body

    const user = await User.findOne({ _id: userId })
    const director = await Director.findOne({ userId: user._id })
    await Client.updateOne({ _id: clientId }, { mainContact: director._id })

    return res.json({ msg: 'Пользователь назначен на роль контактного лица' })
  }
  catch (e) {
    return res.status(500).json({ data: [{ msg: 'Что-то пошло не так, попробуйте снова' }] })
  }
})

router.post('/addshare', auth, async (req, res) => {
  try {
    const { share, clientId } = req.body

    const shareholder = new Shareholder({ name: share.name, person: share.person ? share.person : false, numOfShares: share.numOfShares, shareholderDate: share.shareDate, client: clientId })

    await shareholder.save()

    return res.json({ msg: 'Акционер успешно добавлен' })
  }
  catch (e) {
    console.log('e', e);
    return res.status(500).json({ data: [{ msg: 'Что-то пошло не так, попробуйте снова' }] })
  }
})

router.post('/updateshare', auth, async (req, res) => {
  try {
    const { share } = req.body

    await Shareholder.updateOne({ _id: share.id }, { name: share.name, person: share.person, numOfShares: share.numOfShares, shareholderDate: share.shareDate  })

    return res.json({ msg: 'Информация акционера успешно изменена' })
  }
  catch (e) {
    return res.status(500).json({ data: [{ msg: 'Что-то пошло не так, попробуйте снова' }] })
  }
})

router.post('/uploaddocument', [auth, upload.single('file')], async (req, res) => {
  try {
    const { title, description, section, tags, owner, companyId, clientId } = req.body
    const file = req.file
    const tagsArr = tags.split(',')
    const filePath = __dirname.replace('\\routes', '') + `\\files\\companies\\${companyId}\\${clientId}`
  
    fs.mkdir(filePath, error => {
      if (error && error.code !== 'EEXIST') {
        return res.status(500).json({ data: [{ msg: 'Невозможно создать директорию для клиента' }] })
      }
    })
  
    const fileid = shortid.generate()
  
    fs.access(filePath + `\\${fileid}${path.extname(file.originalname)}`, error => { 
      if (error) { 
        fs.writeFile(filePath + `\\${fileid}${path.extname(file.originalname)}`, file.buffer, "binary", async error => {
          if (error) {
            return res.status(500).json({ data: [{ msg: 'Что-то пошло не так, попробуйте снова' }] })
          } else {

            const document = new Document({ 
              title, description, dateOfCreation: new Date(), 
              pathToFile: filePath + `\\${fileid}${path.extname(file.originalname)}`,
              company: companyId, client: clientId, owner: owner, section, tags: tagsArr
            })
            
            await document.save()

            return res.json({ msg: 'Файл успешно создан' })
          }
        })
      } else {
        return res.status(500).json({ data: [{ msg: 'Что-то пошло не так, попробуйте снова' }] })
      }
    })
  }
  catch (e) {
    return res.status(500).json({ data: [{ msg: 'Что-то пошло не так, попробуйте снова' }] })
  }
})

router.post('/getdocuments', auth, async (req, res) => {
  try {
    const { clientId, companyId } = req.body

    const documents = await Document.find({ client: clientId, company: companyId }, { _id: true, title: true, description: true, dateOfCreation: true, owner: true, section: true, tags: true })

    let documentArray = new Array()

    for (let i = 0; i < documents.length; i++) {
      const user = await User.findOne({ _id: documents[i].owner }, { password: false })
      documentArray.push({ 
        _id: documents[i]._id,
        id: documents[i]._id,
        title: documents[i].title,
        description: documents[i].description,
        dateOfCreation: documents[i].dateOfCreation,
        owner: { ...user.toObject() },
        section: documents[i].section,
        tags: documents[i].tags
      })
    }

    return res.json({ data: documentArray })
  } catch (e) {
    return res.status(500).json({ data: [{ msg: 'Что-то пошло не так, попробуйте снова' }] })
  }
})

router.post('/downloaddocument', auth, async (req, res) => {
  try {
    const { docId } = req.body

    console.log('docId', docId)

    const document = await Document.findOne({ _id: docId })

    if (!document) {
      return res.status(400).json({ data: [{ msg: 'Файл не найден' }] })
    }

    console.log('document', document)

    const filePath = document.pathToFile

    res.download(filePath)
  } catch(e) {
    return res.status(500).json({ data: [{ msg: 'Что-то пошло не так, попробуйте снова' }] })
  }
})

router.post('/updatedocument', auth, async (req,res) => {
  try {
    const { id, title, description, section, tags } = req.body
    await Document.updateOne({ _id: id }, { title: title, description: description, section: section, tags: tags })
    return res.status(200).json({ msg: 'Документ успешно изменен' })
  } catch(e) {
    return res.status(500).json({ data: [{ msg: 'Что-то пошло не так, попробуйте снова' }] })
  }
})

router.post('/documentdelete', auth, async (req,res) => {
  try {
    const { id } = req.body
    await Document.deleteOne({ _id: id })
    return res.status(200).json({ msg: 'Документ успешно удален' })
  } catch(e) {
    return res.status(500).json({ data: [{ msg: 'Что-то пошло не так, попробуйте снова' }] })
  }
})

// * получает сведения о контактном лице
// ? принимает: id
router.post('/getmaincontact', 
  auth, 
  async (req, res) => {
    try {
      const { id } = req.body

      const director = await Director.findOne({ _id: id })
      const user = await User.findOne({ _id: director.userId }, { _id: true })

      return res.status(200).json({ mainContact: { id: user._id } })
    } catch(e) {
      return res.status(500).json({ data: [{ msg: 'Что-то пошло не так, попробуйте снова' }] })
    }
  }
)

// * изменяет сведения о клиенте
// ? принимает: clientId, field
router.post('/changeinfo', 
  auth, 
  async (req, res) => {
    try {
      const { clientId, field } = req.body

      const client = await Client.findOne({ _id: clientId })

      if (!client) {
        return res.status(400).json({ data: [{ msg: 'Не удалось получить данные о компании' }] })
      }

      if (field.name === 'clientStatus') {
        await Client.updateOne({ _id: client._id }, { clientStatus: field.value, statusDate: new Date() })
      } else {
        await Client.updateOne({ _id: client._id }, { [field.name]: field.value })
      }


      return res.status(200).json({ msg: 'Данные успешно изменены' })
    } catch(e) {
      return res.status(500).json({ data: [{ msg: 'Что-то пошло не так, попробуйте снова' }] })
    }
  }
)

// * получает приглашения отправленные клиентом
// ? принимает: clientId
router.post('/getinvites', 
  auth, 
  async (req, res) => {
    try {
      const { clientId } = req.body

      const client = await Client.findOne({ _id: clientId })

      if (!client) {
        return res.status(400).json({ data: [{ msg: 'Не удалось получить данные о компании' }] })
      }

      const notification = await Notifications.find({ type: 'invite-director', from: clientId, status: 'active' })

      let invites = new Array()

      for (let i = 0; i < notification.length; i++) {
        const user = await User.findOne({ _id: notification[i].to }, { password: false })
        invites.push({ ...notification[i].toObject(), to: { ...user.toObject() } })
      }

      return res.status(200).json({ invites: invites })
    } catch(e) {
      return res.status(500).json({ data: [{ msg: 'Что-то пошло не так, попробуйте снова' }] })
    }
  }
)

// * удаляет приглашение отправленное клиентом
// ? принимает: id
router.post('/deleteinvites', 
  auth, 
  async (req, res) => {
    try {
      const { id } = req.body

      await Notifications.deleteOne({ _id: id })

      return res.status(200).json({ msg: 'Приглашение удалено' })
    } catch(e) {
      return res.status(500).json({ data: [{ msg: 'Что-то пошло не так, попробуйте снова' }] })
    }
  }
)

// * получает информацию для клиента
// ? принимает: id
router.post('/getinfo',
  auth, 
  async (req, res) => {
    try {
      
      const { userId } = req.body

      const director = await Director.findOne({ userId: userId })

      if (!director) {
        return res.status(400).json({ data: [{ msg: 'Данный пользователь не обнаружен' }] })
      }

      const client = await Client.findOne({ directors: director._id })

      if (!client) {
        return res.status(400).json({ data: [{ msg: 'Компания не обнаружена' }] })
      }

      // получение всех сведений о директорах клиента
      const directors = []
      for (const i in client.directors) {
        const director = await Director.findOne({ _id: client.directors[i] })
        if (director) {
          const user = await User.findOne({ _id: director.userId }, { password: false })
          if (user) {
            directors.push({ post: director.post, directorId: director._id, ...user.toObject() })
          }
        }
      }

      // получение всех сведений о акционерах
      const shareholders = await Shareholder.find({ client: client._id }, { client: false })

      // получение всех сведений о документах
      const documentsItems = await Document.find({ client: client._id }, { client: false, company: false, pathToFile: false })

      const documents = []
      if (documentsItems.length > 0) {
        for (const i in documentsItems) {
          const user = await User.findOne({ _id: documentsItems[i].owner }, { password: false })
          if (user) {
            documents.push({ ...documentsItems[i].toObject(), owner: { ...user.toObject() } })
          }
        }
      }

      // получение всех сведений о событиях
      const eventsItems = await EventModel.find({ $or: [ { client: client._id }, { creator: userId } ] })
      
      const events = []
      if (eventsItems.length > 0) {
        for (const i in eventsItems) {
          const notification = await Notifications.findOne({ type: 'event-remember', to: userId, 'params.eventId': eventsItems[i]._id })
          const user = await User.findOne({ _id: eventsItems[i].creator }, { password: false })
          events.push({ 
            ...eventsItems[i].toObject(), 
            notification: notification 
              ? { ...notification.toObject() } 
              : null,
            creator: user
              ? { ...user.toObject() }
              : null
          })
        }
      }

      // получение всех сведений о приглашениях
      const ivnitesItems = await Notifications.find({ type: 'invite-director', from: client._id, status: 'active' })

      const invites = []
      if (ivnitesItems.length > 0) {
        for (const i in ivnitesItems) {
          const user = await User.findOne({ _id: ivnitesItems[i].to }, { password: false })
          if (user) {
            invites.push({ ...ivnitesItems[i].toObject(), to: { ...user.toObject() } })
          }
        }
      }

      // получение сведений о компании
      const company = await Company.findOne({ _id: client.company }, { clients: false })

      if (!company) {
        return res.status(200).json({ 
          ...client.toObject(), 
          directors: directors, 
          shareholders: shareholders,
          documents: documents,
          events: events,
          invites: invites
        })
      }

      // получение сведений о пользователях компании
      const users = []
      for (const i in company.users) {
        const user = await User.findOne({ _id: company.users[i] }, { password: false })
        if (user) {
          users.push({ ...user.toObject() })
        }
      }

      return res.status(200).json({ 
        ...client.toObject(), 
        directors: directors, 
        shareholders: shareholders,
        documents: documents,
        events: events,
        invites: invites,
        company: { ...company.toObject(), users: users }
      })

    } catch(e) {
      return res.status(500).json({ data: [{ msg: 'Что-то пошло не так, попробуйте снова' }] })
    }
  }
)

// * сохраняет изменившуюся информацию о клиенте
// ? принимает: options
router.post('/saveinfo',
  auth, 
  async (req, res) => {
    try {
      
      const { clientId, options } = req.body

      const client = await Client.findOne({ _id: clientId })

      if (!client) {
        return res.status(400).json({ data: [{ msg: 'Не удалось найти эту компанию' }] })
      }

      await Client.updateOne({ _id: client._id }, { ...options })

      res.status(200).json({ msg: 'Данные успешно сохранены' })
    } catch(e) {
      return res.status(500).json({ data: [{ msg: 'Что-то пошло не так, попробуйте снова' }] })
    }
  }
)

// * сохраняет нового акционера
// ? принимает: options
router.post('/newshareholder',
  auth,
  async (req, res) => {
    try {
      
      const { clientId, options } = req.body

      const client = await Client.findOne({ _id: clientId })

      if (!client) {
        return res.status(400).json({ data: [{ msg: 'Не удалось найти эту компанию' }] })
      }

      const shareholder = new Shareholder({ ...options, client: client._id })

      console.log('shareholder', shareholder)

      await shareholder.save()

      res.status(200).json({ msg: 'Данные успешно сохранены' })
    } catch(e) {
      console.log('e', e)
      return res.status(500).json({ data: [{ msg: 'Что-то пошло не так, попробуйте снова' }] })
    }
  }
)

// * сохраняет изменившуюся информацию об акционере
// ? принимает: options
router.post('/saveshareholder',
  auth,
  async (req, res) => {
    try {
      
      const { clientId, options } = req.body

      const client = await Client.findOne({ _id: clientId })

      if (!client) {
        return res.status(400).json({ data: [{ msg: 'Не удалось найти эту компанию' }] })
      }

      const shareholder = await Shareholder.findOne({ _id: options.id, client: client._id })

      if (!shareholder) {
        return res.status(400).json({ data: [{ msg: 'Не удалось найти акционера' }] })
      }

      await Shareholder.updateOne({ _id: shareholder._id }, { ...options })

      res.status(200).json({ msg: 'Данные успешно сохранены' })
    } catch(e) {
      return res.status(500).json({ data: [{ msg: 'Что-то пошло не так, попробуйте снова' }] })
    }
  }
)

// * получение списка событий
// ? принимает: clientId, userId
router.post('/getevents',
  auth,
  async (req, res) => {
    try {
      const { clientId, userId } = req.body

      const client = await Client.findOne({ _id: clientId })

      if (!client) {
        return res.status(400).json({ data: [{ msg: 'Не удалось получить данные о компании' }] })
      }

      // получение всех сведений о событиях
      const eventsItems = await EventModel.find({ $or: [ { client: client._id }, { creator: userId } ] })
      
      const events = []
      if (eventsItems.length > 0) {
        for (const i in eventsItems) {
          const notification = await Notifications.findOne({ type: 'event-remember', to: userId, 'params.eventId': eventsItems[i]._id })
          const user = await User.findOne({ _id: eventsItems[i].creator }, { password: false })
          events.push({ 
            ...eventsItems[i].toObject(), 
            notification: notification 
              ? { ...notification.toObject() } 
              : null,
            creator: user
              ? { ...user.toObject() }
              : null
          })
        }
      }

      return res.status(200).json({ events: events })
    } catch(e) {
      return res.status(500).json({ data: [{ msg: 'Что-то пошло не так, попробуйте снова' }] })
    }
  }
)

module.exports = router