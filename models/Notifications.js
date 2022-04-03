
const { Schema, model, Types } = require('mongoose')

const schema = new Schema({
  type: { type: String, required: true },
  to: { type: Types.ObjectId, ref: 'User' },
  from: { type: Types.ObjectId },
  companyName: { type: String },
  message: { type: String },
  params: { type: Object },
  creation: { type: Date },
  expires: { type: Date },
  status: { type: String }
})

module.exports = model('Notifications', schema)
