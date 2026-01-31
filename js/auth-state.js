import { auth } from "./firebase.js";
import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";

const LOGGED_OUT_NAV_HTML =
  '<a href="register.html" class="nav-btn">회원가입</a><a href="login.html" class="nav-btn nav-btn-outline">로그인</a>';
const LOGOUT_BTN_HTML =
  '<button type="button" class="nav-btn nav-btn-outline" id="logoutBtn">로그아웃</button>';

/**
 * Initialize auth state listener and optional UI/redirect behavior.
 * @param {Object} options
 * @param {boolean} [options.requireAuth] - If true, redirect to login.html when not logged in
 * @param {HTMLElement} [options.headerNav] - Header nav element to show 회원가입/로그인 or 로그아웃
 */
function initAuthState(options = {}) {
  const { requireAuth = false, headerNav = null } = options;

  if (headerNav) {
    headerNav.addEventListener("click", (e) => {
      if (e.target && e.target.id === "logoutBtn") {
        signOut(auth).catch(() => {});
      }
    });
  }

  onAuthStateChanged(auth, (user) => {
    if (requireAuth && !user) {
      window.location.replace("login.html");
      return;
    }

    if (headerNav) {
      if (user) {
        headerNav.innerHTML = LOGOUT_BTN_HTML;
      } else {
        headerNav.innerHTML = LOGGED_OUT_NAV_HTML;
      }
    }
  });
}

export { initAuthState };
