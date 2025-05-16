const express = require('express')
const router = express.Router()

const { createUser, getAllUsers, getUserId, changeRole, checkUser } = require('../controllers/user')

router.post('/create', createUser)
router.get('/getUser/:id', getUserId)
router.get('/allUsers', getAllUsers)
router.patch('/changeRole', changeRole)


module.exports = router