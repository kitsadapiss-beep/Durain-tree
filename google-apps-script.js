/**
 * ===================================================================
 *  Durian Smart Garden - Google Apps Script (Code.gs)
 *  ระบบเชื่อมต่อและซิงค์ข้อมูลสวนทุเรียนกับ Google Sheets อัตโนมัติ
 * ===================================================================
 * 
 * 📌 ขั้นตอนการติดตั้งใช้งาน:
 * 1. เปิด Google Sheets ขึ้นมา 1 ไฟล์ (สร้างใหม่ได้ที่ https://sheets.new)
 * 2. ไปที่เมนู "ส่วนขยาย" (Extensions) > เลือก "Apps Script"
 * 3. ลบโค้ดเดิมทั้งหมดใน Code.gs แล้วคัดลอกโค้ดในไฟล์นี้ทั้งหมดไปวาง
 * 4. กดปุ่มบันทึก 💾 (Save)
 * 5. กดปุ่มสีน้ำเงิน "ทำให้ใช้งานได้" (Deploy) > เลือก "การทำให้ใช้งานได้รายการใหม่" (New deployment)
 * 6. กดที่ไอคอนรูปฟันเฟือง ⚙️ ด้านซ้าย > เลือก "เว็บแอป" (Web app)
 * 7. ตั้งค่าการ Deploy:
 *    - คำอธิบาย (Description): Durian Garden Sync API
 *    - ดำเนินการในฐานะ (Execute as): ตัวฉัน (Me)
 *    - ผู้มีสิทธิ์เข้าถึง (Who has access): ทุกคน (Anyone)  <-- ⚠️ สำคัญมาก ต้องเลือก Anyone
 * 8. กดปุ่ม "ทำให้ใช้งานได้" (Deploy) และกด "ให้สิทธิ์เข้าถึง" (Authorize access)
 * 9. คัดลอก "URL เว็บแอป" (Web App URL) ที่ได้ มาวางในหน้าเว็บได้ทันที!
 */

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : 'get';
  
  if (action === 'get') {
    return handleGetData();
  }
  
  return createResponse({
    status: 'success',
    message: 'Durian Smart Garden Web App API is running!'
  });
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return createResponse({ status: 'error', message: 'No payload provided' });
    }
    
    var payload = JSON.parse(e.postData.contents);
    var gardens = payload.data || payload.gardens || payload;
    
    if (!Array.isArray(gardens)) {
      return createResponse({ status: 'error', message: 'Invalid gardens format. Array expected.' });
    }
    
    // 1. บันทึก Raw JSON ลงในชีตสำรองข้อมูลหลัก
    saveRawData(gardens);
    
    // 2. จัดระเบียบข้อมูลลงในแท็บที่อ่านง่ายสำหรับผู้ใช้
    exportToFormattedSheets(gardens);
    
    return createResponse({
      status: 'success',
      message: 'ซิงค์ข้อมูลกับ Google Sheets สำเร็จเรียบร้อยแล้ว!',
      timestamp: new Date().toISOString(),
      gardensCount: gardens.length
    });
    
  } catch (error) {
    return createResponse({
      status: 'error',
      message: error.toString()
    });
  }
}

// -------------------------------------------------------------
// Helper Functions
// -------------------------------------------------------------

function createResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function saveRawData(gardens) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('_DB_RawData');
  if (!sheet) {
    sheet = ss.insertSheet('_DB_RawData');
    sheet.hideSheet(); // ซ่อนชีตฐานข้อมูลไว้ไม่ให้เกะกะ
  }
  sheet.clear();
  sheet.getRange(1, 1).setValue(JSON.stringify(gardens));
  sheet.getRange(2, 1).setValue(new Date().toISOString());
}

function handleGetData() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('_DB_RawData');
  if (!sheet) {
    return createResponse({ status: 'empty', data: [] });
  }
  
  var jsonStr = sheet.getRange(1, 1).getValue();
  if (!jsonStr) {
    return createResponse({ status: 'empty', data: [] });
  }
  
  try {
    var gardens = JSON.parse(jsonStr);
    return createResponse({
      status: 'success',
      data: gardens,
      updatedAt: sheet.getRange(2, 1).getValue()
    });
  } catch(e) {
    return createResponse({ status: 'error', message: 'Failed to parse stored JSON' });
  }
}

