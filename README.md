# Ridersity 2026 新春大轉盤 (Lunar New Year Wheel)

這是 Ridersity 2026 新春活動的轉盤抽獎程式。本專案使用 React + Vite 建置，並透過 Google Apps Script (GAS) 將抽獎結果記錄到 Google Sheets。

---

## 🛠️ 安裝與執行 (Installation)

請確保您的電腦已安裝 [Node.js](https://nodejs.org/)。

1.  **安裝依賴套件 (Install dependencies)**
    ```bash
    npm install
    ```

2.  **啟動開發環境 (Run development server)**
    ```bash
    npm run dev
    ```
    啟動後，按住 `Ctrl` (或 Mac 上的 `Cmd`) 並點擊終端機中的網址 (例如 `http://localhost:5173`) 即可開啟。

---

## ⚙️ 環境變數設定 (Environment Setup)

為了讓程式能將資料傳送到您的 Google Sheet，您需要設定環境變數。

1.  在專案根目錄建立一個 `.env` 檔案。
2.  加入以下內容：
    ```env
    VITE_GAS_URL=您的_GOOGLE_APPS_SCRIPT_佈署網址
    ```
    *(下一節將說明如何取得這個網址)*

---

## 📊 Google Sheets & Apps Script 設定指南

本專案使用 Google Sheets 記錄中獎結果，並透過 Apps Script 作為後端。

### 第一步：建立 Google Sheet (共 4 張工作表)
請建立一個新的 Google Sheet，並在其中新增以下 **4 張工作表 (Tabs)**，名稱請務必完全一致：

1.  **`抽獎結果`** (用來儲存中獎紀錄)
2.  **`3000`** (設定 3000 元門檻的獎項)
3.  **`5000`** (設定 5000 元門檻的獎項)
4.  **`10000`** (設定 10000 元門檻的獎項)

#### 📝 工作表內容格式與範例

**1. 工作表：`抽獎結果`**
請設定第一列標題 (Row 1)：

| 欄位 | A1 | B1 | C1 | D1 |
| :--- | :--- | :--- | :--- | :--- |
| **標題** | Timestamp | Tier | Prize | Action |
| **說明** | 抽獎時間 | 抽獎金額 | 中獎內容 | 動作類型 |

**2. 工作表：`3000`、`5000`、`10000`**
這三張表是用來設定獎項的。每一張表的格式都一樣，只需要從 **A2** 開始填寫獎項即可。
請設定第一列標題 (Row 1) 為 `Prize`。

| (Row) | A (Prize) |
| :--- | :--- |
| **1** | **Prize** |
| 2 | 折扣 50 元 |
| 3 | 折扣 50 元 |
| 4 | 精美筆記本 |
| 5 | 再來一次 |

> **💡 機率設定技巧**：轉盤的機率是根據項目數量決定的。如果您希望「折扣 50 元」比較容易抽中，請在表中**重複填寫多行** (如上表範例，折扣 50 元出現兩次，機率就會加倍)。

---

### 第二步：建立 Apps Script

1.  在 Google Sheet 中，點選 **「擴充功能」 (Extensions) > 「Apps Script」**。
2.  **清空** 編輯器原本的內容。
3.  **複製並貼上** 以下完整的程式碼：

```javascript
/* 
 * Ridersity Wheel Backend 
 * 支援多工作表：3000, 5000, 10000 (讀取獎項) & 抽獎結果 (寫入紀錄)
 */

// 1. 寫入中獎紀錄 (POST)
function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    var data = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // 指定寫入 '抽獎結果' 工作表
    var sheet = ss.getSheetByName('抽獎結果');
    
    // 如果找不到表，自動建立 (防呆)
    if (!sheet) {
      sheet = ss.insertSheet('抽獎結果');
      sheet.appendRow(['Timestamp', 'Tier', 'Prize', 'Action']); // 補上標題
    }
    
    var timestamp = new Date();
    var newRow = [
      timestamp,
      data.tier,
      data.prize,
      data.action || 'record'
    ];

    sheet.appendRow(newRow);

    return ContentService.createTextOutput(JSON.stringify({ 
      status: 'success', 
      message: 'Recorded to "抽獎結果"',
      timestamp: timestamp
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ 
      status: 'error', 
      message: error.toString() 
    })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

// 2. 讀取獎項清單 (GET)
function doGet(e) {
  var lock = LockService.getScriptLock();
  // 嘗試取得鎖定，避免並發問題
  try {
    lock.tryLock(10000);
  } catch(e) {
    // 鎖定失敗就算了，讀取比較沒關係
  }

  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) {
       throw new Error("找不到試算表，請確認此程式碼是綁定在 Google Sheets 中 (擴充功能 > Apps Script)");
    }

    var tiers = ['3000', '5000', '10000']; // 定義要讀取的面額分頁
    var prizeMap = {};

    for (var t = 0; t < tiers.length; t++) {
      var tier = tiers[t];
      var sheet = ss.getSheetByName(tier);
      
      if (sheet) {
        // 讀取該分頁所有資料
        // 使用 try-catch 避免讀取空表時報錯
        try {
           var data = sheet.getDataRange().getValues();
           var prizes = [];
        
           // 從第 2 行開始讀取 (跳過標題 A1: Prize)
           for (var i = 1; i < data.length; i++) {
             // 檢查 A 欄位是否有值
             if (data[i] && data[i][0]) {
               var val = data[i][0].toString().trim();
               if (val !== '') {
                 prizes.push(val);
               }
             }
           }
           prizeMap[tier] = prizes;
        } catch(err) {
           // 如果表是空的，這裡可能會出錯，就當作空獎項
           prizeMap[tier] = [];
        }
      } else {
        prizeMap[tier] = []; // 如果沒這個表，回傳空陣列
      }
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      data: prizeMap
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: error.toString() + " (Stack: " + error.stack + ")"
    })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}
// --- 程式碼結束 (請務必複製到這裡) ---
```

### 第三步：部署為 Web 應用程式 (Deployment)

**⚠️ 請務必依照步驟執行「建立新版本」，否則新程式碼不會生效！**

1.  點選右上角的 **「部署」 (Deploy) > 「管理部署」 (Manage deployments)**。
2.  選擇您原本的部署 (Active)。
3.  點選上方的 **「鉛筆圖示」 (Edit)**。
4.  在 **「版本」 (Version)** 的下拉選單中，選擇 **「建立新版本」 (New version)**。
5.  點選 **「部署」 (Deploy)**。
6.  複製網址 (Web App URL) 並更新到您的 `.env` 檔案中。

---

## 🧪 測試範例 (Testing)

### 測試 寫入 (POST)
```bash
curl -L -X POST "YOUR_DEPLOYMENT_URL" \
-H "Content-Type: application/json" \
--data-raw '{ "action": "record", "tier": "3000", "prize": "測試獎項", "timestamp": "2026-02-01" }'
```

### 測試 讀取 (GET)
直接在瀏覽器開啟您的 GAS 網址，您應該要看到類似以下的 JSON 回應：
```json
{
  "status": "success",
  "data": {
    "3000": ["折扣 50 元", "筆記本"],
    "5000": ["折扣 100 元"],
    "10000": []
  }
}
```

---

## 🚀 自動部署到 GitHub Pages (Auto Deployment)

本專案已設定 GitHub Actions，只要您將程式碼推送 (Push) 到 GitHub，它就會自動建置並部署到 GitHub Pages。

### 設定步驟

1.  **設定 Secrets (環境變數)**
    由於 `VITE_GAS_URL` 是私密設定，我們不能直接將其 .env 檔案上傳到 GitHub。請依照以下步驟設定：
    *   進入您的 GitHub Repository 頁面。
    *   點選上方的 **Settings** (設定)。
    *   在左側選單找到 **Secrets and variables** > **Actions**。
    *   點選 **New repository secret** (新增儲存庫密鑰)。
    *   **Name**: `VITE_GAS_URL`
    *   **Secret**: 貼上您的 Google Apps Script 網址 (與 .env 檔案中相同)。
    *   點選 **Add secret**。

2.  **開啟 GitHub Pages 權限**
    *   還是在 **Settings** 頁面。
    *   在左側選單找到 **Pages**。
    *   在 **Build and deployment** > **Source** 下拉選單中，選擇 **GitHub Actions**。

3.  **推送到 Main 分支**
    *   只要您將程式碼 Push 到 `main` 分支，GitHub Actions 就會自動開始執行。
    *   您可以點選 Repository 上方的 **Actions** 頁籤查看部署進度。
    *   部署完成後，您的網站就可以透過 GitHub Pages 的網址 (通常是 `https://您的帳號.github.io/專案名稱/`) 進行訪問了！
