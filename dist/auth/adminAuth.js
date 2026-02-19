"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setAdminCookie = setAdminCookie;
exports.clearAdminCookie = clearAdminCookie;
exports.validateAdminCredentials = validateAdminCredentials;
exports.isAdminAuthenticated = isAdminAuthenticated;
exports.requireAdminAuth = requireAdminAuth;
const crypto_1 = __importDefault(require("crypto"));
const COOKIE_NAME = "admin_session";
const COOKIE_MAX_AGE_SEC = 60 * 60 * 12;
const adminUsername = process.env.ADMIN_USERNAME || "admin";
const adminPassword = process.env.ADMIN_PASSWORD || "admin123";
const sessionSecret = process.env.ADMIN_SESSION_SECRET || "change-me-admin-session-secret";
function base64UrlEncode(input) {
    return Buffer.from(input).toString("base64url");
}
function base64UrlDecode(input) {
    return Buffer.from(input, "base64url").toString("utf8");
}
function sign(data) {
    return crypto_1.default.createHmac("sha256", sessionSecret).update(data).digest("base64url");
}
function parseCookieHeader(cookieHeader) {
    const map = {};
    if (!cookieHeader)
        return map;
    cookieHeader.split(";").forEach(part => {
        const [k, ...rest] = part.trim().split("=");
        if (!k)
            return;
        map[k] = decodeURIComponent(rest.join("="));
    });
    return map;
}
function buildToken(username) {
    const payload = JSON.stringify({
        u: username,
        exp: Date.now() + COOKIE_MAX_AGE_SEC * 1000,
    });
    const encoded = base64UrlEncode(payload);
    const signature = sign(encoded);
    return `${encoded}.${signature}`;
}
function verifyToken(token) {
    if (!token)
        return false;
    const [encoded, signature] = token.split(".");
    if (!encoded || !signature)
        return false;
    if (sign(encoded) !== signature)
        return false;
    try {
        const payload = JSON.parse(base64UrlDecode(encoded));
        return (payload === null || payload === void 0 ? void 0 : payload.u) === adminUsername && Number(payload === null || payload === void 0 ? void 0 : payload.exp) > Date.now();
    }
    catch (_a) {
        return false;
    }
}
function setAdminCookie(res) {
    const token = buildToken(adminUsername);
    res.setHeader("Set-Cookie", `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${COOKIE_MAX_AGE_SEC}`);
}
function clearAdminCookie(res) {
    res.setHeader("Set-Cookie", `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
}
function validateAdminCredentials(username, password) {
    return username === adminUsername && password === adminPassword;
}
function isAdminAuthenticated(req) {
    const cookies = parseCookieHeader(req.headers.cookie);
    return verifyToken(cookies[COOKIE_NAME]);
}
function requireAdminAuth(req, res, next) {
    if (!isAdminAuthenticated(req)) {
        res.redirect("/admin/login");
        return;
    }
    next();
}
