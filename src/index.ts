import "./logger"
import express from "express"
import "./scheduler/cron"
import executeTask from "./scheduler/execute"

const app = express()

app.use(express.json())

app.get("/", (_req, res) => {
  res.send("Welcome to conductor server!")
})

app.get("/execute", (_req, res) => {
  executeTask();
})

app.get("/logs", (_req, res) => {
  res.sendFile(process.cwd() + "/logs/app.log")
})

app.listen(8000, () => {
  console.log("Server started on port 8000")
})
