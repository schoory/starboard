const {Schema, model, Types} = require('mongoose')

const schema = new Schema({
  companyName: { type: String, required: true },
  companyEmail: { type: String },
  companyAddress: { type: String },
  companyPhone: { type: String },
  companyWeb: { type: String },
  creationDate: { type: Date },
  admins: [{ type: Types.ObjectId, ref: 'User', required: true }],
  users: [{ type: Types.ObjectId, ref: 'User', required: true }],
  clients: [{ type: Types.ObjectId, ref: 'Client' }],
  owner: { type: Types.ObjectId, ref: 'User', required: true }
})

module.exports = model('Company', schema)