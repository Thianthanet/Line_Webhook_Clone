require('dotenv').config()
const express = require('express')
const bodyParser = require('body-parser')
// const { PrismaClient } = require('@prisma/client')
const axios = require('axios')
const path = require('path')
const cors = require('cors')
const prisma = require('./config/prisma')
const favicon = require('serve-favicon')

const { readdirSync } = require('fs')
const webhookRoute = require('./webhook/webhook')

const app = express()
// const prisma = new PrismaClient()
const PORT = process.env.PORT || 5002
const LINE_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN

// app.use(bodyParser.json())
app.use(express.json())
app.use(cors())
app.use(express.urlencoded({ extended: true }))
app.use(favicon(path.join(__dirname, "public", "favicon.ico")))
// app.use(bodyParser.urlencoded({ extended: true }))

readdirSync('./routes').map((item) => app.use('/api', require('./routes/' + item)))
app.use('/webhook', webhookRoute)

app.get('/', (req, res) => {
  try {
    res.json({ message: "API Created by Thianthanet" })
  } catch (error) {
    console.log(error)
    res.status(500).json({ message: "Server Error" })
  }
})


app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`)
})
