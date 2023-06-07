export namespace endpoints {
    export namespace stack_list {
        export const url = '/api/stacks';
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
        export const url = '/api/stack/:name';

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
            zfs_available: boolean;
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
            export const url = "/api/stack/:name/compose";
        }
    }

    export namespace snapshot {
        export namespace create {
            export const url = '/api/snapshot/create';

            export interface type {
                dataset: string;
                name: string;
            }

            export interface response_type {
                message: string;
            }
        }
    }

    export namespace config {
        export const url = '/api/config';
        export interface type {
            port: number;
            ssh_host: string;
            ssh_username: string;
            ssh_privkey?: string;  // cannot be downloaded
            ssh_privkey_present?: boolean; // instead of downloading
        };
    }

    export namespace container {
        export const url_fmt = '/api/container/:name';
    }
}
