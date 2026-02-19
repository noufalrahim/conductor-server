import "./logger"
import express from "express"
import adminRouter from "./router/adminRouter"
import { run } from "./scheduler/cron"

const app = express()
const isVercel = process.env.VERCEL === "1"

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.get("/", (_req, res) => {
  res.send("Welcome to conductor server!")
})

app.get("/execute", async (_req, res) => {
  try {
    await run("manual")
    res.status(200).send("Execution trigger completed")
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    res.status(500).send(`Execution failed: ${message}`)
  }
})

app.use("/admin", adminRouter)

app.get("/logs", (_req, res) => {
  res.sendFile(process.cwd() + "/logs/app.log")
})

if (!isVercel) {
  app.listen(8000, () => {
    console.log("Server started on port 8000")
  })
}

export default app
