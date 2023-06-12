import { Express } from "express";
import { endpoints } from "../lib/api";
import { DockerHub } from "../lib/dockerhub";

class UpdateChecker {
    private cache: {[image_name: string]: {
        latest_hash: string
        check_timestamp: number;
    }} = {};

    private referenceCache: {[reference: string]: string|null} = {};

    static max_cache_age_ms = 5 * 60 * 1000;

    async #fetchLatestHashForImage(image_name: string): Promise<boolean> {
        try {
            const manifest = (await DockerHub.getManifest(image_name));

            let remote_hash;
            if (manifest.dockerManifest) {
                remote_hash = manifest.dockerManifest.config.digest;
            } else if (manifest.ociImageIndex) {
                remote_hash = UpdateChecker.getHashForPlatform(manifest.ociImageIndex);
            }

            if (remote_hash) {
                this.cache[image_name] = {
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
        if (Object.keys(this.cache).includes(image_name)) {
            const age = new Date().getTime() - this.cache[image_name].check_timestamp;
            if (age < UpdateChecker.max_cache_age_ms) {
                return true;
            }
        }
        return false;
    }

    static getHashForPlatform(ociImageIndex: Exclude<DockerHub.ManifestResponse['ociImageIndex'], undefined>): string|null {
        const match = ociImageIndex.manifests.find((value) => value.platform.architecture == 'amd64' && value.platform.os == 'linux');
        if (match) {
            return match.digest;
        }
        return null;
    }

    private async getHashForReference(reference: string): Promise<string|null> {
        if (!Object.keys(this.referenceCache).includes(reference)) {
            const manifest = await DockerHub.getManifestByReference(reference);
            if (manifest.ociImageIndex) {
                this.referenceCache[reference] = UpdateChecker.getHashForPlatform(manifest.ociImageIndex);
            }
        }
        return this.referenceCache[reference];
    }

    async isUpdateAvailable(image_name_with_tag: string, current_hash: string): Promise<'outdated'|'up-to-date'|'error'> {
        if (current_hash.indexOf('@') != -1) {
            const actualHash = await this.getHashForReference(current_hash);
            if (!actualHash) {
                return 'error';
            }
            current_hash = actualHash;
        }

        const image_name = image_name_with_tag.split(':')[0];
        if (!this.#isCached(image_name)) {
            if (!await this.#fetchLatestHashForImage(image_name)) {
                return 'error'
            }
        }

        if (this.cache[image_name].latest_hash != current_hash) {
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
