import { store } from "@/store"
import axios from "axios"

export default () => {
    return axios.create({
        headers: {
            Authorization: `Bearer ${store.state.token}`
        }
    });
}
