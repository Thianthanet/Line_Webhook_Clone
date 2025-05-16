require('dotenv').config()
const express = require('express')
const bodyParser = require('body-parser')
// const { PrismaClient } = require('@prisma/client')
const axios = require('axios')
const path = require('path')
const cors = require('cors')
const prisma = require('./config/prisma')

const { readdirSync } = require('fs')
const webhookRoute = require('./webhook/webhook')

const app = express()
// const prisma = new PrismaClient()
const PORT = process.env.PORT || 5002
const LINE_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN

app.use(bodyParser.json())
app.use(express.json())
app.use(cors())
app.use(express.urlencoded({ extended: true }))
app.use(bodyParser.urlencoded({ extended: true }))

readdirSync('./routes').map((item) => app.use('/api', require('./routes/' + item)))
app.use('/webhook', webhookRoute)

// -- In-memory session --
// const registerSession = {} // สำหรับ user
// const technicianSession = {} // สำหรับช่าง

// // -- LINE Webhook --
// app.post('/webhook', async (req, res) => {
//   const events = req.body.events

//   for (const event of events) {
//     const userId = event.source.userId
//     const message = event.message?.text?.trim()

//     if (!userId || !message) continue

//     // ===== ลงทะเบียนช่าง =====
//     if (message === 'ลงทะเบียนช่าง') {
//       technicianSession[userId] = { step: 'ASK_NAME' }
//       await reply(event.replyToken, 'กรุณาพิมพ์ชื่อ-นามสกุลของคุณ')
//       continue
//     }

//     if (technicianSession[userId]?.step === 'ASK_NAME') {
//       const [firstName, lastName = ''] = message.split(' ')
//       const existing = await prisma.user.findFirst({ where: { userId: userId } })

//       if (existing) {
//         await prisma.user.update({
//           where: { id: existing.id },
//           data: { firstName, lastName, role: 'technician' },
//         })
//       } else {
//         await prisma.user.create({
//           data: {
//             firstName,
//             lastName,
//             phone: '-', address: '-', role: 'technician',
//             userId: userId,
//           },
//         })
//       }

//       delete technicianSession[userId]
//       await reply(event.replyToken, `✅ ลงทะเบียนช่างสำเร็จ: ${firstName} ${lastName}`)
//       continue
//     }

//     // ===== ผู้ใช้งานทั่วไปลงทะเบียนด้วยเบอร์โทร =====
//     if (message === 'ลงทะเบียน') {
//       registerSession[userId] = { step: 'ASK_PHONE' }
//       await reply(event.replyToken, 'กรุณาพิมพ์เบอร์โทรของคุณ')
//       continue
//     }

//     if (registerSession[userId]?.step === 'ASK_PHONE') {
//       const phone = message
//       const user = await prisma.user.findFirst({ where: { phone } })

//       if (user) {
//         await prisma.user.update({
//           where: { phone },
//           data: { userId: userId },
//         })
//         await reply(event.replyToken, `✅ ผูกบัญชีเรียบร้อย คุณคือ ${user.firstName} ${user.lastName}`)
//       } else {
//         await reply(event.replyToken, 'ไม่พบเบอร์นี้ในระบบ กรุณาติดต่อเจ้าหน้าที่')
//       }

//       delete registerSession[userId]
//       continue
//     }

//     // ===== กรณีอื่น ๆ =====
//     await reply(event.replyToken, 'พิมพ์ "ลงทะเบียน" สำหรับผู้ใช้ทั่วไป หรือ "ลงทะเบียนช่าง" สำหรับช่าง')
//   }

//   res.sendStatus(200)
// })

// // ====== ฟังก์ชันส่งข้อความ ======
// async function reply(replyToken, text) {
//   await axios.post('https://api.line.me/v2/bot/message/reply', {
//     replyToken,
//     messages: [{ type: 'text', text }],
//   }, {
//     headers: {
//       'Authorization': `Bearer ${LINE_TOKEN}`,
//       'Content-Type': 'application/json',
//     },
//   })
// }



app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`)
})
