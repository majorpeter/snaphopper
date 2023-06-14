import { DockerHub } from "../../lib/dockerhub";

describe("DockerHub repo name checks", () => {
    test("ghcr.io is token error", () => {
        expect(DockerHub.splitImageName('ghcr.io/hassio-addons/vscode/amd64:5.6.0').error).toEqual('access_token_required');
    });

    test("homeassistant is in group", () => {
        const result = DockerHub.splitImageName('homeassistant/home-assistant');
        expect(result.result!).toEqual({
            imagePath: 'homeassistant/home-assistant',
            imageRegistryApi: 'registry-1.docker.io',
            imageTag: 'latest'
        });
    });

    test("nginx not in group", () => {
        const result = DockerHub.splitImageName('nginx');
        expect(result.result!).toEqual({
            imagePath: 'library/nginx',
            imageRegistryApi: 'registry-1.docker.io',
            imageTag: 'latest'
        });
    });
});
