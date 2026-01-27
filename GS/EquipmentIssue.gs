// EquipmentIssue.gs - 入職裝備領用表系統

// ==================== 工作表名稱 ====================
const SHEET_EQUIPMENT_ISSUE = '入職裝備領用表';

const EQUIPMENT_LIST = [
  { name: '✦安全帽', quantity: 1, unit: '個', category: 'required', unitPrice: 200 },
  { name: '✦直二格釘袋', quantity: 1, unit: '個', category: 'required', unitPrice: 600 },
  { name: '✦S腰帶', quantity: 1, unit: '條', category: 'required', unitPrice: 200 },
  { name: '✦工具收納袋', quantity: 1, unit: '個', category: 'required', unitPrice: 500 },
  { name: '✦捲尺快扣', quantity: 1, unit: '個', category: 'required', unitPrice: 500 },

  { name: '鐵鎚', quantity: 1, unit: '個', category: 'normal', unitPrice: 750 },
  { name: '槌架', quantity: 1, unit: '個', category: 'normal', unitPrice: 200 },
  { name: '垂線錐', quantity: 1, unit: '組', category: 'normal', unitPrice: 500 },
  { name: '鋼絲鉗', quantity: 1, unit: '個', category: 'normal', unitPrice: 450 },
  { name: '單口鉗套', quantity: 1, unit: '個', category: 'normal', unitPrice: 400 },

  { name: '◆捲尺', quantity: 1, unit: '個', category: 'company', unitPrice: 0 },
  { name: '◆制服', quantity: 2, unit: '件', category: 'company', unitPrice: 0 },
  { name: '◆削筆器', quantity: 1, unit: '個', category: 'company', unitPrice: 0 },
  { name: '◆鉛筆', quantity: 1, unit: '盒', category: 'company', unitPrice: 0 },
  { name: '◆螺絲起子(小)', quantity: 1, unit: '把', category: 'company', unitPrice: 0 }
];

function calcTotalAmount(receivedItems) {
  const priceMap = {};
  EQUIPMENT_LIST.forEach(i => priceMap[i.name] = i);

  let total = 0;
  Object.keys(receivedItems || {}).forEach(name => {
    if (!receivedItems[name]) return;
    const item = priceMap[name];
    if (!item) return;
    total += (Number(item.unitPrice) || 0) * (Number(item.quantity) || 1);
  });

  return total;
}


/**
 * ✅ 處理取得裝備清單（固定資料，前端直接顯示）
 */
function handleGetEquipmentList(params) {
  try {
    // Session 驗證
    if (!params.token || !validateSession(params.token)) {
      return { ok: false, msg: "未授權或 session 已過期" };
    }
    
    return {
      ok: true,
      data: EQUIPMENT_LIST,
      note: '◆為公司提供，無須購買，毀損可與倉管換領'
    };
    
  } catch (error) {
    Logger.log('❌ 取得裝備清單錯誤: ' + error);
    return { ok: false, msg: error.message };
  }
}

/**
 * ✅ 處理取得員工裝備領用記錄
 */
function handleGetEmployeeEquipmentIssue(params) {
  try {
    Logger.log('═══════════════════════════════════════');
    Logger.log('📋 取得員工裝備領用記錄');
    Logger.log('═══════════════════════════════════════');
    
    // Session 驗證
    if (!params.token || !validateSession(params.token)) {
      return { ok: false, msg: "未授權或 session 已過期" };
    }
    
    const sessionResult = handleCheckSession(params.token);
    const userId = sessionResult.user.userId;
    
    Logger.log('👤 查詢員工: ' + userId);
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_EQUIPMENT_ISSUE);
    
    if (!sheet) {
      Logger.log('ℹ️  工作表不存在，返回空資料');
      return { 
        ok: true, 
        data: {
          hasRecord: false,
          equipmentList: EQUIPMENT_LIST.map(item => ({ ...item, received: false })),
          totalAmount: 0,
          note: ''
        }
      };
    }
    
    const data = sheet.getDataRange().getValues();
    
    // 找到該員工的領用記錄
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === userId) {
        Logger.log('✅ 找到領用記錄（第 ' + (i + 1) + ' 列）');
        
        const receivedItems = data[i][3] ? JSON.parse(data[i][3]) : {};

        const equipmentWithStatus = EQUIPMENT_LIST.map(item => ({
          ...item,
          received: receivedItems[item.name] || false
        }));

        const calcTotal = calcTotalAmount(receivedItems);
        const has6Cols = data[i].length >= 6;

        // 新表：E=total, F=note；舊表：E=note
        const totalAmount = has6Cols ? (data[i][4] ?? calcTotal) : calcTotal;
        const note = has6Cols ? (data[i][5] || '') : (data[i][4] || '');

        return {
          ok: true,
          data: {
            hasRecord: true,
            issueDate: data[i][2],
            equipmentList: equipmentWithStatus,
            totalAmount: totalAmount,
            note: note
          }
        };
      }
    }
    
    Logger.log('ℹ️  找不到領用記錄');
    
    return { 
      ok: true, 
      data: {
        hasRecord: false,
        equipmentList: EQUIPMENT_LIST.map(item => ({ ...item, received: false })),
        totalAmount: 0,
        note: ''
      }
    };
    
  } catch (error) {
    Logger.log('❌ 錯誤: ' + error);
    return { ok: false, msg: error.message };
  }
}

