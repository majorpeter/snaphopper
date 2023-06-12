import { Express } from "express";
import { endpoints } from "../lib/api";
import { DockerHub } from "../lib/dockerhub";

class UpdateChecker {
    #cache: {[image_name: string]: {
        latest_hash: string
        check_timestamp: number;
    }} = {};

    static max_cache_age_ms = 5 * 60 * 1000;

    async #fetchLatestHashForImage(image_name: string): Promise<boolean> {
        try {
            const remote_hash = (await DockerHub.getManifest(image_name))?.config.digest;
            if (remote_hash) {
                this.#cache[image_name] = {
                    latest_hash: remote_hash,
                    check_timestamp: new Date().getTime()
                };
                return true;
            }
        } catch (e) {
            //TODO
        }
        return false;
    }

    #isCached(image_name: string): boolean {
        if (Object.keys(this.#cache).includes(image_name)) {
            const age = new Date().getTime() - this.#cache[image_name].check_timestamp;
            if (age < UpdateChecker.max_cache_age_ms) {
                return true;
            }
        }
        return false;
    }

    async isUpdateAvailable(image_name_with_tag: string, current_hash: string): Promise<'outdated'|'up-to-date'|'error'> {
        const image_name = image_name_with_tag.split(':')[0];
        if (!this.#isCached(image_name)) {
            if (!await this.#fetchLatestHashForImage(image_name)) {
                return 'error'
            }
        }

        if (this.#cache[image_name].latest_hash != current_hash) {
            return 'outdated';
        }

        return 'up-to-date';
    }
}

export default function (app: Express) {
    const checker: UpdateChecker = new UpdateChecker();

    app.get<{}, endpoints.updates.resp_type, {}, endpoints.updates.query>(endpoints.updates.url, async (req, res) => {
        res.send({
            state: await checker.isUpdateAvailable(req.query.image_name, req.query.current_hash)
        });
    });
};
