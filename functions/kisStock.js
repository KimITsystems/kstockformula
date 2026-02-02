const axios = require("axios");
const functionsLogger = require("firebase-functions/logger");
const { BASE_URL, getAccessToken, KIS_APPKEY, KIS_APPSECRET } = require("./kisAuth");

// ⚠️ 여기 tr_id와 url/params는 "국내주식 현재가 조회" 문서와 1:1로 맞춰야 해.
// 너의 KIS 개발자센터에서 '국내주식 현재가' API 문서 열고 아래 3가지를 확인해서 채워줘:
// 1) endpoint path
// 2) tr_id
// 3) 필요한 query params (종목코드 등)

// ✅ 많이 쓰는 형태(예시): /uapi/domestic-stock/v1/quotations/inquire-price
// ✅ tr_id(예시): FHKST01010100
const ENDPOINT_PATH = "/uapi/domestic-stock/v1/quotations/inquire-price";
const TR_ID = "FHKST01010100";

async function getPrice({ code }) {
  const token = await getAccessToken();

  const appkey = KIS_APPKEY.value();
  const appsecret = KIS_APPSECRET.value();

  const url = `${BASE_URL}${ENDPOINT_PATH}`;

  // ⚠️ 파라미터 키 이름은 문서랑 동일해야 함
  // 보통 국내주식은 종목코드가 'FID_INPUT_ISCD' 인 경우가 많음
  const params = {
    FID_COND_MRKT_DIV_CODE: "J", // (예시) 주식시장 구분
    FID_INPUT_ISCD: code,        // 종목코드 6자리
  };

  const headers = {
    Authorization: `Bearer ${token}`,
    appkey,
    appsecret,
    tr_id: TR_ID,
    "Content-Type": "application/json",
  };

  const res = await axios.get(url, { headers, params, timeout: 15000 });
  return res.data;
}

module.exports = { getPrice };
