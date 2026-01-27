// WorklogOperations.gs - 工作日誌核心功能

// ==================== 常數定義 ====================
const SHEET_WORKLOG = '工作日誌';

const WORKLOG_STATUS = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED'
};

// ==================== 工作表初始化 ====================

function getWorklogSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_WORKLOG);
  
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_WORKLOG);
    
    // ⭐ 更新標題列（從 12 欄變成 16 欄）
    const headers = [
      '日誌ID',        // A (0)
      '員工ID',        // B (1)
      '員工姓名',      // C (2)
      '部門',          // D (3)
      '工作日期',      // E (4)
      '天氣',          // F (5) ⭐ 新增
      '地點',          // G (6) ⭐ 新增
      '工作時段',      // H (7) ⭐ 新增
      '工作時數',      // I (8) - 原 F
      '工作內容',      // J (9) - 原 G
      '備註',          // K (10) ⭐ 新增
      '狀態',          // L (11) - 原 H
      '提交時間',      // M (12) - 原 I
      '審核人',        // N (13) - 原 J
      '審核時間',      // O (14) - 原 K
      '審核意見'       // P (15) - 原 L
    ];
    
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    
    // 格式化標題列
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground('#4285f4')
               .setFontColor('#ffffff')
               .setFontWeight('bold')
               .setHorizontalAlignment('center');
    
    sheet.setFrozenRows(1);
    
    Logger.log('✅ 工作日誌工作表已建立');
  }
  
  return sheet;
}

// ==================== 新增工作日誌 ====================

function submitWorklog(userId, userName, department, date, hours, content, 
                       weather, location, timeSlot, note) {
  try {
    Logger.log('═══════════════════════════════════════');
    Logger.log('📝 開始提交工作日誌（完整版）');
    Logger.log('   員工: ' + userName);
    Logger.log('   日期: ' + date);
    Logger.log('   天氣: ' + weather);
    Logger.log('   地點: ' + location);
    Logger.log('   工作時段: ' + timeSlot);
    Logger.log('   時數: ' + hours);
    Logger.log('   內容長度: ' + (content ? content.length : 0));
    Logger.log('   備註: ' + (note ? '有' : '無'));
    Logger.log('═══════════════════════════════════════');
    
    // ⭐⭐⭐ 修正：使用 .trim() 檢查，並提供更詳細的錯誤訊息
    if (!userId || typeof userId !== 'string' || !userId.trim()) {
      Logger.log('❌ 缺少員工 ID');
      return { success: false, message: '缺少員工 ID' };
    }
    
    if (!date || typeof date !== 'string' || !date.trim()) {
      Logger.log('❌ 缺少工作日期');
      return { success: false, message: '缺少工作日期' };
    }
    
    if (!weather || typeof weather !== 'string' || !weather.trim()) {
      Logger.log('❌ 缺少天氣資訊');
      return { success: false, message: '缺少天氣資訊' };
    }
    
    if (!location || typeof location !== 'string' || !location.trim()) {
      Logger.log('❌ 缺少地點資訊');
      return { success: false, message: '缺少地點資訊' };
    }
    
    if (!hours) {
      Logger.log('❌ 缺少工作時數');
      return { success: false, message: '缺少工作時數' };
    }
    
    if (!content || typeof content !== 'string' || !content.trim()) {
      Logger.log('❌ 缺少工作內容');
      return { success: false, message: '缺少工作內容' };
    }
    
    // 驗證工作時數
    const hoursNum = parseFloat(hours);
    if (isNaN(hoursNum) || hoursNum <= 0 || hoursNum > 24) {
      Logger.log('❌ 工作時數格式錯誤: ' + hours);
      return { success: false, message: '工作時數必須在 0.5 ~ 24 小時之間' };
    }
    
    // 驗證工作內容長度
    if (content.trim().length < 10) {
      Logger.log('❌ 工作內容太短: ' + content.trim().length + ' 字');
      return { success: false, message: '工作內容至少需要 10 個字' };
    }
    
    // 檢查是否已有相同日期的待審核日誌
    const sheet = getWorklogSheet();
    const data = sheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][1] === userId && 
          data[i][4] === date && 
          data[i][11] === WORKLOG_STATUS.PENDING) {
        Logger.log('❌ 該日期已有待審核的工作日誌');
        return { success: false, message: '該日期已有待審核的工作日誌，請先撤回或等待審核' };
      }
    }
    
    // 生成日誌ID
    const worklogId = 'WL_' + Date.now();
    const submittedAt = new Date().toISOString();
    
    // 新增工作日誌（16 欄）
    const newRow = [
      worklogId,                    // A: 日誌ID
      userId,                       // B: 員工ID
      userName,                     // C: 員工姓名
      department,                   // D: 部門
      date,                         // E: 工作日期
      weather.trim(),               // F: 天氣
      location.trim(),              // G: 地點
      timeSlot || '',           // H: 工作時段
      hoursNum,                     // I: 工作時數
      content.trim(),               // J: 工作內容
      note ? note.trim() : '',      // K: 備註
      WORKLOG_STATUS.PENDING,       // L: 狀態
      submittedAt,                  // M: 提交時間
      '',                           // N: 審核人
      '',                           // O: 審核時間
      ''                            // P: 審核意見
    ];
    
    sheet.appendRow(newRow);
    
    Logger.log('✅ 工作日誌提交成功');
    Logger.log('   日誌ID: ' + worklogId);
    Logger.log('═══════════════════════════════════════');
    
    return {
      success: true,
      message: '工作日誌提交成功',
      worklogId: worklogId
    };
    
  } catch (error) {
    Logger.log('❌ submitWorklog 錯誤: ' + error);
    Logger.log('   錯誤堆疊: ' + error.stack);
    return { success: false, message: error.message };
  }
}

