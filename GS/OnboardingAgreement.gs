// OnboardingAgreement.gs - 入職切結書系統（完全修正版 v2）

// ==================== 工作表名稱 ====================
const SHEET_ONBOARDING = '入職切結書簽核';
const SHEET_EMPLOYEE_DATA = '入職職員名卡';

// ==================== 簽核狀態 ====================
const ONBOARDING_STATUS = {
  PENDING: 'PENDING',       // 待填寫
  SUBMITTED: 'SUBMITTED',   // 已提交
  APPROVED: 'APPROVED',     // 已核准
  REJECTED: 'REJECTED'      // 已拒絕
};

/**
 * ✅ 處理取得員工入職資料（從入職職員名卡）
 */
function handleGetEmployeeOnboardingData(params) {
  try {
    Logger.log('═══════════════════════════════════════');
    Logger.log('📋 開始取得員工入職資料');
    Logger.log('═══════════════════════════════════════');
    
    // Session 驗證
    if (!params.token || !validateSession(params.token)) {
      Logger.log('❌ Session 驗證失敗');
      return { ok: false, msg: "未授權或 session 已過期" };
    }
    
    Logger.log('✅ Session 驗證成功');
    
    const sessionResult = handleCheckSession(params.token);
    const userId = sessionResult.user.userId;
    
    Logger.log('👤 查詢員工: ' + userId);
    
    // 從「入職職員名卡」工作表讀取資料
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_EMPLOYEE_DATA);
    
    if (!sheet) {
      Logger.log('❌ 找不到「入職職員名卡」工作表');
      return { ok: false, msg: "找不到「入職職員名卡」工作表，請先建立工作表" };
    }
    
    Logger.log('✅ 找到「入職職員名卡」工作表');
    
    const data = sheet.getDataRange().getValues();
    
    if (data.length === 0) {
      Logger.log('❌ 工作表為空');
      return { ok: false, msg: "工作表沒有資料" };
    }
    
    const headers = data[0];
    Logger.log('📊 表頭數量: ' + headers.length);
    Logger.log('📊 表頭內容: ' + JSON.stringify(headers));
    
    // ⭐ 尋找該員工的資料
    let employeeData = null;
    let foundRow = -1;
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const rowUserId = String(row[0]).trim(); // A 欄是 userId
      
      Logger.log(`   檢查第 ${i} 列: userId = "${rowUserId}"`);
      
      if (rowUserId === userId) {
        Logger.log(`✅ 找到員工資料！（第 ${i} 列）`);
        foundRow = i;
        
        // 將資料轉換為物件
        employeeData = {};
        headers.forEach((header, index) => {
          employeeData[header] = row[index];
        });
        
        break;
      }
    }
    
    if (!employeeData) {
      Logger.log('❌ 找不到該員工的資料');
      Logger.log('   要找的 userId: "' + userId + '"');
      Logger.log('   工作表共有 ' + (data.length - 1) + ' 筆資料');
      
      return { 
        ok: false, 
        msg: "找不到您的入職資料，請聯絡人資部門\n（userId: " + userId + "）" 
      };
    }
    
    Logger.log('✅ 員工資料取得成功');
    Logger.log('   姓名: ' + employeeData['姓名']);
    Logger.log('   部門: ' + employeeData['部門']);
    Logger.log('   職位: ' + employeeData['職位']);
    
    // 檢查是否已簽核
    const onboardingSheet = ss.getSheetByName(SHEET_ONBOARDING);
    let signatureRecord = null;
    
    if (onboardingSheet) {
      Logger.log('📋 檢查簽核記錄...');
      
      const onboardingData = onboardingSheet.getDataRange().getValues();
      
      for (let i = 1; i < onboardingData.length; i++) {
        if (onboardingData[i][0] === userId) {
          Logger.log('✅ 找到簽核記錄');
          
          signatureRecord = {
            status: onboardingData[i][5],
            signedAt: onboardingData[i][6],
            approvedBy: onboardingData[i][7],
            approvedAt: onboardingData[i][8]
          };
          
          Logger.log('   狀態: ' + signatureRecord.status);
          break;
        }
      }
      
      if (!signatureRecord) {
        Logger.log('ℹ️  尚未提交簽核');
      }
    } else {
      Logger.log('ℹ️  簽核工作表不存在（尚未有人提交）');
    }
    
    Logger.log('═══════════════════════════════════════');
    Logger.log('✅ 資料準備完成，準備回傳');
    Logger.log('═══════════════════════════════════════');
    
    return {
      ok: true,
      data: {
        employee: employeeData,
        signature: signatureRecord
      }
    };
    
  } catch (error) {
    Logger.log('❌ 錯誤: ' + error);
    Logger.log('❌ 錯誤堆疊: ' + error.stack);
    return { ok: false, msg: error.message };
  }
}

