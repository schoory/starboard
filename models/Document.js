const {Schema, model, Types} = require('mongoose')

const schema = new Schema({
  title: { type: String, required: true },
  description: { type: String },
  dateOfCreation: { type: Date, required: true },
  pathToFile: { type: String, required: true },
  company: { type: Types.ObjectId, ref: 'Company' },
  client: { type: Types.ObjectId, ref: 'Client', required: true },
  owner: { type: Types.ObjectId, ref: 'User', required: true },
  section: { type: String, required: true },
  tags: [{ type: String, required: true }]
})

module.exports = model('Document', schema)