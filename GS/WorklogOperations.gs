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
    
    // ⭐ 更新標題列（從 16 欄變成 17 欄）
    const headers = [
      '日誌ID',        // A (0)
      '批次ID',        // B (1) ⭐ 新增
      '員工ID',        // C (2) - 原 B
      '員工姓名',      // D (3) - 原 C
      '部門',          // E (4) - 原 D
      '工作日期',      // F (5) - 原 E
      '天氣',          // G (6) - 原 F
      '地點',          // H (7) - 原 G
      '工作時段',      // I (8) - 原 H
      '工作時數',      // J (9) - 原 I
      '工作內容',      // K (10) - 原 J
      '備註',          // L (11) - 原 K
      '狀態',          // M (12) - 原 L
      '提交時間',      // N (13) - 原 M
      '審核人',        // O (14) - 原 N
      '審核時間',      // P (15) - 原 O
      '審核意見'       // Q (16) - 原 P
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

function getWorklogs(userId, limit = 30) {
  try {
    Logger.log('📋 查詢工作日誌: ' + userId);
    
    const sheet = getWorklogSheet();
    const data = sheet.getDataRange().getValues();
    const worklogs = [];
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][2] === userId) {  // ⭐ 原 [1] → [2]
        worklogs.push({
          id: data[i][0],
          batchId: data[i][1],        // ⭐ 新增
          userId: data[i][2],         // 原 [1] → [2]
          userName: data[i][3],       // 原 [2] → [3]
          department: data[i][4],     // 原 [3] → [4]
          date: data[i][5],           // 原 [4] → [5]
          weather: data[i][6],        // 原 [5] → [6]
          location: data[i][7],       // 原 [6] → [7]
          timeSlot: data[i][8],       // 原 [7] → [8]
          hours: data[i][9],          // 原 [8] → [9]
          content: data[i][10],       // 原 [9] → [10]
          note: data[i][11],          // 原 [10] → [11]
          status: data[i][12],        // 原 [11] → [12]
          submittedAt: data[i][13],   // 原 [12] → [13]
          reviewedBy: data[i][14],    // 原 [13] → [14]
          reviewedAt: data[i][15],    // 原 [14] → [15]
          reviewComment: data[i][16]  // 原 [15] → [16]
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
            batchId: data[i][1],      // ⭐ 新增
            userId: data[i][2],       // 原 [1] → [2]
            userName: data[i][3],     // 原 [2] → [3]
            department: data[i][4],   // 原 [3] → [4]
            date: data[i][5],         // 原 [4] → [5]
            weather: data[i][6],      // 原 [5] → [6]
            location: data[i][7],     // 原 [6] → [7]
            timeSlot: data[i][8],     // 原 [7] → [8]
            hours: data[i][9],        // 原 [8] → [9]
            content: data[i][10],     // 原 [9] → [10]
            note: data[i][11],        // 原 [10] → [11]
            status: data[i][12],      // 原 [11] → [12]
            submittedAt: data[i][13], // 原 [12] → [13]
            reviewedBy: data[i][14],  // 原 [13] → [14]
            reviewedAt: data[i][15],  // 原 [14] → [15]
            reviewComment: data[i][16]// 原 [15] → [16]
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

/**
 * ✅ 新增：根據批次ID查詢所有工作日誌
 */
function getWorklogsByBatchId(batchId) {
  try {
    Logger.log('📋 查詢批次工作日誌: ' + batchId);
    
    if (!batchId) {
      return { success: false, message: '缺少批次ID' };
    }
    
    const sheet = getWorklogSheet();
    const data = sheet.getDataRange().getValues();
    const worklogs = [];
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][1] === batchId) {  // 比對批次ID
        worklogs.push({
          id: data[i][0],
          batchId: data[i][1],
          userId: data[i][2],
          userName: data[i][3],
          department: data[i][4],
          date: data[i][5],
          weather: data[i][6],
          location: data[i][7],
          timeSlot: data[i][8],
          hours: data[i][9],
          content: data[i][10],
          note: data[i][11],
          status: data[i][12],
          submittedAt: data[i][13],
          reviewedBy: data[i][14],
          reviewedAt: data[i][15],
          reviewComment: data[i][16]
        });
      }
    }
    
    Logger.log('✅ 找到 ' + worklogs.length + ' 筆批次工作日誌');
    
    return {
      success: true,
      worklogs: worklogs,
      total: worklogs.length
    };
    
  } catch (error) {
    Logger.log('❌ getWorklogsByBatchId 錯誤: ' + error);
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
      if (data[i][12] === WORKLOG_STATUS.PENDING) {  // ✅ M欄（索引12）= 狀態
        pendingWorklogs.push({
          rowNumber: i + 1,
          id: data[i][0],          // A: 日誌ID
          batchId: data[i][1],     // B: 批次ID ⭐ 新增
          userId: data[i][2],      // C: 員工ID ✅
          userName: data[i][3],    // D: 員工姓名 ✅
          department: data[i][4],  // E: 部門 ✅
          date: data[i][5],        // F: 工作日期 ✅
          weather: data[i][6],     // G: 天氣 ✅
          location: data[i][7],    // H: 地點 ✅
          timeSlot: data[i][8],    // I: 工作時段 ✅
          hours: data[i][9],       // J: 工作時數 ✅
          content: data[i][10],    // K: 工作內容 ✅
          note: data[i][11],       // L: 備註 ✅
          status: data[i][12],     // M: 狀態 ✅
          submittedAt: data[i][13] // N: 提交時間 ✅
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
        
        // ⭐ 檢查狀態（M欄 = 索引12）
        if (data[i][12] !== WORKLOG_STATUS.PENDING) {  // ✅ 正確：索引12是狀態
          Logger.log('❌ 該工作日誌已審核');
          return { success: false, message: '該工作日誌已審核，無法重複審核' };
        }
        
        const newStatus = action === 'approve' ? WORKLOG_STATUS.APPROVED : WORKLOG_STATUS.REJECTED;
        const reviewedAt = new Date().toISOString();
        
        // ⭐ 更新審核結果（欄位索引調整）
        sheet.getRange(i + 1, 13).setValue(newStatus);           // M: 狀態 ✅
        sheet.getRange(i + 1, 15).setValue(reviewerName);        // O: 審核人 ✅
        sheet.getRange(i + 1, 16).setValue(reviewedAt);          // P: 審核時間 ✅
        sheet.getRange(i + 1, 17).setValue(comment || '');       // Q: 審核意見 ✅
        
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
      const rowUserId = String(data[i][2]).trim();
      
      // ⭐ 關鍵修正：處理日期物件
      const worklogDateRaw = data[i][5];
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
          id: data[i][0],          // A: 日誌ID
          batchId: data[i][1],     // B: 批次ID ⭐ 新增
          date: formattedDate,     // F: 工作日期
          hours: parseFloat(data[i][9]) || 0,   // J: 工作時數 ✅
          content: data[i][10],    // K: 工作內容 ✅
          status: data[i][12],     // M: 狀態 ✅
          submittedAt: data[i][13],// N: 提交時間 ✅
          reviewedBy: data[i][14], // O: 審核人 ✅
          reviewedAt: data[i][15], // P: 審核時間 ✅
          reviewComment: data[i][16] // Q: 審核意見 ✅
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
      const worklogDateRaw = data[i][5];
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
          id: data[i][0],          // A
          batchId: data[i][1],     // B ⭐ 新增
          userId: data[i][2],      // C ✅
          userName: data[i][3],    // D ✅
          department: data[i][4],  // E ✅
          date: formattedDate,     // F
          hours: parseFloat(data[i][9]) || 0,  // J ✅
          content: data[i][10],    // K ✅
          status: data[i][12],     // M ✅
          submittedAt: data[i][13],// N ✅
          reviewedBy: data[i][14], // O ✅
          reviewedAt: data[i][15], // P ✅
          reviewComment: data[i][16] // Q ✅
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
      const userId = String(data[i][2]).trim();  // ✅ C欄：員工ID
      const userName = data[i][3];               // ✅ D欄：員工姓名
      const department = data[i][4];             // ✅ E欄：部門
      const worklogDateRaw = data[i][5];         // ✅ F欄：工作日期
      const hours = parseFloat(data[i][9]) || 0; // ✅ J欄：工作時數
      const status = data[i][12];                // ✅ M欄：狀態 
      
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
 * ✅ 更新工作日誌（支援批量更新）
 */
function updateWorklog(worklogId, date, hours, content, weather, location, timeSlot, note, updateBatch) {
  try {
    Logger.log('═══════════════════════════════════════');
    Logger.log('📝 更新工作日誌');
    Logger.log('   日誌ID: ' + worklogId);
    Logger.log('   批量更新: ' + (updateBatch ? '是' : '否'));
    Logger.log('═══════════════════════════════════════');
    
    // 驗證參數
    if (!date || !hours || !content) {
      return { success: false, message: '缺少必要參數' };
    }
    
    if (!weather || !location) {
      return { success: false, message: '缺少天氣或地點資訊' };
    }
    
    const hoursNum = parseFloat(hours);
    if (isNaN(hoursNum) || hoursNum <= 0 || hoursNum > 24) {
      return { success: false, message: '工作時數必須在 0.5 ~ 24 小時之間' };
    }
    
    if (content.trim().length < 2) {
      return { success: false, message: '工作內容至少需要 2 個字' };
    }
    
    const sheet = getWorklogSheet();
    const data = sheet.getDataRange().getValues();
    
    // ⭐ 先找到目標記錄的批次ID
    let targetBatchId = null;
    let targetRow = -1;
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === worklogId) {
        targetBatchId = data[i][1];  // 批次ID
        targetRow = i;
        
        // 檢查狀態
        if (data[i][12] !== WORKLOG_STATUS.PENDING) {
          Logger.log('❌ 該工作日誌已審核，無法修改');
          return { success: false, message: '已審核的工作日誌無法修改' };
        }
        break;
      }
    }
    
    if (targetRow === -1) {
      Logger.log('❌ 找不到工作日誌');
      return { success: false, message: '找不到工作日誌' };
    }
    
    // ⭐ 決定更新範圍
    const rowsToUpdate = [];
    
    if (updateBatch && targetBatchId) {
      // 批量更新：找出所有相同批次ID的記錄
      for (let i = 1; i < data.length; i++) {
        if (data[i][1] === targetBatchId && data[i][12] === WORKLOG_STATUS.PENDING) {
          rowsToUpdate.push(i);
        }
      }
      Logger.log(`   找到 ${rowsToUpdate.length} 筆待更新記錄`);
    } else {
      // 單筆更新
      rowsToUpdate.push(targetRow);
    }
    
    // ⭐ 執行更新
    for (const rowIndex of rowsToUpdate) {
      sheet.getRange(rowIndex + 1, 6).setValue(date);              // 
      sheet.getRange(rowIndex + 1, 7).setValue(weather.trim());    // ✅ G欄對了（天氣）
      sheet.getRange(rowIndex + 1, 8).setValue(location.trim());   // ✅ H欄對了（地點）
      sheet.getRange(rowIndex + 1, 9).setValue(timeSlot || '');    // ✅ I欄對了（工作時段）
      sheet.getRange(rowIndex + 1, 10).setValue(hoursNum);         // ✅ J欄對了（工作時數）
      sheet.getRange(rowIndex + 1, 11).setValue(content.trim());   // ✅ K欄對了（工作內容）
      // ⭐ 注意：備註不批量更新，保留各自的備註
      if (!updateBatch) {
        sheet.getRange(rowIndex + 1, 12).setValue(note ? note.trim() : '');  // ✅ L欄對了（備註）
      }
    }
    
    Logger.log('✅ 工作日誌更新成功');
    Logger.log('   更新筆數: ' + rowsToUpdate.length);
    Logger.log('═══════════════════════════════════════');
    
    return {
      success: true,
      message: '工作日誌更新成功',
      updatedCount: rowsToUpdate.length
    };
    
  } catch (error) {
    Logger.log('❌ updateWorklog 錯誤: ' + error);
    return { success: false, message: error.message };
  }
}


/**
 * ✅ 提交工作日誌（完整版 - 支援批次ID）
 */
function submitWorklog(userId, userName, department, date, hours, content, 
                       weather, location, timeSlot, note, batchId) {
  try {
    Logger.log('═══════════════════════════════════════');
    Logger.log('📝 開始提交工作日誌（完整版）');
    Logger.log('   員工: ' + userName);
    Logger.log('   批次ID: ' + (batchId || '單筆提交'));
    Logger.log('═══════════════════════════════════════');
    
    // ⭐ 驗證必要參數
    if (!userId || !userName || !date) {
      Logger.log('❌ 缺少必要參數');
      return { success: false, message: '缺少必要參數' };
    }
    
    if (!weather || weather.trim().length === 0) {
      Logger.log('❌ 缺少天氣資訊');
      return { success: false, message: '請選擇天氣' };
    }
    
    if (!location || location.trim().length === 0) {
      Logger.log('❌ 缺少地點資訊');
      return { success: false, message: '請填寫工作地點' };
    }
    
    if (!timeSlot || timeSlot.trim().length === 0) {
      Logger.log('❌ 缺少工作時段');
      return { success: false, message: '請填寫工作時段' };
    }
    
    // 驗證工作時數
    const hoursNum = parseFloat(hours);
    if (isNaN(hoursNum) || hoursNum <= 0 || hoursNum > 24) {
      Logger.log('❌ 工作時數無效: ' + hours);
      return { success: false, message: '工作時數必須在 0.5 ~ 24 小時之間' };
    }
    
    // 驗證工作內容
    if (!content || content.trim().length < 2) {
      Logger.log('❌ 工作內容太短: ' + (content ? content.length : 0));
      return { success: false, message: '工作內容至少需要 2 個字' };
    }
    
    Logger.log('✅ 參數驗證通過');
    Logger.log('   日期: ' + date);
    Logger.log('   天氣: ' + weather);
    Logger.log('   地點: ' + location);
    Logger.log('   工作時段: ' + timeSlot);
    Logger.log('   工作時數: ' + hoursNum);
    Logger.log('   工作內容長度: ' + content.trim().length);
    Logger.log('   備註長度: ' + (note ? note.trim().length : 0));
    
    // 取得工作表
    const sheet = getWorklogSheet();
    
    // 生成日誌ID
    const worklogId = 'WL_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    const submittedAt = new Date().toISOString();
    
    Logger.log('📋 生成日誌ID: ' + worklogId);
    
    // ⭐ 新增工作日誌（17 欄，包含批次ID）
    const newRow = [
      worklogId,                    // A: 日誌ID
      batchId || '',                // B: 批次ID ⭐ 新增
      userId,                       // C: 員工ID
      userName,                     // D: 員工姓名
      department,                   // E: 部門
      date,                         // F: 工作日期
      weather.trim(),               // G: 天氣
      location.trim(),              // H: 地點
      timeSlot || '',               // I: 工作時段
      hoursNum,                     // J: 工作時數
      content.trim(),               // K: 工作內容
      note ? note.trim() : '',      // L: 備註
      WORKLOG_STATUS.PENDING,       // M: 狀態
      submittedAt,                  // N: 提交時間
      '',                           // O: 審核人
      '',                           // P: 審核時間
      ''                            // Q: 審核意見
    ];
    
    Logger.log('📤 準備寫入資料...');
    
    // 寫入工作表
    sheet.appendRow(newRow);
    
    Logger.log('✅ 工作日誌提交成功');
    Logger.log('   日誌ID: ' + worklogId);
    Logger.log('   批次ID: ' + (batchId || '無'));
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