function handleUpdateEmployeeOnboardingData(params) {
  try {
    Logger.log('═══════════════════════════════════════');
    Logger.log('📝 開始更新員工入職資料');
    Logger.log('═══════════════════════════════════════');
    
    // Session 驗證
    if (!params.token || !validateSession(params.token)) {
      Logger.log('❌ Session 驗證失敗');
      return { ok: false, msg: "未授權或 session 已過期" };
    }
    
    const sessionResult = handleCheckSession(params.token);
    const userId = sessionResult.user.userId;
    const userName = sessionResult.user.name;
    
    Logger.log('👤 更新員工: ' + userId);
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_EMPLOYEE_DATA);
    
    // ⭐ 如果工作表不存在，建立它
    if (!sheet) {
      Logger.log('📋 建立「入職職員名卡」工作表...');
      sheet = ss.insertSheet(SHEET_EMPLOYEE_DATA);
      
      // 設定標題列（根據你的實際需求調整）
      sheet.getRange(1, 1, 1, 30).setValues([[
        'userId',           // A (1)
        '姓名',             // B (2)
        '出生日期',         // C (3)
        '部門',             // D (4)
        '性別',             // E (5)
        '身分證字號',       // F (6)
        '血型',             // G (7)
        '通訊地址',         // H (8)
        '戶籍地址',         // I (9)
        '聯絡電話',         // J (10)
        '行動電話',         // K (11)
        'E-mail',          // L (12)
        '籍貫',             // M (13)
        '緊急連絡人',       // N (14)
        '緊急連絡電話',     // O (15)
        '緊急連絡人關係',   // P (16)
        '最高學歷',         // Q (17)
        '學校',             // R (18)
        '勞保單位',         // S (19)
        '勞保投保日期',     // T (20)
        '健保單位',         // U (21)
        '健保投保日期',     // V (22)
        '職位',             // W (23)
        '到職日',           // X (24)
        '離職日',           // Y (25)
        '相關學經歷或證照', // Z (26)
        '其他應記載事項',   // AA (27)
        '備註',             // AB (28)
        '銀行',             // AC (29)
        '匯款帳號'          // AD (30)
      ]]);
      
      // 設定標題列格式
      sheet.getRange(1, 1, 1, 30)
        .setBackground('#4a5568')
        .setFontColor('#ffffff')
        .setFontWeight('bold')
        .setHorizontalAlignment('center');
      
      Logger.log('✅ 工作表建立完成');
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    
    Logger.log('📊 工作表欄位: ' + JSON.stringify(headers));
    
    // 找到該員工的資料列
    let targetRow = -1;
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() === userId) {
        targetRow = i + 1; // Sheet 的 row 從 1 開始
        break;
      }
    }
    
    // ⭐⭐⭐ 如果找不到，自動建立新列
    if (targetRow === -1) {
      Logger.log('ℹ️  找不到現有資料，建立新列...');
      
      // 新增一列，並設定 userId 和姓名
      const newRow = sheet.getLastRow() + 1;
      sheet.getRange(newRow, 1).setValue(userId);       // A: userId
      sheet.getRange(newRow, 2).setValue(userName);     // B: 姓名
      
      targetRow = newRow;
      Logger.log('✅ 已建立第 ' + targetRow + ' 列');
    } else {
      Logger.log('✅ 找到員工資料（第 ' + targetRow + ' 列）');
    }
    
    // ⭐⭐⭐ 更新所有傳入的欄位
    let updatedCount = 0;
    const skippedFields = [];
    
    Object.keys(params).forEach(paramKey => {
      // 跳過系統參數
      if (paramKey === 'token' || paramKey === 'action') {
        return;
      }
      
      const value = params[paramKey];
      
      // 跳過空值
      if (value === undefined || value === null || value === '') {
        return;
      }
      
      // 尋找對應的欄位索引
      const colIndex = headers.indexOf(paramKey);
      
      if (colIndex !== -1) {
        sheet.getRange(targetRow, colIndex + 1).setValue(value);
        Logger.log(`   更新欄位: ${paramKey} = ${value}`);
        updatedCount++;
      } else {
        Logger.log(`   ⚠️  找不到欄位: ${paramKey}`);
        skippedFields.push(paramKey);
      }
    });
    
    Logger.log('═══════════════════════════════════════');
    Logger.log(`✅ 更新完成`);
    Logger.log(`   成功: ${updatedCount} 個欄位`);
    if (skippedFields.length > 0) {
      Logger.log(`   跳過: ${skippedFields.join(', ')}`);
    }
    Logger.log('═══════════════════════════════════════');
    
    return {
      ok: true,
      msg: "資料已成功更新",
      updatedFields: updatedCount,
      skippedFields: skippedFields,
      isNewRecord: targetRow === sheet.getLastRow()
    };
    
  } catch (error) {
    Logger.log('❌ 錯誤: ' + error);
    Logger.log('❌ 錯誤堆疊: ' + error.stack);
    return { ok: false, msg: error.message };
  }
}


