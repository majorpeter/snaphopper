<template>
    <h3>Change password</h3>

    <div class="alert alert-success alert-dismissible fade show" role="alert" v-if="status=='success'">
        Configuration successfully saved!
        <button type="button" class="btn-close" aria-label="Close" @click="status='idle'"></button>
    </div>

    <div class="alert alert-danger alert-dismissible show" role="alert" v-if="status=='error'">
        Could not set new password!
        <button type="button" class="btn-close" aria-label="Close" @click="status='idle'"></button>
    </div>

    <div class="alert alert-danger show" role="alert" v-if="passwordMissmatch">
        New passwords do not match.
    </div>

    <form @submit.prevent="changePassword"><fieldset>
        <div class="form-group row mb-2">
            <label for="currentPassword" class="col-sm-3 col-form-label">Current password:</label>
            <div class="col-sm-3">
                <input type="password" class="form-control" id="currentPassword" v-model="currentPassword"/>
            </div>
        </div>

        <div class="form-group row mb-2">
            <label for="newPassword" class="col-sm-3 col-form-label">New password:</label>
            <div class="col-sm-3">
                <input type="password" class="form-control" id="newPassword" v-model="newPassword"/>
            </div>
        </div>

        <div class="form-group row mb-2">
            <label for="repNewPassword" class="col-sm-3 col-form-label">Repeat new password:</label>
            <div class="col-sm-3">
                <input type="password" class="form-control" id="repNewPassword" v-model="repNewPassword"/>
            </div>
        </div>

        <button type="submit" class="btn btn-primary" :disabled="!canSubmit">Change</button>
    </fieldset></form>
</template>

<script lang="ts">
import ApiClient from '@/services/ApiClient';
import { endpoints } from '@api';
import { defineComponent } from 'vue';

export default defineComponent({
    methods: {
        async changePassword() {
            try {
                await ApiClient().post(endpoints.config_change_password.url, <endpoints.config_change_password.type> {
                    current_pw: this.currentPassword,
                    new_pw: this.newPassword
                });
                this.currentPassword = this.newPassword = this.repNewPassword = ''
                this.status = 'success';
            } catch (e) {
                this.status = 'error';
            }
        }
    },
    computed: {
        passwordMissmatch() {
            return this.newPassword != this.repNewPassword;
        },
        canSubmit() {
            return this.currentPassword != '' && this.newPassword != '' && !this.passwordMissmatch;
        }
    },
    data() {
        return {
            status: <'idle'|'success'|'error'> 'idle',
            currentPassword: '',
            newPassword: '',
            repNewPassword: ''
        };
    }
});
</script>
