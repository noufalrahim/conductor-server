"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSentReportKeys = getSentReportKeys;
exports.saveSentReportKeys = saveSentReportKeys;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const storeDir = path_1.default.join(process.cwd(), "logs");
const storeFile = path_1.default.join(storeDir, "sent-report-days.json");
function ensureDir() {
    if (!fs_1.default.existsSync(storeDir)) {
        fs_1.default.mkdirSync(storeDir, { recursive: true });
    }
}
function getSentReportKeys() {
    try {
        if (!fs_1.default.existsSync(storeFile))
            return new Set();
        const raw = fs_1.default.readFileSync(storeFile, "utf-8");
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed))
            return new Set();
        return new Set(parsed.filter(d => typeof d === "string"));
    }
    catch (_a) {
        return new Set();
    }
}
function saveSentReportKeys(keys) {
    ensureDir();
    fs_1.default.writeFileSync(storeFile, JSON.stringify(Array.from(keys).sort(), null, 2));
}
