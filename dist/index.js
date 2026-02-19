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
require("./logger");
const express_1 = __importDefault(require("express"));
const adminRouter_1 = __importDefault(require("./router/adminRouter"));
const cron_1 = require("./scheduler/cron");
const app = (0, express_1.default)();
const isVercel = process.env.VERCEL === "1";
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.get("/", (_req, res) => {
    res.send("Welcome to conductor server!");
});
app.get("/execute", (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield (0, cron_1.run)("manual");
        res.status(200).send("Execution trigger completed");
    }
    catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        res.status(500).send(`Execution failed: ${message}`);
    }
}));
app.use("/admin", adminRouter_1.default);
app.get("/logs", (_req, res) => {
    res.sendFile(process.cwd() + "/logs/app.log");
});
if (!isVercel) {
    app.listen(8000, () => {
        console.log("Server started on port 8000");
    });
}
exports.default = app;
