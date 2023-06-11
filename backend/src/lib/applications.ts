import yaml from 'js-yaml';
import { Docker } from './docker';

export type exec = (command: string, args: string[]) => Promise<string>;

export interface DockerComposeYaml {
    version: string;
    services: {[key: string]: {
        image?: string;
        build?: string;
        volumes?: string[];
        ports?: string[];
    }}
};

export class Applications {
    #exec: exec|undefined;
    #path: string|undefined;

    setPath(path?: string) {
        this.#path = path;
    }

    setAdapter(exec: exec|undefined) {
        this.#exec = exec;
    }

    async getProjectFolders(): Promise<string[]> {
        if (this.#path && this.#exec) {
            const output = (await this.#exec('ls', ['-F1', this.#path])).split('\n');
            return output
                .filter((value) => value.endsWith('/'))
                .map((value) => value.substring(0, value.length - 1));
        }
        return [];
    }

    async projectExists(name: string): Promise<boolean> {
        const projects = await this.getProjectFolders();
        return projects.includes(name);
    }

    getProjectWorkingDirectory(name: string) {
        return this.#path + '/' + name;
    }

    async getProject(name: string): Promise<DockerComposeYaml|null> {
        if (this.#path && this.#exec && await this.projectExists(name)) {
            try {
                return <DockerComposeYaml> yaml.load(await this.#exec('cat', [this.#path + '/' + name + '/' + Docker.ConfigFileName]));
            } catch (e) {
            }
        }
        return null;
    }

    async getAllProjects() {
        let result: {[key: string]: {
            compose?: DockerComposeYaml
        }} = {};
        if (this.#path && this.#exec) {
            const folders = await this.getProjectFolders();
            for (const f of folders) {
                try {
                    const yamlContent = await this.#exec('cat', [this.#path + '/' + f + '/' + Docker.ConfigFileName]);
                    result[f] = {
                        compose: <DockerComposeYaml> yaml.load(yamlContent)
                    };
                } catch (e) {
                    result[f] = {};
                }
            }
        }
        return result;
    }
}