function handleSaveEquipmentIssue(params) {
  try {
    Logger.log('═══════════════════════════════════════');
    Logger.log('💾 儲存裝備領用記錄');
    Logger.log('═══════════════════════════════════════');

    if (!params.token || !validateSession(params.token)) {
      return { ok: false, msg: "未授權或 session 已過期" };
    }

    const sessionResult = handleCheckSession(params.token);
    const userId = sessionResult.user.userId;
    const userName = sessionResult.user.name;

    let receivedItems;
    try {
      receivedItems = JSON.parse(decodeURIComponent(params.receivedItems));
    } catch (e) {
      return { ok: false, msg: "資料格式錯誤" };
    }

    const totalAmount = calcTotalAmount(receivedItems);

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_EQUIPMENT_ISSUE);

    // ✅ sheet 不存在就先建立
    if (!sheet) {
      Logger.log('📋 建立「入職裝備領用表」工作表...');
      sheet = ss.insertSheet(SHEET_EQUIPMENT_ISSUE);

      sheet.getRange(1, 1, 1, 6).setValues([[
        'userId', '領用人', '領用日期', '領取項目JSON', '總金額', '備註'
      ]]);

      sheet.getRange(1, 1, 1, 6)
        .setBackground('#4a5568')
        .setFontColor('#ffffff')
        .setFontWeight('bold')
        .setHorizontalAlignment('center');

      sheet.setColumnWidth(1, 150);
      sheet.setColumnWidth(2, 100);
      sheet.setColumnWidth(3, 120);
      sheet.setColumnWidth(4, 300);
      sheet.setColumnWidth(5, 100);
      sheet.setColumnWidth(6, 200);

      sheet.setFrozenRows(1);
      Logger.log('✅ 工作表建立完成');
    } else {
      // ✅ 兼容舊表：只有 5 欄（D後面沒有總金額）
      const lastCol = sheet.getLastColumn();
      if (lastCol === 5) {
        sheet.insertColumnAfter(4);            // E:總金額
        sheet.getRange(1, 5).setValue('總金額');

        // 原本 E 是備註，搬到 F（把整欄搬過去）
        const lastRow = sheet.getLastRow();
        if (lastRow >= 1) {
          const oldNote = sheet.getRange(1, 5, lastRow, 1).getValues();
          sheet.getRange(1, 6, lastRow, 1).setValues(oldNote);
          sheet.getRange(1, 5, lastRow, 1).clearContent(); // 清掉原備註欄
          sheet.getRange(1, 5).setValue('總金額');
          sheet.getRange(1, 6).setValue('備註');
        }
      }
    }

    const data = sheet.getDataRange().getValues();
    let targetRow = -1;

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === userId) {
        targetRow = i + 1;
        break;
      }
    }

    const now = new Date();
    const rowData = [
      userId,
      userName,
      now,
      JSON.stringify(receivedItems),
      totalAmount,
      params.note || ''
    ];

    if (targetRow > 0) {
      sheet.getRange(targetRow, 1, 1, 6).setValues([rowData]);
      Logger.log('✅ 更新記錄: Row ' + targetRow);
    } else {
      sheet.appendRow(rowData);
      Logger.log('✅ 新增記錄');
    }

    return { ok: true, msg: "裝備領用記錄已成功儲存", data: { savedAt: now.toISOString(), totalAmount } };

  } catch (error) {
    Logger.log('❌ 錯誤: ' + error);
    Logger.log('❌ 錯誤堆疊: ' + error.stack);
    return { ok: false, msg: error.message };
  }
}

function handleGetAllEquipmentIssues(params) {
  try {
    Logger.log('📋 取得所有裝備領用記錄');
    
    // Session 驗證
    if (!params.token || !validateSession(params.token)) {
      return { ok: false, msg: "未授權" };
    }
    
    const sessionResult = handleCheckSession(params.token);
    
    // 權限檢查：只有管理員可以查看
    if (sessionResult.user.dept !== '管理員') {
      return { ok: false, msg: "僅限管理員查看" };
    }
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_EQUIPMENT_ISSUE);
    
    if (!sheet) {
      return { ok: true, records: [] };
    }
    
    const data = sheet.getDataRange().getValues();
    const records = [];
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];

      const received = JSON.parse(row[3] || '{}');
      const calcTotal = calcTotalAmount(received);
      const has6Cols = row.length >= 6;

      records.push({
        userId: row[0],
        userName: row[1],
        issueDate: row[2],
        receivedItems: received,
        totalAmount: has6Cols ? (row[4] ?? calcTotal) : calcTotal,
        note: has6Cols ? (row[5] || '') : (row[4] || '')
      });
    }

    
    return {
      ok: true,
      records: records,
      count: records.length
    };
    
  } catch (error) {
    Logger.log('❌ 錯誤: ' + error);
    return { ok: false, msg: error.message };
  }
}

/**
 * 🧪 測試函數
 */
function testEquipmentIssueAPI() {
  Logger.log('===== 測試裝備領用表 API =====');
  
  // ⚠️ 替換成你的真實 token
  const testToken = 'eaf9bca2-63e8-4582-abd3-9951be95c597';
  
  // 測試 1: 取得裝備清單
  const listResult = handleGetEquipmentList({ token: testToken });
  Logger.log('1. 裝備清單: ' + JSON.stringify(listResult));
  
  // 測試 2: 取得領用記錄
  const recordResult = handleGetEmployeeEquipmentIssue({ token: testToken });
  Logger.log('2. 領用記錄: ' + JSON.stringify(recordResult));
  
  // 測試 3: 儲存領用記錄
  const saveResult = handleSaveEquipmentIssue({
    token: testToken,
    receivedItems: encodeURIComponent(JSON.stringify({
      '✦安全帽': true,
      '✦直二格釘袋': true,
      '鐵鎚': true
    })),
    note: '測試領用'
  });
  Logger.log('3. 儲存結果: ' + JSON.stringify(saveResult));
}