/**
 * ✅ 處理提交入職切結書簽核（增強版）
 */
function handleSubmitOnboardingAgreement(params) {
  try {
    Logger.log('═══════════════════════════════════════');
    Logger.log('📝 開始提交入職切結書簽核');
    Logger.log('═══════════════════════════════════════');
    
    // Session 驗證
    if (!params.token || !validateSession(params.token)) {
      Logger.log('❌ Session 驗證失敗');
      return { ok: false, msg: "未授權或 session 已過期" };
    }
    
    Logger.log('✅ Session 驗證成功');
    
    const sessionResult = handleCheckSession(params.token);
    const user = sessionResult.user;
    
    Logger.log('👤 提交者: ' + user.name + ' (' + user.userId + ')');
    
    // ⭐⭐⭐ 修正：詳細驗證所有條款是否勾選
    const requiredTerms = [
      'agreeConfidentiality',    // 保密義務
      'agreeNonCompete',         // 競業禁止
      'agreeIpRights',           // 智慧財產權
      'agreeLiability',          // 違約責任
      'agreeProbation',          // 試用期間
      'agreeEquipment',          // 工具領用
      'agreeSafety'              // 安全規定
    ];
    
    Logger.log('📋 檢查條款勾選狀態...');
    
    const uncheckedTerms = [];
    requiredTerms.forEach(term => {
      const value = params[term];
      Logger.log(`   ${term}: ${value}`);
      
      if (value !== 'true' && value !== true) {
        uncheckedTerms.push(term);
      }
    });
    
    if (uncheckedTerms.length > 0) {
      Logger.log('❌ 有條款未勾選:');
      uncheckedTerms.forEach(term => {
        Logger.log('   - ' + term);
      });
      
      return { 
        ok: false, 
        msg: `請勾選所有切結書條款（尚有 ${uncheckedTerms.length} 項未勾選）`,
        uncheckedTerms: uncheckedTerms
      };
    }
    
    Logger.log('✅ 所有條款已勾選');
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_ONBOARDING);
    
    // 如果工作表不存在，建立它
    if (!sheet) {
      Logger.log('📋 建立「入職切結書簽核」工作表...');
      
      sheet = ss.insertSheet(SHEET_ONBOARDING);
      
      // ⭐ 更新標題列，增加條款勾選記錄欄位
      sheet.getRange(1, 1, 1, 18).setValues([[
        'userId',                    // A
        '姓名',                      // B
        '身分證字號',                // C
        '職位',                      // D
        '部門',                      // E
        '狀態',                      // F
        '簽核時間',                  // G
        '核准者',                    // H
        '核准時間',                  // I
        'IP位址',                    // J
        '保密義務',                  // K
        '競業禁止',                  // L
        '智慧財產權',                // M
        '違約責任',                  // N
        '試用期間',                  // O
        '工具領用',                  // P
        '安全規定',                  // Q
        '備註'                       // R
      ]]);
      
      // 設定標題列格式
      sheet.getRange(1, 1, 1, 18)
        .setBackground('#4a5568')
        .setFontColor('#ffffff')
        .setFontWeight('bold')
        .setHorizontalAlignment('center');
      
      Logger.log('✅ 工作表建立完成');
    }
    
    // 檢查是否已提交
    const data = sheet.getDataRange().getValues();
    let existingRow = -1;
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === user.userId) {
        existingRow = i + 1;
        Logger.log('ℹ️  找到現有記錄（第 ' + existingRow + ' 列）');
        break;
      }
    }
    
    const now = new Date();
    const ipAddress = params.ipAddress || 'Unknown';
    
    Logger.log('📋 準備員工資料...');
    
    // 從入職名卡取得完整資料
    const employeeSheet = ss.getSheetByName(SHEET_EMPLOYEE_DATA);
    let employeeInfo = {
      name: user.name,
      idNumber: '',
      position: '',
      department: user.dept || ''
    };
    
    if (employeeSheet) {
      const empData = employeeSheet.getDataRange().getValues();
      for (let i = 1; i < empData.length; i++) {
        if (empData[i][0] === user.userId) {
          employeeInfo = {
            name: empData[i][1] || user.name,
            idNumber: empData[i][5] || '',  // F 欄是身分證字號
            position: empData[i][22] || '', // W 欄是職位
            department: empData[i][3] || user.dept // D 欄是部門
          };
          
          Logger.log('✅ 取得完整員工資料');
          Logger.log('   姓名: ' + employeeInfo.name);
          Logger.log('   身分證: ' + employeeInfo.idNumber);
          Logger.log('   職位: ' + employeeInfo.position);
          Logger.log('   部門: ' + employeeInfo.department);
          
          break;
        }
      }
    } else {
      Logger.log('⚠️  找不到「入職職員名卡」，使用基本資料');
    }
    
    // ⭐⭐⭐ 更新資料列，包含所有條款勾選狀態
    const rowData = [
      user.userId,                               // A
      employeeInfo.name,                         // B
      employeeInfo.idNumber,                     // C
      employeeInfo.position,                     // D
      employeeInfo.department,                   // E
      ONBOARDING_STATUS.SUBMITTED,               // F
      now,                                       // G
      '',                                        // H (核准者，待填)
      '',                                        // I (核准時間，待填)
      ipAddress,                                 // J
      params.agreeConfidentiality === 'true' ? '✓' : '✗',  // K
      params.agreeNonCompete === 'true' ? '✓' : '✗',       // L
      params.agreeIpRights === 'true' ? '✓' : '✗',         // M
      params.agreeLiability === 'true' ? '✓' : '✗',        // N
      params.agreeProbation === 'true' ? '✓' : '✗',        // O
      params.agreeEquipment === 'true' ? '✓' : '✗',        // P
      params.agreeSafety === 'true' ? '✓' : '✗',           // Q
      params.note || ''                          // R
    ];
    
    if (existingRow > 0) {
      // 更新現有記錄
      sheet.getRange(existingRow, 1, 1, 18).setValues([rowData]);
      Logger.log('✅ 更新記錄: Row ' + existingRow);
    } else {
      // 新增記錄
      sheet.appendRow(rowData);
      Logger.log('✅ 新增記錄');
    }
    
    Logger.log('═══════════════════════════════════════');
    Logger.log('✅ 提交成功');
    Logger.log('═══════════════════════════════════════');
    
    // 🔔 發送通知給管理員（可選）
    try {
      notifyAdminNewOnboarding_(employeeInfo.name, employeeInfo.position);
    } catch (notifyError) {
      Logger.log('⚠️  通知失敗: ' + notifyError);
    }
    
    return {
      ok: true,
      msg: "入職切結書已成功提交，等待主管審核",
      data: {
        submittedAt: now.toISOString(),
        agreedTerms: requiredTerms.length
      }
    };
    
  } catch (error) {
    Logger.log('❌ 錯誤: ' + error);
    Logger.log('❌ 錯誤堆疊: ' + error.stack);
    return { ok: false, msg: error.message };
  }
}

