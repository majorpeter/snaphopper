import express, {Express, Request, Response} from 'express';
import cors from 'cors';

import {endpoints} from './lib/api';
import fs from 'fs';
import path from 'path';
import {NodeSSH} from 'node-ssh';
import {Docker} from './lib/docker';
import {DockerHub} from './lib/dockerhub';

const config: {
    port: number;
    ssh_host: string;
    ssh_username: string;
    ssh_privkey_path: string;
    cors_enabled: boolean;  // for dev server
} = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json')).toString());

const app: Express = express();
if (config.cors_enabled) {
    app.use(cors());
}
let docker: Docker;

(async() => {
    let ssh = new NodeSSH();
    await ssh.connect({
        host: config.ssh_host,
        username: config.ssh_username,
        privateKeyPath: config.ssh_privkey_path
    });

    docker = new Docker((command, args) => {return ssh.exec(command, args)});

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
        const projects = await docker.getDockerComposeProjects();
        let data: endpoints.stack_list.type = {};
        for (const i of projects.keys()) {
            data[i] = {
                containers: projects.get(i)!,    //TODO more fields
                updateAvailable: false //TODO implement
            };
        }
        res.send(data);
    })

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
