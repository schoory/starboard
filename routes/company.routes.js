const { Router } = require('express')
const Company = require('../models/Company')
const auth = require('../middleware/auth.middleware')
const config = require('config')
const shortid = require('shortid')
const Notifications = require('../models/Notifications')
const User = require('../models/User')
const Invites = require('../models/Invites')
const Client = require('../models/Client')
const Director = require('../models/Director')
const router = Router()



// * создание компании
// ? принимает: companyName, companyEmail, companyAddress, companyPhone, companyWeb
// /api/company/create
router.post(
  '/create', 
  auth, 
  async (req, res) => {
  try {

    const { companyName, companyEmail, companyAddress, companyPhone, companyWeb } = req.body

    if (!Boolean(companyName)) {
      res.status(400).json({ data: [{ msg: 'Наименование компании является обязательным полем' }] })
    }

    const currentDate = new Date()
    currentDate.setHours(0, 0, 0, 0)
    
    const company = new Company({ 
      companyName, companyEmail, companyAddress, companyPhone, companyWeb,
      creationDate: currentDate,
      admins: new Array(req.user.userId), 
      users: new Array(req.user.userId),
      owner: req.user.userId,
      clients: null
    })
    
    await company.save()

    res.status(201).json({ company })
  } catch (e) {
    return res.status(500).json({ data: [{ msg: 'Что-то пошло не так, попробуйте снова' }] })
  }
})


// * получение информации о компании
// ? принимает: userId
// /api/company/companyinfo
router.post('/companyinfo', auth, async (req, res) => {
  try {
    const { userId } = req.body

    const company = await Company.findOne({ users: userId })

    if (!company) {
      return res.json(null)
    }

    res.json({ 
      companyId: company._id,
      companyName: company.companyName, 
      companyEmail: company.companyEmail, 
      companyAddress: company.companyAddress,  
      companyPhone: company.companyPhone,
      companyWeb: company.companyWeb,
      creationDate: company.creationDate,
      admins: company.admins,
      users: company.users,
      clients: company.clients,
      owner: company.owner
    })
  } catch (e) {
    return res.status(500).json({ data: [{ msg: 'Что-то пошло не так, попробуйте снова' }] })
  }
})


// * приглашение пользователя в компанию (создание уведомления о приглашении)
// ? принимает: email, message, companyId, companyName
// /api/company/inviteuser
router.post('/inviteuser', auth, async(req, res) => {
  try {
    const { email, companyId, message, companyName } = req.body
    const baseUrl = config.get('baseUrl')

    let expiresIn = new Date()
    expiresIn.setDate(expiresIn.getDate() + 7)
    const params = null

    const invitedUser = await User.findOne({ email })

    if (invitedUser) {
      const notification = new Notifications({
        type: 'invite', to: invitedUser._id, from: companyId, companyName: companyName, message: message,
        params: params, creation: new Date(), expires: expiresIn, status: 'active'
      })
      await notification.save()
    }
    res.json({ message: 'Все ок' })
  } catch(e) {
    return res.status(500).json({ data: [{ msg: 'Что-то пошло не так, попробуйте снова' }] })
  }
})


// * получение информации о пользователях компании
// ? принимает: companyId
// /api/company/companyusers
router.post('/companyusers', auth, async (req, res) => {
  try {
    
    const { companyId } = req.body

    if (!companyId) {
      return res.status(400)
    }

    const company = await Company.findById({ _id: companyId })
    if (!company) {
      return res.status(400).json({ data: [{ msg: 'Неудалось получить информацию о компании' }] })
    }

    res.json({ users: company.users })
    
  } catch (e) {
    console.log(e)
    return res.status(500).json({ data: [{ msg: 'Что-то пошло не так, попробуйте снова' }] })
  }
})


