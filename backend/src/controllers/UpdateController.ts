import { Express } from "express";
import { endpoints } from "../lib/api";
import { DockerHub } from "../lib/dockerhub";
import { AxiosError } from "axios";
import { Config } from "../lib/config";

export class UpdateChecker {
    private config: Readonly<Config.Type>;
    private cache: {[image_name: string]: {
        latest_hash: string
        check_timestamp: number;
    }} = {};

    private referenceCache: {[reference: string]: string|null} = {};

    static max_cache_age_ms = 5 * 60 * 1000;

    static stripImageTagFromName(name: string): string {
        return name.split(':')[0];
    }

    constructor(config: Readonly<Config.Type>) {
        this.config = config;
    }

    private async fetchLatestHashForImage(image_name: string): Promise<'ok'|'access_token_required'|'unknown_content_type'|'rate_limit'|'unknown_error'> {
        try {
            const manifest = (await DockerHub.getManifest(image_name));

            if (manifest.error) {
                return manifest.error;
            }
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
                return 'ok';
            }
        } catch (e) {
            if ((<AxiosError> e).response?.status == 429) {
                console.log('Ratelimit exceeded');
                return 'rate_limit';
            }
        }
        return 'unknown_error';
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
        if (this.config.container_update_checks) {
            const image_name = UpdateChecker.stripImageTagFromName(image_name_with_tag);
            if (!this.isCached(image_name)) {
                const fetchResult = await this.fetchLatestHashForImage(image_name);
                if (fetchResult != 'ok') {
                    return {state: fetchResult};
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
        return {state: 'check_disabled'};
    }
}

export default function (app: Express, config: Readonly<Config.Type>) {
    const checker: UpdateChecker = new UpdateChecker(config);

    app.get<{}, endpoints.updates.resp_type, {}, endpoints.updates.query>(endpoints.updates.url, async (req, res) => {
        res.send(await checker.isUpdateAvailable(req.query.image_name, req.query.id, req.query.digest));
    });
};
