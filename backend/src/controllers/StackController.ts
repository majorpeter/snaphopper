import { Express } from 'express';
import { authenticationRequred } from '../lib/policies';
import { endpoints } from '../lib/api';
import { Docker } from '../lib/docker';
import { Zfs } from '../lib/zfs';
import { DockerHub } from '../lib/dockerhub';

export default function(app: Express, docker: Docker, zfs: Zfs) {
    app.get<{}, endpoints.stack_list.type>(endpoints.stack_list.url, authenticationRequred, async (req, res) => {
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

    app.get<endpoints.stack.params, endpoints.stack.type, {}>(endpoints.stack.url, authenticationRequred, async (req, res) => {
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

    app.get<endpoints.stack.docker_compose_file.params>(endpoints.stack.docker_compose_file.url, authenticationRequred, async (req, res) => {
        if (docker) {
            res.contentType('yaml');
            res.send(await docker.getDockerComposeFile(req.params.name));
        } else {
            res.sendStatus(500);
        }
    });
};
