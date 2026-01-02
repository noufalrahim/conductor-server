import { Router } from "express";
import axios from "axios";

const busRouter = Router();

busRouter.get("/", async (req, res) => {
    try {
        const { date } = req.query;
        const response = await axios.get(`https://onlineksrtcswift.com/api/resource/searchRoutesV4?fromCityID=10072&toCityID=451&fromCityName=Kozhikode&toCityName=Kanjirappally&journeyDate=${date}&mode=oneway`);
        const data = response.data;
        console.log("Data", data);
        res.json(data);
    }
    catch (e) {
        res.status(500).json({ error: e });
    }
});

export default busRouter;