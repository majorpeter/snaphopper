export type exec = (command: string, args: string[]) => Promise<string>;

export class Zfs {
    _exec: exec;
    constructor(exec: exec) {
        this._exec = exec;
    }

    async getMountPoints(): Promise<{[key: string]: string}> {
        let result = <{[key: string]: string}>{};
        const output = await this._exec('sudo', ['zfs', 'list', '-H', '-o', 'name,mountpoint']);
        for (const line of output.split('\n')) {
            const parts = line.split('\t');
            result[parts[0]] = parts[1];
        }
        return result;
    }

    async getDataSetByMountPoint(mountPoint: string): Promise<string|null> {
        const mountPoints = await this.getMountPoints();
        const match = Object.entries(mountPoints).find((value) => value[1] == mountPoint);
        return match ? match[0] : null;
    }
};