function exportToFormattedSheets(gardens) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. ชีตภาพรวมสวน
  var sGardens = getOrCreateSheet(ss, '🌳 แปลงสวนทุเรียน');
  sGardens.clear();
  sGardens.appendRow(['ID', 'ชื่อแปลงทุเรียน', 'คำอธิบาย', 'พิกัด GPS', 'ลิงก์ Google Maps', 'จำนวนขั้นตอน', 'จำนวนสิ่งของ', 'ยอดรายรับรวม (บาท)', 'ยอดรายจ่ายรวม (บาท)', 'กำไร/ขาดทุนสุทธิ']);
  formatHeaderRow(sGardens);
  
  // 2. ชีตขั้นตอนงาน
  var sTasks = getOrCreateSheet(ss, '📝 ขั้นตอนงานในสวน');
  sTasks.clear();
  sTasks.appendRow(['ชื่อแปลงสวน', 'ID งาน', 'ชื่องาน / กิจกรรม', 'วันที่เริ่มงาน', 'สถานะงาน', 'วันที่ทำเสร็จ']);
  formatHeaderRow(sTasks);
  
  // 3. ชีตสิ่งของ / ปัจจัยการผลิต
  var sItems = getOrCreateSheet(ss, '📦 สิ่งที่มีไว้ใช้ในสวน');
  sItems.clear();
  sItems.appendRow(['ชื่อแปลงสวน', 'ID สิ่งของ', 'หมวดหมู่', 'ชื่อสิ่งของ', 'จำนวน/หน่วย', 'วันที่ซื้อ', 'สถานะคงคลัง']);
  formatHeaderRow(sItems);
  
  // 4. ชีตรายรับ-รายจ่าย
  var sFinance = getOrCreateSheet(ss, '💰 บันทึกการเงิน');
  sFinance.clear();
  sFinance.appendRow(['ชื่อแปลงสวน', 'ID ธุรกรรม', 'ประเภท (รายรับ/รายจ่าย)', 'รายการ', 'จำนวน/หน่วย', 'จำนวนเงิน (บาท)']);
  formatHeaderRow(sFinance);
  
  gardens.forEach(function(g) {
    var totalIncome = 0;
    var totalExpense = 0;
    if (g.finances) {
      g.finances.forEach(function(f) {
        if (f.type === 'income') totalIncome += Number(f.amount || 0);
        if (f.type === 'expense') totalExpense += Number(f.amount || 0);
      });
    }
    
    var coords = (g.location && g.location.lat && g.location.lng) 
      ? (g.location.lat + ', ' + g.location.lng) 
      : '-';
    var mapsUrl = (g.location && g.location.rawInput) ? g.location.rawInput : '-';
    
    sGardens.appendRow([
      g.id,
      g.name,
      g.description || '-',
      coords,
      mapsUrl,
      g.tasks ? g.tasks.length : 0,
      g.items ? g.items.length : 0,
      totalIncome,
      totalExpense,
      totalIncome - totalExpense
    ]);
    
    // บันทึก Tasks
    if (g.tasks && g.tasks.length > 0) {
      g.tasks.forEach(function(t) {
        var statusTh = t.status === 'done' ? 'เสร็จแล้ว' : (t.status === 'doing' ? 'กำลังทำ' : 'ยังไม่ทำ');
        sTasks.appendRow([g.name, t.id, t.title, t.startDate || '-', statusTh, t.completedAt || '-']);
      });
    }
    
    // บันทึก Items
    if (g.items && g.items.length > 0) {
      g.items.forEach(function(i) {
        var stockStatus = i.outOfStock ? '🔴 ของหมด (ต้องเติม)' : '🟢 มีของพร้อมใช้';
        sItems.appendRow([g.name, i.id, i.category || 'อุปกรณ์', i.name, i.qty, i.purchaseDate || '-', stockStatus]);
      });
    }
    
    // บันทึก Finances
    if (g.finances && g.finances.length > 0) {
      g.finances.forEach(function(f) {
        var typeTh = f.type === 'income' ? 'รายรับ (+)' : 'รายจ่าย (-)';
        sFinance.appendRow([g.name, f.id, typeTh, f.title, f.qty || '-', Number(f.amount || 0)]);
      });
    }
  });
  
  [sGardens, sTasks, sItems, sFinance].forEach(function(sheet) {
    sheet.autoResizeColumns(1, sheet.getLastColumn() || 1);
  });
}

function getOrCreateSheet(ss, name) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  return sheet;
}

function formatHeaderRow(sheet) {
  var range = sheet.getRange(1, 1, 1, sheet.getLastColumn() || 1);
  range.setBackground('#0F4C81');
  range.setFontColor('#FFFFFF');
  range.setFontWeight('bold');
  range.setHorizontalAlignment('center');
}
