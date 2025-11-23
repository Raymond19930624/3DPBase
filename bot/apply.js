const fs = require("fs");
const path = require("path");
const axios = require("axios");

function readJson(p, def){ try{ return JSON.parse(fs.readFileSync(p, "utf-8")); } catch{ return def; } }
function writeJson(p, obj){ fs.writeFileSync(p, JSON.stringify(obj, null, 2)); }

const root = __dirname;
const webDir = path.resolve(root, "..", "web");
const webModelsPath = path.join(webDir, "models.json");
const imagesDir = path.join(webDir, "images");
const filesDir = path.join(webDir, "files");

const token = process.env.BOT_TOKEN || readJson(path.join(root, "config.json"), {}).BOT_TOKEN;
const channelId = process.env.CHANNEL_ID || readJson(path.join(root, "config.json"), {}).CHANNEL_ID;
const apiBase = token ? `https://api.telegram.org/bot${token}` : null;

function arg(key){ const i=process.argv.indexOf(`--${key}`); if(i!==-1 && i+1<process.argv.length) return process.argv[i+1]; return null; }

async function tgDelete(chatId, messageId){
  if(!apiBase) return false;
  try{ const res=await axios.post(`${apiBase}/deleteMessage`,{ chat_id: chatId, message_id: messageId }); return res.data && res.data.ok; } catch{ return false; }
}

(async function main(){
  fs.mkdirSync(webDir, { recursive: true });
  fs.mkdirSync(imagesDir, { recursive: true });
  fs.mkdirSync(filesDir, { recursive: true });

  let models = readJson(webModelsPath, []);
  const rawOps = arg("ops") || "{}";
  let ops = {};
  try{ ops = JSON.parse(rawOps); } catch{ ops = {}; }
  const deletes = Array.isArray(ops.deletes) ? ops.deletes : [];
  const edits = Array.isArray(ops.edits) ? ops.edits : [];

  for(const e of edits){
    const id = e && e.id;
    const name = (e && e.name) || "";
    const tagsStr = (e && e.tags) || "";
    if(!id || !name) continue;
    const m = models.find(x=>x.id===id);
    if(!m) continue;
    m.name = name.trim();
    const newTags = String(tagsStr).split(/[,，]/).map(s=>s.trim()).filter(Boolean);
    if(newTags.length) m.tags = newTags;
    if(m.directUrl){
      const fname = path.basename(m.directUrl);
      m.directUrl = `files/${id}/${fname}`;
    }
  }

  const toDelete = new Set(deletes);
  if(toDelete.size){
    const left = [];
    for(const item of models){
      if(!toDelete.has(item.id)) { left.push(item); continue; }
      try{ const img = path.join(imagesDir, `${item.id}.jpg`); if(fs.existsSync(img)) fs.unlinkSync(img); } catch{}
      try{ const dir = path.join(filesDir, item.id); if(fs.existsSync(dir)) fs.rmSync(dir, { recursive:true, force:true }); } catch{}
      try{
        const docMsg = item.doc_message_id || null;
        const photoMsg = item.photo_message_id || null;
        if(token && channelId && docMsg) await tgDelete(channelId, docMsg);
        if(token && channelId && photoMsg) await tgDelete(channelId, photoMsg);
      } catch{}
    }
    models = left;
  }

  writeJson(webModelsPath, models);
})();

