import { Router } from "express"
import {
  clearAdminCookie,
  isAdminAuthenticated,
  requireAdminAuth,
  setAdminCookie,
  validateAdminCredentials,
} from "../auth/adminAuth"
import { refreshCronSchedule } from "../scheduler/cron"
import { getAppConfig, saveAppConfig } from "../store/appConfigStore"
import { AppConfig, RouteConfig } from "../types/AppConfig"

const adminRouter = Router()

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

function pageTemplate(title: string, body: string) {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 0; background: #f1f5f9; color: #0f172a; }
      .wrap { max-width: 980px; margin: 24px auto; padding: 0 16px; }
      .card { background: white; border: 1px solid #e2e8f0; border-radius: 10px; padding: 18px; margin-bottom: 16px; }
      h1,h2 { margin: 0 0 12px; }
      label { display:block; font-size: 14px; margin-bottom: 6px; }
      input, textarea { width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 14px; box-sizing: border-box; }
      textarea { min-height: 130px; font-family: Menlo, monospace; }
      button { margin-top: 10px; padding: 10px 14px; border: 0; border-radius: 8px; background: #0f172a; color: white; cursor: pointer; }
      .muted { color: #475569; font-size: 13px; }
      .row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
      .ok { color: #166534; font-weight: 600; }
      .err { color: #b91c1c; font-weight: 600; }
    </style>
  </head>
  <body>
    <div class="wrap">${body}</div>
  </body>
</html>`
}

function renderLogin(error?: string) {
  const msg = error ? `<p class="err">${escapeHtml(error)}</p>` : ""

  return pageTemplate(
    "Admin Login",
    `<div class="card">
      <h1>Admin Login</h1>
      ${msg}
      <form method="post" action="/admin/login">
        <label>Username</label>
        <input name="username" required />
        <label>Password</label>
        <input type="password" name="password" required />
        <button type="submit">Sign In</button>
      </form>
    </div>`
  )
}

function parseListInput(input: string) {
  return input
    .split(/[\n,]/)
    .map(v => v.trim())
    .filter(Boolean)
}

function renderDashboard(config: AppConfig, status?: { ok?: string; err?: string }) {
  const statusHtml = status?.ok
    ? `<p class="ok">${escapeHtml(status.ok)}</p>`
    : status?.err
      ? `<p class="err">${escapeHtml(status.err)}</p>`
      : ""

  return pageTemplate(
    "Cron Admin Panel",
    `<div class="card">
      <h1>Cron Admin Panel</h1>
      <p class="muted">Manage schedule timings, route pairs, recipient emails, and night start hour.</p>
      ${statusHtml}
      <form method="post" action="/admin/logout">
        <button type="submit">Logout</button>
      </form>
    </div>

    <div class="card">
      <h2>Schedule + Recipients</h2>
      <form method="post" action="/admin/update/general">
        <label>Cron Timings (IST, HH:mm, comma or new line)</label>
        <textarea name="timings">${escapeHtml(config.timings.join("\n"))}</textarea>

        <div class="row">
          <div>
            <label>Night Start Hour (IST)</label>
            <input type="number" min="0" max="23" name="nightStartHour" value="${config.nightStartHour}" />
          </div>
          <div>
            <label>Recipient Emails (comma or new line)</label>
            <textarea name="emails">${escapeHtml(config.emails.join("\n"))}</textarea>
          </div>
        </div>

        <button type="submit">Save General Settings</button>
      </form>
    </div>

    <div class="card">
      <h2>Route Pairs (to & fro)</h2>
      <p class="muted">Edit as JSON array. Fields: label, fromCityID, toCityID, fromCityName, toCityName, enabled</p>
      <form method="post" action="/admin/update/routes">
        <textarea name="routesJson">${escapeHtml(JSON.stringify(config.routes, null, 2))}</textarea>
        <button type="submit">Save Routes</button>
      </form>
    </div>`
  )
}

adminRouter.get("/login", (req, res) => {
  if (isAdminAuthenticated(req)) {
    res.redirect("/admin")
    return
  }
  res.status(200).send(renderLogin())
})

adminRouter.post("/login", (req, res) => {
  const username = String(req.body?.username || "")
  const password = String(req.body?.password || "")

  if (!validateAdminCredentials(username, password)) {
    res.status(401).send(renderLogin("Invalid username or password"))
    return
  }

  setAdminCookie(res)
  res.redirect("/admin")
})

adminRouter.post("/logout", (_req, res) => {
  clearAdminCookie(res)
  res.redirect("/admin/login")
})

adminRouter.get("/", requireAdminAuth, async (_req, res) => {
  const config = await getAppConfig()
  res.status(200).send(renderDashboard(config))
})

adminRouter.post("/update/general", requireAdminAuth, async (req, res) => {
  try {
    const current = await getAppConfig()
    const timings = parseListInput(String(req.body?.timings || ""))
    const emails = parseListInput(String(req.body?.emails || ""))
    const nightStartHour = Number(req.body?.nightStartHour)

    const updated = await saveAppConfig({
      ...current,
      timings,
      emails,
      nightStartHour,
    })

    await refreshCronSchedule()
    res.status(200).send(renderDashboard(updated, { ok: "General settings updated." }))
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update settings"
    const config = await getAppConfig()
    res.status(500).send(renderDashboard(config, { err: message }))
  }
})

adminRouter.post("/update/routes", requireAdminAuth, async (req, res) => {
  try {
    const current = await getAppConfig()
    const raw = String(req.body?.routesJson || "[]")
    const parsed = JSON.parse(raw)

    if (!Array.isArray(parsed)) {
      throw new Error("Routes must be a JSON array")
    }

    const routes = parsed.map((route: any): RouteConfig => ({
      label: String(route.label || "").trim(),
      fromCityID: Number(route.fromCityID),
      toCityID: Number(route.toCityID),
      fromCityName: String(route.fromCityName || "").trim(),
      toCityName: String(route.toCityName || "").trim(),
      enabled: route.enabled !== false,
    }))

    const updated = await saveAppConfig({
      ...current,
      routes,
    })

    res.status(200).send(renderDashboard(updated, { ok: "Routes updated." }))
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update routes"
    const config = await getAppConfig()
    res.status(400).send(renderDashboard(config, { err: message }))
  }
})

export default adminRouter
