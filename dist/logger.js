"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const isServerless = process.env.VERCEL === "1" ||
    process.env.AWS_LAMBDA_FUNCTION_NAME !== undefined;
let logFile = null;
if (!isServerless) {
    const logDir = path_1.default.join(process.cwd(), "logs");
    logFile = path_1.default.join(logDir, "app.log");
    if (!fs_1.default.existsSync(logDir)) {
        fs_1.default.mkdirSync(logDir, { recursive: true });
    }
}
function write(message) {
    if (isServerless || !logFile)
        return;
    fs_1.default.appendFileSync(logFile, message + "\n");
}
const originalLog = console.log.bind(console);
const originalError = console.error.bind(console);
console.log = (...args) => {
    const msg = `[${new Date().toISOString()}] ${args.join(" ")}`;
    write(msg);
    originalLog(msg);
};
console.error = (...args) => {
    const msg = `[${new Date().toISOString()}] ERROR ${args.join(" ")}`;
    write(msg);
    originalError(msg);
};
