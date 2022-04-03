const {Schema, model, Types} = require('mongoose')

const schema = new Schema({
  title: { type: String, required: true },
  description: { type: String },
  date: { type: Date, required: true },
  creator: { type: Types.ObjectId, ref: 'User', required: true },
  company: { type: Types.ObjectId, ref: 'Company' },
  client: { type: Types.ObjectId, ref: 'Client' }
})

module.exports = model('Event', schema)