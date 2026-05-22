import { MongoClient } from 'mongodb'

let client: MongoClient | null = null
let connectPromise: Promise<MongoClient | null> | null = null

const mongoUrl = (): string => {
  const value = process.env.MONGODB_URI ?? process.env.MONGO_URL
  if (!value) {
    return ''
  }
  return value
}

export const getMongoClient = async (): Promise<MongoClient | null> => {
  if (client) {
    return client
  }

  const url = mongoUrl()
  if (!url) {
    return null
  }

  if (!connectPromise) {
    const nextClient = new MongoClient(url, {
      serverSelectionTimeoutMS: 300,
      socketTimeoutMS: 500,
    })
    connectPromise = nextClient.connect().then((connected) => {
      client = connected
      return connected
    }).catch(() => {
      connectPromise = null
      return null
    })
  }

  return connectPromise
}