/**
 * ✅ 處理取得所有待審核的入職簽核（管理員）
 */
function handleGetPendingOnboardingRequests(params) {
  try {
    Logger.log('📋 取得待審核入職簽核');
    
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
    const sheet = ss.getSheetByName(SHEET_ONBOARDING);
    
    if (!sheet) {
      return { ok: true, requests: [] };
    }
    
    const data = sheet.getDataRange().getValues();
    const requests = [];
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      
      // 只顯示待審核的
      if (row[5] === ONBOARDING_STATUS.SUBMITTED) {
        requests.push({
          id: i + 1, // Row number
          userId: row[0],
          name: row[1],
          idNumber: row[2],
          position: row[3],
          department: row[4],
          status: row[5],
          submittedAt: row[6],
          ipAddress: row[9],
          note: row[10]
        });
      }
    }
    
    return {
      ok: true,
      requests: requests,
      count: requests.length
    };
    
  } catch (error) {
    Logger.log('❌ 錯誤: ' + error);
    return { ok: false, msg: error.message };
  }
}

/**
 * ✅ 處理審核入職簽核（核准/拒絕）
 * ⭐ 修正：確保 action 正確映射到狀態
 */
function handleReviewOnboarding(params) {
  try {
    Logger.log('═══════════════════════════════════════');
    Logger.log('👨‍💼 審核入職簽核');
    Logger.log('═══════════════════════════════════════');
    
    // Session 驗證
    if (!params.token || !validateSession(params.token)) {
      return { ok: false, msg: "未授權" };
    }
    
    const sessionResult = handleCheckSession(params.token);
    
    // 權限檢查
    if (sessionResult.user.dept !== '管理員') {
      return { ok: false, msg: "僅限管理員操作" };
    }
    
    const rowId = parseInt(params.rowId);
    const action = String(params.decision).toLowerCase().trim();
    
    const comment = params.comment || '';
    
    Logger.log('   rowId: ' + rowId);
    Logger.log('   action: "' + action + '"');
    Logger.log('   comment: ' + comment);
    
    if (!rowId || !action) {
      return { ok: false, msg: "缺少必要參數" };
    }
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_ONBOARDING);
    
    if (!sheet) {
      return { ok: false, msg: "找不到簽核記錄" };
    }
    
    // ⭐ 修正：確保正確判斷 action
    let newStatus;
    if (action === 'approve') {
      newStatus = ONBOARDING_STATUS.APPROVED;
    } else if (action === 'reject') {
      newStatus = ONBOARDING_STATUS.REJECTED;
    } else {
      Logger.log('❌ 無效的 action: ' + action);
      return { ok: false, msg: "無效的操作：" + action };
    }
    
    Logger.log('   新狀態: ' + newStatus);
    
    const now = new Date();
    
    // 更新狀態
    sheet.getRange(rowId, 6).setValue(newStatus);                   // F: 狀態
    sheet.getRange(rowId, 8).setValue(sessionResult.user.name);     // H: 核准者
    sheet.getRange(rowId, 9).setValue(now);                         // I: 核准時間
    
    Logger.log('✅ 已更新工作表');
    
    // 如果有備註，更新備註欄
    if (comment) {
      const existingNote = sheet.getRange(rowId, 11).getValue();
      const newNote = existingNote 
        ? `${existingNote}\n[${newStatus}] ${comment}` 
        : `[${newStatus}] ${comment}`;
      sheet.getRange(rowId, 11).setValue(newNote);
      Logger.log('✅ 已更新備註');
    }
    
    // 取得員工資訊
    const employeeName = sheet.getRange(rowId, 2).getValue();
    const userId = sheet.getRange(rowId, 1).getValue();
    
    Logger.log('═══════════════════════════════════════');
    Logger.log(`✅ ${newStatus}: ${employeeName} (${userId})`);
    Logger.log('═══════════════════════════════════════');
    
    return {
      ok: true,
      msg: action === 'approve' ? "已核准入職簽核" : "已拒絕入職簽核",
      data: {
        status: newStatus,
        reviewedBy: sessionResult.user.name,
        reviewedAt: now.toISOString()
      }
    };
    
  } catch (error) {
    Logger.log('❌ 錯誤: ' + error);
    Logger.log('❌ 錯誤堆疊: ' + error.stack);
    return { ok: false, msg: error.message };
  }
}

