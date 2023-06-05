export namespace endpoints {
    export namespace stack_list {
        export const url = '/stacks';
        export interface type {
            name: string;
        };
    }

    export namespace container {
        export const url_fmt = '/container/:name';
    }
}
