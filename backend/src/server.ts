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

let config: {
    port: number;
    ssh_host?: string;
    ssh_username?: string;
    ssh_privkey?: string;
    cors_enabled: boolean;  // for dev server
} = {
    port: 8080,
    cors_enabled: false
};

try {
    config = JSON.parse(fs.readFileSync(config_path).toString());
} catch (e) {
    //TODO handle
}

const app: Express = express();
if (config.cors_enabled) {
    app.use(cors());
}
app.use(bodyParser.json());
app.use(express.static(path.resolve(__dirname, '../../frontend/dist')));


const server = app.listen(config.port, () => {
    console.log(`Listening on port ${config.port}.`);
});

let docker: Docker|null = null;
let zfs: Zfs|null = null;

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

    app.get(endpoints.stack.docker_compose_file.url, async (req: Request, res: Response) => {
        if (docker) {
            res.contentType('yaml');
            res.send(await docker.getDockerComposeFile(req.params.name));
        } else {
            res.sendStatus(500);
        }
    });

    app.get(endpoints.snapshot.list.url, async (req: Request, res: Response) => {
        const req_data: endpoints.snapshot.list.req_type = {
            dataset: <string> req.query['dataset']
        };

        if (typeof(req_data.dataset) == 'string' && zfs && zfs.available) {
            const resp: endpoints.snapshot.list.resp_type = (await zfs.getSnapshots(req_data.dataset)).sort((a, b) => (a.name < b.name) ? 1 : -1);
            res.send(resp);
        } else {
            res.sendStatus(500);
        }
    });

    app.post(endpoints.snapshot.create.url, async (req: Request, res: Response) => {
        const data = <endpoints.snapshot.create.req_type> req.body;

        if (!Zfs.isPathValid(data.dataset)) {
            res.status(400);
            res.send(<endpoints.snapshot.create.error_resp_type> {
                message: 'Dataset path is not valid.'
            });
            return;
        }
        if (!Zfs.isNameValid(data.name)) {
            res.status(400);
            res.send(<endpoints.snapshot.create.error_resp_type> {
                message: 'Snapshot name is not valid.'
            });
            return;
        }

        if (!zfs || !zfs.available) {
            res.status(500);
            res.send(<endpoints.snapshot.create.error_resp_type> {
                message: 'ZFS is not available on host.'
            });
            return;
        }

        try {
            await zfs.createSnapshot(data.dataset, data.name);
            res.sendStatus(200);
        } catch (e) {
            res.status(500);
            res.send(<endpoints.snapshot.create.error_resp_type> {
                message: 'ZFS command failed.'
            });
            return;
        }
    });

    app.post(endpoints.snapshot.clone.url, async (req: Request, res: Response) => {
        const data = <endpoints.snapshot.clone.req_type> req.body;

        if (!Zfs.isPathValid(data.dataset_path)) {
            res.status(400);
            res.send(<endpoints.snapshot.create.error_resp_type> {
                message: 'Original dataset path is not valid.'
            });
            return;
        }

        if (!Zfs.isNameValid(data.snapshot_name)) {
            res.status(400);
            res.send(<endpoints.snapshot.create.error_resp_type> {
                message: 'Snapshot name is not valid.'
            });
            return;
        }

        if (!Zfs.isPathValid(data.clone_path)) {
            res.status(400);
            res.send(<endpoints.snapshot.create.error_resp_type> {
                message: 'Destination path is not valid.'
            });
            return;
        }

        if (!zfs || !zfs.available) {
            res.status(500);
            res.send(<endpoints.snapshot.create.error_resp_type> {
                message: 'ZFS is not available on host.'
            });
            return;
        }

        try {
            await zfs.cloneSnapshotToDataset(data.dataset_path, data.snapshot_name, data.clone_path);
            res.sendStatus(200);
        } catch (e: any) {
            res.status(500);
            res.send(<endpoints.snapshot.create.error_resp_type> {
                message: `ZFS command failed: ${e.message}`
            });
        }
    });

    app.get(endpoints.config.url, async (req: Request, res: Response) => {
        res.send(<endpoints.config.type> {
            port: config.port,
            ssh_username: config.ssh_username,
            ssh_host: config.ssh_host,
            ssh_privkey_present: config.ssh_privkey != undefined
        });
    });

    app.post(endpoints.config.url, async (req: Request, res: Response) => {
        const data: endpoints.config.type = req.body;
        const portChanged = config.port != data.port;

        config.port = data.port;
        config.ssh_username = data.ssh_username;
        config.ssh_host = data.ssh_host;
        if (data.ssh_privkey !== undefined) {
            config.ssh_privkey = data.ssh_privkey;
        }

        await fsPromises.writeFile(config_path, JSON.stringify(config, undefined, 4), {flag: 'w'});
        console.log('Configuration saved.');

        if (portChanged) {
            server.close((err: Error|undefined) => {
                server.listen(config.port, undefined, undefined, () => {
                    console.log(`Listening port changed to ${config.port}`);
                });
            });
        }
        await createSshConnectionServices();

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
