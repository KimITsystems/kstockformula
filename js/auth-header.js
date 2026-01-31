import { initAuthState } from "./auth-state.js";

const headerNav = document.getElementById("headerNav");
const isScreenerPage =
  /screener\.html$/i.test(window.location.pathname) ||
  window.location.href.includes("screener.html");

if (headerNav || isScreenerPage) {
  initAuthState({
    requireAuth: isScreenerPage,
    headerNav: headerNav || null,
  });
}
