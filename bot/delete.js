const fs = require("fs");
const path = require("path");
const axios = require("axios");

function readJson(p, def) {
  try { return JSON.parse(fs.readFileSync(p, "utf-8")); } catch { return def; }
}
function writeJson(p, obj) { fs.writeFileSync(p, JSON.stringify(obj, null, 2)); }

const root = __dirname;
const config = readJson(path.join(root, "config.json"), {});
const modelsPath = path.join(root, "models.json");
const webDir = path.resolve(root, "..", "web");
const webModelsPath = path.join(webDir, "models.json");
const imagesDir = path.join(webDir, "images");
const filesRoot = path.join(webDir, "files");

const token = config.BOT_TOKEN;
const channelId = config.CHANNEL_ID;
const apiBase = `https://api.telegram.org/bot${token}`;

function arg(key) {
  const i = process.argv.indexOf(`--${key}`);
  if (i !== -1 && i + 1 < process.argv.length) return process.argv[i + 1];
  return null;
}

async function tgDelete(chatId, messageId) {
  try {
    const res = await axios.post(`${apiBase}/deleteMessage`, { chat_id: chatId, message_id: messageId });
    return res.data && res.data.ok;
  } catch { return false; }
}

async function main() {
  const id = arg("id");
  const name = arg("name");
  if (!id && !name) return;

  const models = readJson(modelsPath, []);
  let idx = -1;
  for (let i = 0; i < models.length; i++) {
    const m = models[i];
    if ((id && m.id === id) || (name && String(m.name).trim() === String(name).trim())) { idx = i; break; }
  }
  if (idx === -1) return;
  const item = models[idx];

  const img = path.join(imagesDir, `${item.id}.jpg`);
  const filesDir = path.join(filesRoot, item.id);
  try { if (fs.existsSync(img)) fs.unlinkSync(img); } catch {}
  try { if (fs.existsSync(filesDir)) fs.rmSync(filesDir, { recursive: true, force: true }); } catch {}

  models.splice(idx, 1);
  writeJson(modelsPath, models);
  writeJson(webModelsPath, models);

  if (token && channelId && item.doc_message_id) await tgDelete(channelId, item.doc_message_id);
  if (token && channelId && item.photo_message_id) await tgDelete(channelId, item.photo_message_id);
}

main();