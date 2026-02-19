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
exports.run = run;
const node_cron_1 = __importDefault(require("node-cron"));
const execute_1 = __importDefault(require("./execute"));
let isTaskRunning = false;
const isVercel = process.env.VERCEL === "1";
function run() {
    return __awaiter(this, arguments, void 0, function* (trigger = "schedule") {
        if (isTaskRunning) {
            console.log(`TASK_SKIPPED_ALREADY_RUNNING trigger=${trigger}`);
            return;
        }
        isTaskRunning = true;
        console.log(`TASK_RUN_START trigger=${trigger} at=${new Date().toISOString()}`);
        try {
            yield (0, execute_1.default)();
            console.log(`TASK_RUN_SUCCESS trigger=${trigger} at=${new Date().toISOString()}`);
        }
        catch (err) {
            const message = err instanceof Error ? err.message : "Unknown error";
            console.error(`TASK_RUN_FAILED trigger=${trigger} at=${new Date().toISOString()} ${message}`);
        }
        finally {
            isTaskRunning = false;
        }
    });
}
if (!isVercel) {
    node_cron_1.default.schedule("0 12,17,19 * * *", () => __awaiter(void 0, void 0, void 0, function* () {
        console.log(`CRON_TRIGGERED ${new Date().toISOString()}`);
        yield run("schedule");
    }), {
        timezone: "Asia/Kolkata",
    });
    void run("startup");
}
