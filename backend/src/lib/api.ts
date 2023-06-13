export namespace endpoints {
    export type DockerContainerStatus = 'N/A' | 'created'|'running'|'paused'|'restarting'|'removing'|'exited'|'dead';

    export type ServiceData = {
        dockerfile_image?: {
            name?: string;
            url?: string;
            id?: string;
            digest?: string;
            custom_build?: 'local'|'git';
        }
        existing_image?: {
            name: string;
            id: string;
            digest?: string;
            url?: string;
            base?: string;
            base_url?: string;
        };
        container_name?: string;
        status: DockerContainerStatus;
    };

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
                    status: 'ok'|'invalid_compose_file'|'access_error',
                    services: {[service_name: string]: ServiceData};
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
            services: {[service_name: string]: ServiceData};
            working_directory?: string;
            compose_config_file_name?: string;
            compose_config_invalid?: boolean;
            zfs_available: boolean;
            zfs_dataset: null|{
                name: string;
                used: string;
                referenced: string;
            };
            working_directory_error: boolean;
        };

        export namespace docker_compose_file {
            export const url = "/api/stack/:name/compose_file";

            export type params = {
                name: string
            };
            export type get_resp_type = string;
            export type post_req_type = {
                content: string;
            };
        }

        export namespace docker_compose {
            export const url = "/api/stack/:name/compose";
            export type params = {
                name: string
            };
            export type post_req_type = {
                command: 'up'|'down'|'build';
            };
            export type post_resp_type = string;

            export namespace logs {
                export const url = "/api/stack/:name/compose/logs";
                export type params = {
                    name: string
                };
            }
        }

        export namespace git {
            export const url = "/api/stack/:name/git";
            export type params = {
                name: string
            };
            export type post_req_type = {
                service_name: string;
            };
            export type post_resp_type = string;
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

        export namespace rollback {
            export const url = '/api/snapshot/rollback';

            export interface req_type {
                dataset_path: string;
                snapshot_name: string;
            }

            export interface error_resp_type {
                message: string;
            }
        }

        export namespace remove {
            export const url = '/api/snapshot/remove';

            export interface req_type {
                dataset_path: string;
                snapshot_name: string;
            }

            export interface error_resp_type {
                message: string;
            }
        }
    }

    export namespace updates {
        export const url = '/api/updates';
        export type query = {
            image_name: string;
            id: string;
            digest: string;
        };
        export type resp_type = {
            state: 'up-to-date'|'outdated'|'check_disabled'|'access_token_required'|'unknown_content_type'|'rate_limit'|'unknown_error'
            latest_hash?: string
        };
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
}
