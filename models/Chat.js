
const { Schema, model, Types } = require('mongoose')

const schema = new Schema({
  users: [{ type: Types.ObjectId, ref: 'User', required: true }],
  lastMessage: { type: Types.ObjectId, ref: 'Message' }
})

module.exports = model('Chat', schema)