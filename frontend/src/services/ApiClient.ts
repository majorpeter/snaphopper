import { MutationTypes, store } from "@/store"
import axios from "axios"

export function WebSocketClient(path: string): WebSocket & {token: Readonly<string>} {
    const c = <WebSocket & {token: string}> new WebSocket((location.protocol == 'https:' ? 'wss://' : 'ws://') + location.host + path);
    c.token = store.state.token;        // this token can be used for authentication in the first message
    return c;
}

export default () => {
    const instance = axios.create({
        headers: {
            Authorization: `Bearer ${store.state.token}`
        }
    });

    instance.interceptors.response.use(function (response) {
        return response;
    }, function (error) {
        // force logout & login if token expired
        if (error.response.status == 403) {
            store.commit(MutationTypes.logout);

            // cannot use router to redirect: router may not be available from calling context (while navigating)
            location.reload();
        } else {
            throw error;
        }
    });
    return instance;
}
