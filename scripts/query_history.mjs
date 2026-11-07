import fs from 'fs';
import path from 'path';
import os from 'os';
import { DatabaseSync } from 'node:sqlite';

const D_GEMINI_DIR = 'D:/.gemini/antigravity';
const SUMMARIES_DB = path.join(D_GEMINI_DIR, 'conversation_summaries.db');
const BRAIN_DIR = path.join(D_GEMINI_DIR, 'brain');

function getTempDb() {
  if (!fs.existsSync(SUMMARIES_DB)) {
    throw new Error(`Master database not found at ${SUMMARIES_DB}`);
  }
  const tempPath = path.join(os.tmpdir(), `summaries_query_${Date.now()}.db`);
  fs.copyFileSync(SUMMARIES_DB, tempPath);
  const db = new DatabaseSync(tempPath, { readOnly: true });
  return {
    db,
    close: () => {
      db.close();
      try { fs.unlinkSync(tempPath); } catch {}
      try { fs.unlinkSync(`${tempPath}-shm`); } catch {}
      try { fs.unlinkSync(`${tempPath}-wal`); } catch {}
    }
  };
}

const args = process.argv.slice(2);
const command = args[0] || 'list';

if (command === 'list') {
  const limit = parseInt(args[1], 10) || 15;
  const { db, close } = getTempDb();
  try {
    const rows = db.prepare(`
      SELECT conversation_id, title, preview, last_user_input_time 
      FROM conversation_summaries 
      ORDER BY last_user_input_time DESC 
      LIMIT ?
    `).all(limit);
    console.log(`\n=== LAST ${rows.length} CONVERSATIONS FROM D:\\.gemini ===\n`);
    for (const r of rows) {
      console.log(`[${r.last_user_input_time}] ${r.conversation_id}`);
      console.log(`   Title: ${r.title || '(No Title)'}`);
      console.log(`   Preview: ${r.preview ? r.preview.slice(0, 100) : ''}\n`);
    }
  } finally {
    close();
  }
} else if (command === 'search') {
  const query = args.slice(1).join(' ');
  if (!query) {
    console.log('Usage: node scripts/query_history.mjs search <keyword>');
    process.exit(1);
  }
  const { db, close } = getTempDb();
  try {
    const rows = db.prepare(`
      SELECT conversation_id, title, preview, last_user_input_time 
      FROM conversation_summaries 
      WHERE title LIKE ? OR preview LIKE ? OR workspace_uris LIKE ?
      ORDER BY last_user_input_time DESC 
      LIMIT 20
    `).all(`%${query}%`, `%${query}%`, `%${query}%`);
    console.log(`\n=== FOUND ${rows.length} MATCHES FOR "${query}" IN D:\\.gemini ===\n`);
    for (const r of rows) {
      console.log(`[${r.last_user_input_time}] ${r.conversation_id}`);
      console.log(`   Title: ${r.title || '(No Title)'}`);
      console.log(`   Preview: ${r.preview ? r.preview.slice(0, 120) : ''}\n`);
    }
  } finally {
    close();
  }
} else if (command === 'read') {
  const convId = args[1];
  if (!convId) {
    console.log('Usage: node scripts/query_history.mjs read <conversation_id>');
    process.exit(1);
  }
  const transcriptPath = path.join(BRAIN_DIR, convId, '.system_generated', 'logs', 'transcript.jsonl');
  if (!fs.existsSync(transcriptPath)) {
    console.log(`No transcript found at ${transcriptPath}`);
    process.exit(1);
  }
  const lines = fs.readFileSync(transcriptPath, 'utf8').split('\n');
  console.log(`\n=== TRANSCRIPT FOR ${convId} ===\n`);
  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const obj = JSON.parse(line);
      if (obj.type === 'USER_INPUT') {
        const text = typeof obj.content === 'string' ? obj.content : JSON.stringify(obj.content);
        console.log(`\n[USER]: ${text.slice(0, 300)}`);
      } else if (obj.type === 'PLANNER_RESPONSE' && obj.content) {
        console.log(`\n[AI]: ${obj.content.slice(0, 300)}...`);
      }
    } catch {}
  }
} else {
  console.log('Commands: list [limit], search <keyword>, read <conv_id>');
}
