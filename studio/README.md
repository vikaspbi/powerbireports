# Power BI Delivery Studio

A **live chat workspace** (Google AI Studio–style) for Power BI delivery: talk, upload, download — no API keys.

## Open it

- `studio/index.html` or `https://vikaspbi.github.io/powerbireports/studio/`
- Portfolio header → **Delivery Studio**

## How it works

1. **New project** opens a chat for that engagement  
2. **Type and upload** requirements, schema, screenshots, report files  
3. **Copy prompt for Cursor** → paste into Cursor Agent (that’s the live AI)  
4. **Paste Cursor’s reply** back into Studio chat → saved as a downloadable stage output  
5. Say **lock** (or click Lock stage) → move to the next stage  
6. **Download** stage files or the full project ZIP anytime  

There is **no Gemini / “Run with AI” button** in Studio. Cursor is the brain; Studio is the chat + files + downloads desk.

## Commands in chat

- `lock` — lock current stage  
- `next` — go to next stage  
- `stage 3` — jump to stage 3  

## Privacy

Projects stay in your browser (localStorage + IndexedDB) until you export a ZIP.