// ==================== 查詢工作日誌 ====================

function getWorklogs(userId, limit = 30) {
  try {
    Logger.log('📋 查詢工作日誌: ' + userId);
    
    const sheet = getWorklogSheet();
    const data = sheet.getDataRange().getValues();
    const worklogs = [];
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][1] === userId) {
        worklogs.push({
          id: data[i][0],
          userId: data[i][1],
          userName: data[i][2],
          department: data[i][3],
          date: data[i][4],
          weather: data[i][5],        // ⭐ 新增
          location: data[i][6],       // ⭐ 新增
          timeSlot: data[i][7],    // ⭐ 新增
          hours: data[i][8],          // 原 [5] → [8]
          content: data[i][9],        // 原 [6] → [9]
          note: data[i][10],          // ⭐ 新增
          status: data[i][11],        // 原 [7] → [11]
          submittedAt: data[i][12],   // 原 [8] → [12]
          reviewedBy: data[i][13],    // 原 [9] → [13]
          reviewedAt: data[i][14],    // 原 [10] → [14]
          reviewComment: data[i][15]  // 原 [11] → [15]
        });
      }
    }
    
    worklogs.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
    
    const limitedWorklogs = worklogs.slice(0, limit);
    
    Logger.log('✅ 找到 ' + worklogs.length + ' 筆工作日誌');
    
    return {
      success: true,
      worklogs: limitedWorklogs,
      total: worklogs.length
    };
    
  } catch (error) {
    Logger.log('❌ getWorklogs 錯誤: ' + error);
    return { success: false, message: error.message };
  }
}

function getWorklogDetail(worklogId) {
  try {
    const sheet = getWorklogSheet();
    const data = sheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === worklogId) {
        return {
          success: true,
          worklog: {
            id: data[i][0],
            userId: data[i][1],
            userName: data[i][2],
            department: data[i][3],
            date: data[i][4],
            weather: data[i][5],        // ⭐ 新增
            location: data[i][6],       // ⭐ 新增
            timeSlot: data[i][7],    // ⭐ 新增
            hours: data[i][8],          // 原 [5] → [8]
            content: data[i][9],        // 原 [6] → [9]
            note: data[i][10],          // ⭐ 新增
            status: data[i][11],        // 原 [7] → [11]
            submittedAt: data[i][12],   // 原 [8] → [12]
            reviewedBy: data[i][13],    // 原 [9] → [13]
            reviewedAt: data[i][14],    // 原 [10] → [14]
            reviewComment: data[i][15]  // 原 [11] → [15]
          }
        };
      }
    }
    
    return { success: false, message: '找不到工作日誌' };
    
  } catch (error) {
    Logger.log('❌ getWorklogDetail 錯誤: ' + error);
    return { success: false, message: error.message };
  }
}

