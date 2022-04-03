
const { Schema, model, Types } = require('mongoose')

const schema = new Schema({
  chatId: { type: Types.ObjectId, ref: 'Chat', required: true },
  senderId: { type: Types.ObjectId, ref: 'User', required: true },
  message: { type: String, required: true },
  delivered: { type: Boolean, required: true },
  readed: { type: Boolean, required: true },
  date: { type: Date, required: true }
})

module.exports = model('Message', schema)