const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL + '?pgbouncer=true', // เพิ่ม pgbouncer=true
    },
  },
})
module.exports = prisma