// ==================== 管理員功能 ====================

/**
 * ✅ 取得所有待審核的工作日誌
 */
function getPendingWorklogs() {
  try {
    Logger.log('📋 查詢待審核工作日誌');
    
    const sheet = getWorklogSheet();
    const data = sheet.getDataRange().getValues();
    const pendingWorklogs = [];
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][11] === WORKLOG_STATUS.PENDING) {  // ⭐ 原 [7] → [11]
        pendingWorklogs.push({
          rowNumber: i + 1,
          id: data[i][0],
          userId: data[i][1],
          userName: data[i][2],
          department: data[i][3],
          date: data[i][4],
          weather: data[i][5],      // ⭐ 新增
          location: data[i][6],     // ⭐ 新增
          timeSlot: data[i][7],  // ⭐ 新增
          hours: data[i][8],        // 原 [5] → [8]
          content: data[i][9],      // 原 [6] → [9]
          note: data[i][10],        // ⭐ 新增
          status: data[i][11],      // 原 [7] → [11]
          submittedAt: data[i][12]  // 原 [8] → [12]
        });
      }
    }
    
    pendingWorklogs.sort((a, b) => new Date(a.submittedAt) - new Date(b.submittedAt));
    
    Logger.log('✅ 找到 ' + pendingWorklogs.length + ' 筆待審核工作日誌');
    
    return {
      success: true,
      worklogs: pendingWorklogs,
      total: pendingWorklogs.length
    };
    
  } catch (error) {
    Logger.log('❌ getPendingWorklogs 錯誤: ' + error);
    return { success: false, message: error.message };
  }
}

/**
 * ✅ 審核工作日誌（核准/拒絕）
 */
function reviewWorklog(worklogId, action, reviewerId, reviewerName, comment) {
  try {
    Logger.log('═══════════════════════════════════════');
    Logger.log('📝 審核工作日誌');
    Logger.log('   日誌ID: ' + worklogId);
    Logger.log('   動作: ' + action);
    Logger.log('   審核人: ' + reviewerName);
    Logger.log('═══════════════════════════════════════');
    
    if (action !== 'approve' && action !== 'reject') {
      Logger.log('❌ 無效的審核動作');
      return { success: false, message: '無效的審核動作' };
    }
    
    const sheet = getWorklogSheet();
    const data = sheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === worklogId) {
        
        // ⭐ 檢查狀態（原 [7] → [11]）
        if (data[i][11] !== WORKLOG_STATUS.PENDING) {
          Logger.log('❌ 該工作日誌已審核');
          return { success: false, message: '該工作日誌已審核，無法重複審核' };
        }
        
        const newStatus = action === 'approve' ? WORKLOG_STATUS.APPROVED : WORKLOG_STATUS.REJECTED;
        const reviewedAt = new Date().toISOString();
        
        // ⭐ 更新審核結果（欄位索引調整）
        sheet.getRange(i + 1, 12).setValue(newStatus);           // L: 狀態（原 8 → 12）
        sheet.getRange(i + 1, 14).setValue(reviewerName);        // N: 審核人（原 10 → 14）
        sheet.getRange(i + 1, 15).setValue(reviewedAt);          // O: 審核時間（原 11 → 15）
        sheet.getRange(i + 1, 16).setValue(comment || '');       // P: 審核意見（原 12 → 16）
        
        Logger.log('✅ 工作日誌審核完成');
        Logger.log('   新狀態: ' + newStatus);
        Logger.log('═══════════════════════════════════════');
        
        return {
          success: true,
          message: action === 'approve' ? '工作日誌已核准' : '工作日誌已拒絕'
        };
      }
    }
    
    Logger.log('❌ 找不到工作日誌');
    return { success: false, message: '找不到工作日誌' };
    
  } catch (error) {
    Logger.log('❌ reviewWorklog 錯誤: ' + error);
    return { success: false, message: error.message };
  }
}

/**
 * ✅ 核准工作日誌（便捷函數）
 */
