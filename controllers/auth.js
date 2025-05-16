const prisma = require('../config/prisma')

exports.login = async (req, res) => {
    try {
        const { firstName } = req.body
        const user = await prisma.user.findFirst({
            where: { firstName: firstName }
        })
        res.json({ message: "Login successed!!", data: user})
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: "Server error" })
    }
}