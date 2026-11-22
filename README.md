# 每日食光 · 飲食熱量紀錄 (v1.0)

手機優先的純前端 PWA。**不需帳號、資料庫伺服器或 API Key**。所有食物、營養素、飲水與每日目標僅儲存於目前瀏覽器的 IndexedDB，不會同步到 GitHub。

## 已有功能
- 逐日查看總熱量、蛋白質、碳水化合物、脂肪、膳食纖維及飲水量
- 手動新增、編輯、刪除食物紀錄（早餐、午餐、晚餐、點心）
- 飲水快速紀錄 250 / 500ml，或自訂飲水量；飲水紀錄可編輯、刪除
- 查看近 30 天與曾有紀錄日期的歷史頁，點擊返回該日
- 修改每日營養與飲水目標
- 匯出、匯入 JSON 完整備份；匯入前檢驗格式與數值，並確認覆蓋原資料
- PWA 主畫面安裝、快取靜態程式以便離線使用

## 尚未提供（僅預留接口）
- `food-api.js`：未來食品資料庫搜尋；v1 無搜尋功能
- `photo-ai.js`：未來照片辨識；v1 不傳送照片、不涉及雲端 AI

## GitHub Pages 部署（不需要終端機）
1. 登入 https://github.com ，點右上角 `+` → **New repository**。
2. Repository name 輸入 `food-tracker`，選擇 **Public**（GitHub 免費方案一般需公開才能用 Pages），按 **Create repository**。
3. 在專案頁點 **Add file → Upload files**。請先將 ZIP 解壓縮，**上傳 `food-tracker` 資料夾裡面的所有檔案和 `icons` 子資料夾**，而不是 ZIP 本身，也不要再包一層 `food-tracker`。`.nojekyll` 隱藏檔如未上傳也不影響本專案。確保 `index.html` 位於 repository 根目錄。
4. 按 **Commit changes** 完成上傳。
5. 前往 **Settings → Pages → Build and deployment**，Source 選 **Deploy from a branch**，Branch 選 `main`，Folder 選 `/(root)`，按 **Save**。
6. Pages 部署完成後，網址通常為 `https://你的帳號.github.io/food-tracker/`（以 Pages 顯示的實際網址為準）。請用 HTTPS 開啟。部署可能需要數分鐘。
7. iPhone Safari：開啟網址 → 分享 → **加入主畫面**；Android Chrome：選單 → **安裝應用程式**或**加到主畫面**（依瀏覽器而異）。

## 本機測試
- 建議透過 VS Code Live Server，或電腦已安裝 Python 時在此資料夾執行 `python3 -m http.server 8000` 後開啟 http://localhost:8000 。
- **不要直接雙擊 index.html**，因 ES modules 與 service worker 對 `file://` 有瀏覽器限制。
- 測試：新增食物 → 刷新 → 資料仍在 → 更換日期 → 歷史跳轉 → 匯出備份 → 匯入備份。

## 檔案用途
| 檔案 | 用途 |
|---|---|
| `index.html` | 所有主畫面、輸入表單、設定、彈窗結構 |
| `style.css` | 手機／桌面 RWD 設計 |
| `app.js` | 記錄邏輯、計算、日期切換、匯出匯入、畫面更新 |
| `db.js` | IndexedDB 讀寫、資料交易與覆蓋匯入 |
| `manifest.webmanifest` | PWA 名稱、圖示、啟動範圍 |
| `service-worker.js` | 靜態資源離線快取 |
| `icons/` | App 圖示 |
| `food-api.js` | 食物搜尋擴充接口（尚未啟用） |
| `photo-ai.js` | 照片辨識擴充接口（尚未啟用） |
| `.nojekyll` | 防止 GitHub Pages Jekyll 處理靜態檔案 |

## 使用與資料安全須知
- 同一網站在不同裝置或瀏覽器的資料不會同步。
- 刪除網站資料、使用無痕模式、重設瀏覽器、更換手機，都可能造成資料遺失。**請定期使用「設定 → 匯出 JSON 備份」**。備份可能含敏感飲食資訊，請私下保管。
- 變更 repository 名稱或部署網址可能使原本瀏覽器儲存空間無法直接被新網址存取；變更前先匯出資料，再於新網址匯入。
- 目標值為可修改的預設範例，非個人健康／醫療建議。營養數值由使用者自行提供，不作驗證。
- 網站程式碼公開不代表 IndexedDB 中的個人飲食紀錄公開；不要將 JSON 備份檔上傳到公開 repo。
- PWA 的安裝介面依瀏覽器與裝置而異，並非所有瀏覽器都提供相同安裝提示。

## 後續開發建議
1. 在 `food-api.js` 串接 Open Food Facts，先做搜尋及手動確認，遵守 API 條款、署名及流量規範。
2. 在 `photo-ai.js` 加入拍照與裝置端 OCR/辨識。若需付費雲端 AI，需安全的後端保管金鑰，**不可把 API Key 放在前端 Github repo**。
3. 預設照片不保存、不傳送；若未來啟用圖片儲存或雲端傳輸，應先讓使用者明確確認。
