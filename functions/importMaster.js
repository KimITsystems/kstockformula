const admin = require("firebase-admin");
const { onRequest } = require("firebase-functions/https");
const logger = require("firebase-functions/logger");
const { getStorage } = require("firebase-admin/storage");

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

function parseLineToStock(line) {
  if (!line) return null;

  const code = line.slice(0, 6);
  if (!/^\d{6}$/.test(code)) return null;

  const rest = line.slice(6);
  const name = rest.split(/\s{2,}/)[0].trim();
  if (!name) return null;

  return { code, name };
}

async function importOneFile({ bucket, path, market }) {
  const file = bucket.file(path);
  const [exists] = await file.exists();
  if (!exists) throw new Error(`Storage file not found: ${path}`);

  const [buf] = await file.download();
  const text = buf.toString("utf8");
  const lines = text.split(/\r?\n/);

  let count = 0;
  let batch = db.batch();
  const batchSize = 400;

  for (const line of lines) {
    const parsed = parseLineToStock(line);
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
        total += await importOneFile({
          bucket,
          path: "master/kospi_code.mst",
          market: "KOSPI",
        });
      }

      if (market === "kosdaq" || market === "all") {
        total += await importOneFile({
          bucket,
          path: "master/kosdaq_code.mst",
          market: "KOSDAQ",
        });
      }

      res.json({ ok: true, imported: total });
    } catch (e) {
      logger.error(e);
      res.status(500).json({ ok: false, error: e.message });
    }
  }
);
