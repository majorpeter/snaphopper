<template>
<div class="d-flex flex-column gap-4 py-md-5 align-items-center justify-content-center">
    <div class="card" id="loginCard">
        <div class="card-header">
            <h5 class="card-title">Log in to snaphopper</h5>
            <p class="card-text">
                Please provide credentials for login.
            </p>
        </div>
        <div class="card-body">
            <div class="row g-0">
                <div class="col-md-4" id="imageCol">
                    <p class="text-center">
                        <img src="@/svg/secure-account-icon.svg" style="max-width: 64px;"/>
                    </p>
                </div>
                <div class="col-md-8">
                    <p class="card-text">
                        <div class="form-floating mb-3">
                            <input type="text" class="form-control" id="userName" value="admin" readonly/>
                            <label for="userName">User</label>
                        </div>
                        <div class="form-floating mb-3">
                            <input type="password" class="form-control" @keypress="onPasswordKeyPressed" id="password" autofocus/>
                            <label for="password">Password</label>
                        </div>
                    </p>
                </div>
            </div>
        </div>
        <div class="card-footer text-center">
            <button class="btn btn-primary" @click="login">Log in</button>
        </div>
    </div>
</div>
</template>

<script lang="ts">
import paths from '@/router/paths';
import { MutationTypes } from '@/store';
import { defineComponent } from 'vue';

export default defineComponent({
    methods: {
        login() {
            //TODO actual login check

            //TODO token
            this.$store.commit(MutationTypes.login, 'mytoken');
            this.$router.push(paths.home);
        },
        onPasswordKeyPressed(e: KeyboardEvent) {
            if (e.key == 'Enter') {
                this.login();
            }
        }
    }
});
</script>

<style>
div#loginCard {
    width: 450px;
}

div#imageCol {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
}
div#imageCol > p {
    width: 100%;
}
</style>
