import yaml from 'js-yaml';

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

    async getProjects() {
        let result: {[key: string]: {
            compose?: DockerComposeYaml
        }} = {};
        if (this.#path && this.#exec) {
            const folders = await this.getProjectFolders();
            for (const f of folders) {
                try {
                    const yamlContent = await this.#exec('cat', [this.#path + '/' + f + '/' + 'docker-compose.yml']);
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
