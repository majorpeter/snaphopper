import { Request, Response, NextFunction, RequestHandler } from "express";

export const authenticationRequred: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
    if (req.header('Authorization') == 'Bearer mytoken') {
        next();
    } else {
        res.sendStatus(403);
    }
};
