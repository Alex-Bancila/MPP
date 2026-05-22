import { PrismaClient } from '@prisma/client'

const p = new PrismaClient()

async function main() {
  await p.$executeRawUnsafe('GRANT ALL ON SCHEMA public TO mpp_user')
  await p.$executeRawUnsafe('GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO mpp_user')
  await p.$executeRawUnsafe('GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO mpp_user')
  console.log('Permissions granted to mpp_user')
}

main()
  .then(() => p.$disconnect())
  .catch((e) => { console.error(e); p.$disconnect() })