function approveWorklog(worklogId, reviewerId, reviewerName, comment) {
  return reviewWorklog(worklogId, 'approve', reviewerId, reviewerName, comment);
}

/**
 * ✅ 拒絕工作日誌（便捷函數）
 */
function rejectWorklog(worklogId, reviewerId, reviewerName, comment) {
  return reviewWorklog(worklogId, 'reject', reviewerId, reviewerName, comment);
}

// ==================== 報表功能 ====================

/**
 * ✅ 完全修正版：取得員工指定月份的工作日誌報表
 * 修正：正確處理日期物件格式
 */
function getWorklogReport(employeeId, yearMonth) {
  try {
    Logger.log('═══════════════════════════════════════');
    Logger.log('📊 查詢工作日誌報表');
    Logger.log('   員工ID: "' + employeeId + '"');
    Logger.log('   年月: "' + yearMonth + '"');
    Logger.log('═══════════════════════════════════════');
    
    const sheet = getWorklogSheet();
    const data = sheet.getDataRange().getValues();
    const worklogs = [];
    let totalHours = 0;
    let approvedHours = 0;
    
    // 解析目標年月
    const [targetYear, targetMonth] = yearMonth.split('-').map(Number);
    
    Logger.log('\n🔍 開始搜尋資料...');
    Logger.log('   目標年份: ' + targetYear);
    Logger.log('   目標月份: ' + targetMonth);
    Logger.log('   總行數（含標題）: ' + data.length);
    
    for (let i = 1; i < data.length; i++) {
      // ⭐ 處理員工ID
      const rowUserId = String(data[i][1]).trim();
      
      // ⭐ 關鍵修正：處理日期物件
      const worklogDateRaw = data[i][4];
      let worklogYear, worklogMonth, worklogDay;
      let formattedDate;
      
      if (worklogDateRaw instanceof Date) {
        // 如果是日期物件
        worklogYear = worklogDateRaw.getFullYear();
        worklogMonth = worklogDateRaw.getMonth() + 1;  // getMonth() 回傳 0-11
        worklogDay = worklogDateRaw.getDate();
        formattedDate = worklogYear + '-' + 
                       String(worklogMonth).padStart(2, '0') + '-' + 
                       String(worklogDay).padStart(2, '0');
      } else if (typeof worklogDateRaw === 'string') {
        // 如果是字串，嘗試解析
        try {
          const dateObj = new Date(worklogDateRaw);
          worklogYear = dateObj.getFullYear();
          worklogMonth = dateObj.getMonth() + 1;
          worklogDay = dateObj.getDate();
          formattedDate = worklogYear + '-' + 
                         String(worklogMonth).padStart(2, '0') + '-' + 
                         String(worklogDay).padStart(2, '0');
        } catch (e) {
          Logger.log('⚠️ 無法解析日期: ' + worklogDateRaw);
          continue;
        }
      } else {
        Logger.log('⚠️ 未知的日期格式');
        continue;
      }
      
      // 檢查員工ID是否匹配
      const employeeMatch = (rowUserId === employeeId);
      
      // 檢查年月是否匹配
      const monthMatch = (worklogYear === targetYear && worklogMonth === targetMonth);
      
      // 除錯輸出（只輸出前幾筆）
      if (i <= 3) {
        Logger.log(`\n   列 ${i}:`);
        Logger.log(`     原始日期: ${worklogDateRaw}`);
        Logger.log(`     格式化: ${formattedDate}`);
        Logger.log(`     年月: ${worklogYear}-${worklogMonth}`);
        Logger.log(`     員工ID: "${rowUserId}" ${employeeMatch ? '✅匹配' : '❌不匹配'}`);
        Logger.log(`     月份: ${monthMatch ? '✅匹配' : '❌不匹配'}`);
      }
      
      // 如果員工ID和月份都匹配，加入結果
      if (employeeMatch && monthMatch) {
        const worklog = {
          id: data[i][0],
          date: formattedDate,  // ⭐ 使用格式化後的日期
          hours: parseFloat(data[i][5]) || 0,
          content: data[i][6],
          status: data[i][7],
          submittedAt: data[i][8],
          reviewedBy: data[i][9],
          reviewedAt: data[i][10],
          reviewComment: data[i][11]
        };
        
        worklogs.push(worklog);
        totalHours += worklog.hours;
        
        if (worklog.status === 'APPROVED') {
          approvedHours += worklog.hours;
        }
        
        Logger.log(`   ✅ 找到匹配: ${formattedDate} (${worklog.hours}小時)`);
      }
    }
    
    // 按日期排序
    worklogs.sort((a, b) => a.date.localeCompare(b.date));
    
    Logger.log('\n📊 查詢結果:');
    Logger.log('   找到工作日誌: ' + worklogs.length + ' 筆');
    Logger.log('   總工時: ' + totalHours + ' 小時');
    Logger.log('   已核准工時: ' + approvedHours + ' 小時');
    Logger.log('═══════════════════════════════════════');
    
    return {
      success: true,
      worklogs: worklogs,
      summary: {
        total: worklogs.length,
        totalHours: totalHours,
        approvedHours: approvedHours,
        pendingHours: totalHours - approvedHours
      }
    };
    
  } catch (error) {
    Logger.log('❌ getWorklogReport 錯誤: ' + error);
    Logger.log('   錯誤堆疊: ' + error.stack);
    return { success: false, message: error.message };
  }
}
// ==================== 測試函數 ====================

