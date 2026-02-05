const admin = require("firebase-admin");
const { onRequest } = require("firebase-functions/https");
const logger = require("firebase-functions/logger");
const { getStorage } = require("firebase-admin/storage");
const iconv = require("iconv-lite");

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * KIS mst 라인에서 "ISIN(KR7...)"을 찾아 종목코드(6자리)를 추출한다.
 * 예) KR7005930003 -> 005930
 * - 보통주/우선주 등도 KR7로 시작하는 경우가 많음.
 */
function parseLineByIsin(line) {
  if (!line) return null;

  // KR7 + (6자리 코드) + (3자리)
  const m = line.match(/KR7(\d{6})\d{3}/);
  if (!m) return null;

  const code = m[1];

  // 종목명: ISIN 바로 뒤쪽에 고정폭으로 들어가는 경우가 많아서,
  // ISIN이 나온 위치를 기준으로 뒤를 잘라 앞 공백 전까지.
  const isin = m[0];
  const idx = line.indexOf(isin);
  let name = "";
  if (idx >= 0) {
    const after = line.slice(idx + isin.length);
    name = after.split(/\s{2,}/)[0].trim();
  }

  // 혹시 name이 비어있으면 최소한 code만 저장은 하게끔
  if (!name) name = `CODE_${code}`;

  return { code, name };
}

async function importOneFile({ bucket, path, market }) {
  const file = bucket.file(path);
  const [exists] = await file.exists();
  if (!exists) throw new Error(`Storage file not found: ${path}`);

  const [buf] = await file.download();

  // mst는 보통 CP949(EUC-KR 계열)로 제공됨 → 한글 깨짐 방지
  const text = iconv.decode(buf, "cp949");
  const lines = text.split(/\r?\n/);

  let count = 0;
  let batch = db.batch();
  const batchSize = 400;

  for (const line of lines) {
    const parsed = parseLineByIsin(line);
    if (!parsed) continue;

    const ref = db.collection("stocks").doc(parsed.code);
    batch.set(
      ref,
      {
        code: parsed.code,
        name: parsed.name,
        market,
        active: true,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    count++;
    if (count % batchSize === 0) {
      await batch.commit();
      batch = db.batch();
    }
  }

  await batch.commit();
  return count;
}

exports.importMaster = onRequest(
  { region: "asia-northeast3" },
  async (req, res) => {
    try {
      const market = (req.query.market || "all").toLowerCase();
      const bucket = getStorage().bucket();
      let total = 0;

      if (market === "kospi" || market === "all") {
        const cnt = await importOneFile({
          bucket,
          path: "master/kospi_code.mst",
          market: "KOSPI",
        });
        logger.info(`KOSPI imported: ${cnt}`);
        total += cnt;
      }

      if (market === "kosdaq" || market === "all") {
        const cnt = await importOneFile({
          bucket,
          path: "master/kosdaq_code.mst",
          market: "KOSDAQ",
        });
        logger.info(`KOSDAQ imported: ${cnt}`);
        total += cnt;
      }

      res.json({ ok: true, imported: total });
    } catch (e) {
      logger.error(e);
      res.status(500).json({ ok: false, error: e.message });
    }
  }
);
