<template>
    <header class="d-flex flex-wrap justify-content-center py-3 mb-4 border-bottom">
        <router-link :to="{name: 'home'}" class="d-flex align-items-center mb-3 mb-md-0 me-md-auto link-body-emphasis text-decoration-none">
            <img src="@/svg/clock-rotate-left-icon.svg" class="d-inline-block align-middle"/>
            <span class="fs-4">snaphopper</span>
        </router-link>
        <ul class="nav nav-pills">
            <li class="nav-item">
                <router-link :to="{name: 'home'}" class="nav-link">Stacks</router-link>
            </li>
            <li class="nav-item">
                <router-link :to="{name: 'config'}" class="nav-link">Config</router-link>
            </li>
            <li class="nav-item">
                <!--TODO-->
                <a href="/logout" class="nav-link">Logout</a>
            </li>
        </ul>
    </header>
</template>

<style scoped>
header > a > img {
    height: 40px;
    margin-right: 8px;
}
</style>
