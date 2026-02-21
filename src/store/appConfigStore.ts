import { getDb } from "../db/mongo"
import { AppConfig, RouteConfig } from "../types/AppConfig"

const COLLECTION = "app_config"
const DOC_ID = "primary"

const defaultRoutes: RouteConfig[] = [
  {
    label: "UP",
    fromCityID: 10072,
    toCityID: 451,
    fromCityName: "Kozhikode (11)",
    toCityName: "Kanjirappally (704)",
    enabled: true,
  },
  {
    label: "DOWN",
    fromCityID: 451,
    toCityID: 10072,
    fromCityName: "Kanjirappally (704)",
    toCityName: "Kozhikode (11)",
    enabled: true,
  },
]

const defaultConfig: AppConfig = {
  timings: ["12:00", "17:00", "19:00"],
  routes: defaultRoutes,
  emails: ["noufalrahim6784@gmail.com"],
  nightStartHour: 19,
}

function isValidTiming(value: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value)
}

function normalizeRoute(route: any): RouteConfig | null {
  if (!route || typeof route !== "object") return null
  if (
    typeof route.label !== "string" ||
    typeof route.fromCityName !== "string" ||
    typeof route.toCityName !== "string"
  ) {
    return null
  }

  const fromCityID = Number(route.fromCityID)
  const toCityID = Number(route.toCityID)
  if (Number.isNaN(fromCityID) || Number.isNaN(toCityID)) return null

  return {
    label: route.label.trim() || "ROUTE",
    fromCityID,
    toCityID,
    fromCityName: route.fromCityName.trim(),
    toCityName: route.toCityName.trim(),
    enabled: route.enabled !== false,
  }
}

function normalizeConfig(input: any): AppConfig {
  const timings: string[] = Array.isArray(input?.timings)
    ? Array.from(
      new Set(
        input.timings
          .map((t: any) => String(t).trim())
          .filter((t: string) => isValidTiming(t))
      )
    )
    : defaultConfig.timings

  const routes = Array.isArray(input?.routes)
    ? input.routes.map(normalizeRoute).filter(Boolean)
    : defaultConfig.routes

  const emails: string[] = Array.isArray(input?.emails)
    ? Array.from(
      new Set(
        input.emails
          .map((e: any) => String(e).trim().toLowerCase())
          .filter((e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))
      )
    )
    : defaultConfig.emails

  const nightStartHourRaw = Number(input?.nightStartHour)
  const nightStartHour =
    Number.isInteger(nightStartHourRaw) && nightStartHourRaw >= 0 && nightStartHourRaw <= 23
      ? nightStartHourRaw
      : defaultConfig.nightStartHour

  return {
    timings: timings.length ? timings : defaultConfig.timings,
    routes: routes.length ? (routes as RouteConfig[]) : defaultConfig.routes,
    emails: emails.length ? emails : defaultConfig.emails,
    nightStartHour,
  }
}

export async function getAppConfig() {
  try {
    const db = await getDb()
    const collection = db.collection<AppConfig & { _id: string }>(COLLECTION)

    const doc = await collection.findOne({ _id: DOC_ID })
    if (!doc) {
      await collection.insertOne({ _id: DOC_ID, ...defaultConfig })
      return defaultConfig
    }

    return normalizeConfig(doc)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error(`APP_CONFIG_READ_FAILED ${message}`)
    return defaultConfig
  }
}

export async function saveAppConfig(input: AppConfig) {
  const normalized = normalizeConfig(input)

  try {
    const db = await getDb()
    const collection = db.collection<AppConfig & { _id: string }>(COLLECTION)

    await collection.updateOne(
      { _id: DOC_ID },
      {
        $set: {
          timings: normalized.timings,
          routes: normalized.routes,
          emails: normalized.emails,
          nightStartHour: normalized.nightStartHour,
        },
      },
      { upsert: true }
    )

    return normalized
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error(`APP_CONFIG_WRITE_FAILED ${message}`)
    throw err
  }
}
