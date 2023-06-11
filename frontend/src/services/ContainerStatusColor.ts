import { endpoints } from "@api";

export default function (status: endpoints.DockerContainerStatus) {
    switch (status) {
        case 'running':
            return 'text-success';
        case 'N/A':
            return 'text-muted';
        case 'restarting':
        case 'removing':
        case 'exited':
        case 'dead':
            return 'text-warning';
    }
    return '';
}
