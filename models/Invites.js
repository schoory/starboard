
const { Schema, model, Types } = require('mongoose')

const schema = new Schema({
  link: { type: String, required: true, unique: true },
  to: { type: String },
  from: { type: Types.ObjectId, ref: 'Company', required: true },
  creationDate: { type: Date, required: true },
  expiresIn: { type: Date, required: true },
  status: { type: String, required: true }
})

module.exports = model('Invites', schema)