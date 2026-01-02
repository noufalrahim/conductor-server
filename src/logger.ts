import fs from "fs"
import path from "path"

const isServerless =
  process.env.VERCEL === "1" ||
  process.env.AWS_LAMBDA_FUNCTION_NAME !== undefined

let logFile: string | null = null

if (!isServerless) {
  const logDir = path.join(process.cwd(), "logs")
  logFile = path.join(logDir, "app.log")

  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true })
  }
}

function write(message: string) {
  if (isServerless || !logFile) return
  fs.appendFileSync(logFile, message + "\n")
}

const originalLog = console.log.bind(console)
const originalError = console.error.bind(console)

console.log = (...args: any[]) => {
  const msg = `[${new Date().toISOString()}] ${args.join(" ")}`
  write(msg)
  originalLog(msg)
}

console.error = (...args: any[]) => {
  const msg = `[${new Date().toISOString()}] ERROR ${args.join(" ")}`
  write(msg)
  originalError(msg)
}
