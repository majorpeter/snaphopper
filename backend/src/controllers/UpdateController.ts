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

    private async fetchLatestHashForImage(image_name: string): Promise<boolean> {
        try {
            const manifest = (await DockerHub.getManifest(image_name));

            let remote_hash;
            if (manifest.dockerManifest) {
                remote_hash = manifest.dockerManifest.config.digest;
            } else if (manifest.ociImageIndex) {
                remote_hash = manifest.dockerContentDigest;
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

    private isCached(image_name: string): boolean {
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
            try {
                const manifest = await DockerHub.getManifestByReference(reference);
                if (manifest.ociImageIndex) {
                    this.referenceCache[reference] = UpdateChecker.getHashForPlatform(manifest.ociImageIndex);
                }
            } catch (e) {
                return null;
            }
        }
        return this.referenceCache[reference];
    }

    async isUpdateAvailable(image_name_with_tag: string, id: string, digest: string): Promise<endpoints.updates.resp_type> {
        const image_name = image_name_with_tag.split(':')[0];
        if (!this.isCached(image_name)) {
            if (!await this.fetchLatestHashForImage(image_name)) {
                return {state: 'error'};
            }
        }

        if ((this.cache[image_name].latest_hash != id) && (this.cache[image_name].latest_hash != digest)) {
            return {
                state: 'outdated',
                latest_hash: this.cache[image_name].latest_hash
            };
        }

        return {state:'up-to-date'};
    }
}

export default function (app: Express) {
    const checker: UpdateChecker = new UpdateChecker();

    app.get<{}, endpoints.updates.resp_type, {}, endpoints.updates.query>(endpoints.updates.url, async (req, res) => {
        res.send(await checker.isUpdateAvailable(req.query.image_name, req.query.id, req.query.digest));
    });
};
