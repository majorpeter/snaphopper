import express, {Express} from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';

import path from 'path';
import {NodeSSH} from 'node-ssh';
import {Docker} from './lib/docker';
import { Zfs } from './lib/zfs';
import { Config } from './lib/config';
import LoginController from './controllers/LoginController';
import ConfigController from './controllers/ConfigController';
import SnapshotController from './controllers/SnapshotController';
import StackController from './controllers/StackController';

const config = Config.init();

const docker: Docker = new Docker();
const zfs: Zfs = new Zfs();

const app: Express = express();
if (config.cors_enabled) {
    app.use(cors());
}
app.use(bodyParser.json());
app.use(express.static(path.resolve(__dirname, '../../frontend/dist')));

const server = app.listen(config.port, () => {
    console.log(`Listening on port ${config.port}.`);
});

LoginController(app, config);
ConfigController(app, config, server, setupSshConnectionServices);
StackController(app, docker, zfs);
SnapshotController(app, zfs);

setupSshConnectionServices();

async function setupSshConnectionServices() {
    docker.setAdapter(undefined);
    zfs.setAdapter(undefined);

    if (!config.ssh_host || !config.ssh_username || !config.ssh_privkey) {
        return;
    }

    try {
        let ssh = new NodeSSH();
        await ssh.connect({
            host: config.ssh_host,
            username: config.ssh_username,
            privateKey: config.ssh_privkey
        });

        docker.setAdapter((command, args) => {return ssh.exec(command, args)});
        zfs.setAdapter((command, args) => {return ssh.exec(command, args)});
    } catch (e: any) {
        console.log(e);
    }
}
