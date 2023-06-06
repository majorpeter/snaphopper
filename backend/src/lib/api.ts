export namespace endpoints {
    export namespace stack_list {
        export const url = '/stacks';
        export interface type {
            [key: string]: {
                containers: string[];
                updateAvailable: boolean;
            };
        };
    }

    export namespace container {
        export const url_fmt = '/container/:name';
    }
}
