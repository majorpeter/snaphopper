import { createStore, Store as VuexStore } from 'vuex'

export interface State {
    isLoggedIn: boolean
}

export const store = createStore<State>({
    strict: true,
    state() {
        return {
            isLoggedIn: false
        };
    },
    mutations: {
        login(state, payload) {
            state.isLoggedIn = true;
        },
        logout(state) {
            state.isLoggedIn = false;
        }
    }
});

export type Store = VuexStore<State>;
