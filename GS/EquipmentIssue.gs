// EquipmentIssue.gs - 入職裝備領用表系統

// ==================== 工作表名稱 ====================
const SHEET_EQUIPMENT_ISSUE = '入職裝備領用表';

const EQUIPMENT_LIST = [
  { name: '➤安全帽', quantity: 1, unit: '個', category: 'required' },
  { name: '➤直二格釘袋', quantity: 1, unit: '個', category: 'required' },
  { name: '➤S腰帶', quantity: 1, unit: '條', category: 'required' },
  { name: '➤工具收納袋', quantity: 1, unit: '個', category: 'required' },
  { name: '➤捲尺快扣', quantity: 1, unit: '個', category: 'required' },
  { name: '鐵鎚', quantity: 1, unit: '個', category: 'normal' },
  { name: '槌架', quantity: 1, unit: '個', category: 'normal' },
  { name: '垂線錐', quantity: 1, unit: '組', category: 'normal' },
  { name: '鋼絲鉗', quantity: 1, unit: '個', category: 'normal' },
  { name: '單口鉗套', quantity: 1, unit: '個', category: 'normal' },
  { name: '◆捲尺', quantity: 1, unit: '個', category: 'company' },
  { name: '◆制服', quantity: 2, unit: '件', category: 'company' },
  { name: '◆削筆器', quantity: 1, unit: '個', category: 'company' },
  { name: '◆鉛筆', quantity: 1, unit: '盒', category: 'company' },
  { name: '◆螺絲起子(小)', quantity: 1, unit: '把', category: 'company' }
];

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
      note: '◆為公司提供，無須購買，毀損可與會管換領'
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
          equipmentList: EQUIPMENT_LIST.map(item => ({
            ...item,
            received: false
          }))
        }
      };
    }
    
    const data = sheet.getDataRange().getValues();
    
    // 找到該員工的領用記錄
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === userId) {
        Logger.log('✅ 找到領用記錄（第 ' + (i + 1) + ' 列）');
        
        // 解析勾選狀態
        const receivedItems = data[i][3] ? JSON.parse(data[i][3]) : {};
        
        const equipmentWithStatus = EQUIPMENT_LIST.map(item => ({
          ...item,
          received: receivedItems[item.name] || false
        }));
        
        return {
          ok: true,
          data: {
            hasRecord: true,
            issueDate: data[i][2],
            equipmentList: equipmentWithStatus,
            totalAmount: data[i][4],
            note: data[i][5]
          }
        };
      }
    }
    
    Logger.log('ℹ️  找不到領用記錄');
    
    return {
      ok: true,
      data: {
        hasRecord: false,
        equipmentList: EQUIPMENT_LIST.map(item => ({
          ...item,
          received: false
        }))
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
    
    // Session 驗證
    if (!params.token || !validateSession(params.token)) {
      return { ok: false, msg: "未授權或 session 已過期" };
    }
    
    const sessionResult = handleCheckSession(params.token);
    const userId = sessionResult.user.userId;
    const userName = sessionResult.user.name;
    
    Logger.log('👤 領用人: ' + userName + ' (' + userId + ')');
    
    // 解析勾選的裝備
    let receivedItems;
    try {
      receivedItems = JSON.parse(decodeURIComponent(params.receivedItems));
    } catch (e) {
      return { ok: false, msg: "資料格式錯誤" };
    }
    
    Logger.log('📦 勾選項目: ' + Object.keys(receivedItems).filter(k => receivedItems[k]).length + ' 項');
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_EQUIPMENT_ISSUE);
    
    // 如果工作表不存在，建立它
    if (!sheet) {
      Logger.log('📋 建立「入職裝備領用表」工作表...');
      
      sheet = ss.insertSheet(SHEET_EQUIPMENT_ISSUE);
      
      // 設定標題列（移除總金額欄位）
      sheet.getRange(1, 1, 1, 5).setValues([[
        'userId',           // A
        '領用人',           // B
        '領用日期',         // C
        '領取項目JSON',     // D
        '備註'              // E
      ]]);
      
      // 設定格式
      sheet.getRange(1, 1, 1, 5)
        .setBackground('#4a5568')
        .setFontColor('#ffffff')
        .setFontWeight('bold')
        .setHorizontalAlignment('center');
      
      // 設定欄寬
      sheet.setColumnWidth(1, 150);  // userId
      sheet.setColumnWidth(2, 100);  // 領用人
      sheet.setColumnWidth(3, 120);  // 領用日期
      sheet.setColumnWidth(4, 300);  // 領取項目JSON
      sheet.setColumnWidth(5, 200);  // 備註
      
      sheet.setFrozenRows(1);
      
      Logger.log('✅ 工作表建立完成');
    }
    
    const data = sheet.getDataRange().getValues();
    let targetRow = -1;
    
    // 找到現有記錄
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === userId) {
        targetRow = i + 1;
        break;
      }
    }
    
    const now = new Date();
    const rowData = [
      userId,                           // A
      userName,                         // B
      now,                              // C
      JSON.stringify(receivedItems),    // D
      params.note || ''                 // E
    ];
    
    if (targetRow > 0) {
      // 更新現有記錄
      sheet.getRange(targetRow, 1, 1, 5).setValues([rowData]);
      Logger.log('✅ 更新記錄: Row ' + targetRow);
    } else {
      // 新增記錄
      sheet.appendRow(rowData);
      Logger.log('✅ 新增記錄');
    }
    
    Logger.log('═══════════════════════════════════════');
    Logger.log('✅ 儲存成功');
    Logger.log('═══════════════════════════════════════');
    
    return {
      ok: true,
      msg: "裝備領用記錄已成功儲存",
      data: {
        savedAt: now.toISOString()
      }
    };
    
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
      
      records.push({
        userId: row[0],
        userName: row[1],
        issueDate: row[2],
        receivedItems: JSON.parse(row[3] || '{}'),
        note: row[4]
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
  const testToken = '8b03d177-8702-4f98-8dee-9b56e5c21ab1';
  
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
      '➤安全帽': true,
      '➤直二格釘袋': true,
      '鐵鎚': true
    })),
    note: '測試領用'
  });
  Logger.log('3. 儲存結果: ' + JSON.stringify(saveResult));
}