import fs from "fs"
import path from "path"

const storeDir = path.join(process.cwd(), "logs")
const storeFile = path.join(storeDir, "sent-report-days.json")

function ensureDir() {
  if (!fs.existsSync(storeDir)) {
    fs.mkdirSync(storeDir, { recursive: true })
  }
}

export function getSentReportKeys() {
  try {
    if (!fs.existsSync(storeFile)) return new Set<string>()
    const raw = fs.readFileSync(storeFile, "utf-8")
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return new Set<string>()
    return new Set(parsed.filter(d => typeof d === "string"))
  } catch {
    return new Set<string>()
  }
}

export function saveSentReportKeys(keys: Set<string>) {
  ensureDir()
  fs.writeFileSync(storeFile, JSON.stringify(Array.from(keys).sort(), null, 2))
}
