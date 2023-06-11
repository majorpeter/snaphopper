import yaml from 'js-yaml';
import { Docker } from './docker';

export type exec = (command: string, args: string[], stdin?: string) => Promise<string>;

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
        const contents = await this.getProjectFileText(name);
        if (contents) {
            return <DockerComposeYaml> yaml.load(contents);
        }
        return null;
    }

    async getProjectFileText(name: string): Promise<string|null> {
        if (this.#path && this.#exec && await this.projectExists(name)) {
            try {
                return await this.#exec('cat', [this.#path + '/' + name + '/' + Docker.ConfigFileName]);
            } catch (e) {
            }
        }
        return null;
    }

    async writeProjectFile(name: string, contents: string): Promise<boolean> {
        if (this.#path && this.#exec && await this.projectExists(name)) {
            try {
                await this.#exec('tee', [this.#path + '/' + name + '/' + Docker.ConfigFileName], contents);
                return true;
            } catch (e) {
            }
        }
        return false;
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
