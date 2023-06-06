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

async function createDockerSshConnection() {
    docker = null;
    try {
        let ssh = new NodeSSH();
        await ssh.connect({
            host: config.ssh_host,
            username: config.ssh_username,
            privateKeyPath: config.ssh_privkey_path
        });

        docker = new Docker((command, args) => {return ssh.exec(command, args)});
    } catch (e: any) {
        console.log(e);
    }
}

(async() => {
    await createDockerSshConnection();

    app.get('/', async (req: Request, res: Response) => {
        res.contentType('html');
        const projects = await docker.getDockerComposeProjects();
        const project_names = new Array(...projects.keys()).sort();
        for (const i of project_names) {
            res.write(i+'<br/>');
            for (const j of <string[]> projects.get(i)) {
                const image = (await docker.inspectImages([(await docker.inspectContainers([j]))[0].Image]))[0];
                const custom = image.Metadata.LastTagTime != '0001-01-01T00:00:00Z';
                const tag = image.RepoTags[0];
                res.write(`&nbsp;&nbsp;-<a href="${endpoints.container.url_fmt.replace(':name', j)}">${j}</a> - `);
                if (!custom) {
                    res.write(`<a href="${DockerHub.getUrl(tag.split(':')[0])}" target="blank">${tag}</a>`);
                } else {
                    res.write(`${tag} <b>(custom)</b>`);
                }
                res.write('<br/>');
            }
            res.write('\n');
        }
        res.end();
    });

    app.get(endpoints.stack_list.url, async (req: Request, res: Response) => {
        let data: endpoints.stack_list.type = {
            connected: docker != null,
            projects: {}
        };

        if (docker) {
            const projects = await docker.getDockerComposeProjects();

            for (const i of projects.keys()) {
                data.projects[i] = {
                    containers: projects.get(i)!,    //TODO more fields
                    updateAvailable: false //TODO implement
                };
            }
        }
        res.send(data);
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

        const containerData = await docker.inspectContainers([containerName]);
        const imageData = await docker.inspectImages([containerData[0].Image]);

        res.send((await DockerHub.getImageTags(imageData[0].RepoTags[0].split(':')[0])).reverse());
    });
})();

app.listen(config.port, () => {
    console.log(`Listening on port ${config.port}.`);
});
