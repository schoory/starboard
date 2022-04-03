const {Schema, model, Types} = require('mongoose')

const schema = new Schema({
  name: { type: String, required: true },
  person: { type: Boolean, required: true },
  numOfShares: { type: String, required: true },
  shareholderDate: { type: Date },
  client: { type: Types.ObjectId, ref: 'Client', required: true }
})

module.exports = model('Shareholder', schema)