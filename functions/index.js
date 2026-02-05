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