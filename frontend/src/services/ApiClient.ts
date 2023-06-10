import { MutationTypes, store } from "@/store"
import axios from "axios"

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
