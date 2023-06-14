import { Zfs } from "../../lib/zfs";

describe("ZFS tests", () => {
    test("zfs not available without adapter", () => {
        const zfs = new Zfs();
        expect(zfs.available).toBe(false);
    });

    test("dataset fs usage", async() => {
        const zfs = new Zfs();
        await zfs.setAdapter(async(command, args) => {
            if (args.includes('-H') && args.indexOf('-o') + 1 == args.indexOf('used,referenced')) {
                return '1 Gb\t2 Gb';
            }
            return '';
        });
        expect(await zfs.getDataSetFsUsage('data/test')).toEqual({
            used: '1 Gb',
            referenced: '2 Gb'
        });
    });

    test("snapshot listing", async() => {
        const test_data: {name: string;
            used: string;
            referenced: string}[] = [{
                name: 'asd',
                referenced: '2 Gb',
                used: '1 Gb'
            }, {
                name: 'test_data',
                referenced: '5 Gb',
                used: '3 Gb'
            }];

        const zfs = new Zfs();
        await zfs.setAdapter(async(command, args) => {
            if (args.includes('-H') && args.indexOf('-o') + 1 == args.indexOf('name,used,referenced') && args.indexOf('-t') + 1 == args.indexOf('snapshot')) {
                return test_data.map(i => `dataset@${i.name}\t${i.used}\t${i.referenced}`).join('\n');
            }
            return '';
        });
        expect(await zfs.getSnapshots('data/test')).toEqual(test_data);
    });
});
