import axios, { Axios, AxiosError } from 'axios'

export namespace DockerHub {
    /**
     * @see https://gitlab.com/MatthiasLohr/omnibus-gitlab-management-scripts/-/blob/main/docker-image-update-check.sh
     */
    export async function getManifest(imageName: string) {
        if (imageName.split(':')[0].split('/')[0].indexOf('.') != -1) {
            return null;    // custom registry not supported
        }

        let imageRegistry: string;
        let imageRegistryApi: string;
        let imagePathFull: string;
        if (imageName.indexOf('/') == -1) {
            imageRegistry = "docker.io";
            imageRegistryApi = "registry-1.docker.io";
            imagePathFull = "library/" + imageName;
        } else {
            imageRegistry = "docker.io";
            imageRegistryApi = "registry-1.docker.io";
            imagePathFull = imageName;
        }

        let imagePath: string;
        let imageTag: string;
        let imageLocal: string;
        if (imagePathFull.indexOf(':') != -1) {
            imagePath = imagePathFull.split(':')[0];
            imageTag = imagePathFull.split(':')[1];
            imageLocal = imageName;
        } else {
            imagePath = imagePathFull;
            imageTag = "latest";
            imageLocal= imageName + ':latest';
        }

        const manifestResp = await axios.get(`https://${imageRegistryApi}/v2/${imagePath}/manifests/${imageTag}`, {headers: {
            'Accept': 'application/vnd.docker.distribution.manifest.v2+json',
            'Authorization':  `Bearer ${await getAuthToken(imagePath)}`
        }});

        return manifestResp.data;
    }

    export async function getImageTags(name: string): Promise<string[]> {
        return (await axios.get(`https://registry-1.docker.io/v2/${name}/tags/list`, {headers: {
            'Authorization':  `Bearer ${await getAuthToken(name)}`
        }})).data.tags;
    }

    async function getAuthToken(imagePath:string): Promise<string> {
        const imageRegistryApi = "registry-1.docker.io";

        let authDomainService: string|null = null;
        try {
            await axios.head(`https://${imageRegistryApi}/v2/`);
        } catch (e: any) {
            if (e.response.status == 401) {
                const header = <string> e.response.headers['www-authenticate'];
                authDomainService = header.substring(header.indexOf('=') + 1).replace(',', '?').replace(/"/g, '');
            }
        }

        const authScope = `repository:${imagePath}:pull`
        return (await axios.get(`${authDomainService}&scope=${authScope}&offline_token=1&client_id=shell`)).data.token;
    }

    export function getUrl(name: string): string {
        if (name.indexOf('/') != -1) {
            return 'https://hub.docker.com/r/' + name;
        } else {
            return 'https://hub.docker.com/_/' + name;
        }
    }
}
