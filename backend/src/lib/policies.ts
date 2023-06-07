import { Request, Response, NextFunction } from "express";

export const authenticationRequred = (req: Request, res: Response, next: NextFunction) => {
    if (req.header('Authorization') == 'Bearer mytoken') {
        next();
    } else {
        res.sendStatus(403);
    }
};
