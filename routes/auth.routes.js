const {Router} = require('express')
const {check, validationResult} = require('express-validator')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const config = require('config')
const User = require('../models/User')
const Company = require('../models/Company')
const Director = require('../models/Director')
const Client = require('../models/Client')
const auth = require('../middleware/auth.middleware')
const router = Router()

// /api/auth/register
router.post(
  '/register', 
  [
    check('email', 'Некорректный email').exists().isEmail(),
    check('password', 'Минимальная длина пароля 6 символов').exists().isLength({ min: 6 }),
    check('firstName', 'Введите имя').exists(),
    check('lastName', 'Введите фамилию').exists()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ data: errors.array() })
      }

      const { email, password, firstName, lastName, birthDate, phoneNumber } = req.body
      
      const candidate = await User.findOne({ email })

      if (candidate) {
        return res.status(400).json({ data: [{ msg: 'Такой пользователь уже существует' }] })
      }

      const hashedPassword = await bcrypt.hash(password, 15)
      const user = new User({ email, password: hashedPassword, firstName, lastName, birthDate, phoneNumber })

      await user.save()

      res.status(200).json({ data: 'Пользователь создан' })
    } catch (e) {
      res.status(500).json({ data: [{msg: 'Что-то пошло не так, попробуйте снова'}] })
    }
})

// /api/auth/login
router.post(
  '/login', 
  [
    check('email', 'Некорректный email').exists().isEmail(),
    check('password', 'Введите пароль').exists(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ data: errors.array() })
      }
      
      const { email, password } = req.body
      
      const candidate = await User.findOne({ email: email })
      
      if (!candidate) {
        return res.status(400).json({ data: [{msg: 'Неверный логин/пароль'}] })
      }
      
      const isMatch = await bcrypt.compare(password, candidate.password)
      
      if (!isMatch) {
        return res.status(400).json({ data: [{ msg: 'Неверный логин/пароль' }] })
      }

      const token = jwt.sign(
        { userId: candidate.id },
        config.get('jwtSecret'),
        { expiresIn: '1h'}
      )
      
      const refreshToken = jwt.sign(
        { userId: candidate._id }, 
        config.get('jwtRefresh'), 
        { expiresIn: '180 days' } 
      )

      let membership = 'none'

      const company = await Company.findOne({ users: candidate._id }, { _id: true })

      // проверка принадлежит ли пользователь к компании или клиенту
      if (company) {
        membership = 'company'
      } else {
        const director = await Director.findOne({ userId: candidate._id }, { _id: true })

        if (director) {
          const client = await Client.findOne({ directors: director ? director._id : '' }, { _id: true })

          if (client) {
            membership = 'client'
          }
        }
      }

      res.json({ token, refreshToken, userId: candidate.id, userMembership: membership })
    } catch (e) {
      res.status(500).json({ data: [{ msg: 'Что-то пошло не так' }] })
    }
})

router.post(
  '/validate',
  auth,
  async (req, res) => {
    try {
      const { userId } = req.body

      const user = await User.findOne({ _id: userId }, { _id: true })

      if (!user) {
        return res.status(401).json({ data: [{ msg: 'Пользователь не найден' }] })
      }

      const company = await Company.findOne({ users: user._id }, { _id: true })

      if (company) {
        return res.status(200).json({ membership: 'company' })
      }

      const director = await Director.findOne({ userId: user._id }, { _id: true })

      if (director) {
        const client = await Client.findOne({ directors: director }, { _id: true })
        if (client) {
          return res.status(200).json({ membership: 'client' })
        }
      }

      res.status(200).json({ membership: 'none' })
    }
    catch (e) {
      res.status(500).json({ data: [{ msg: 'Что-то пошло не так' }] })
    }
})

router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken, userId } = req.body
    
    if (!refreshToken || !userId) {
      return res.status(500).json({ msg: 'Нет авторизации' })
    }
    
    const decoded = jwt.verify(refreshToken, config.get('jwtRefresh'))

    const newRefreshToken = jwt.sign(
      { userId: userId },
      config.get('jwtRefresh'),
      { expiresIn: '180 days'}
    )

    const newToken = jwt.sign(
      { userId: userId },
      config.get('jwtSecret'),
      { expiresIn: '1h'}
    )

    res.json({ token: newToken, refreshToken: newRefreshToken, userId: userId })
  } catch(e) {
    return res.status(500).json({ msg: 'Нет авторизации' })
  }
})

module.exports = router