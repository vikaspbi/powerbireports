# Power BI Delivery Studio

A simple browser interface (like Google AI Studio / Base44-style upload–download workspace) for the Power BI Delivery Kit.

## Open it

- Local / GitHub Pages: open [`studio/index.html`](../studio/index.html) or `https://vikaspbi.github.io/powerbireports/studio/`
- From the portfolio site: use the **Delivery Studio** button in the header

## What you can do (no coding)

1. **New project** — name it, choose NEW/ONGOING, optionally jump to stage N  
2. **Upload** — notes, RSD, screenshots, schema, `.pbix` / zipped `.pbip`  
3. **Run this stage with AI** — optional Gemini API key (from [Google AI Studio](https://aistudio.google.com/apikey))  
4. **Or paste** output from Cursor if you prefer  
5. **Download** stage JSON/Markdown or the full **project ZIP**  
6. **Lock stage** when happy, then move on  

## Important notes

- Data is stored **in your browser** (localStorage + IndexedDB) until you download a ZIP backup  
- Clearing browser data deletes projects unless you exported a ZIP  
- Large `.pbix` files may be slow; prefer schema text or a zipped `.pbip` for AI stages  
- Without an API key, upload/download/paste still work — AI run needs Gemini  

## Privacy

Your Gemini API key is saved only in this browser’s local storage and is sent only to Google’s Gemini API when you click **Run this stage with AI**.