/**
 * 🔔 通知管理員有新的入職簽核（可選實作）
 */
function notifyAdminNewOnboarding_(employeeName, position) {
  try {
    Logger.log(`🔔 通知管理員：${employeeName} (${position}) 已提交入職切結書`);
    
    // ⭐ 可選：使用 LINE Notify 發送通知
    // const message = `🆕 新入職簽核\n員工：${employeeName}\n職位：${position}`;
    // sendLineNotify(message);
    
  } catch (error) {
    Logger.log('通知失敗: ' + error);
  }
}

/**
 * 🧪 測試函數：建立入職簽核工作表
 */
function createOnboardingSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_ONBOARDING);
  
  if (sheet) {
    Logger.log('⚠️ 工作表已存在');
    return;
  }
  
  sheet = ss.insertSheet(SHEET_ONBOARDING);
  
  // 設定標題列
  sheet.getRange(1, 1, 1, 11).setValues([[
    'userId',
    '姓名',
    '身分證字號',
    '職位',
    '部門',
    '狀態',
    '簽核時間',
    '核准者',
    '核准時間',
    'IP位址',
    '備註'
  ]]);
  
  // 設定格式
  sheet.getRange(1, 1, 1, 11)
    .setBackground('#4a5568')
    .setFontColor('#ffffff')
    .setFontWeight('bold')
    .setHorizontalAlignment('center');
  
  // 設定欄寬
  sheet.setColumnWidth(1, 150);  // userId
  sheet.setColumnWidth(2, 100);  // 姓名
  sheet.setColumnWidth(3, 120);  // 身分證
  sheet.setColumnWidth(4, 120);  // 職位
  sheet.setColumnWidth(5, 100);  // 部門
  sheet.setColumnWidth(6, 100);  // 狀態
  sheet.setColumnWidth(7, 150);  // 簽核時間
  sheet.setColumnWidth(8, 100);  // 核准者
  sheet.setColumnWidth(9, 150);  // 核准時間
  sheet.setColumnWidth(10, 120); // IP
  sheet.setColumnWidth(11, 200); // 備註
  
  // 凍結標題列
  sheet.setFrozenRows(1);
  
  Logger.log('✅ 入職簽核工作表建立完成');
}

