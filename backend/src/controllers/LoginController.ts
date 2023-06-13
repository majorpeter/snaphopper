import { Express } from "express";
import { endpoints } from "../lib/api";
import { Config } from "../lib/config";
import bcrypt from 'bcryptjs';

let validSessionToken: {
    value: string;
    timestamp: number;
} | undefined = undefined;

const session_timeout_ms = 15 * 60 * 1000;

/**
 * this allows a single admin user to be logged in for a limited time
 * @note in this application, this is enough; json web token could be used for multi-user situations
 * @param token session token from Authorization header
 * @returns true if correct and still valid
 */
export function isTokenValid(token: string): boolean {
    if (validSessionToken) {
        if (validSessionToken.value == token) {
            const age = new Date().getTime() - validSessionToken.timestamp;
            if (age < session_timeout_ms) {
                return true;
            }
        }
    }
    return false;
}

export default function(app: Express, config: Readonly<Config.Type>) {
    validSessionToken = Config.restoreSession();

    app.post<{}, endpoints.login.resp_type, endpoints.login.type>(endpoints.login.url, async (req, res) => {
        if (bcrypt.compareSync(req.body.password, config.login_password_hash!)) {
            const ts = new Date().getTime();
            validSessionToken = {
                value: bcrypt.hashSync(ts.toString(), config.salt!),    // just something random
                timestamp: ts
            }
            Config.saveSession(validSessionToken);

            res.send({
                success: true,
                token: validSessionToken.value,
            });
        } else {
            res.send({
                success: false,
            });
        }
    });
}
