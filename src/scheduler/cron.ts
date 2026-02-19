import cron from "node-cron"
import executeTask from "./execute"

let isTaskRunning = false
const isVercel = process.env.VERCEL === "1"

async function run(trigger: "startup" | "schedule" | "manual" = "schedule") {
  if (isTaskRunning) {
    console.log(`TASK_SKIPPED_ALREADY_RUNNING trigger=${trigger}`)
    return
  }

  isTaskRunning = true
  console.log(`TASK_RUN_START trigger=${trigger} at=${new Date().toISOString()}`)

  try {
    await executeTask()
    console.log(`TASK_RUN_SUCCESS trigger=${trigger} at=${new Date().toISOString()}`)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error(`TASK_RUN_FAILED trigger=${trigger} at=${new Date().toISOString()} ${message}`)
  } finally {
    isTaskRunning = false
  }
}

if (!isVercel) {
  cron.schedule(
    "0 12,17,19 * * *",
    async () => {
      console.log(`CRON_TRIGGERED ${new Date().toISOString()}`)
      await run("schedule")
    },
    {
      timezone: "Asia/Kolkata",
    }
  )

  void run("startup")
}

export { run }
