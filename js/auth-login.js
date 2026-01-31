import { auth } from "./firebase.js";
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";

const AUTH_ERROR_MESSAGES = {
  "auth/user-not-found": "등록되지 않은 이메일입니다.",
  "auth/wrong-password": "비밀번호가 올바르지 않습니다.",
  "auth/invalid-credential": "이메일 또는 비밀번호가 올바르지 않습니다.",
  "auth/invalid-email": "올바른 이메일 형식을 입력해 주세요.",
};

function getAuthErrorMessage(err) {
  const code = err?.code || "";
  return AUTH_ERROR_MESSAGES[code] || err?.message || "로그인에 실패했습니다.";
}

const form = document.getElementById("loginForm");
if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    try {
      await signInWithEmailAndPassword(auth, email, password);
      window.location.href = "screener.html";
    } catch (err) {
      alert(getAuthErrorMessage(err));
    }
  });
}
