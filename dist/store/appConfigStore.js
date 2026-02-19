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
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAppConfig = getAppConfig;
exports.saveAppConfig = saveAppConfig;
const mongo_1 = require("../db/mongo");
const COLLECTION = "app_config";
const DOC_ID = "primary";
const defaultRoutes = [
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
];
const defaultConfig = {
    timings: ["12:00", "17:00", "19:00"],
    routes: defaultRoutes,
    emails: ["noufalrahim6784@gmail.com"],
    nightStartHour: 19,
};
function isValidTiming(value) {
    return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}
function normalizeRoute(route) {
    if (!route || typeof route !== "object")
        return null;
    if (typeof route.label !== "string" ||
        typeof route.fromCityName !== "string" ||
        typeof route.toCityName !== "string") {
        return null;
    }
    const fromCityID = Number(route.fromCityID);
    const toCityID = Number(route.toCityID);
    if (Number.isNaN(fromCityID) || Number.isNaN(toCityID))
        return null;
    return {
        label: route.label.trim() || "ROUTE",
        fromCityID,
        toCityID,
        fromCityName: route.fromCityName.trim(),
        toCityName: route.toCityName.trim(),
        enabled: route.enabled !== false,
    };
}
function normalizeConfig(input) {
    const timings = Array.isArray(input === null || input === void 0 ? void 0 : input.timings)
        ? Array.from(new Set(input.timings
            .map((t) => String(t).trim())
            .filter((t) => isValidTiming(t))))
        : defaultConfig.timings;
    const routes = Array.isArray(input === null || input === void 0 ? void 0 : input.routes)
        ? input.routes.map(normalizeRoute).filter(Boolean)
        : defaultConfig.routes;
    const emails = Array.isArray(input === null || input === void 0 ? void 0 : input.emails)
        ? Array.from(new Set(input.emails
            .map((e) => String(e).trim().toLowerCase())
            .filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))))
        : defaultConfig.emails;
    const nightStartHourRaw = Number(input === null || input === void 0 ? void 0 : input.nightStartHour);
    const nightStartHour = Number.isInteger(nightStartHourRaw) && nightStartHourRaw >= 0 && nightStartHourRaw <= 23
        ? nightStartHourRaw
        : defaultConfig.nightStartHour;
    return {
        timings: timings.length ? timings : defaultConfig.timings,
        routes: routes.length ? routes : defaultConfig.routes,
        emails: emails.length ? emails : defaultConfig.emails,
        nightStartHour,
    };
}
function getAppConfig() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const db = yield (0, mongo_1.getDb)();
            const collection = db.collection(COLLECTION);
            const doc = yield collection.findOne({ _id: DOC_ID });
            if (!doc) {
                yield collection.insertOne(Object.assign({ _id: DOC_ID }, defaultConfig));
                return defaultConfig;
            }
            return normalizeConfig(doc);
        }
        catch (err) {
            const message = err instanceof Error ? err.message : "Unknown error";
            console.error(`APP_CONFIG_READ_FAILED ${message}`);
            return defaultConfig;
        }
    });
}
function saveAppConfig(input) {
    return __awaiter(this, void 0, void 0, function* () {
        const normalized = normalizeConfig(input);
        try {
            const db = yield (0, mongo_1.getDb)();
            const collection = db.collection(COLLECTION);
            yield collection.updateOne({ _id: DOC_ID }, {
                $set: {
                    timings: normalized.timings,
                    routes: normalized.routes,
                    emails: normalized.emails,
                    nightStartHour: normalized.nightStartHour,
                },
            }, { upsert: true });
            return normalized;
        }
        catch (err) {
            const message = err instanceof Error ? err.message : "Unknown error";
            console.error(`APP_CONFIG_WRITE_FAILED ${message}`);
            throw err;
        }
    });
}
