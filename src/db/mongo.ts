import { Db, MongoClient } from "mongodb"

const mongoUri =
  process.env.MONGODB_URI ||
  "mongodb+srv://noufalrahim6784_db_user:UzxRUvPFsnQ7fz3Q@cluster0.dvyj0fv.mongodb.net"

const dbName = process.env.MONGODB_DB || "conductor"

let clientPromise: Promise<MongoClient> | null = null

function getClient() {
  if (!clientPromise) {
    const client = new MongoClient(mongoUri)
    clientPromise = client.connect()
  }
  return clientPromise
}

export async function getDb(): Promise<Db> {
  const client = await getClient()
  return client.db(dbName)
}
