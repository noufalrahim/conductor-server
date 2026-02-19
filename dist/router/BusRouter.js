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
const express_1 = require("express");
const axios_1 = __importDefault(require("axios"));
const busRouter = (0, express_1.Router)();
busRouter.get("/", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { date } = req.query;
        const response = yield axios_1.default.get(`https://onlineksrtcswift.com/api/resource/searchRoutesV4?fromCityID=10072&toCityID=451&fromCityName=Kozhikode&toCityName=Kanjirappally&journeyDate=${date}&mode=oneway`);
        const data = response.data;
        console.log("Data", data);
        res.json(data);
    }
    catch (e) {
        res.status(500).json({ error: e });
    }
}));
exports.default = busRouter;
