import { Express,RequestHandler } from "express";
import { endpoints } from "../lib/api";
import { Config } from "../lib/config";
import bcrypt from 'bcryptjs';

export default function(app: Express, config: Config.Type) {
    app.post<{}, endpoints.login.resp_type, endpoints.login.type, {}>(endpoints.login.url, async (req, res) => {
        if (bcrypt.compareSync(req.body.password, config.login_password_hash!)) {
            res.send({
                success: true,
                token: 'mytoken',
            });
        } else {
            res.send({
                success: false,
            });
        }
    });
}
