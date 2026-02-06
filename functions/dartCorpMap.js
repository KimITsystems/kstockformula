const admin = require("firebase-admin");
const { onRequest } = require("firebase-functions/https");
const logger = require("firebase-functions/logger");
const { getStorage } = require("firebase-admin/storage");
const { XMLParser } = require("fast-xml-parser");

if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

async function readCorpCodeXmlFromStorage(path = "master/CORPCODE.xml") {
  const bucket = getStorage().bucket();
  const file = bucket.file(path);
  const [exists] = await file.exists();
  if (!exists) throw new Error(`Storage file not found: ${path}`);

  const [buf] = await file.download();
  const xmlText = buf.toString("utf8");

  const parser = new XMLParser({
    ignoreAttributes: false,
    // XML이 커서 배열 형태가 될 수 있음
    isArray: (name) => name === "list",
  });

  const obj = parser.parse(xmlText);

  // 구조: <result><list>...</list></result>
  const list = obj?.result?.list || [];
  return list;
}

// stock_code -> corp_code, corp_name 매핑 만들기
function buildMap(list) {
  const map = new Map(); // key: "005930"
  for (const item of list) {
    const stockCode = String(item.stock_code ?? "").trim();
    const corpCode  = String(item.corp_code ?? "").trim();
    const corpName  = String(item.corp_name ?? "").trim();


    if (!stockCode || !corpCode) continue;
    if (!/^\d{6}$/.test(stockCode)) continue; // 종목코드 6자리만
    map.set(stockCode, { corpCode, corpName });
  }
  return map;
}

exports.mapDartCorpCodesKospi = onRequest(
  { region: "asia-northeast3", timeoutSeconds: 540, memory: "1GiB" },
  async (req, res) => {
    try {
      const limit = Math.min(Number(req.query.limit || 500), 2000);
      const startAfter = (req.query.startAfter || "").toString();

      // 1) CORPCODE.xml 읽어서 매핑 생성
      const list = await readCorpCodeXmlFromStorage("master/CORPCODE.xml");
      const map = buildMap(list);

      // 2) KOSPI만 가져오기 (페이지 방식)
      let q = db.collection("stocks")
        .where("market", "==", "KOSPI")
        .orderBy("code")
        .limit(limit);

      if (startAfter) {
        q = db.collection("stocks")
          .where("market", "==", "KOSPI")
          .orderBy("code")
          .startAfter(startAfter)
          .limit(limit);
      }

      const snap = await q.get();
      const docs = snap.docs;

      let updated = 0;
      let skipped = 0;
      let lastCode = null;

      // Firestore batch는 500 write 제한
      let batch = db.batch();
      let batchCount = 0;

      for (const d of docs) {
        const code = d.id; // doc id가 code
        lastCode = code;

        const m = map.get(code);
        if (!m) {
          skipped++;
          continue;
        }

        const ref = db.collection("stocks").doc(code);
        batch.set(ref, { corpCode: m.corpCode, corpName: m.corpName }, { merge: true });
        updated++;
        batchCount++;

        if (batchCount >= 450) {
          await batch.commit();
          batch = db.batch();
          batchCount = 0;
        }
      }

      if (batchCount > 0) {
        await batch.commit();
      }

      res.json({
        ok: true,
        market: "KOSPI",
        processed: docs.length,
        updated,
        skipped,
        nextStartAfter: lastCode,
      });
    } catch (e) {
      logger.error(e);
      res.status(500).json({ ok: false, error: e.message });
    }
  }
);
exports.dartCorpDebug = onRequest(
  { region: "asia-northeast3", timeoutSeconds: 120, memory: "512MiB" },
  async (req, res) => {
    try {
      const list = await readCorpCodeXmlFromStorage("master/CORPCODE.xml");

      // 원본 5개 샘플
      const sampleRaw = list.slice(0, 5);

      // stock_code가 실제로 있는지 카운트
      let hasStock = 0;
      for (const it of list) {
        const sc = (it.stock_code || it.stockCode || "").toString().trim();
        if (/^\d{6}$/.test(sc)) hasStock++;
      }

      // map 만들면 사이즈가 얼마인지
      const map = buildMap(list);

      res.json({
        ok: true,
        listCount: list.length,
        mapSize: map.size,
        hasStockCodeCount: hasStock,
        sampleRaw,
      });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  }
);
