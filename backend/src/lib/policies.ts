import { Request, Response, NextFunction, RequestHandler } from "express";
import { isTokenValid } from "../controllers/LoginController";

let authenticationDisabled = false;

export function setAuthenticationDisabled(disabled: boolean) {
    authenticationDisabled = disabled;
}

export function isWsTokenValid(token: string): boolean {
    return authenticationDisabled || isTokenValid(token);
}

export const authenticationRequred: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
    if (authenticationDisabled || req.header('Authorization')?.startsWith('Bearer ') && isTokenValid(req.header('Authorization')!.substring('Bearer '.length))) {
        next();
    } else {
        res.sendStatus(403);
    }
};
