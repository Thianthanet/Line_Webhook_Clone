const prisma = require('../config/prisma')
const axios = require('axios')
const dayjs = require('dayjs')
require('dotenv').config()

const { cloudinary } = require('../config/cloudinary')

const LINE_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN
const TECHNICIAN_GROUP_ID = process.env.LINE_GROUP_ID

const generateJobIdTCH = async () => {
    const now = new Date()
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '')
    const jobsToday = await prisma.technicianJob.findMany({
        where: { jobId: { startsWith: dateStr } }
    })

    const sequence = String(jobsToday.length + 1).padStart(4, '0')
    return `${dateStr}${sequence}THC`
}

const sendFlexToGroup = async (groupId, job, user) => {
    const formattedTimestamp = dayjs(job.timestamp).format('DD-MM-YYYY HH:mm')

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
                            { type: 'text', text: `📢 งานใหม่ #${job.jobId}`, weight: 'bold', size: 'lg', wrap: true },
                            { type: 'text', text: `ชื่อผู้แจ้ง: ${job.customerName}`},
                            { type: 'text', text: `เจ้าหน้าที่: ${user.firstName} ${user.lastName}`},
                            { type: 'text', text: `ประเภท: ${job.type}` },
                            { type: 'text', text: `สถานที่: ${job.location}` },
                            { type: 'text', text: `เวลา: ${formattedTimestamp}` },
                            { type: 'text', text: `รายละเอียด: ${job.description}`, wrap: true },
                            {
                                type: 'image',
                                url: job.image1,
                                size: 'full',
                                aspectRatio: '20:13',
                                aspectMode: 'cover',
                                margin: 'md'
                            },
                            {
                                type: 'image',
                                url: job.image2,
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

exports.createJobTCH = async (req, res) => {
    try {
        const { userId, type, location, description, customerName } = req.body
        const rawTimestamp = req.body.timestamp
        const timestamp = rawTimestamp ? new Date(rawTimestamp.replace(' ', 'T')) : undefined
        const image1 = req.files?.image1?.[0]
        const image2 = req.files?.image2?.[0]

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

        const jobId = await generateJobIdTCH()

        const jobtech = await prisma.technicianJob.create({
            data: {
                userId,
                type,
                jobId,
                customerName,
                description,
                location,
                image1: image1Url,
                image2: image2Url,
                timestamp,
                status: 'PENDING',
            }
        })

        await sendFlexToGroup(TECHNICIAN_GROUP_ID, jobtech, user)
        res.json({ message: "Job create successded and sent to line message ", data: jobtech })
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: "Server Error" })
    }
}