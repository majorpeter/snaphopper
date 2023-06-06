import express, {Express, Request, Response} from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';

import {endpoints} from './lib/api';
import fs from 'fs';
import {promises as fsPromises} from 'fs';
import path from 'path';
import {NodeSSH} from 'node-ssh';
import {Docker} from './lib/docker';
import {DockerHub} from './lib/dockerhub';
import { validateHeaderName } from 'http';
import { Zfs } from './lib/zfs';

const config_path = path.join(__dirname, 'config.json');

const config: {
    port: number;
    ssh_host: string;
    ssh_username: string;
    ssh_privkey_path: string;
    cors_enabled: boolean;  // for dev server
} = JSON.parse(fs.readFileSync(config_path).toString());

const app: Express = express();
if (config.cors_enabled) {
    app.use(cors());
}
app.use(bodyParser.json());
let docker: Docker|null = null;
let zfs: Zfs|null = null;

async function createSshConnectionServices() {
    docker = null;
    try {
        let ssh = new NodeSSH();
        await ssh.connect({
            host: config.ssh_host,
            username: config.ssh_username,
            privateKeyPath: config.ssh_privkey_path
        });

        docker = new Docker((command, args) => {return ssh.exec(command, args)});
        zfs = new Zfs((command, args) => {return ssh.exec(command, args)});
    } catch (e: any) {
        console.log(e);
    }
}

(async() => {
    await createSshConnectionServices();

    app.get(endpoints.stack_list.url, async (req: Request, res: Response) => {
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

    app.get(endpoints.stack.url, async (req: Request, res: Response) => {
        if (docker) {
            const projects = await docker.getDockerComposeProjects();
            if (req.params.name in projects) {
                const stack = projects[req.params.name];
                const working_dir_set = new Set(stack.map((value) => value.Config.Labels[Docker.workingDirLabel]));
                const compose_config_file_set = new Set(stack.map((value) => value.Config.Labels[Docker.configFileNameLabel]));

                let data: endpoints.stack.type = {
                    containers: [],
                    working_directory: working_dir_set.values().next().value,
                    zfs_dataset: null,
                    zfs_snapshots: [],
                    compose_config_file: compose_config_file_set.values().next().value,
                    working_directory_error: (working_dir_set.size != 1) || (compose_config_file_set.size != 1)
                };

                if (zfs) {
                    const datasetName = await zfs.getDataSetByMountPoint(data.working_directory);
                    if (datasetName) {
                        data.zfs_dataset = {
                            name: datasetName,
                            ...await zfs.getDataSetFsUsage(datasetName)
                        }
                        data.zfs_snapshots = (await zfs.getSnapshots(datasetName)).sort((a, b) => (a.name < b.name) ? 1 : -1);
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

    app.get(endpoints.stack.docker_compose_file.url,async (req: Request, res: Response) => {
        if (docker) {
            res.contentType('yaml');
            res.send(await docker.getDockerComposeFile(req.params.name));
        } else {
            res.sendStatus(500);
        }
    });

    app.get(endpoints.config.url, async (req: Request, res: Response) => {
        res.send(<endpoints.config.type> {
            port: config.port,
            ssh_username: config.ssh_username,
            ssh_host: config.ssh_host,
            ssh_privkey_path: config.ssh_privkey_path
        });
    });

    app.post(endpoints.config.url, async (req: Request, res: Response) => {
        const data: endpoints.config.type = req.body;

        config.port = data.port;
        config.ssh_username = data.ssh_username;
        config.ssh_host = data.ssh_host;
        config.ssh_privkey_path = data.ssh_privkey_path;

        await fsPromises.writeFile(config_path, JSON.stringify(config, undefined, 4), {flag: 'w'});

        res.sendStatus(200);
    });

    app.get(endpoints.container.url_fmt, async (req: Request, res: Response) => {
        res.contentType('txt');
        const containerName = req.params['name'];
        if (!Docker.isContainerNameValid(containerName)) {
            res.sendStatus(403);
            return;
        }

        if (docker) {
            const containerData = await docker.inspectContainers([containerName]);
            const imageData = await docker?.inspectImages([containerData[0].Image]);

            res.send((await DockerHub.getImageTags(imageData[0].RepoTags[0].split(':')[0])).reverse());
        } else {
            res.sendStatus(500);
        }
    });
})();

app.listen(config.port, () => {
    console.log(`Listening on port ${config.port}.`);
});
