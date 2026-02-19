import crypto from "crypto"
import { NextFunction, Request, Response } from "express"

const COOKIE_NAME = "admin_session"
const COOKIE_MAX_AGE_SEC = 60 * 60 * 12

const adminUsername = process.env.ADMIN_USERNAME || "admin"
const adminPassword = process.env.ADMIN_PASSWORD || "admin123"
const sessionSecret = process.env.ADMIN_SESSION_SECRET || "change-me-admin-session-secret"

function base64UrlEncode(input: string) {
  return Buffer.from(input).toString("base64url")
}

function base64UrlDecode(input: string) {
  return Buffer.from(input, "base64url").toString("utf8")
}

function sign(data: string) {
  return crypto.createHmac("sha256", sessionSecret).update(data).digest("base64url")
}

function parseCookieHeader(cookieHeader: string | undefined) {
  const map: Record<string, string> = {}
  if (!cookieHeader) return map

  cookieHeader.split(";").forEach(part => {
    const [k, ...rest] = part.trim().split("=")
    if (!k) return
    map[k] = decodeURIComponent(rest.join("="))
  })

  return map
}

function buildToken(username: string) {
  const payload = JSON.stringify({
    u: username,
    exp: Date.now() + COOKIE_MAX_AGE_SEC * 1000,
  })

  const encoded = base64UrlEncode(payload)
  const signature = sign(encoded)
  return `${encoded}.${signature}`
}

function verifyToken(token: string | undefined) {
  if (!token) return false

  const [encoded, signature] = token.split(".")
  if (!encoded || !signature) return false
  if (sign(encoded) !== signature) return false

  try {
    const payload = JSON.parse(base64UrlDecode(encoded))
    return payload?.u === adminUsername && Number(payload?.exp) > Date.now()
  } catch {
    return false
  }
}

export function setAdminCookie(res: Response) {
  const token = buildToken(adminUsername)
  res.setHeader(
    "Set-Cookie",
    `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${COOKIE_MAX_AGE_SEC}`
  )
}

export function clearAdminCookie(res: Response) {
  res.setHeader(
    "Set-Cookie",
    `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
  )
}

export function validateAdminCredentials(username: string, password: string) {
  return username === adminUsername && password === adminPassword
}

export function isAdminAuthenticated(req: Request) {
  const cookies = parseCookieHeader(req.headers.cookie)
  return verifyToken(cookies[COOKIE_NAME])
}

export function requireAdminAuth(req: Request, res: Response, next: NextFunction) {
  if (!isAdminAuthenticated(req)) {
    res.redirect("/admin/login")
    return
  }
  next()
}
