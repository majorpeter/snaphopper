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
                    //TODO updateAvailable: boolean;
                }
            };
        };
    }

    export namespace stack {
        export const url = '/stack/:name';

        export interface type {
            containers: {
                name: string;
                service: string;
                image: {
                    name: string;
                    hash: string;
                    url: string|null;
                    base: string|null;
                    base_url: string|null;
                };
                state: string;
            }[];
            working_directory: string;
            compose_config_file: string;
            zfs_dataset: null|{
                name: string;
                used: string;
                referenced: string;
            };
            zfs_snapshots: {
                name: string;
                used: string;
                referenced: string;
            }[];
            working_directory_error: boolean;
        };

        export namespace docker_compose_file {
            export const url = "/stack/:name/compose";
        }
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
