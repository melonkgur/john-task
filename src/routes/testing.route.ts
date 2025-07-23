import express, { Request, Response } from "express"

const router = express.Router();

router.get("/json", (req: Request, res: Response) => {
    res.send({data: "Something happened."});
})

router.get("/addr", (req: Request, res: Response) => {
    res.send({address: `${req.ip}`});
})

export default router;
