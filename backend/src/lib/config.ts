import path from "path";
import fs from 'fs';
import {promises as fsPromises} from 'fs';
import bcrypt from 'bcryptjs';

const config_path = path.resolve(__dirname, '../config.json');
const session_path = path.resolve(__dirname, '../session.json');

export namespace Config {

export type Type = {
    salt?: string;
    login_password_hash?: string;
    port: number;
    ssh_host?: string;
    ssh_username?: string;
    ssh_privkey?: string;
    applications_path?: string;
    container_update_checks: boolean;
    auth_disabled: boolean;  // for dev server
    cors_enabled: boolean;  // for dev server
};

export function init(): Type {
    let config: Type = {
        port: 8080,
        container_update_checks: true,
        auth_disabled: false,
        cors_enabled: false
    };

    try {
        config = JSON.parse(fs.readFileSync(config_path).toString());
    } catch (e) {
        //TODO handle
    }

    if (!config.salt) {
        config.salt = bcrypt.genSaltSync();
        config.login_password_hash = bcrypt.hashSync('admin', config.salt);
    }

    return config;
}

export async function save(config: Type) {
    await fsPromises.writeFile(config_path, JSON.stringify(config, undefined, 4), {flag: 'w'});
    console.log('Configuration saved.');
}

export function restoreSession() {
    try {
        return JSON.parse(fs.readFileSync(session_path).toString());
    } catch (e) {
    }
    return undefined;
}

export function saveSession(session: Object) {
    fsPromises.writeFile(session_path, JSON.stringify(session, undefined, 4), {flag: 'w'});
}

}
