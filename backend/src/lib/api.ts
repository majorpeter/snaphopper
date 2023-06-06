export namespace endpoints {
    export namespace stack_list {
        export const url = '/stacks';
        export interface type {
            connected: boolean;
            projects: {[key: string]: {
                    containers: {
                        name: string;
                        service: string;
                        image_name: string;
                        image_hash: string;
                    }[];
                    updateAvailable: boolean;
                }
            };
        };
    }

    export namespace config {
        export const url = '/config';
        export interface type {
            port: number;
            ssh_host: string;
            ssh_username: string;
            ssh_privkey_path: string;
        };
    }

    export namespace container {
        export const url_fmt = '/container/:name';
    }
}
