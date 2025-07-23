import express, { Request, Response } from "express"
import dbService from "../services/jsondb.service";

const router = express.Router();

router.get("/", async (req: Request, res: Response) => {
    res.json(await dbService.getDailyBriefs())
})

export default router;
