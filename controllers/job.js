const prisma = require('../config/prisma')
const axios = require('axios')
require('dotenv').config()

const { cloudinary } = require('../config/cloudinary')

const LINE_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN
const TECHNICIAN_GROUP_ID = process.env.LINE_GROUP_ID

const generateJobId = async () => {
    const now = new Date()
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '')
    const jobsToday = await prisma.job.findMany({
        where: { jobId: { startsWith: dateStr } }
    })

    const sequence = String(jobsToday.length + 1).padStart(4, '0')
    return `${dateStr}${sequence}`
}

// === Line flex: user ===
const sendFlexToUser = async (userId, job, user) => {
    const msg = {
        to: userId,
        messages: [ // แก้จาก 'essages' เป็น 'messages'
            {
                type: 'flex',
                altText: `📋 แจ้งซ่อมสำเร็จ: ${job.jobId}`,
                contents: {
                    type: 'bubble',
                    body: {
                        type: 'box',
                        layout: 'vertical',
                        contents: [
                            { type: 'text', text: '✅ แจ้งซ่อมสำเร็จ', weight: 'bold', size: 'lg' },
                            { type: 'text', text: `หมายเลขงาน: ${job.jobId}`, margin: 'md' },
                            { type: 'text', text: `สถานะ: รอรับเรื่อง`, color: '#FF0000', size: 'lg', margin: 'lg' },
                        ]
                    }
                }
            }
        ]
    }
    await pushToLine(msg)
}

// === Line flex: group technician ===
const sendFlexToGroup = async (groupId, job, user) => {
    const msg = {
        to: groupId,
        messages: [
            {
                type: 'flex',
                altText: `📢 แจ้งซ่อมใหม่: ${job.jobId}`,
                contents: {
                    type: 'bubble',
                    body: {
                        type: 'box',
                        layout: 'vertical',
                        contents: [
                            { type: 'text', text: `📢 งานใหม่ #${job.jobId}`, weight: 'bold', size: 'lg' },
                            { type: 'text', text: `ชื่อผู้แจ้ง: ${user.firstName} ${user.lastName}` },
                            { type: 'text', text: `ประเภท: ${job.type}` },
                            { type: 'text', text: `สถานที่: ${job.location}` },
                            { type: 'text', text: `รายละเอียด: ${job.description}`, wrap: true },
                            {
                                type: 'image',
                                url: job.image2,
                                size: 'full',
                                aspectRatio: '20:13',
                                aspectMode: 'cover',
                                margin: 'md'
                            },
                            {
                                type: 'image',
                                url: job.image1,
                                size: 'full',
                                aspectRatio: '20:13',
                                aspectMode: 'cover'
                            },
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
                                    label: '📥 รับงานนี้',
                                    data: `action=accept&jobId=${job.id}`
                                },
                                style: 'primary',
                                color: '#1DB446'
                            }
                        ]
                    }
                }
            }
        ]
    }
    await pushToLine(msg)
}

const pushToLine = async (payload) => {
    await axios.post('https://api.line.me/v2/bot/message/push', payload, {
        headers: {
            'Authorization': `Bearer ${LINE_TOKEN}`,
            'Content-Type': 'application/json'
        }
    })
}

// ========== createJob (อัปโหลดไป Cloudinary) ==========
exports.createJob = async (req, res) => {
    try {
        const { userId, type, description, location } = req.body
        if (!userId || !type || !description || !location) {
            return res.status(400).send("Missing required fields");
        }

        const image1 = req.files?.image1?.[0]
        const image2 = req.files?.image2?.[0]
        if (!image1 || !image2) {
            return res.status(400).json({ error: "กรุณาอัปโหลดรูปภาพทั้ง 2 รูป" })
        }

        const uploadImage = (fileBuffer) => {
            return new Promise((resolve, reject) => {
                const stream = cloudinary.uploader.upload_stream(
                    { folder: "line-jobs" },
                    (error, result) => {
                        if (error) return reject(error)
                        resolve(result.secure_url)
                    }
                )
                stream.end(fileBuffer)
            })
        }

        const [image1Url, image2Url] = await Promise.all([
            uploadImage(image1.buffer),
            uploadImage(image2.buffer)
        ])

        const user = await prisma.user.findFirst({ where: { userId } })
        if (!user) return res.status(404).json({ error: "User not found" })

        const jobId = await generateJobId()
        const job = await prisma.job.create({
            data: {
                jobId,
                userId: user.userId,
                type,
                description,
                image1: image1Url,
                image2: image2Url,
                location,
                status: 'PENDING'
            }
        })

        await sendFlexToUser(userId, job, user)
        await sendFlexToGroup(TECHNICIAN_GROUP_ID, job, user)

        res.json({ message: "Job created and Line messages sent", job })
    } catch (error) {
        console.error(error)
        res.status(500).json({ error: "Internal Server Error" })
    }
}

