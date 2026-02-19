"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = executeTask;
const axios_1 = __importDefault(require("axios"));
const pdfkit_1 = __importDefault(require("pdfkit"));
const stream_1 = require("stream");
const appConfigStore_1 = require("../store/appConfigStore");
const buildSeatMatrix_1 = require("../utils/buildSeatMatrix");
const dateTimeFormatter_1 = require("../utils/dateTimeFormatter");
const mailer_1 = require("../utils/mailer");
const WINDOW_DAYS = 3;
function formatDateUTC(d) {
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(d.getUTCDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
}
function getTargetDatesUTC(baseDate) {
    return Array.from({ length: WINDOW_DAYS }, (_, offset) => {
        const dt = new Date(baseDate);
        dt.setUTCDate(baseDate.getUTCDate() + offset);
        return dt;
    });
}
function parseScheduleDateFromRouteId(routeId) {
    if (typeof routeId !== "string")
        return null;
    const parts = routeId.split("~");
    return parts.length ? parts[parts.length - 1] : null;
}
function toNumberOrNull(value) {
    if (typeof value === "number")
        return value;
    if (typeof value === "string" && value.trim()) {
        const parsed = Number(value);
        return Number.isNaN(parsed) ? null : parsed;
    }
    return null;
}
function getRouteStartTime(route) {
    if (typeof route.PickupTime === "string" && route.PickupTime) {
        return route.PickupTime;
    }
    return route.DepartureTime;
}
function isNightRoute(route, nightStartHour) {
    const startTime = getRouteStartTime(route);
    if (typeof startTime !== "string")
        return false;
    const hour = (0, dateTimeFormatter_1.getIstHour)(startTime);
    return !Number.isNaN(hour) && hour >= nightStartHour;
}
function validateRoute(route, dir, requestedDate) {
    const errors = [];
    if (!route || typeof route !== "object") {
        errors.push("Route payload is missing");
        return errors;
    }
    if (typeof route.RouteScheduleId !== "string" || !route.RouteScheduleId) {
        errors.push("RouteScheduleId missing");
    }
    const scheduleDate = parseScheduleDateFromRouteId(route.RouteScheduleId);
    if (scheduleDate !== requestedDate) {
        errors.push("RouteScheduleId date mismatch");
    }
    const fromCity = toNumberOrNull(route.FromCityID);
    if (fromCity !== dir.fromCityID) {
        errors.push("FromCityID mismatch");
    }
    const toCity = toNumberOrNull(route.ToCityID);
    if (toCity !== dir.toCityID) {
        errors.push("ToCityID mismatch");
    }
    const startTime = getRouteStartTime(route);
    if (typeof startTime === "string") {
        const departureDate = startTime.slice(0, 10);
        if (/^\d{4}-\d{2}-\d{2}$/.test(departureDate) && departureDate !== requestedDate) {
            errors.push("Start time date mismatch");
        }
    }
    else {
        errors.push("Pickup/Departure time missing");
    }
    return errors;
}
function validateSeats(seats) {
    const errors = [];
    const labels = new Set();
    for (const seat of seats) {
        if (!seat || typeof seat !== "object") {
            errors.push("Invalid seat object");
            continue;
        }
        if (typeof seat.SeatLabel === "string") {
            if (labels.has(seat.SeatLabel)) {
                errors.push(`Duplicate seat label: ${seat.SeatLabel}`);
            }
            labels.add(seat.SeatLabel);
        }
    }
    return errors;
}
function toTimeSortValue(dateTime) {
    if (!dateTime)
        return Number.MAX_SAFE_INTEGER;
    const ts = Date.parse(dateTime);
    return Number.isNaN(ts) ? Number.MAX_SAFE_INTEGER : ts;
}
function processDirection(dir, dates, nightStartHour) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d;
        const doc = new pdfkit_1.default({ autoFirstPage: false });
        const stream = new stream_1.PassThrough();
        const chunks = [];
        let pagesAdded = 0;
        const briefingLines = [];
        doc.pipe(stream);
        stream.on("data", c => chunks.push(c));
        console.log(`DIRECTION_START ${dir.label}`);
        for (const d of dates) {
            const date = formatDateUTC(d);
            console.log(`DATE_PROCESS_START ${dir.label} ${date}`);
            try {
                const response = yield axios_1.default.get("https://onlineksrtcswift.com/api/resource/searchRoutesV4", {
                    params: {
                        fromCityID: dir.fromCityID,
                        toCityID: dir.toCityID,
                        fromCityName: dir.fromCityName,
                        toCityName: dir.toCityName,
                        journeyDate: date,
                        mode: "oneway",
                    },
                });
                const routes = Array.isArray(response.data) ? response.data : [];
                if (!routes.length) {
                    console.log(`ROUTE_NOT_FOUND ${dir.label} ${date}`);
                    continue;
                }
                const validatedRoutes = [];
                for (const route of routes) {
                    const routeErrors = validateRoute(route, dir, date);
                    if (routeErrors.length) {
                        console.error(`ROUTE_VALIDATION_FAILED ${dir.label} ${date} ${(_a = route.RouteScheduleId) !== null && _a !== void 0 ? _a : "unknown"} ${routeErrors.join(" | ")}`);
                        continue;
                    }
                    if (!isNightRoute(route, nightStartHour)) {
                        continue;
                    }
                    validatedRoutes.push(route);
                }
                if (!validatedRoutes.length) {
                    console.log(`NIGHT_ROUTE_NOT_FOUND ${dir.label} ${date}`);
                    continue;
                }
                validatedRoutes.sort((a, b) => toTimeSortValue(getRouteStartTime(a)) - toTimeSortValue(getRouteStartTime(b)));
                for (const route of validatedRoutes) {
                    const routeId = route.RouteScheduleId;
                    try {
                        const seatResp = yield axios_1.default.get("https://onlineksrtcswift.com/api/resource/seatArrangement", {
                            params: {
                                routeID: routeId,
                                journeyDate: date,
                            },
                        });
                        const seatsRaw = (_c = (_b = seatResp.data) === null || _b === void 0 ? void 0 : _b.APIGetChartMicrositeResult) === null || _c === void 0 ? void 0 : _c.Seats;
                        const seats = Array.isArray(seatsRaw) ? seatsRaw : [];
                        if (!seats.length) {
                            console.error(`SEATS_NOT_FOUND ${dir.label} ${date} route=${routeId}`);
                            continue;
                        }
                        const seatErrors = validateSeats(seats);
                        if (seatErrors.length) {
                            console.error(`SEAT_VALIDATION_WARNINGS ${dir.label} ${date} route=${routeId} ${seatErrors.join(" | ")}`);
                        }
                        const startTime = getRouteStartTime(route);
                        const arrivalTime = (_d = route.ArrivalTime) !== null && _d !== void 0 ? _d : startTime;
                        if (!startTime || !arrivalTime) {
                            console.error(`ROUTE_TIMING_MISSING ${dir.label} ${date} route=${routeId}`);
                            continue;
                        }
                        const seatsPending = seats.filter(s => s.IsAvailable === 1).length;
                        (0, buildSeatMatrix_1.appendSeatPage)(doc, seats, {
                            from: dir.fromCityName,
                            to: dir.toCityName,
                            date: (0, dateTimeFormatter_1.getIstDateString)(startTime),
                            departureTime: (0, dateTimeFormatter_1.formatPrettyDateTime)(startTime),
                            arrivalTime: (0, dateTimeFormatter_1.formatPrettyDateTime)(arrivalTime),
                        });
                        briefingLines.push(`${dir.label} | ${(0, dateTimeFormatter_1.getIstDateString)(startTime)} | ${(0, dateTimeFormatter_1.formatPrettyDateTime)(startTime)} | seats pending: ${seatsPending}`);
                        pagesAdded += 1;
                        console.log(`PAGE_ADDED ${dir.label} ${date} route=${routeId}`);
                    }
                    catch (err) {
                        const message = err instanceof Error ? err.message : "Unknown error";
                        console.error(`SEAT_PROCESS_FAILED ${dir.label} ${date} route=${routeId} ${message}`);
                    }
                }
            }
            catch (err) {
                const message = err instanceof Error ? err.message : "Unknown error";
                console.error(`DATE_PROCESS_FAILED ${dir.label} ${date} ${message}`);
            }
        }
        if (!pagesAdded) {
            doc.addPage({ size: "A4", margin: 36 });
            doc
                .fontSize(16)
                .fillColor("#0f172a")
                .text(`${dir.label} Route Report`, { align: "center" });
            doc.moveDown(1);
            doc
                .fontSize(11)
                .fillColor("#475569")
                .text("No eligible night-route data found for the current 3-day window.", {
                align: "center",
            });
        }
        doc.end();
        yield new Promise(resolve => stream.on("end", resolve));
        return {
            attachment: {
                filename: `bus-seats-${dir.label.toLowerCase()}.pdf`,
                content: Buffer.concat(chunks),
            },
            pagesAdded,
            briefingLines,
        };
    });
}
function executeTask() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("TASK_START");
        const config = yield (0, appConfigStore_1.getAppConfig)();
        if (!config.emails.length) {
            console.error("NO_RECIPIENT_EMAILS_CONFIGURED_SKIP_MAIL");
            return;
        }
        const activeRoutes = config.routes.filter(route => route.enabled !== false);
        if (!activeRoutes.length) {
            console.error("NO_ACTIVE_ROUTES_CONFIGURED_SKIP_TASK");
            return;
        }
        const baseDate = new Date();
        const dates = getTargetDatesUTC(baseDate);
        const targetDates = dates.map(d => formatDateUTC(d));
        const results = [];
        for (const route of activeRoutes) {
            results.push(yield processDirection(route, dates, config.nightStartHour));
        }
        const totalPages = results.reduce((sum, r) => sum + r.pagesAdded, 0);
        if (!totalPages) {
            console.error("NO_VALID_PAGES_GENERATED_SKIP_MAIL");
            return;
        }
        const briefing = [
            `Bus Seat Report Briefing`,
            `Date Window (UTC): ${targetDates.join(", ")}`,
            `Night Filter Start (IST): ${String(config.nightStartHour).padStart(2, "0")}:00`,
            ``,
            ...results.flatMap(r => r.briefingLines),
        ].join("\n");
        yield (0, mailer_1.sendPDFMail)(results.map(r => r.attachment), `Bus Seat Report | ${targetDates.join(", ")}`, config.emails, briefing);
        console.log(`TASK_END pages=${totalPages} attachments=${results.length}`);
    });
}
