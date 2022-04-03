const {Schema, model, Types} = require('mongoose')

const schema = new Schema({
  post: { type: String },
  userId: { type: Types.ObjectId, ref: 'User', required: true, unique: true },
  client: { type: Types.ObjectId, ref: 'Client', required: true }
})

module.exports = model('Director', schema)