/**
 * 🧪 測試提交工作日誌
 */
function testSubmitWorklog() {
  Logger.log('🧪 測試提交工作日誌');
  
  const result = submitWorklog(
    'U123456',
    '測試員工',
    '工程部',
    '2026-01-16',
    8.5,
    '今日完成了以下工作：1. 修復系統 bug 2. 優化資料庫查詢 3. 參與技術會議'
  );
  
  Logger.log('結果: ' + JSON.stringify(result, null, 2));
}

/**
 * 🧪 測試查詢工作日誌
 */
function testGetWorklogs() {
  Logger.log('🧪 測試查詢工作日誌');
  
  const result = getWorklogs('U123456');
  
  Logger.log('結果: ' + JSON.stringify(result, null, 2));
}

/**
 * 🧪 測試審核工作日誌
 */
function testReviewWorklog() {
  Logger.log('🧪 測試審核工作日誌');
  
  // 先取得待審核的工作日誌
  const pending = getPendingWorklogs();
  
  if (pending.success && pending.worklogs.length > 0) {
    const worklogId = pending.worklogs[0].id;
    
    const result = reviewWorklog(
      worklogId,
      'approve',
      'ADMIN001',
      '管理員',
      '工作內容詳實，核准通過'
    );
    
    Logger.log('結果: ' + JSON.stringify(result, null, 2));
  } else {
    Logger.log('沒有待審核的工作日誌');
  }
}

/**
 * 🧪 測試核准工作日誌（使用便捷函數）
 */
function testApproveWorklog() {
  Logger.log('🧪 測試核准工作日誌');
  
  const pending = getPendingWorklogs();
  
  if (pending.success && pending.worklogs.length > 0) {
    const worklogId = pending.worklogs[0].id;
    
    const result = approveWorklog(
      worklogId,
      'ADMIN001',
      '管理員',
      '工作內容詳實，核准通過'
    );
    
    Logger.log('結果: ' + JSON.stringify(result, null, 2));
  } else {
    Logger.log('沒有待審核的工作日誌');
  }
}

/**
 * 🧪 測試拒絕工作日誌（使用便捷函數）
 */
function testRejectWorklog() {
  Logger.log('🧪 測試拒絕工作日誌');
  
  const pending = getPendingWorklogs();
  
  if (pending.success && pending.worklogs.length > 0) {
    const worklogId = pending.worklogs[0].id;
    
    const result = rejectWorklog(
      worklogId,
      'ADMIN001',
      '管理員',
      '工作內容不夠詳細，請補充說明'
    );
    
    Logger.log('結果: ' + JSON.stringify(result, null, 2));
  } else {
    Logger.log('沒有待審核的工作日誌');
  }
}

/**
 * 🧪 測試修正後的 getWorklogReport 函數
 */
