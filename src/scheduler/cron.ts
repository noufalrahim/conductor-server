import cron from "node-cron"
import executeTask from "./execute"

async function run() {
  console.log(`CRON_RUN_START ${new Date().toISOString()}`)
  try {
    await executeTask()
    console.log(`CRON_RUN_SUCCESS ${new Date().toISOString()}`)
  } catch (err) {
    console.error(`CRON_RUN_FAILED ${new Date().toISOString()}`)
  }
}

cron.schedule(
  "0 15, 19, 21 * * *",
  async () => {
    console.log(`CRON_TRIGGERED ${new Date().toISOString()}`)
    await run()
  },
  {
    timezone: "Asia/Kolkata",
  }
)