// * приглашение клиента присоединиться к компании
// ? принимает: companyId
// /api/company/inviteuser
router.post('/inviteclient', auth, async (req, res) => {
  try {
    const { user, companyId } = req.body
    const baseUrl = config.get('baseUrl')
    const code = shortid.generate()

    let expiresIn = new Date()
    expiresIn.setDate(expiresIn.getDate() + 7)
    const link = baseUrl + '/i/' + code

    const invite = new Invites({ 
      link: link, from: companyId, creationDate: new Date(), 
      expiresIn: expiresIn, status: 'active', to: user
    })
    await invite.save()

    res.json({ data: [{ msg: 'Сообщение отправлено' }] })
  } catch(e) {
    return res.status(500).json({ data: [{ msg: 'Что-то пошло не так, попробуйте снова' }] })
  }
})

// * получение списка приглашений
// ? принимает: companyId
// /api/company/getinvites
router.post('/getinvites', auth, async (req, res) => {
  try {
    const { companyId } = req.body

    const invites = await Invites.find({ from: companyId, status: 'active' })

    res.json({ invites })
  } catch(e) {
    return res.status(500).json({ data: [{ msg: 'Что-то пошло не так, попробуйте снова' }] })
  }
})

// * получение списка приглашений
// ? принимает: id
// /api/company/deleteinvite
router.post('/deleteinvite', auth, async (req, res) => {
  try {
    const { id } = req.body

    await Invites.deleteOne({ _id: id })

    res.status(200).json({ msg: 'Приглашение удалено' })
  } catch(e) {
    return res.status(500).json({ data: [{ msg: 'Что-то пошло не так, попробуйте снова' }] })
  }
})

// * получение списка клиентов
// ? принимает: companyId
// /api/company/getclients
router.post('/getclients', auth, async (req, res) => {
  try {
    const { companyId } = req.body
    
    const company = await Company.findOne({ _id: companyId }, { clients: true })

    res.json({ clients: company.clients })
  } catch(e) {
    console.log(e)
    return res.status(500).json({ data: [{ msg: 'Что-то пошло не так, попробуйте снова' }] })
  }
})

// * получение информации о клиентах
// ? принимает: clientsId - array
// /api/company/getclientsinfo
router.post('/getclientsinfo', auth, async (req, res) => {
  try {
    const { clientsId } = req.body

    let clients = new Array()

    for(let i = 0; i < clientsId.length; i++) {
      const client = await Client.findOne({ _id: clientsId[i] })
      clients.push(client)
    }
        
    return res.json({ clients })
  } catch(e) {
    return res.status(500).json({ data: [{ msg: 'Что-то пошло не так, попробуйте снова' }] })
  }
})

// * получение информации о клиентах
// ? принимает: clientsId - array
// /api/company/getclientsinfo
router.post('/getclientdetails', auth, async (req, res) => {
  try {
    const { clientUEN } = req.body

    const client = await Client.findOne({ UEN: clientUEN })

    const mainContact = await Director.findOne({ _id: client.mainContact })

    const user = await User.findOne({ _id: mainContact.userId })
        
    return res.json({ client: client, mainContact: user })
  } catch(e) {
    console.log(e)
    return res.status(500).json({ data: [{ msg: 'Что-то пошло не так, попробуйте снова' }] })
  }
})

// * получение информации о клиентах
// ? принимает: field - object
// /api/company/changeinfo
router.post('/changeinfo', auth, async (req, res) => {
  try {
    const { companyId, field } = req.body

    const company = await Company.findOne({ _id: companyId })

    if (!company) {
      return res.status(400).json({ data: [{ msg: 'Не удалось получить данные о компании' }] })
    }

    await Company.updateOne({ _id: company._id }, { [field.name]: field.value })
        
    return res.status(200).json({ msg: 'Информация о компании успешно изменена' })
  } catch(e) {
    console.log(e)
    return res.status(500).json({ data: [{ msg: 'Что-то пошло не так, попробуйте снова' }] })
  }
})

module.exports = router