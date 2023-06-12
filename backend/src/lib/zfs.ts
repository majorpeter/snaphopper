export type exec = (command: string, args: string[]) => Promise<string>;

export class Zfs {
    private exec: exec|undefined;
    private zfsAvailable: boolean = false;

    setAdapter(exec: exec|undefined) {
        this.zfsAvailable = false;
        this.exec = exec;

        if (this.exec) {
            this.exec('sudo', ['zfs', 'list']).then(() => {
                this.zfsAvailable = true;
            }).catch(() => {
                console.log('ZFS functionality not available.');
            });
        }
    }

    public get available(): boolean {
        return this.zfsAvailable;
    }

    async getMountPoints(): Promise<{[key: string]: string}> {
        let result = <{[key: string]: string}>{};
        const output = await this.exec!('sudo', ['zfs', 'list', '-H', '-o', 'name,mountpoint']);
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

    async getDataSetFsUsage(dataset: string): Promise<{
        used: string;
        referenced: string;
    }> {
        const output = (await this.exec!('sudo', ['zfs', 'list', '-H', '-o', 'used,referenced', dataset])).split('\t');
        return {
            used: output[0],
            referenced: output[1]
        };
    }

    async getSnapshots(dataset: string): Promise<{
        name: string;
        used: string;
        referenced: string;
    }[]> {
        let result: {
            name: string;
            used: string;
            referenced: string;
        }[] = [];
        const output = await this.exec!('sudo', ['zfs', 'list', '-H', '-o', 'name,used,referenced', '-t', 'snapshot', dataset]);
        if (output.length > 0) {
            for (const line of output.split('\n')) {
                const parts = line.split('\t');
                result.push({
                    name: parts[0].split('@')[1],
                    used: parts[1],
                    referenced: parts[2]
                })
            }
        }
        return result;
    }

    async createSnapshot(dataset: string, snapshotName: string) {
        await this.exec!('sudo', ['zfs', 'snapshot', dataset + '@' + snapshotName]);
    }

    async cloneSnapshotToDataset(dataset: string, snapshotName: string, clonedDataset: string) {
        await this.exec!('sudo', ['zfs', 'clone', dataset + '@' + snapshotName, clonedDataset]);
    }

    async rollbackSnapshot(dataset: string, snapshotName: string) {
        await this.exec!('sudo', ['zfs', 'rollback', dataset + '@' + snapshotName]);
    }

    async removeSnapshot(dataset: string, snapshotName: string) {
        await this.exec!('sudo', ['zfs', 'destroy', dataset + '@' + snapshotName]);
    }

    /**
     * @see https://docs.oracle.com/cd/E19253-01/819-5461/gbcpt/index.html
     */
    static isNameValid(name: string): boolean {
        const pattern = RegExp(/^([a-zA-Z0-9_\-\.])+$/);
        return Boolean(name.match(pattern));
    }

    static isPathValid(path: string): boolean {
        return path.split('/').every((value) => Zfs.isNameValid(value));
    }
};
