"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getIstDateString = getIstDateString;
exports.getIstHour = getIstHour;
exports.formatPrettyDateTime = formatPrettyDateTime;
const IST_TIMEZONE = "Asia/Kolkata";
function getIstDateParts(dateTime) {
    const d = new Date(dateTime);
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: IST_TIMEZONE,
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
    }).formatToParts(d);
    const part = (type) => { var _a, _b; return (_b = (_a = parts.find(p => p.type === type)) === null || _a === void 0 ? void 0 : _a.value) !== null && _b !== void 0 ? _b : ""; };
    return {
        day: Number(part("day")),
        month: part("month"),
        year: Number(part("year")),
        hour: part("hour"),
        minute: part("minute"),
        dayPeriod: part("dayPeriod"),
    };
}
function getIstDateString(dateTime) {
    const d = new Date(dateTime);
    return new Intl.DateTimeFormat("en-CA", {
        timeZone: IST_TIMEZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(d);
}
function getIstHour(dateTime) {
    const d = new Date(dateTime);
    return Number(new Intl.DateTimeFormat("en-US", {
        timeZone: IST_TIMEZONE,
        hour: "2-digit",
        hour12: false,
    }).format(d));
}
function formatPrettyDateTime(dateTime) {
    const { day, month, year, hour, minute, dayPeriod } = getIstDateParts(dateTime);
    const time = `${hour}:${minute} ${dayPeriod}`;
    const suffix = day % 10 === 1 && day !== 11 ? "st" :
        day % 10 === 2 && day !== 12 ? "nd" :
            day % 10 === 3 && day !== 13 ? "rd" :
                "th";
    return `${day}${suffix} ${month} ${year}, ${time} IST`;
}
