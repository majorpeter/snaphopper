import { CommitOptions, createStore, MutationTree, Store as VuexStore } from 'vuex'

export interface State {
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
        return {
            token: '',
            isLoggedIn: false
        };
    },
    mutations: mutations
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
