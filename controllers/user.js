const prisma = require('../config/prisma')
const { checkout } = require('../routes/user')

exports.createUser = async (req, res) => {
    try {
        const { firstName, lastName, phone, location } = req.body
        const user = await prisma.user.create({
            data: {
                firstName,
                lastName,
                phone,
                location,
            }
        })
        res.json({ message: "Create user successed!!", data: user })
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: "Server error" })
    }
}
 

exports.updateUser = async (req, res) => {
    try {
        const { id, firstName,  lastName} = req.body
        const user = await prisma.user.update({
            where: { id: Number(id) },
            data: {
                firstName,
                lastName
            },
            select: {
                firstName: true,
                lastName: true,
                location: true,
                role: true
            }
        })
        res.json({ message: "Update user successed!!", data: user })
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: "Update user error" })
    }
}

exports.changeRole = async (req, res) => {
    try {   
        const { id, role } = req.body
        console.log(id, role)
        const user = await prisma.user.update({
            where: { id: Number(id) },
            data: { role: role},
            select: {
                id: true,
                firstName: true,
                lastName: true,
                location: true,
                role: true
            }
        })
        res.json(user)
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: "Server error" })
    }
}

exports.getUserId = async (req, res) => {
    try {
        const { id } = req.params
        const user = await prisma.user.findFirst({
            where: { userId: id }
        })
        res.json({ message: "Get user id successed", data: user })
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: "Server error" })
    }
}

exports.getAllUsers = async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            orderBy: {
                createdAt: 'asc' // เรียงจากเก่าไปใหม่
            }
        })
        res.json(users)
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: "Server error" })
    }
}