function testFixedWorklogReport() {
  Logger.log('🧪 測試修正後的工作日誌匯出功能');
  
  // ⭐ 使用實際存在的員工ID
  const tests = [
    { id: 'U1771fd65da16e2f2000a3c3805fbe256', name: '洪培瑜Eric' },
    { id: 'U123456', name: '測試員工' }
  ];
  
  tests.forEach(test => {
    Logger.log('\n' + '='.repeat(60));
    Logger.log('🔍 測試員工: ' + test.name);
    Logger.log('   員工ID: ' + test.id);
    Logger.log('   年月: 2026-01');
    Logger.log('='.repeat(60));
    
    // ⭐ 呼叫修正後的 getWorklogReport（不是 Debug 版本）
    const result = getWorklogReport(test.id, '2026-01');
    
    Logger.log('\n📊 結果:');
    Logger.log('   成功: ' + result.success);
    Logger.log('   找到筆數: ' + result.worklogs.length);
    
    if (result.worklogs && result.worklogs.length > 0) {
      Logger.log('\n✅ 工作日誌列表:');
      result.worklogs.forEach((log, index) => {
        Logger.log(`   [${index + 1}] ${log.date} - ${log.hours}小時 - ${log.status}`);
        Logger.log(`       內容: ${log.content.substring(0, 50)}...`);
      });
      
      Logger.log('\n📈 統計:');
      Logger.log('   總時數: ' + result.summary.totalHours);
      Logger.log('   已核准時數: ' + result.summary.approvedHours);
    } else {
      Logger.log('   ⚠️ 沒有找到工作日誌');
    }
  });
  
  Logger.log('\n' + '='.repeat(60));
  Logger.log('✅ 測試完成');
  Logger.log('='.repeat(60));
}


/**
 * ✅ 取得所有員工指定月份的工作日誌報表
 */
function getAllWorklogReport(yearMonth) {
  try {
    Logger.log('═══════════════════════════════════════');
    Logger.log('📊 查詢全部員工工作日誌報表');
    Logger.log('   年月: "' + yearMonth + '"');
    Logger.log('═══════════════════════════════════════');
    
    const sheet = getWorklogSheet();
    const data = sheet.getDataRange().getValues();
    const worklogs = [];
    
    // 解析目標年月
    const [targetYear, targetMonth] = yearMonth.split('-').map(Number);
    
    Logger.log('\n🔍 開始搜尋資料...');
    Logger.log('   目標年份: ' + targetYear);
    Logger.log('   目標月份: ' + targetMonth);
    
    for (let i = 1; i < data.length; i++) {
      // 處理日期
      const worklogDateRaw = data[i][4];
      let worklogYear, worklogMonth, worklogDay;
      let formattedDate;
      
      if (worklogDateRaw instanceof Date) {
        worklogYear = worklogDateRaw.getFullYear();
        worklogMonth = worklogDateRaw.getMonth() + 1;
        worklogDay = worklogDateRaw.getDate();
        formattedDate = worklogYear + '-' + 
                       String(worklogMonth).padStart(2, '0') + '-' + 
                       String(worklogDay).padStart(2, '0');
      } else if (typeof worklogDateRaw === 'string') {
        try {
          const dateObj = new Date(worklogDateRaw);
          worklogYear = dateObj.getFullYear();
          worklogMonth = dateObj.getMonth() + 1;
          worklogDay = dateObj.getDate();
          formattedDate = worklogYear + '-' + 
                         String(worklogMonth).padStart(2, '0') + '-' + 
                         String(worklogDay).padStart(2, '0');
        } catch (e) {
          continue;
        }
      } else {
        continue;
      }
      
      // 檢查年月是否匹配
      if (worklogYear === targetYear && worklogMonth === targetMonth) {
        worklogs.push({
          id: data[i][0],
          userId: data[i][1],
          userName: data[i][2],
          department: data[i][3],
          date: formattedDate,
          hours: parseFloat(data[i][5]) || 0,
          content: data[i][6],
          status: data[i][7],
          submittedAt: data[i][8],
          reviewedBy: data[i][9],
          reviewedAt: data[i][10],
          reviewComment: data[i][11]
        });
      }
    }
    
    // 按員工姓名和日期排序
    worklogs.sort((a, b) => {
      if (a.userName !== b.userName) {
        return a.userName.localeCompare(b.userName);
      }
      return a.date.localeCompare(b.date);
    });
    
    Logger.log('\n📊 查詢結果:');
    Logger.log('   找到工作日誌: ' + worklogs.length + ' 筆');
    Logger.log('═══════════════════════════════════════');
    
    return {
      success: true,
      worklogs: worklogs,
      total: worklogs.length
    };
    
  } catch (error) {
    Logger.log('❌ getAllWorklogReport 錯誤: ' + error);
    return { success: false, message: error.message };
  }
}


