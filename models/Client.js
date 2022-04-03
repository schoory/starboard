const {Schema, model, Types} = require('mongoose')

const schema = new Schema({
  clientName: { type: String, required: true },
  email: { type: String },
  registeredAddress: { type: String },
  UEN: { type: String, required: true, unique: true },
  UENDate: { type: Date, required: true },
  UENStatus: { type: String, required: true },
  clientStatus: { type: String, required: true },
  statusDate: { type: Date },
  dateOfReg: { type: Date, required: true },
  capital: { type: String },
  shareCapital: { type: String },
  numOfShares: { type: String },
  lastAGM: { type: Date },
  lastARFilled: { type: Date },
  mainContact: { type: Types.ObjectId, ref: 'Director' },
  directors: [{ type: Types.ObjectId, ref: 'Director' }],
  shareholders: [{ type: Types.ObjectId, ref: 'Shareholder' }],
  events: [{ type: Types.ObjectId, ref: 'Event' }],
  documents: [{ type: Types.ObjectId, ref: 'Document'}],
  company: { type: Types.ObjectId, ref: 'Company', required: true }
})

module.exports = model('Client', schema)