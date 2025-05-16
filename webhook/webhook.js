const express = require('express')
const axios = require('axios')
const { PrismaClient } = require('@prisma/client')

const router = express.Router()
const prisma = new PrismaClient()
const LINE_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN

// -- In-memory session --
const registerSession = {} // สำหรับ user
const technicianSession = {} // สำหรับช่าง

// Webhook Handler
router.post('/', async (req, res) => {
  const events = req.body.events

  for (const event of events) {
    const userId = event.source.userId

    // ============================
    //กรณี Postback (กดปุ่มใน Flex)
    // ============================

    // เพิ่มเข้าไปใน router.post('/', async (req, res) => { ... })

    if (event.type === 'postback') {
      const postbackData = new URLSearchParams(event.postback.data);
      const action = postbackData.get('action');
      const jobId = postbackData.get('jobId');

      if (action === 'accept') {
        const technicianUserId = event.source.userId;

        // ดึงงานจากฐานข้อมูล
        const job = await prisma.job.findUnique({
          where: { id: Number(jobId) },
          include: {
            user: true,
          }
        });

        if (!job || job.status !== 'PENDING') {
          await reply(event.replyToken, '❌ งานนี้ไม่สามารถรับได้แล้ว');
          return;
        }

        // อัปเดตสถานะงานและเก็บช่างที่รับงาน
        await prisma.job.update({
          where: { id: job.id },
          data: {
            status: 'IN_PROGRESS',
            technicianId: technicianUserId,
          },
        });

        // แจ้งกลับกลุ่มช่างและผู้แจ้งซ่อม
        const flexMsg = {
          type: 'flex',
          altText: `🛠️ กำลังดำเนินการ: ${job.jobId}`,
          contents: {
            type: 'bubble',
            body: {
              type: 'box',
              layout: 'vertical',
              contents: [
                { type: 'text', text: '🛠️ กำลังดำเนินการซ่อม', weight: 'bold', size: 'lg' },
                { type: 'text', text: `หมายเลขงาน: ${job.jobId}` },
                { type: 'text', text: `สถานะ: กำลังดำเนินการ`, color: '#FFA500', margin: 'lg' },
              ],
            },
          },
        };

        const flexMsgGroup = {
          type: 'flex',
          altText: `📢 กำลังดำเนินการ: ${job.jobId}`,
          contents: {
            type: 'bubble',
            body: {
              type: 'box',
              layout: 'vertical',
              contents: [
                {
                  type: 'text',
                  text: `📢 กำลังดำเนินการ #${job.jobId}`,
                  weight: 'bold',
                  size: 'lg',
                  wrap: true
                }
              ]
            },
            footer: {
              type: 'box',
              layout: 'vertical',
              spacing: 'sm',
              contents: [
                {
                  type: 'button',
                  action: {
                    type: 'postback',
                    label: '🔄 กำลังดำเนินการ',
                    data: `action=in_progress&jobId=${job.id}`
                  },
                  style: 'primary',
                  color: '#FFA500'
                }
              ]
            }
          }
        }


        // ส่งข้อความไปยังผู้แจ้งและกลุ่มช่าง
        await pushToLine({
          to: job.userId,
          messages: [flexMsg],
        });

        await pushToLine({
          to: process.env.LINE_GROUP_ID,
          messages: [flexMsgGroup],
        });

        await reply(event.replyToken, `✅ รับงานหมายเลข ${job.jobId} สำเร็จแล้ว`);
      } else if (action === 'in_progress') {
        const job = await prisma.job.findUnique({
          where: { id: Number(jobId) },
          include: { user: true }
        })

        if (!job || job.status !== 'IN_PROGRESS') {
          await reply(event.replyToken, '❌ งานนี้ได้ "เสร็จสิ้น" หรือ มีคนรับงานแล้ว');
          return;
        }

        await prisma.job.update({
          where: { id: job.id },
          data: { status: 'COMPLETED' }
        })

        const userFlexMsg = {
          type: 'flex',
          altText: `✅ งานหมายเลข ${job.jobId} เสร็จสิ้นแล้ว`,
          contents: {
            type: 'bubble',
            body: {
              type: 'box',
              layout: 'vertical',
              contents: [
                { type: 'text', text: '✅ งานซ่อมเสร็จสิ้นแล้ว', weight: 'bold', size: 'lg' },
                { type: 'text', text: `หมายเลขงาน: ${job.jobId}` },
                { type: 'text', text: 'สถานะ: เสร็จสิ้น', color: '#00B900', margin: 'lg' }
              ]
            }
          }
        }

        const groupFlexMsg = {
          type: 'flex',
          altText: `📢 งานหมายเลข ${job.jobId} เสร็จสิ้นแล้ว`,
          contents: {
            type: 'bubble',
            body: {
              type: 'box',
              layout: 'vertical',
              contents: [
                { type: 'text', text: `📢 งาน #${job.jobId} เสร็จสิ้นแล้ว`, weight: 'bold', size: 'lg', wrap: true },
                { type: 'text', text: 'สถานะ: เสร็จสิ้น', color: '#00B900', margin: 'md' }
              ]
            }
          }
        }

        await pushToLine({ to: job.userId, messages: [userFlexMsg] })
        await pushToLine({ to: process.env.LINE_GROUP_ID, messages: [groupFlexMsg] })
        await reply(event.replyToken, `✅ เปลี่ยนสถานะงานหมายเลข ${job.jobId} เป็น "เสร็จสิ้น" แล้ว`)
      }
    }



    const message = event.message?.text?.trim()

    if (!userId || !message) continue

    // ===== ลงทะเบียนช่าง =====
    if (message === 'ลงทะเบียนช่าง') {
      technicianSession[userId] = { step: 'ASK_NAME' }
      await reply(event.replyToken, 'กรุณาพิมพ์ชื่อ-นามสกุลของคุณ')
      continue
    }

    if (technicianSession[userId]?.step === 'ASK_NAME') {
      const [firstName, lastName = ''] = message.split(' ')
      const existing = await prisma.user.findFirst({ where: { userId: userId } })

      if (existing) {
        await prisma.user.update({
          where: { id: existing.id },
          data: { firstName, lastName, role: 'technician' },
        })
      } else {
        await prisma.user.create({
          data: {
            firstName,
            lastName,
            phone: '-', location: '-', role: 'technician',
            userId: userId,
          },
        })
      }

      delete technicianSession[userId]
      await reply(event.replyToken, `✅ ลงทะเบียนช่างสำเร็จ: ${firstName} ${lastName}`)
      continue
    }

    // ===== ผู้ใช้งานทั่วไปลงทะเบียนด้วยเบอร์โทร =====
    if (message === 'ลงทะเบียน') {
      registerSession[userId] = { step: 'ASK_PHONE' }
      await reply(event.replyToken, 'กรุณาพิมพ์เบอร์โทรของคุณ')
      continue
    }

    if (registerSession[userId]?.step === 'ASK_PHONE') {
      const phone = message
      const user = await prisma.user.findFirst({ where: { phone } })

      if (user) {
        await prisma.user.update({
          where: { phone },
          data: { userId: userId },
        })
        await reply(event.replyToken, `✅ ผูกบัญชีเรียบร้อย คุณคือ ${user.firstName} ${user.lastName}`)
      } else {
        await reply(event.replyToken, 'ไม่พบเบอร์นี้ในระบบ กรุณาติดต่อเจ้าหน้าที่')
      }

      delete registerSession[userId]
      continue
    }

    // ===== กรณีอื่น ๆ =====
    await reply(event.replyToken, 'พิมพ์ "ลงทะเบียน" สำหรับผู้ใช้ทั่วไป หรือ "ลงทะเบียนช่าง" สำหรับช่าง')
  }

  res.sendStatus(200)
})

// ฟังก์ชันส่งข้อความ
async function reply(replyToken, text) {
  await axios.post('https://api.line.me/v2/bot/message/reply', {
    replyToken,
    messages: [{ type: 'text', text }],
  }, {
    headers: {
      'Authorization': `Bearer ${LINE_TOKEN}`,
      'Content-Type': 'application/json',
    },
  })
}

async function pushToLine(payload) {
  await axios.post('https://api.line.me/v2/bot/message/push', payload, {
    headers: {
      'Authorization': `Bearer ${LINE_TOKEN}`,
      'Content-Type': 'application/json',
    },
  });
}

module.exports = router