/**
 * ✅ 新增：取得當月所有員工的工作日誌統計
 * 回傳格式：{ success: true, stats: [{userName, department, totalDays, totalHours, approvedHours}] }
 */
function getWorklogMonthlyStats(yearMonth) {
  try {
    Logger.log('═══════════════════════════════════════');
    Logger.log('📊 查詢當月工作日誌統計');
    Logger.log('   年月: "' + yearMonth + '"');
    Logger.log('═══════════════════════════════════════');
    
    const sheet = getWorklogSheet();
    const data = sheet.getDataRange().getValues();
    
    // 解析目標年月
    const [targetYear, targetMonth] = yearMonth.split('-').map(Number);
    
    Logger.log('\n🔍 開始統計資料...');
    Logger.log('   目標年份: ' + targetYear);
    Logger.log('   目標月份: ' + targetMonth);
    
    // 使用物件來儲存每個員工的統計
    const employeeStats = {};
    
    for (let i = 1; i < data.length; i++) {
      const userId = String(data[i][1]).trim();
      const userName = data[i][2];
      const department = data[i][3];
      const worklogDateRaw = data[i][4];
      const hours = parseFloat(data[i][5]) || 0;
      const status = data[i][7];
      
      // 處理日期
      let worklogYear, worklogMonth;
      
      if (worklogDateRaw instanceof Date) {
        worklogYear = worklogDateRaw.getFullYear();
        worklogMonth = worklogDateRaw.getMonth() + 1;
      } else if (typeof worklogDateRaw === 'string') {
        try {
          const dateObj = new Date(worklogDateRaw);
          worklogYear = dateObj.getFullYear();
          worklogMonth = dateObj.getMonth() + 1;
        } catch (e) {
          continue;
        }
      } else {
        continue;
      }
      
      // 檢查年月是否匹配
      if (worklogYear === targetYear && worklogMonth === targetMonth) {
        // 初始化員工統計
        if (!employeeStats[userId]) {
          employeeStats[userId] = {
            userId: userId,
            userName: userName,
            department: department || '未分類',
            totalDays: 0,
            totalHours: 0,
            approvedHours: 0
          };
        }
        
        // 累加統計
        employeeStats[userId].totalDays += 1;
        employeeStats[userId].totalHours += hours;
        
        if (status === 'APPROVED') {
          employeeStats[userId].approvedHours += hours;
        }
      }
    }
    
    // 轉換為陣列
    const stats = Object.values(employeeStats);
    
    Logger.log('\n📊 統計結果:');
    Logger.log('   員工數: ' + stats.length);
    Logger.log('═══════════════════════════════════════');
    
    return {
      success: true,
      stats: stats
    };
    
  } catch (error) {
    Logger.log('❌ getWorklogMonthlyStats 錯誤: ' + error);
    Logger.log('   錯誤堆疊: ' + error.stack);
    return { success: false, message: error.message };
  }
}

/**
 * 🧪 測試當月統計功能
 */
function testWorklogMonthlyStats() {
  Logger.log('🧪 測試當月工作日誌統計');
  
  // 測試當月
  const now = new Date();
  const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  
  const result = getWorklogMonthlyStats(yearMonth);
  
  Logger.log('\n結果:');
  Logger.log('  成功: ' + result.success);
  Logger.log('  員工數: ' + (result.stats ? result.stats.length : 0));
  
  if (result.stats && result.stats.length > 0) {
    Logger.log('\n員工統計:');
    result.stats.forEach((stat, index) => {
      Logger.log(`  [${index + 1}] ${stat.userName} (${stat.department})`);
      Logger.log(`      填寫天數: ${stat.totalDays} 天`);
      Logger.log(`      總工時: ${stat.totalHours} 小時`);
      Logger.log(`      已核准工時: ${stat.approvedHours} 小時`);
    });
  }
}

