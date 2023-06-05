import path from 'path';

export type exec = (command: string, args: string[]) => Promise<string>;

export class Docker {
    _exec: exec;

    static projectLabel = 'com.docker.compose.project';
    static workingDirLabel = 'com.docker.compose.project.working_dir';
    static configFileNameLabel = 'com.docker.compose.project.config_files';
    static serviceNameLabel = 'com.docker.compose.service';

    static isContainerNameValid(name: string): boolean {
        return name.match(/^([a-zA-Z_\-1-9]+)$/) != null;
    }

    constructor(exec: exec) {
        this._exec = exec;
    }

    async getContainers(): Promise<string[]> {
        return (await this._exec('docker', ['container', 'ls', '--format', '{{.Names}}'])).split('\n');
    }

    async inspectContainers(names: string[]): Promise<[{
        Id: string;
        Created: string; //time
        Path: string;
        Args: string[];
        State: {
            Status: string;
            Running: boolean;
            Paused: boolean;
            Restarting: boolean;
            OOMKilled: boolean;
            Dead: boolean;
            Pid: number;
            ExitCode: number;
            Error: string;
            StartedAt: string; //time
            FinishedAt: string; //time
        };
        Image: string;
        Config: {
            Labels: {[key: string]: string};
        };
        Name: string;
    }]> {
        return JSON.parse(await this._exec('docker', ['container', 'inspect', ...names]));
    }

    async inspectImages(names: string[]): Promise<[{
        Id: string;
        RepoTags: string[];
        RepoDigests: string[];
        Created: string; //time
        Metadata: {
            LastTagTime: string;
        }
    }]> {
        return JSON.parse(await this._exec('docker', ['image', 'inspect', ...names]));
    }

    async getDockerComposeProjects(): Promise<Map<string, string[]>> {
        const containers = await this.getContainers();
        const container_data = await this.inspectContainers(containers);
    
        let result = new Map<string, string[]>()
        for (let i of container_data) {
            const project = i.Config.Labels[Docker.projectLabel];
            if (project !== undefined) {
                if (!result.has(project)) {
                    result.set(project, []);
                }
                result.get(project)?.push(i.Name.replace(/^\//,''));
            }
        }
        return result;
    }

    async getDockerComposeFile(containerName: string): Promise<string> {
        const data = await this.inspectContainers([containerName]);
        return this._exec('cat', [path.join(data[0].Config.Labels[Docker.workingDirLabel], data[0].Config.Labels[Docker.configFileNameLabel])]);
    }
};
