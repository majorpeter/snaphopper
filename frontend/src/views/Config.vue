<template>
    <h2><img src="@/svg/operations-icon.svg" class="d-inline-block align-middle"/> Configuration</h2>

    <form @submit.prevent="submit">
        <div class="alert alert-success alert-dismissible fade show" role="alert" v-if="saved">
          Configuration successfully saved!
          <button type="button" class="btn-close" aria-label="Close" @click="saved=false"></button>
        </div>

        <div class="alert alert-danger show" role="alert" v-if="error">
            Configuration could not be saved.
        </div>

        <fieldset :disabled="!loaded">
            <div class="form-group row mb-2">
                <label for="portNumber" class="col-sm-3 col-form-label">Listening port number</label>
                <div class="col-sm-3">
                    <input type="number" class="form-control" id="portNumber" placeholder="port" v-model="config.port"/>
                </div>
            </div>

            <div class="form-group row mb-2">
                <label class="col-sm-3" for="sshUser">SSH user & host</label>
                <div class="col-sm-2 pe-0">
                    <input type="text" class="form-control" id="sshUser" placeholder="user" v-model="config.ssh_username"/>
                </div>
                <div class="col-sm-3 ps-0">
                    <div class="input-group">
                        <div class="input-group-prepend">
                            <span class="input-group-text" id="inputGroupPrepend">@</span>
                        </div>
                        <input type="text" class="form-control" id="sshHost" placeholder="hostname" v-model="config.ssh_host"/>
                    </div>
                </div>
            </div>

            <div class="form-group row mb-2">
                <label class="col-sm-3" for="sshPrivKey">SSH private key</label>
                <div class="col-sm-4">
                    <input type="file" class="form-control" id="sshPrivKey" @change="sshPrivKeyUploaded"/>
                <div class="form-text">
                    <span v-if="config.ssh_privkey_present" class="badge rounded-pill bg-success" title="Already uploaded">Available</span>
                    Private key cannot be downloaded for safety reasons.</div>
                </div>
            </div>

            <button type="submit" class="btn btn-primary" :disabled="saving">
                <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true" v-if="saving"></span>
                Submit
            </button>
    </fieldset>
    </form>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { endpoints } from '@api';
import ApiClient from '@/services/ApiClient';

export default defineComponent({
  data() {
    return {
      config: <endpoints.config.type> {},
      loaded: false,
      saving: false,
      saved: false,
      error: false
    };
  },
  methods: {
    async submit() {
        this.saving = true;
        this.saved = this.error = false;

        try {
            await ApiClient().post(endpoints.config.url, this.config);
            this.saved = true;
        } catch (e) {
            this.error = true;
        } finally {
            this.saving = false;
        }
    },
    async sshPrivKeyUploaded(e: any) {
        const f: File = e.target.files[0];
        const fr = new FileReader();
        fr.onload = (ev: any) => {
            this.config.ssh_privkey = ev.target.result;
        };
        fr.readAsText(f);
    }
  },
  async created() {
    this.config = (await ApiClient().get(endpoints.config.url)).data;
    this.loaded = true;
  }
});
</script>
