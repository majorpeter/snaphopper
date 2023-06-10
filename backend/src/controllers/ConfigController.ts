import { endpoints } from "../lib/api";
import { Config } from "../lib/config";
import { authenticationRequred } from "../lib/policies";
import {Express, RequestHandler} from 'express';
import http from 'http';
import bcrypt from 'bcryptjs';

export default function (app: Express, config: Config.Type, server: http.Server, onConfigChanged: () => Promise<void>) {
    const conifgGetHandler: RequestHandler<unknown, endpoints.config.type, unknown, unknown> = async (_req, res) => {
        res.send({
            port: config.port,
            ssh_username: config.ssh_username,
            ssh_host: config.ssh_host,
            ssh_privkey_present: config.ssh_privkey != undefined
        });
    };
    app.get(endpoints.config.url, authenticationRequred, conifgGetHandler);

    const configPostHandler: RequestHandler<unknown, unknown, endpoints.config.type, unknown> = async (req, res) => {
        const portChanged = config.port != req.body.port;

        config.port = req.body.port;
        config.ssh_username = req.body.ssh_username;
        config.ssh_host = req.body.ssh_host;
        if (req.body.ssh_privkey !== undefined) {
            config.ssh_privkey = req.body.ssh_privkey;
        }

        Config.save(config);

        if (portChanged) {
            server.close((err: Error|undefined) => {
                server.listen(config.port, undefined, undefined, () => {
                    console.log(`Listening port changed to ${config.port}`);
                });
            });
        }
        await onConfigChanged();

        res.sendStatus(200);
    };
    app.post(endpoints.config.url, authenticationRequred, configPostHandler);

    const changePasswordHandler: RequestHandler<unknown, unknown, endpoints.config_change_password.type, unknown> = async (req, res) => {
        if (bcrypt.compareSync(req.body.current_pw, config.login_password_hash!)) {
            config.login_password_hash = bcrypt.hashSync(req.body.new_pw, config.salt);

            Config.save(config);

            res.sendStatus(200);
        } else {
            res.sendStatus(400);
        }
    };
    app.post(endpoints.config_change_password.url, authenticationRequred, changePasswordHandler);
}
