import { Express } from 'express';
import { authenticationRequred } from '../lib/policies';
import { endpoints } from '../lib/api';
import { Docker, ImageInfo } from '../lib/docker';
import { Zfs } from '../lib/zfs';
import { DockerHub } from '../lib/dockerhub';
import { Applications } from '../lib/applications';

export default function(app: Express, docker: Docker, applications: Applications, zfs: Zfs) {
    app.get<{}, endpoints.stack_list.type>(endpoints.stack_list.url, authenticationRequred, async (_req, res) => {
        let data: endpoints.stack_list.type = {
            connected: docker.available,
            projects: {}
        };

        if (docker.available) {
            const apps = await applications.getAllProjects();
            const projects = await docker.getDockerComposeProjects();

            for (const project_name of Object.keys(apps)) {
                data.projects[project_name] = {
                    status: apps[project_name].compose != undefined ? 'ok' : 'access_error',
                    services: []
                };

                const project = project_name in projects ? projects[project_name] : undefined;
                if (apps[project_name].compose != undefined) {
                    try {
                        for (const service_name of Object.keys(apps[project_name].compose!.services)) {
                            const service_config = apps[project_name].compose!.services[service_name];
                            const running_service_container = project ? project.find((i) => i.Config.Labels[Docker.serviceNameLabel] == service_name) : null;
                            const service_record: endpoints.stack_list.type['projects']['']['services'][0] = {
                                container_name: running_service_container?.Name.replace(/^\//,''),
                                service_name: service_name,
                                custom_build: service_config.build != undefined,
                                status: running_service_container ? running_service_container['State'].Status : 'N/A',
                            };

                            if (running_service_container) {
                                const image = (await docker.inspectImages([running_service_container.Image]))[0];

                                service_record.image_name = running_service_container.Config.Image;
                                if (image.RepoDigests.length > 0) {
                                    service_record.image_id = image.Id;
                                    service_record.image_digest = image.RepoDigests[0].split('@')[1];
                                }

                                service_record.custom_build = Docker.isCustomImage(image);
                            } else {
                                service_record.image_name = service_config.image;
                            }

                            data.projects[project_name].services.push(service_record);
                        }
                    }
                    catch (e) {
                        data.projects[project_name].status = 'invalid_compose_file';
                    }
                }
            }
        }
        res.send(data);
    });

    app.get<endpoints.stack.params, endpoints.stack.type, {}>(endpoints.stack.url, authenticationRequred, async (req, res) => {
        if (docker.available) {
            let data: endpoints.stack.type = {
                services: {},
                zfs_available: zfs.available,
                zfs_dataset: null,
                working_directory_error: false
            };

            if (await applications.projectExists(req.params.name)) {
                data.working_directory = applications.getProjectWorkingDirectory(req.params.name);
                data.compose_config_file_name = Docker.ConfigFileName;

                const project = await applications.getProject(req.params.name);
                try {
                    if (project) {
                        for (const service_name of Object.keys(project.services)) {
                            const image_name = project.services[service_name].image;
                            let image_data: ImageInfo[] = [];
                            if (image_name) {
                                try {
                                    image_data = await docker.inspectImages([image_name]);
                                } catch (e) {}
                            }
                            data.services[service_name] = {
                                dockerfile_image: {
                                    name: image_name,
                                    url: image_name ? DockerHub.getUrl(image_name.split(':')[0]) : undefined,
                                    id: image_data.length ? image_data[0].Id : undefined,
                                    digest: image_data.length && image_data[0].RepoDigests.length ? image_data[0].RepoDigests[0].split('@')[1] : undefined
                                },
                                status: 'N/A'
                            };
                        }
                    }
                } catch (e) {
                    data.compose_config_invalid = true;
                }
            }

            const stack = await docker.getDockerComposeProject(req.params.name);
            if (stack) {
                const working_dir_set = new Set(stack.map((value) => value.Config.Labels[Docker.workingDirLabel]));
                const compose_config_file_set = new Set(stack.map((value) => value.Config.Labels[Docker.configFileNameLabel]));

                if (!data.working_directory) {
                    data.working_directory = working_dir_set.values().next().value;
                }
                if (!data.compose_config_file_name) {
                    data.compose_config_file_name = compose_config_file_set.values().next().value;
                }
                data.working_directory_error =  data.working_directory != working_dir_set.values().next().value ||
                                                data.compose_config_file_name != compose_config_file_set.values().next().value ||
                                                (working_dir_set.size != 1) || (compose_config_file_set.size != 1);

                for (const value of stack) {
                    const service_name = value.Config.Labels[Docker.serviceNameLabel];

                    if (!Object.keys(data.services).includes(service_name)) {
                        data.services[service_name] = {
                            status: 'N/A'
                        };
                    }

                    const service = data.services[service_name];
                    service.container_name = value.Name.replace(/^\//,'');

                    const image = (await docker.inspectImages([value.Image]))[0];
                    const custom = Docker.isCustomImage(image);
                    const base = custom ? await docker.extractBaseForCustomImage(image) : undefined;

                    service.existing_image = {
                        name: value.Config.Image,
                        id: image.Id,
                        digest: image.RepoDigests.length ? image.RepoDigests[0].split('@')[1] : undefined,
                        url: custom ? undefined : DockerHub.getUrl(value.Config.Image.split(':')[0]),
                        base: base,
                        base_url: base ? DockerHub.getUrl(base!.split(':')[0]) : undefined
                    };
                    service.status = value.State.Status;
                }
            }

            if (zfs.available && data.working_directory) {
                const datasetName = await zfs.getDataSetByMountPoint(data.working_directory);
                if (datasetName) {
                    data.zfs_dataset = {
                        name: datasetName,
                        ...await zfs.getDataSetFsUsage(datasetName)
                    }
                }
            }

            if (data.working_directory) {
                res.send(data);
            } else {
                res.sendStatus(404);
            }
        } else {
            res.sendStatus(500);
        }
    });

    app.post<endpoints.stack.docker_compose.params, endpoints.stack.docker_compose.post_resp_type, endpoints.stack.docker_compose.post_req_type, {}>(endpoints.stack.docker_compose.url, authenticationRequred,async (req, res) => {
        if (req.body.command == 'up') {
            res.writeHead(200, {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Content-Encoding': 'none'
            });
            await applications.composeUp(req.params.name, (chunk: Buffer) => {
                res.write(chunk);
            });
            res.end();
        } else if (req.body.command == 'down') {
            res.writeHead(200, {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Content-Encoding': 'none'
            });
            await applications.composeDown(req.params.name, (chunk: Buffer) => {
                res.write(chunk);
            });
            res.end();
        } else {
            res.sendStatus(400);
        }
    });

    app.get<endpoints.stack.docker_compose_file.params, endpoints.stack.docker_compose_file.get_resp_type>(endpoints.stack.docker_compose_file.url, authenticationRequred, async (req, res) => {
        if (docker.available) {
            res.contentType('yaml');
            const contents = await applications.getProjectFileText(req.params.name);
            res.send(contents ? contents : '');
        } else {
            res.sendStatus(500);
        }
    });

    app.post<endpoints.stack.docker_compose_file.params, {}, endpoints.stack.docker_compose_file.post_req_type>(endpoints.stack.docker_compose_file.url, authenticationRequred, async (req, res) => {
        if (docker.available) {
            if (await applications.writeProjectFile(req.params.name, req.body.content)) {
                res.sendStatus(200);
            } else {
                res.sendStatus(500);
            }
        } else {
            res.sendStatus(500);
        }
    });

    app.get<endpoints.stack.docker_compose.logs.params>(endpoints.stack.docker_compose.logs.url, (req, res) => {
        if (docker.available) {
            res.writeHead(200, {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Content-Encoding': 'none'
            });

            applications.composeLogs(req.params.name, (chunk: Buffer) => {
                res.write(chunk);
            }).then(() => {
            });
        } else {
            res.sendStatus(500);
        }
    });
};
