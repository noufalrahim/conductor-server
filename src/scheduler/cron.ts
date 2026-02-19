import cron, { ScheduledTask } from "node-cron"
import { getAppConfig } from "../store/appConfigStore"
import executeTask from "./execute"

let isTaskRunning = false
const isVercel = process.env.VERCEL === "1"
let scheduledTasks: ScheduledTask[] = []

function timingToCron(timing: string) {
  const [hourRaw, minuteRaw] = timing.split(":")
  const hour = Number(hourRaw)
  const minute = Number(minuteRaw)

  if (
    !Number.isInteger(hour) ||
    !Number.isInteger(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return null
  }

  return `${minute} ${hour} * * *`
}

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

async function setupCronTasks() {
  scheduledTasks.forEach(task => task.stop())
  scheduledTasks = []

  const config = await getAppConfig()
  const uniqueTimings = Array.from(new Set(config.timings))

  for (const timing of uniqueTimings) {
    const expression = timingToCron(timing)
    if (!expression) {
      console.error(`INVALID_CRON_TIMING_SKIPPED timing=${timing}`)
      continue
    }

    const task = cron.schedule(
      expression,
      async () => {
        console.log(`CRON_TRIGGERED timing=${timing} at=${new Date().toISOString()}`)
        await run("schedule")
      },
      {
        timezone: "Asia/Kolkata",
      }
    )

    scheduledTasks.push(task)
  }

  console.log(`CRON_SCHEDULE_UPDATED timings=${uniqueTimings.join(",")}`)
}

async function refreshCronSchedule() {
  if (isVercel) return
  await setupCronTasks()
}

if (!isVercel) {
  void setupCronTasks()
  void run("startup")
}

export { run, refreshCronSchedule }
