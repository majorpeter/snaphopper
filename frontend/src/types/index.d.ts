import { Store } from "@/store";
import { Router, RouteLocation } from "vue-router";

declare module "@vue/runtime-core" {
  interface ComponentCustomProperties {
    $store: Store;
    $route: RouteLocation;
    $router: VueRouter;
  }
}
