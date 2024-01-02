import { Express } from 'express';
import { authenticationRequred, isWsTokenValid } from '../lib/policies';
import { endpoints } from '../lib/api';
import { ContainerInfo, Docker, ImageInfo } from '../lib/docker';
import { Zfs } from '../lib/zfs';
import { DockerHub } from '../lib/dockerhub';
import { Applications, DockerComposeYaml } from '../lib/applications';
import ws from 'ws';
import http from 'http';

export default function(app: Express, server: http.Server, docker: Docker, applications: Applications, zfs: Zfs) {
    async function extractServiceData(project_name: string, project: DockerComposeYaml, stack: ContainerInfo[]|null) {
        let result: {[name: string]: endpoints.ServiceData} = {};

        for (const service_name of Object.keys(project.services)) {
            const image_name = project.services[service_name].image;
            let image_data: ImageInfo[] = [];
            if (image_name) {
                try {
                    image_data = await docker.inspectImages([image_name]);
                } catch (e) {}
            }


            let custom_build: Exclude<endpoints.ServiceData['dockerfile_image'], undefined>['custom_build'];
            if (project.services[service_name].build != undefined) {
                if (await applications.isCustomContainerGitRepo(project_name, project.services[service_name].build!)) {
                    custom_build = 'git';
                } else {
                    custom_build = 'local';
                }
            }

            result[service_name] = {
                dockerfile_image: {
                    name: image_name,
                    url: image_name ? DockerHub.getUrl(image_name.split(':')[0]) : undefined,
                    id: image_data.length ? image_data[0].Id : undefined,
                    digest: image_data.length && image_data[0].RepoDigests.length ? image_data[0].RepoDigests[0].split('@')[1] : undefined,
                    custom_build: custom_build
                },
                status: 'N/A'
            };
        }

        if (stack) {
            for (const value of stack) {
                const service_name = value.Config.Labels[Docker.serviceNameLabel];

                if (!Object.keys(result).includes(service_name)) {
                    result[service_name] = {
                        status: 'N/A'
                    };
                }

                const service = result[service_name];
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

        return result;
    }

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
                    services: {}
                };

                if (apps[project_name].compose) {
                    try {
                        data.projects[project_name].services = await extractServiceData(project_name, apps[project_name].compose!, projects[project_name]);
                    } catch (e) {
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
                const stack = await docker.getDockerComposeProject(req.params.name);
                if (project) {
                    try {
                        data.services = await extractServiceData(req.params.name, project, stack);
                    } catch (e) {
                        data.compose_config_invalid = true;
                    }
                }

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
        } else if (req.body.command == 'pull') {
            res.writeHead(200, {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Content-Encoding': 'none'
            });
            await applications.composePull(req.params.name, (chunk: Buffer) => {
                res.write(chunk);
            });
            res.end();
        } else if (req.body.command == 'build') {
            res.writeHead(200, {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Content-Encoding': 'none'
            });
            await applications.composeBuild(req.params.name, (chunk: Buffer) => {
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

    const logServer = new ws.Server({server: server, path: endpoints.stack.docker_compose.logs.url});
    logServer.on('connection', (socket, _request) => {
        if (docker.available) {
            socket.onmessage = (event: ws.MessageEvent) => {
                socket.onmessage = null;

                const initMessage = <endpoints.stack.docker_compose.logs.param> JSON.parse(<string> event.data);
                if (isWsTokenValid(initMessage.token)) {
                    applications.composeLogsStream(initMessage.stack_name, (chunk) => {
                        socket.send(chunk.toString());
                    }).then(closeCallback => {
                        socket.on('close', (_code, _reason) => {
                            closeCallback();
                        });
                    });
                } else {
                    socket.send('Token invalid!');
                    socket.close();
                }
            }
        }
    });

    app.post<endpoints.stack.git.params, endpoints.stack.git.post_resp_type, endpoints.stack.git.post_req_type>(endpoints.stack.git.url, async (req, res) => {
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Content-Encoding': 'none'
        });

        await applications.pullCustomContainerGitRepo(req.params.name, req.body.service_name, (chunk: Buffer) => {
            res.write(chunk);
        });
        res.end();
    });
};
