export namespace endpoints {
    export namespace login {
        export const url = '/api/logn';
        export interface type {
            password: string;
        };
        export interface resp_type {
            success: boolean;
            token?: string;
        };
    }

    export namespace stack_list {
        export const url = '/api/stacks';
        export interface type {
            connected: boolean;
            projects: {[key: string]: {
                    status: 'ok'|'access_error',
                    services: {
                        service_name: string;
                        container_name?: string;
                        image_name?: string;
                        image_hash?: string;
                        custom_build: boolean;
                        state: 'N/A' | 'created'|'running'|'paused'|'restarting'|'removing'|'exited'|'dead';
                    }[];
                    //TODO updateAvailable: boolean;
                }
            };
        };
    }

    export namespace stack {
        export const url = '/api/stack/:name';

        export type params = {
            name: string
        };

        export interface type {
            services: {[service_name: string]: {
                dockerfile_image?: {
                    name?: string;
                    url?: string;
                }
                existing_image?: {
                    name: string;
                    hash?: string;
                    url?: string;
                    base?: string;
                    base_url?: string;
                };
                container_name?: string;
                state: 'N/A' | 'created'|'running'|'paused'|'restarting'|'removing'|'exited'|'dead';
            }};
            working_directory?: string;
            compose_config_file_name?: string;
            zfs_available: boolean;
            zfs_dataset: null|{
                name: string;
                used: string;
                referenced: string;
            };
            working_directory_error: boolean;
        };

        export namespace docker_compose_file {
            export const url = "/api/stack/:name/compose";

            export type params = {
                name: string
            };
        }
    }

    export namespace snapshot {
        export namespace list {
            export const url = '/api/snapshot/list';
            export type query_type = {
                dataset: string;
            };
            export type resp_type = {
                name: string;
                used: string;
                referenced: string;
            }[];
        }

        export namespace create {
            export const url = '/api/snapshot/create';

            export interface req_type {
                dataset: string;
                name: string;
            }

            export interface error_resp_type {
                message: string;
            }
        }

        export namespace clone {
            export const url = '/api/snapshot/clone';
            export interface req_type {
                dataset_path: string;
                snapshot_name: string;
                clone_path: string;
            }

            export interface error_resp_type {
                message: string;
            }
        }
    }

    export namespace config {
        export const url = '/api/config';
        export interface type {
            port: number;
            ssh_host?: string;
            ssh_username?: string;
            ssh_privkey?: string;  // cannot be downloaded
            ssh_privkey_present?: boolean; // instead of downloading
            applications_path?: string;
        };
    }
    export namespace config_change_password {
        export const url = '/api/config/password';
        export interface type {
            current_pw: string;
            new_pw: string;
        };
    }

    export namespace container {
        export const url_fmt = '/api/container/:name';
    }
}
