import fs from "fs"
import path from "path"

const logDir = path.join(process.cwd(), "logs")
const logFile = path.join(logDir, "app.log")

if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir)
}

function write(message: string) {
  fs.appendFileSync(logFile, message + "\n")
}

const originalLog = console.log
const originalError = console.error

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
