/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const {setGlobalOptions} = require("firebase-functions");
const {onRequest} = require("firebase-functions/https");
const logger = require("firebase-functions/logger");
const { getAccessToken, KIS_APPKEY, KIS_APPSECRET } = require("./kisAuth");
const { getPrice } = require("./kisStock");

// For cost control, you can set the maximum number of containers that can be
// running at the same time. This helps mitigate the impact of unexpected
// traffic spikes by instead downgrading performance. This limit is a
// per-function limit. You can override the limit for each function using the
// `maxInstances` option in the function's options, e.g.
// `onRequest({ maxInstances: 5 }, (req, res) => { ... })`.
// NOTE: setGlobalOptions does not apply to functions using the v1 API. V1
// functions should each use functions.runWith({ maxInstances: 10 }) instead.
// In the v1 API, each function can only serve one request per container, so
// this will be the maximum concurrent request count.
setGlobalOptions({ maxInstances: 10 });

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

// exports.helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });
exports.kisTokenTest = onRequest(
  {
    region: "asia-northeast3",
    secrets: [KIS_APPKEY, KIS_APPSECRET],
  },
  async (req, res) => {
    try {
      const token = await getAccessToken();

      res.json({
        ok: true,
        token_preview: token.slice(0, 12) + "...",
      });
    } catch (e) {
      logger.error(e.response?.data || e.message);

      res.status(500).json({
        ok: false,
        error: e.response?.data || e.message,
      });
    }
  }
);

exports.kisPriceTest = onRequest(
  {
    region: "asia-northeast3",
    secrets: [KIS_APPKEY, KIS_APPSECRET],
  },
  async (req, res) => {
    try {
      // 삼성전자
      const data = await getPrice({ code: "005930" });
      res.json({ ok: true, data });
    } catch (e) {
      logger.error(e.response?.data || e.message);
      res.status(500).json({ ok: false, error: e.response?.data || e.message });
    }
  }
);
const { importMaster } = require("./importMaster");
exports.importMaster = importMaster;

const admin = require("firebase-admin");
if (!admin.apps.length) {
  admin.initializeApp();
}


exports.stocksSample = onRequest(
  { region: "asia-northeast3" },
  async (req, res) => {
    try {
      const snap = await admin.firestore()
        .collection("stocks")
        .orderBy("code")
        .limit(10)
        .get();

      const items = snap.docs.map(d => d.data());
      res.json({ ok: true, count: items.length, items });
    } catch (e) {
      logger.error(e);
      res.status(500).json({ ok: false, error: e.message });
    }
  }
);
exports.marketCapSample = onRequest(
  {
    region: "asia-northeast3",
    secrets: [KIS_APPKEY, KIS_APPSECRET],
  },
  async (req, res) => {
    try {
      const minMarketCapEok = Number(req.query.minMarketCap || 500); // 억원
      const minWon = minMarketCapEok * 100000000;

      // 종목 50개만 샘플
      const snap = await admin.firestore()
        .collection("stocks")
        .orderBy("code")
        .limit(50)
        .get();

      const codes = snap.docs.map(d => d.id);

      const results = [];
      for (const code of codes) {
        try {
          const data = await getPrice({ code });
          const o = data?.output;
          const price = Number(o?.stck_prpr || 0);
          const shares = Number(o?.lstn_stcn || 0);
          const marketCapWon = price * shares;

          if (marketCapWon >= minWon) {
            results.push({
              code,
              name: snap.docs.find(x => x.id === code)?.data()?.name,
              marketCapEok: Math.round(marketCapWon / 100000000),
              price,
            });
          }
        } catch (inner) {
          // 특정 종목에서 실패해도 계속 진행
          logger.warn(`skip ${code}: ${inner.response?.data?.msg1 || inner.message}`);
        }
      }

      // 시총 큰 순 정렬
      results.sort((a, b) => b.marketCapEok - a.marketCapEok);

      res.json({
        ok: true,
        minMarketCapEok,
        checked: codes.length,
        passed: results.length,
        results: results.slice(0, 30),
      });
    } catch (e) {
      logger.error(e);
      res.status(500).json({ ok: false, error: e.message });
    }
  }
);
exports.updateMarketCaps = onRequest(
  {
    region: "asia-northeast3",
    secrets: [KIS_APPKEY, KIS_APPSECRET],
    timeoutSeconds: 540,
    memory: "1GiB",
  },
  async (req, res) => {
    try {
      const limit = Math.min(Number(req.query.limit || 200), 400);
      const startAfter = (req.query.startAfter || "").toString();

      let q = admin.firestore().collection("stocks").orderBy("code").limit(limit);
      if (startAfter) {
        q = admin.firestore().collection("stocks").orderBy("code").startAfter(startAfter).limit(limit);
      }

      const snap = await q.get();
      const docs = snap.docs;

      let updated = 0;
      let lastCode = null;

      // 종목명 매핑
      const nameByCode = new Map(docs.map(d => [d.id, d.data().name]));

      // 순차 호출 (안정성 우선)
      for (const d of docs) {
        const code = d.id;
        lastCode = code;

        try {
          const data = await getPrice({ code });
          const o = data?.output;

          const price = Number(o?.stck_prpr || 0);
          const shares = Number(o?.lstn_stcn || 0);
          const marketCapWon = price * shares;
          const marketCapEok = Math.round(marketCapWon / 100000000);

          await admin.firestore().collection("stocks").doc(code).set(
            {
              price,
              shares,
              marketCapEok,
              mcUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
            },
            { merge: true }
          );

          updated++;
        } catch (inner) {
          logger.warn(`skip ${code}: ${inner.response?.data?.msg1 || inner.message}`);
        }
      }

      res.json({
        ok: true,
        requested: limit,
        processed: docs.length,
        updated,
        nextStartAfter: lastCode, // 다음 호출에 이 값을 넣으면 됨
      });
    } catch (e) {
      logger.error(e);
      res.status(500).json({ ok: false, error: e.message });
    }
  }
);
const { mapDartCorpCodesKospi } = require("./dartCorpMap");
exports.mapDartCorpCodesKospi = mapDartCorpCodesKospi;
const { dartCorpDebug } = require("./dartCorpMap");
exports.dartCorpDebug = dartCorpDebug;
