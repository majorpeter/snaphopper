import path from 'path';

export type exec = (command: string, args: string[]) => Promise<string>;

export interface ContainerInfo {
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
        Image: string;
        Labels: {[key: string]: string};
    };
    Name: string;
    Mounts: [{
        Type: string;
        Source: string;
        Destination: string;
        RW: boolean;
    }]
};

export interface ImageInfo {
    Id: string;
    RepoTags: string[];
    RepoDigests: string[];
    Created: string; //time
    Metadata: {
        LastTagTime: string;
    },
    Parent: string;
};

export class Docker {
    #exec: exec|undefined;

    static projectLabel = 'com.docker.compose.project';
    static workingDirLabel = 'com.docker.compose.project.working_dir';
    static configFileNameLabel = 'com.docker.compose.project.config_files';
    static serviceNameLabel = 'com.docker.compose.service';

    static isContainerNameValid(name: string): boolean {
        return name.match(/^([a-zA-Z_\-1-9]+)$/) != null;
    }

    setAdapter(exec: exec|undefined) {
        this.#exec = exec;
    }

    public get available(): boolean {
        return this.#exec !== undefined;
    }

    async getContainers(): Promise<string[]> {
        return (await this.#exec!('docker', ['container', 'ls', '--format', '{{.Names}}'])).split('\n');
    }

    async inspectContainers(names: string[]): Promise<ContainerInfo[]> {
        return JSON.parse(await this.#exec!('docker', ['container', 'inspect', ...names]));
    }

    async inspectImages(names: string[]): Promise<[ImageInfo]> {
        return JSON.parse(await this.#exec!('docker', ['image', 'inspect', ...names]));
    }

    async getDockerComposeProjects(): Promise<{[key: string]: ContainerInfo[]}> {
        const containers = await this.getContainers();
        const container_data = await this.inspectContainers(containers);
    
        let result = <{[key: string]: ContainerInfo[]}> {}
        for (let i of container_data) {
            const project = i.Config.Labels[Docker.projectLabel];
            if (project !== undefined) {
                if (!(project in result)) {
                    result[project] = [];
                }
                result[project]?.push(i);
            }
        }
        return result;
    }

    async getDockerComposeFile(composeProjectName: string): Promise<string|null> {
        const containers = await this.getContainers();
        const container_data = await this.inspectContainers(containers);

        for (const data of container_data) {
            if (data.Config.Labels[Docker.projectLabel] == composeProjectName) {
                return this.#exec!('cat', [path.join(data.Config.Labels[Docker.workingDirLabel], data.Config.Labels[Docker.configFileNameLabel])]);
            }
        }
        return null;
    }

    async extractBaseForCustomImage(image: ImageInfo): Promise<string|null> {
        while (image.Parent) {
            image = (await this.inspectImages([image.Parent]))[0];
        }
        if (image.RepoTags.length > 0) {
            return image.RepoTags[0];
        }

        return null;
    }

    static isCustomImage(image: ImageInfo): boolean {
        return image.Metadata.LastTagTime != '0001-01-01T00:00:00Z'
    }
};
