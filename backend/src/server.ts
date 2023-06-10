import express, {Express, Request, RequestHandler, Response} from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';

import {endpoints} from './lib/api';
import path from 'path';
import {NodeSSH} from 'node-ssh';
import {Docker} from './lib/docker';
import {DockerHub} from './lib/dockerhub';
import { Zfs } from './lib/zfs';
import { authenticationRequred } from './lib/policies';
import { Config } from './lib/config';
import LoginController from './controllers/LoginController';
import ConfigController from './controllers/ConfigController';
import SnapshotController from './controllers/SnapshotController';

const config = Config.init();

let docker: Docker|null = null;
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
ConfigController(app, config, server, createSshConnectionServices);
SnapshotController(app, zfs);

async function createSshConnectionServices() {
    docker = null;
    if (config.ssh_host === undefined || config.ssh_username === undefined || config.ssh_privkey == undefined) {
        return;
    }

    try {
        let ssh = new NodeSSH();
        await ssh.connect({
            host: config.ssh_host,
            username: config.ssh_username,
            privateKey: config.ssh_privkey
        });

        docker = new Docker((command, args) => {return ssh.exec(command, args)});
        zfs.connect((command, args) => {return ssh.exec(command, args)});
    } catch (e: any) {
        console.log(e);
    }
}

(async() => {
    await createSshConnectionServices();

    app.get(endpoints.stack_list.url, authenticationRequred, async (req: Request, res: Response) => {
        let data: endpoints.stack_list.type = {
            connected: docker != null,
            projects: {}
        };

        if (docker) {
            const projects = await docker.getDockerComposeProjects();

            for (const i of Object.keys(projects)) {
                data.projects[i] = {
                    containers: projects[i].map((value) => {
                        return <endpoints.stack_list.type['projects']['']['containers'][0]> {
                            name: value.Name.replace(/^\//,''),
                            service: value.Config.Labels[Docker.serviceNameLabel],
                            image_name: value.Config.Image,
                            image_hash: value.Image
                        };
                    }),    //TODO more fields
                };
            }
        }
        res.send(data);
    });

    app.get(endpoints.stack.url, authenticationRequred, async (req: Request, res: Response) => {
        if (docker) {
            const projects = await docker.getDockerComposeProjects();
            if (req.params.name in projects) {
                const stack = projects[req.params.name];
                const working_dir_set = new Set(stack.map((value) => value.Config.Labels[Docker.workingDirLabel]));
                const compose_config_file_set = new Set(stack.map((value) => value.Config.Labels[Docker.configFileNameLabel]));

                let data: endpoints.stack.type = {
                    containers: [],
                    working_directory: working_dir_set.values().next().value,
                    zfs_available: zfs != null && zfs.available,
                    zfs_dataset: null,
                    compose_config_file: compose_config_file_set.values().next().value,
                    working_directory_error: (working_dir_set.size != 1) || (compose_config_file_set.size != 1)
                };

                if (zfs != null && zfs.available) {
                    const datasetName = await zfs.getDataSetByMountPoint(data.working_directory);
                    if (datasetName) {
                        data.zfs_dataset = {
                            name: datasetName,
                            ...await zfs.getDataSetFsUsage(datasetName)
                        }
                    }
                }

                for (const value of stack) {
                    const image = (await docker.inspectImages([value.Image]))[0];
                    const custom = Docker.isCustomImage(image);
                    const base = custom ? await docker.extractBaseForCustomImage(image) : null;

                    data.containers.push({
                        name: value.Name.replace(/^\//,''),
                        service: value.Config.Labels[Docker.serviceNameLabel],
                        image: {
                            name: value.Config.Image,
                            hash: value.Image,
                            url: custom ? null : DockerHub.getUrl(value.Config.Image.split(':')[0]),
                            base: base,
                            base_url: base ? DockerHub.getUrl(base!.split(':')[0]) : null
                        },
                        state: value.State.Status
                    });
                }

                res.send(data);
            } else {
                res.sendStatus(404);
            }
        } else {
            res.sendStatus(500);
        }
    });

    app.get(endpoints.stack.docker_compose_file.url, authenticationRequred, async (req: Request, res: Response) => {
        if (docker) {
            res.contentType('yaml');
            res.send(await docker.getDockerComposeFile(req.params.name));
        } else {
            res.sendStatus(500);
        }
    });
})();
