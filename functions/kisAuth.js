const axios = require("axios");
const { defineSecret } = require("firebase-functions/params");

const BASE_URL = "https://openapi.koreainvestment.com:9443";

// ✅ Secret 정의
const KIS_APPKEY = defineSecret("KIS_APPKEY");
const KIS_APPSECRET = defineSecret("KIS_APPSECRET");

let cachedToken = null;
let cachedExpireMs = 0;

async function getAccessToken() {
  const now = Date.now();
  if (cachedToken && now < cachedExpireMs - 60_000) return cachedToken;

  // ✅ Secret 값 읽기
  const appkey = KIS_APPKEY.value();
  const appsecret = KIS_APPSECRET.value();

  if (!appkey || !appsecret) {
    throw new Error("Missing KIS_APPKEY or KIS_APPSECRET secret");
  }

  const url = `${BASE_URL}/oauth2/tokenP`;
  const body = { grant_type: "client_credentials", appkey, appsecret };

  const res = await axios.post(url, body, {
    headers: { "Content-Type": "application/json" },
    timeout: 15000,
  });

  cachedToken = res.data.access_token;
  const expiresInSec = Number(res.data.expires_in || 86400);
  cachedExpireMs = now + expiresInSec * 1000;

  return cachedToken;
}

module.exports = { getAccessToken, BASE_URL, KIS_APPKEY, KIS_APPSECRET };
