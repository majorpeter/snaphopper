import { CommitOptions, createStore, MutationPayload, MutationTree, Store as VuexStore } from 'vuex'
import { version as appVersion } from '@/../package.json';

const localStorageVarName = 'store';

export interface State {
    /// used to validate versions for localStorage loads
    appVersion: string;
    token: string;
    isLoggedIn: boolean;
}

export enum MutationTypes {
    login = 'login',
    logout = 'logout',
}

export type Mutations<S=State> = {
    [MutationTypes.login](state: S, token: string): void;
    [MutationTypes.logout](state: S): void;
}

export const mutations: MutationTree<State> & Mutations = {
    [MutationTypes.login](state, token) {
        state.token = token;
        state.isLoggedIn = true;
    },
    [MutationTypes.logout](state) {
        state.token = '';
        state.isLoggedIn = false;
    },
};

export const store = createStore<State>({
    strict: true,
    state() {
        // try to restore previous state
        const storedJson = localStorage.getItem(localStorageVarName);
        if (storedJson) {
            const stored = JSON.parse(storedJson);
            if (stored.appVersion == appVersion) {
                return stored;
            }
        }

        // give defaults otherwise
        return {
            appVersion: appVersion,
            token: '',
            isLoggedIn: false
        };
    },
    mutations: mutations
});

store.subscribe((mutation: MutationPayload, state: State) => {
    localStorage.setItem(localStorageVarName, JSON.stringify(state));
});

// based onr https://dev.to/3vilarthas/vuex-typescript-m4j
export type Store = Omit<
    VuexStore<State>,
    'commit'
> & {
    commit<K extends keyof Mutations, P extends Parameters<Mutations[K]>[1]>(
        key: K,
        payload: P,
        options?: CommitOptions
        ): ReturnType<Mutations[K]>
};
