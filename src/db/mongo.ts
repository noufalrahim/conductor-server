const mongoUri =
  process.env.MONGODB_URI ||
  "mongodb+srv://noufalrahim6784_db_user:UzxRUvPFsnQ7fz3Q@cluster0.dvyj0fv.mongodb.net"

const dbName = process.env.MONGODB_DB || "conductor"

type MongoClientLike = {
  connect: () => Promise<MongoClientLike>
  db: (name: string) => any
}

let clientPromise: Promise<MongoClientLike> | null = null

function getClient() {
  if (!clientPromise) {
    // Lazy-load to avoid hard crash when dependency is not installed in restricted envs.
    const mongodb = (eval("require")("mongodb") as { MongoClient: new (uri: string) => MongoClientLike })
    const client = new mongodb.MongoClient(mongoUri)
    clientPromise = client.connect()
  }
  return clientPromise
}

export async function getDb() {
  const client = await getClient()
  return client.db(dbName)
}
