import { Express, RequestHandler, Request, Response } from "express";
import { endpoints } from "../lib/api";
import { Zfs } from "../lib/zfs";
import { authenticationRequred } from "../lib/policies";

export default function (app: Express, zfs: Zfs) {
    app.get<{}, endpoints.snapshot.list.resp_type, {}, endpoints.snapshot.list.query_type>(endpoints.snapshot.list.url, authenticationRequred, async (req, res) => {
        if (typeof(req.query.dataset) == 'string' && zfs.available) {
            const resp: endpoints.snapshot.list.resp_type = (await zfs.getSnapshots(req.query.dataset)).sort((a, b) => (a.name < b.name) ? 1 : -1);
            res.send(resp);
        } else {
            res.sendStatus(500);
        }
    });

    app.post<{}, endpoints.snapshot.create.error_resp_type, endpoints.snapshot.create.req_type, {}>(endpoints.snapshot.create.url, authenticationRequred, async (req, res) => {
        if (!Zfs.isPathValid(req.body.dataset)) {
            res.status(400);
            res.send(<endpoints.snapshot.create.error_resp_type> {
                message: 'Dataset path is not valid.'
            });
            return;
        }
        if (!Zfs.isNameValid(req.body.name)) {
            res.status(400);
            res.send(<endpoints.snapshot.create.error_resp_type> {
                message: 'Snapshot name is not valid.'
            });
            return;
        }

        if (!zfs.available) {
            res.status(500);
            res.send(<endpoints.snapshot.create.error_resp_type> {
                message: 'ZFS is not available on host.'
            });
            return;
        }

        try {
            await zfs.createSnapshot(req.body.dataset, req.body.name);
            res.sendStatus(200);
        } catch (e) {
            res.status(500);
            res.send(<endpoints.snapshot.create.error_resp_type> {
                message: 'ZFS command failed.'
            });
            return;
        }
    });

    app.post<{}, endpoints.snapshot.clone.error_resp_type, endpoints.snapshot.clone.req_type, {}>(endpoints.snapshot.clone.url, authenticationRequred, async (req, res) => {
        if (!Zfs.isPathValid(req.body.dataset_path)) {
            res.status(400);
            res.send(<endpoints.snapshot.create.error_resp_type> {
                message: 'Original dataset path is not valid.'
            });
            return;
        }

        if (!Zfs.isNameValid(req.body.snapshot_name)) {
            res.status(400);
            res.send(<endpoints.snapshot.create.error_resp_type> {
                message: 'Snapshot name is not valid.'
            });
            return;
        }

        if (!Zfs.isPathValid(req.body.clone_path)) {
            res.status(400);
            res.send(<endpoints.snapshot.create.error_resp_type> {
                message: 'Destination path is not valid.'
            });
            return;
        }

        if (!zfs.available) {
            res.status(500);
            res.send(<endpoints.snapshot.create.error_resp_type> {
                message: 'ZFS is not available on host.'
            });
            return;
        }

        try {
            await zfs.cloneSnapshotToDataset(req.body.dataset_path, req.body.snapshot_name, req.body.clone_path);
            res.sendStatus(200);
        } catch (e: any) {
            res.status(500);
            res.send(<endpoints.snapshot.create.error_resp_type> {
                message: `ZFS command failed: ${e.message}`
            });
        }
    });
}
