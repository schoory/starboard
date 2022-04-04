const express = require('express')
const app = express()
const http = require('http').Server(app)
const path = require('path')
const io = require('socket.io')(http)

const config = require('config')
const mongoose = require('mongoose')

const SERVER_PORT = config.get('port') || 5000

app.set('trust proxy', true)
app.use(express.json({ extended: true }))
app.use('/api/auth', require('./routes/auth.routes'))
app.use('/api/company', require('./routes/company.routes'))
app.use('/api/user', require('./routes/user.routes'))
app.use('/api/invite', require('./routes/invite.routes'))
app.use('/api/client', require('./routes/client.routes'))

if (process.env.NODE_ENV === 'production') {
  app.use('/', express.static(path.join(__dirname, 'client', 'build')))
 
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'client', 'build', 'index.html'))
  })
}

io.sockets.on("connection", (socket) => {
  
  socket.on('join-room', (id) => {
    socket.join(id)
  })

  socket.on('notification-push', () => {
    socket.broadcast.emit('notification-get');
  })

  socket.on('notification-update', (room) => {
    io.sockets.in(room.id).emit('notification-get');
  })

  socket.on('company-join', (room) => {
    socket.broadcast.to(room.id).emit('company-update')
  })

  socket.on('company-changed', (room) => {
    io.sockets.in(room.id).emit('company-update')
  })

  socket.on('invites-changed', (room) => {
    io.sockets.in(room.id).emit('invites-update')
  })

  socket.on('client-invites-changed', (room) => {
    io.sockets.in(room.id).emit('client-invites-update')
  })

  socket.on('new-client-add', (room) => {
    io.sockets.in(room.id).emit('clients-update')
  })

  socket.on('client-changed', (room) => {
    socket.in(room.id).emit('client-update')
  })

  socket.on('director-join', (room) => {
    socket.in(room.id).emit('client-update')
  })

  socket.on('document-upload', (room) => {
    io.sockets.in(room.id).emit('client-documents-get')
  })

  socket.on('client-changed', (room) => {
    io.sockets.in(room.id).emit('client-update')
  })

  socket.on('client-delete-director', (room) => {
    io.sockets.in(room.id).emit('client-user-deleted')
  })

  socket.on('chat-created', (room) => {
    io.sockets.in(room.id).emit('chats-get')
  })

  socket.on('chat-update', (room) => {
    io.sockets.in(room.id).emit('chats-get')
  })

  socket.on('message-send', (room) => {
    io.sockets.in(room.id).emit('messages-get')
  })

  socket.on('message-user-typing', (room, sender) => {
    io.sockets.in(room.id).emit('message-typing', sender)
  })

  socket.on('message-user-typing-ends', (room, sender) => {
    io.sockets.in(room.id).emit('message-typing-ends', sender)
  })

  socket.on('events-update', (room) => {
    io.sockets.in(room.id).emit('events-get')
  })
})

async function start() {
  try {
    await mongoose.connect(config.get('mongoUri'), {})
    
    http.listen(SERVER_PORT, () => console.log(`App has been started on port ${SERVER_PORT}`))

  } catch (e) {
    console.log('Server Error', e.message)
    process.exit(1)
  }
}

start()