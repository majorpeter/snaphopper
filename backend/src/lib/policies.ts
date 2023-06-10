import { Request, Response, NextFunction, RequestHandler } from "express";
import { isTokenValid } from "../controllers/LoginController";

export const authenticationRequred: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
    if (req.header('Authorization')?.startsWith('Bearer ') && isTokenValid(req.header('Authorization')!.substring('Bearer '.length))) {
        next();
    } else {
        res.sendStatus(403);
    }
};