/**
 * 🧪 完整流程測試（模擬前端呼叫）
 */
function testCompleteWorklogFlow() {
  Logger.log('═══════════════════════════════════════');
  Logger.log('🧪 完整工作日誌流程測試');
  Logger.log('═══════════════════════════════════════');
  Logger.log('');
  
  const token = 'eaf9bca2-63e8-4582-abd3-9951be95c597';  // ⚠️ 替換成你的有效 token
  
  // Step 1: 模擬前端載入員工列表
  Logger.log('📡 Step 1: 載入員工列表');
  const usersResult = handleGetAllUsers({ token: token });
  
  Logger.log('   結果: ' + (usersResult.ok ? '成功' : '失敗'));
  Logger.log('   員工數: ' + (usersResult.users ? usersResult.users.length : 0));
  
  if (!usersResult.ok || !usersResult.users || usersResult.users.length === 0) {
    Logger.log('');
    Logger.log('❌❌❌ Step 1 失敗，無法繼續');
    Logger.log('   原因: ' + usersResult.msg);
    Logger.log('═══════════════════════════════════════');
    return;
  }
  
  Logger.log('   ✅ 員工列表載入成功');
  Logger.log('');
  
  // Step 2: 模擬前端提交批量工作日誌
  Logger.log('📡 Step 2: 提交批量工作日誌');
  
  const testEmployee = usersResult.users[0];  // 使用第一位員工
  
  Logger.log('   選擇的員工: ' + testEmployee.name + ' (' + testEmployee.userId + ')');
  Logger.log('');
  
  const worklogParams = {
    token: token,
    targetUserId: testEmployee.userId,
    targetUserName: testEmployee.name,
    targetUserDept: testEmployee.dept || '未分配',
    date: '2026-01-26',
    weather: '晴天',
    location: '測試地點',
    serialNumber: 'TEST001',
    hours: '8',
    content: '這是完整流程測試的工作日誌內容，用於驗證批量提交功能是否正常運作。',
    note: '測試備註'
  };
  
  Logger.log('📝 提交工作日誌參數:');
  Logger.log('   員工: ' + worklogParams.targetUserName);
  Logger.log('   日期: ' + worklogParams.date);
  Logger.log('   時數: ' + worklogParams.hours);
  Logger.log('');
  
  const submitResult = handleSubmitWorklog(worklogParams);
  
  Logger.log('📤 提交結果:');
  Logger.log('   ok: ' + submitResult.ok);
  Logger.log('   msg: ' + submitResult.msg);
  Logger.log('   worklogId: ' + (submitResult.worklogId || '無'));
  Logger.log('');
  
  if (submitResult.ok) {
    Logger.log('✅✅✅ 完整流程測試成功！');
    Logger.log('');
    Logger.log('📋 請檢查「工作日誌」工作表:');
    Logger.log('   - 應該有一筆新的待審核記錄');
    Logger.log('   - 員工姓名: ' + testEmployee.name);
    Logger.log('   - 工作日期: 2026-01-26');
    Logger.log('   - 天氣: 晴天');
    Logger.log('   - 地點: 測試地點');
  } else {
    Logger.log('❌ Step 2 失敗');
    Logger.log('   原因: ' + submitResult.msg);
  }
  
  Logger.log('');
  Logger.log('═══════════════════════════════════════');
}

function testCompleteWorklogFlow() {
    const worklogParams = {
        token: 'eaf9bca2-63e8-4582-abd3-9951be95c597',
        targetUserId: '員工ID',
        targetUserName: '員工姓名',
        targetUserDept: '部門',
        date: '2026-01-27',
        weather: '晴天',
        location: '測試地點',
        timeSlot: '08-17',      // ⭐ 工作時段
        hours: '8',
        content: '測試工作內容...asf',
        note: ''
    };
    
    const result = handleSubmitWorklog(worklogParams);
    Logger.log('結果: ' + JSON.stringify(result));
}