/**
 * 🧪 測試 API
 */
function testOnboardingAPI() {
  Logger.log('===== 測試入職切結書 API =====');
  
  // ⚠️ 替換成你的真實 token
  const testToken = 'your-test-token-here';
  
  // 測試 1: 取得員工資料
  const getDataResult = handleGetEmployeeOnboardingData({ token: testToken });
  Logger.log('1. 取得資料: ' + JSON.stringify(getDataResult));
  
  // 測試 2: 提交簽核
  const submitResult = handleSubmitOnboardingAgreement({
    token: testToken,
    agreedTerms: 'true',
    ipAddress: '127.0.0.1'
  });
  Logger.log('2. 提交簽核: ' + JSON.stringify(submitResult));
  
  // 測試 3: 取得待審核列表
  const pendingResult = handleGetPendingOnboardingRequests({ token: testToken });
  Logger.log('3. 待審核列表: ' + JSON.stringify(pendingResult));
  
  // 測試 4: 核准
  if (pendingResult.requests && pendingResult.requests.length > 0) {
    const firstRequest = pendingResult.requests[0];
    const approveResult = handleReviewOnboarding({
      token: testToken,
      rowId: firstRequest.id,
      action: 'approve',
      comment: '測試核准'
    });
    Logger.log('4. 核准結果: ' + JSON.stringify(approveResult));
  }
}

/**
 * 🧪 測試審核功能
 */
function testReviewOnboarding() {
  Logger.log('===== 測試審核功能 =====');
  
  const testToken = 'your-admin-token-here';
  
  // 測試核准
  const approveResult = handleReviewOnboarding({
    token: testToken,
    rowId: 2, // 替換成實際的 row ID
    action: 'approve',
    comment: '資料確認無誤'
  });
  
  Logger.log('核准結果:');
  Logger.log(JSON.stringify(approveResult, null, 2));
  
  // 測試拒絕
  const rejectResult = handleReviewOnboarding({
    token: testToken,
    rowId: 3, // 替換成實際的 row ID
    action: 'reject',
    comment: '資料需要補正'
  });
  
  Logger.log('拒絕結果:');
  Logger.log(JSON.stringify(rejectResult, null, 2));
}