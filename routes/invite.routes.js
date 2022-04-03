
const { Router } = require('express')
const config = require('config')
const router = Router()
const Invites = require('../models/Invites')

// * получить информацию о приглашении
router.post('/inviteinfo', async (req, res) => {
  try {

    const baseUrl = config.get('baseUrl')

    const { inviteId } = req.body

    const invite = await Invites.findOne({ link: baseUrl + '/i/' + inviteId })

    if (!invite) {
      return res.status(400).json({ data: [{ msg: 'Приглашение не найдено' }] })
    }
    
    if (new Date(invite.expiresIn).getTime() < new Date().getTime()) {
      await Invites.updateOne({ _id: invite._id }, { status: 'done' })
      return res.status(400).json({ data: [{ msg: 'Приглашение не найдено' }] })
    }

    return res.status(200).json({ inviteId: invite._id })

  } catch(e) {
    console.log(e)
    return res.status(500).json({ data: [{ msg: 'Что-то пошло не так, попробуйте снова' }] })
  }
})

// * получить информацию о приглашении
router.post('/verifyinvite', async (req, res) => {
  try {

    const { inviteId } = req.body

    const invite = await Invites.findOne({ _id: inviteId })

    if (!invite) {
      return res.status(400).json({ data: [{ msg: 'Приглашение не найдено' }] })
    }
    
    if (new Date(invite.expiresIn).getTime() < new Date().getTime()) {
      await Invites.updateOne({ _id: invite._id }, { status: 'done' })
      return res.status(400).json({ data: [{ msg: 'Приглашение не найдено' }] })
    }

    return res.status(200).json({ status: 'active' })

  } catch(e) {
    console.log(e)
    return res.status(500).json({ data: [{ msg: 'Что-то пошло не так, попробуйте снова' }] })
  }
})

module.exports = router