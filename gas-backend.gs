/**
 * Google Apps Script Backend for Lucky Wheel
 * 
 * Instructions:
 * 1. Open your Google Sheet.
 * 2. Extensions > Apps Script.
 * 3. Paste this code.
 * 4. Create sheets named "3000", "5000", "10000" and put prizes in Column A.
 * 5. Create a sheet named "抽獎結果" for logs.
 * 6. Deploy > New Deployment > Web App > "Anyone" access.
 */

function doPost(e) {
  return handleRequest(e);
}

function doGet(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  const lock = LockService.getScriptLock();
  
  try {
    // Parse Input
    let payload = {};
    if (e.postData) {
      payload = JSON.parse(e.postData.contents);
    }
    const params = e.parameter || {};
    
    // Determine Action
    const action = payload.action || params.action;
    
    // Open Spreadsheet (Active if bound, otherwise openById)
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    if (action === 'record') {
      // Locking is critical for concurrent writes
      lock.tryLock(10000); 
      
      let sheet = ss.getSheetByName('抽獎結果');
      if (!sheet) {
        sheet = ss.insertSheet('抽獎結果');
        sheet.appendRow(['Timestamp', 'Tier', 'Prize', 'ClientTime']);
      }
      
      sheet.appendRow([
        new Date(),
        payload.tier,
        payload.prize,
        payload.timestamp
      ]);
      
      return createJSON({ status: 'success' });
    }
    
    if (action === 'getPrizes') {
      const tier = payload.tier || params.tier;
      const sheet = ss.getSheetByName(tier.toString()); // Ensure string
      
      if (!sheet) {
        return createJSON({ prizes: [], error: `Sheet ${tier} not found` });
      }
      
      // Read A1:A50
      const range = sheet.getRange('A1:A50');
      const values = range.getValues();
      
      // Filter empty
      const prizes = values.flat().filter(function(r) { return r && r.toString() !== ''; });
      
      return createJSON({ prizes: prizes });
    }
    
    return createJSON({ status: 'error', message: 'Unknown action' });
    
  } catch (err) {
    return createJSON({ status: 'error', message: err.toString() });
  } finally {
    lock.releaseLock();
  }
}

function createJSON(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
