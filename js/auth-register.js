import { auth } from "./firebase.js";
import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";

const AUTH_ERROR_MESSAGES = {
  "auth/email-already-in-use": "이미 사용 중인 이메일입니다. 로그인하거나 다른 이메일을 사용해 주세요.",
  "auth/invalid-email": "올바른 이메일 형식을 입력해 주세요.",
  "auth/weak-password": "비밀번호는 6자 이상으로 설정해 주세요.",
  "auth/operation-not-allowed": "이 사이트에서는 이메일 회원가입이 허용되지 않습니다.",
};

function getAuthErrorMessage(err) {
  const code = err?.code || "";
  return AUTH_ERROR_MESSAGES[code] || err?.message || "회원가입에 실패했습니다.";
}

const form = document.getElementById("registerForm");
if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    const passwordConfirmInput = document.getElementById("passwordConfirm");
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const passwordConfirm = passwordConfirmInput?.value ?? "";

    if (password !== passwordConfirm) {
      alert("비밀번호가 일치하지 않습니다.");
      return;
    }

    try {
      await createUserWithEmailAndPassword(auth, email, password);
      window.location.href = "login.html";
    } catch (err) {
      alert(getAuthErrorMessage(err));
    }
  });
}
