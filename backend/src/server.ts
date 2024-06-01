import express, {Express, Request, Response, NextFunction} from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';

import path from 'path';
import {Docker} from './lib/docker';
import { Zfs } from './lib/zfs';
import { Config } from './lib/config';
import LoginController from './controllers/LoginController';
import ConfigController from './controllers/ConfigController';
import SnapshotController from './controllers/SnapshotController';
import StackController from './controllers/StackController';
import { Applications } from './lib/applications';
import { setAuthenticationDisabled } from './lib/policies';
import UpdateController from './controllers/UpdateController';
import { SshQueue } from './lib/sshqueue';

const frontend_relative_path = '../../frontend/dist';
const config = Config.init();

const docker: Docker = new Docker();
const applications: Applications = new Applications();
const zfs: Zfs = new Zfs();

const app: Express = express();
if (config.cors_enabled) {
    app.use(cors());
}
app.use(bodyParser.json());
app.use(express.static(path.resolve(__dirname, frontend_relative_path)));

const server = app.listen(config.port, () => {
    console.log(`Listening on port ${config.port}.`);
});

LoginController(app, config);
ConfigController(app, config, server, setupSshConnectionServices);
StackController(app, server, docker, applications, zfs);
SnapshotController(app, zfs);
UpdateController(app, config);

/**
 * default route gets frontend's index.html
 * @note this is required to allow page reloads on routes that vue router generates, e.g. when a stack's page is open
 */
app.get('*', (_, res) => {
    res.sendFile(path.resolve(__dirname, frontend_relative_path, 'index.html'));
});

/**
 * error handler is the last handler registered before `app.listen()`
 */
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error("Exception at url: %s", req.url);
    console.error(err);
    res.sendStatus(500);
});

setupSshConnectionServices();
setAuthenticationDisabled(config.auth_disabled);

async function setupSshConnectionServices() {
    docker.setAdapter(undefined);
    zfs.setAdapter(undefined);
    applications.setPath(config.applications_path);

    if (!config.ssh_host || !config.ssh_username || !config.ssh_privkey) {
        return;
    }

    try {
        const ssh = new SshQueue();

        await ssh.connect({
            host: config.ssh_host,
            username: config.ssh_username,
            privateKey: config.ssh_privkey
        });

        docker.setAdapter((command, args) => {return ssh.exec(command, args)});
        zfs.setAdapter((command, args) => {return ssh.exec(command, args)});
        applications.setAdapter(async (command, args, options?: {
            stdin?: string,
            working_dir?: string,
            onStdout?: (chunk: Buffer) => void,
            onStderr?: (chunk: Buffer) => void
        }) => {
            const result = (await ssh.execStream(command, args, {
                stdin: options?.stdin,
                cwd: options?.working_dir,
                stream: 'both',
                onStdout: options?.onStdout,
                onStderr: options?.onStderr
            }));
            return result.stdout;
        }, async (command_line, onStdout) => {
            return ssh.executeWithShell(command_line, onStdout);
        });
    } catch (e: any) {
        console.log(e);
    }
}
