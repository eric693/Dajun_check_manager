// ==================== 工作日誌功能 ====================
// ==================== 全局變數 ====================
let worklogEmployeeCounter = 0;  // 員工記錄計數器
let allEmployeesList = [];       // 所有員工列表
/**
 * 初始化工作日誌分頁
 */
// async function initWorklogTab() {
//     // 顯示當前使用者名稱
//     const userName = localStorage.getItem('sessionUserName') || '使用者';
//     const userNameEl = document.getElementById('worklog-user-name');
//     if (userNameEl) {
//         userNameEl.textContent = userName;
//     }
    
//     await loadWorklogRecords();
//     setupWorklogForm();
// }
async function initWorklogTab() {
    console.log('📝 初始化工作日誌標籤（批量模式）');
    
    // 顯示當前登入者
    const currentUser = localStorage.getItem('sessionUserName') || '未知使用者';
    const userRole = localStorage.getItem('sessionUserDept') || '員工';
    const userDisplay = `${currentUser} (${userRole})`;
    
    const currentUserEl = document.getElementById('worklog-current-user');
    if (currentUserEl) {
        currentUserEl.textContent = userDisplay;
    }
    
    // 載入員工列表（用於下拉選單）
    await loadAllEmployees();
    
    // 設定今天的日期為預設值
    const dateInput = document.getElementById('worklog-common-date');
    if (dateInput) {
        const today = new Date().toISOString().split('T')[0];
        dateInput.value = today;
    }
    
    // 綁定新增員工按鈕
    const addBtn = document.getElementById('add-employee-worklog-btn');
    if (addBtn) {
        addBtn.addEventListener('click', addEmployeeWorklogRow);
    }
    
    // 綁定批量提交按鈕
    const submitBtn = document.getElementById('batch-submit-worklog-btn');
    if (submitBtn) {
        submitBtn.addEventListener('click', batchSubmitWorklogs);
    }
    
    // 預設新增一個員工行（方便快速開始）
    addEmployeeWorklogRow();
    
    console.log('✅ 工作日誌標籤初始化完成');
}

/**
 * 設定工作日誌表單
 */
function setupWorklogForm() {
    const dateInput = document.getElementById('worklog-date');
    const hoursInput = document.getElementById('worklog-hours');
    const contentInput = document.getElementById('worklog-content');
    const submitBtn = document.getElementById('submit-worklog-btn');
    
    if (dateInput) {
        const today = new Date().toISOString().split('T')[0];
        dateInput.value = today;
        dateInput.max = today;
    }
    
    if (hoursInput) {
        hoursInput.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            if (value < 0) e.target.value = 0;
            if (value > 24) e.target.value = 24;
        });
    }
    
    if (submitBtn) {
        submitBtn.addEventListener('click', submitWorklog);
    }
}

/**
 * 提交工作日誌
 */
async function submitWorklog() {
    const dateInput = document.getElementById('worklog-date');
    const hoursInput = document.getElementById('worklog-hours');
    const contentInput = document.getElementById('worklog-content');
    const submitBtn = document.getElementById('submit-worklog-btn');
    
    const date = dateInput?.value;
    const hours = parseFloat(hoursInput?.value);
    const content = contentInput?.value.trim();
    
    if (!date) {
        showNotification(t('WORKLOG_DATE_REQUIRED') || '請選擇日期', 'error');
        return;
    }
    
    if (!hours || hours <= 0) {
        showNotification(t('WORKLOG_HOURS_REQUIRED') || '請輸入工作時數', 'error');
        return;
    }
    
    if (!content || content.length < 10) {
        showNotification(t('WORKLOG_CONTENT_REQUIRED') || '請填寫工作內容（至少 10 個字）', 'error');
        return;
    }
    
    const loadingText = t('LOADING') || '提交中...';
    generalButtonState(submitBtn, 'processing', loadingText);
    
    try {
        const userId = localStorage.getItem('sessionUserId');
        
        const params = new URLSearchParams({
            date: date,
            hours: hours,
            content: content,
            userId: userId
        });
        
        const res = await callApifetch(`submitWorklog&${params.toString()}`);
        
        if (res.ok) {
            showNotification(t('WORKLOG_SUBMIT_SUCCESS') || '工作日誌提交成功！', 'success');
            
            if (hoursInput) hoursInput.value = '';
            if (contentInput) contentInput.value = '';
            
            await loadWorklogRecords();
        } else {
            showNotification(res.msg || t('WORKLOG_SUBMIT_FAILED') || '提交失敗', 'error');
        }
        
    } catch (error) {
        console.error('提交工作日誌失敗:', error);
        showNotification(t('NETWORK_ERROR') || '網路錯誤', 'error');
        
    } finally {
        generalButtonState(submitBtn, 'idle');
    }
}

/**
 * 載入工作日誌記錄
 */
async function loadWorklogRecords() {
    const loadingEl = document.getElementById('worklog-records-loading');
    const emptyEl = document.getElementById('worklog-records-empty');
    const listEl = document.getElementById('worklog-records-list');
    
    if (!listEl) return;
    
    try {
        if (loadingEl) loadingEl.style.display = 'block';
        if (emptyEl) emptyEl.style.display = 'none';
        listEl.innerHTML = '';
        
        const userId = localStorage.getItem('sessionUserId');
        const res = await callApifetch(`getWorklogs&userId=${userId}`);
        
        if (loadingEl) loadingEl.style.display = 'none';
        
        if (res.ok && res.worklogs && res.worklogs.length > 0) {
            renderWorklogRecords(res.worklogs);
        } else {
            if (emptyEl) emptyEl.style.display = 'block';
        }
        
    } catch (error) {
        console.error('載入工作日誌失敗:', error);
        if (loadingEl) loadingEl.style.display = 'none';
        if (emptyEl) emptyEl.style.display = 'block';
    }
}

/**
 * 渲染工作日誌記錄
 */
function renderWorklogRecords(worklogs) {
    const listEl = document.getElementById('worklog-records-list');
    if (!listEl) return;
    
    listEl.innerHTML = '';
    
    const sortedWorklogs = worklogs.sort((a, b) => {
        return new Date(b.date) - new Date(a.date);
    });
    
    sortedWorklogs.forEach((log) => {
        const li = document.createElement('li');
        li.className = 'bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700';
        
        let workDateStr = log.date;
        if (log.date) {
            try {
                if (/^\d{4}-\d{2}-\d{2}$/.test(log.date)) {
                    workDateStr = log.date;
                } else if (log.date.includes('T')) {
                    const date = new Date(log.date);
                    const year = date.getFullYear();
                    const month = String(date.getMonth() + 1).padStart(2, '0');
                    const day = String(date.getDate()).padStart(2, '0');
                    workDateStr = `${year}-${month}-${day}`;
                }
            } catch (e) {
                workDateStr = log.date;
            }
        }
        
        let submittedTimeStr = '';
        if (log.submittedAt) {
            try {
                const submittedDate = new Date(log.submittedAt);
                submittedTimeStr = submittedDate.toLocaleString('zh-TW', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false
                });
            } catch (e) {
                submittedTimeStr = log.submittedAt;
            }
        }
        
        const safeTranslate = (key, fallback) => {
            if (typeof t !== 'function') return fallback;
            const result = t(key);
            return (result && result !== key) ? result : fallback;
        };
        
        const unitHours = safeTranslate('UNIT_HOURS', '小時');
        const btnEdit = safeTranslate('BTN_EDIT', '編輯');
        const btnDelete = safeTranslate('BTN_DELETE', '刪除');
        const btnResubmit = safeTranslate('BTN_RESUBMIT', '重新提交');
        const reviewComment = safeTranslate('REVIEW_COMMENT', '審核意見');
        
        let statusClass = '';
        let statusText = '';
        let statusIcon = '';
        let actionButtons = '';
        
        switch(log.status) {
            case 'PENDING':
                statusClass = 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
                statusText = safeTranslate('STATUS_PENDING', '待審核');
                statusIcon = '⏳';
                actionButtons = `
                    <button onclick="editWorklog('${log.id}')" 
                            class="px-3 py-1.5 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors">
                        ✏️ ${btnEdit}
                    </button>
                    <button onclick="deleteWorklog('${log.id}')" 
                            class="px-3 py-1.5 text-sm bg-red-500 hover:bg-red-600 text-white rounded-md transition-colors">
                        🗑️ ${btnDelete}
                    </button>
                `;
                break;
            case 'APPROVED':
                statusClass = 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
                statusText = safeTranslate('STATUS_APPROVED', '已核准');
                statusIcon = '✅';
                break;
            case 'REJECTED':
                statusClass = 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
                statusText = safeTranslate('STATUS_REJECTED', '已拒絕');
                statusIcon = '❌';
                actionButtons = `
                    <button onclick="editWorklog('${log.id}')" 
                            class="px-3 py-1.5 text-sm bg-orange-500 hover:bg-orange-600 text-white rounded-md transition-colors">
                        🔄 ${btnResubmit}
                    </button>
                `;
                break;
        }
        
        li.innerHTML = `
            <div class="flex justify-between items-start mb-3">
                <div class="flex-1">
                    <div class="flex items-center space-x-2 mb-2">
                        <span class="font-bold text-gray-800 dark:text-white">${workDateStr}</span>
                        <span class="px-2 py-1 text-xs font-semibold rounded-full ${statusClass}">
                            ${statusIcon} ${statusText}
                        </span>
                    </div>
                    <div class="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                        <span>⏱️ ${log.hours} ${unitHours}</span>
                        ${submittedTimeStr ? `<span>📅 ${submittedTimeStr}</span>` : ''}
                    </div>
                </div>
            </div>
            
            <div class="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 mb-3">
                <p class="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">${log.content}</p>
            </div>
            
            ${log.reviewComment ? `
                <div class="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-400 dark:border-blue-600 rounded p-3 mb-3">
                    <p class="text-xs font-semibold text-blue-800 dark:text-blue-300 mb-1">
                        💬 ${reviewComment}：
                    </p>
                    <p class="text-sm text-blue-700 dark:text-blue-400">${log.reviewComment}</p>
                </div>
            ` : ''}
            
            ${actionButtons ? `
                <div class="flex space-x-2 pt-3 border-t border-gray-200 dark:border-gray-600">
                    ${actionButtons}
                </div>
            ` : ''}
        `;
        
        listEl.appendChild(li);
    });
}

/**
 * 編輯工作日誌
 */
async function editWorklog(logId) {
    try {
        const res = await callApifetch(`getWorklogDetail&id=${logId}`);
        
        if (res.ok && res.worklog) {
            const log = res.worklog;
            
            const dateInput = document.getElementById('worklog-date');
            const hoursInput = document.getElementById('worklog-hours');
            const contentInput = document.getElementById('worklog-content');
            
            if (dateInput) dateInput.value = log.date;
            if (hoursInput) hoursInput.value = log.hours;
            if (contentInput) contentInput.value = log.content;
            
            document.getElementById('worklog-form-container')?.scrollIntoView({ 
                behavior: 'smooth',
                block: 'start'
            });
            
            const submitBtn = document.getElementById('submit-worklog-btn');
            if (submitBtn) {
                submitBtn.textContent = t('BTN_UPDATE') || '更新';
                submitBtn.onclick = () => updateWorklog(logId);
            }
            
            showNotification(t('WORKLOG_EDIT_MODE') || '進入編輯模式', 'info');
        }
        
    } catch (error) {
        console.error('載入工作日誌失敗:', error);
        showNotification(t('LOAD_FAILED') || '載入失敗', 'error');
    }
}

/**
 * 更新工作日誌
 */
async function updateWorklog(logId) {
    const dateInput = document.getElementById('worklog-date');
    const hoursInput = document.getElementById('worklog-hours');
    const contentInput = document.getElementById('worklog-content');
    const submitBtn = document.getElementById('submit-worklog-btn');
    
    const date = dateInput?.value;
    const hours = parseFloat(hoursInput?.value);
    const content = contentInput?.value.trim();
    
    if (!date || !hours || !content || content.length < 10) {
        showNotification(t('FORM_INCOMPLETE') || '請完整填寫表單', 'error');
        return;
    }
    
    const loadingText = t('UPDATING') || '更新中...';
    generalButtonState(submitBtn, 'processing', loadingText);
    
    try {
        const params = new URLSearchParams({
            id: logId,
            date: date,
            hours: hours,
            content: content
        });
        
        const res = await callApifetch(`updateWorklog&${params.toString()}`);
        
        if (res.ok) {
            showNotification(t('WORKLOG_UPDATE_SUCCESS') || '工作日誌更新成功！', 'success');
            
            if (hoursInput) hoursInput.value = '';
            if (contentInput) contentInput.value = '';
            submitBtn.textContent = t('BTN_SUBMIT_WORKLOG') || '提交工作日誌';
            submitBtn.onclick = submitWorklog;
            
            await loadWorklogRecords();
        } else {
            showNotification(res.msg || t('UPDATE_FAILED') || '更新失敗', 'error');
        }
        
    } catch (error) {
        console.error('更新工作日誌失敗:', error);
        showNotification(t('NETWORK_ERROR') || '網路錯誤', 'error');
        
    } finally {
        generalButtonState(submitBtn, 'idle');
    }
}

/**
 * 刪除工作日誌
 */
async function deleteWorklog(logId) {
    if (!confirm(t('WORKLOG_DELETE_CONFIRM') || '確定要刪除此工作日誌嗎？')) {
        return;
    }
    
    try {
        const res = await callApifetch(`deleteWorklog&id=${logId}`);
        
        if (res.ok) {
            showNotification(t('WORKLOG_DELETE_SUCCESS') || '工作日誌已刪除', 'success');
            await loadWorklogRecords();
        } else {
            showNotification(res.msg || t('DELETE_FAILED') || '刪除失敗', 'error');
        }
        
    } catch (error) {
        console.error('刪除工作日誌失敗:', error);
        showNotification(t('NETWORK_ERROR') || '網路錯誤', 'error');
    }
}

// ==================== 管理員功能 ====================

/**
 * 載入待審核的工作日誌
 */
async function loadPendingWorklogs() {
    const loadingEl = document.getElementById('worklog-requests-loading');
    const emptyEl = document.getElementById('worklog-requests-empty');
    const listEl = document.getElementById('pending-worklog-list');
    
    if (!listEl) return;
    
    try {
        if (loadingEl) loadingEl.style.display = 'block';
        if (emptyEl) emptyEl.style.display = 'none';
        listEl.innerHTML = '';
        
        const res = await callApifetch('getPendingWorklogs');
        
        if (loadingEl) loadingEl.style.display = 'none';
        
        if (res.ok && res.worklogs && res.worklogs.length > 0) {
            renderPendingWorklogs(res.worklogs);
        } else {
            if (emptyEl) emptyEl.style.display = 'block';
        }
        
    } catch (error) {
        console.error('載入待審核工作日誌失敗:', error);
        if (loadingEl) loadingEl.style.display = 'none';
        if (emptyEl) emptyEl.style.display = 'block';
    }
}

/**
 * ✅ 新增：載入當月工作日誌統計
 */
async function loadWorklogMonthlyStats() {
    const statsContainer = document.getElementById('worklog-monthly-stats-container');
    const loadingEl = document.getElementById('worklog-stats-loading');
    const emptyEl = document.getElementById('worklog-stats-empty');
    const listEl = document.getElementById('worklog-stats-list');
    
    if (!statsContainer) return;
    
    try {
        if (loadingEl) loadingEl.style.display = 'block';
        if (emptyEl) emptyEl.style.display = 'none';
        if (listEl) listEl.innerHTML = '';
        
        // 取得當前年月
        const now = new Date();
        const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        
        const res = await callApifetch(`getWorklogMonthlyStats&yearMonth=${yearMonth}`);
        
        if (loadingEl) loadingEl.style.display = 'none';
        
        if (res.ok && res.stats && res.stats.length > 0) {
            renderWorklogStats(res.stats, yearMonth);
        } else {
            if (emptyEl) emptyEl.style.display = 'block';
        }
        
    } catch (error) {
        console.error('載入工作日誌統計失敗:', error);
        if (loadingEl) loadingEl.style.display = 'none';
        if (emptyEl) emptyEl.style.display = 'block';
    }
}

/**
 * ✅ 新增：渲染工作日誌統計
 */
function renderWorklogStats(stats, yearMonth) {
    const listEl = document.getElementById('worklog-stats-list');
    if (!listEl) return;
    
    listEl.innerHTML = '';
    
    // 排序：總工時由高到低
    stats.sort((a, b) => b.totalHours - a.totalHours);
    
    // 創建表格
    const table = document.createElement('table');
    table.className = 'w-full text-sm';
    
    // 表頭
    const thead = document.createElement('thead');
    thead.className = 'bg-gray-100 dark:bg-gray-700';
    thead.innerHTML = `
        <tr>
            <th class="px-4 py-2 text-left font-semibold text-gray-700 dark:text-gray-300">員工姓名</th>
            <th class="px-4 py-2 text-center font-semibold text-gray-700 dark:text-gray-300">部門</th>
            <th class="px-4 py-2 text-center font-semibold text-gray-700 dark:text-gray-300">填寫天數</th>
            <th class="px-4 py-2 text-center font-semibold text-gray-700 dark:text-gray-300">總工時</th>
            <th class="px-4 py-2 text-center font-semibold text-gray-700 dark:text-gray-300">已核准工時</th>
        </tr>
    `;
    table.appendChild(thead);
    
    // 表身
    const tbody = document.createElement('tbody');
    tbody.className = 'divide-y divide-gray-200 dark:divide-gray-600';
    
    stats.forEach((stat, index) => {
        const tr = document.createElement('tr');
        tr.className = index % 2 === 0 
            ? 'bg-white dark:bg-gray-800' 
            : 'bg-gray-50 dark:bg-gray-700/50';
        
        tr.innerHTML = `
            <td class="px-4 py-3 text-gray-800 dark:text-white">
                <div class="flex items-center">
                    <span class="font-medium">${stat.userName}</span>
                </div>
            </td>
            <td class="px-4 py-3 text-center text-gray-600 dark:text-gray-400">
                <span class="px-2 py-1 text-xs rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300">
                    ${stat.department || '未分類'}
                </span>
            </td>
            <td class="px-4 py-3 text-center">
                <span class="font-semibold text-blue-600 dark:text-blue-400">${stat.totalDays}</span>
                <span class="text-xs text-gray-500 dark:text-gray-400 ml-1">天</span>
            </td>
            <td class="px-4 py-3 text-center">
                <span class="font-semibold text-green-600 dark:text-green-400">${stat.totalHours}</span>
                <span class="text-xs text-gray-500 dark:text-gray-400 ml-1">小時</span>
            </td>
            <td class="px-4 py-3 text-center">
                <span class="font-semibold text-purple-600 dark:text-purple-400">${stat.approvedHours}</span>
                <span class="text-xs text-gray-500 dark:text-gray-400 ml-1">小時</span>
            </td>
        `;
        
        tbody.appendChild(tr);
    });
    
    table.appendChild(tbody);
    listEl.appendChild(table);
    
    // 新增總計行
    const totalRow = document.createElement('div');
    totalRow.className = 'mt-4 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-700';
    
    const totalDays = stats.reduce((sum, s) => sum + s.totalDays, 0);
    const totalHours = stats.reduce((sum, s) => sum + s.totalHours, 0);
    const totalApproved = stats.reduce((sum, s) => sum + s.approvedHours, 0);
    
    totalRow.innerHTML = `
        <div class="grid grid-cols-3 gap-4 text-center">
            <div>
                <p class="text-xs text-indigo-600 dark:text-indigo-400 mb-1">總填寫天數</p>
                <p class="text-2xl font-bold text-indigo-700 dark:text-indigo-300">${totalDays}</p>
            </div>
            <div>
                <p class="text-xs text-indigo-600 dark:text-indigo-400 mb-1">總工時</p>
                <p class="text-2xl font-bold text-indigo-700 dark:text-indigo-300">${totalHours}</p>
            </div>
            <div>
                <p class="text-xs text-indigo-600 dark:text-indigo-400 mb-1">已核准工時</p>
                <p class="text-2xl font-bold text-indigo-700 dark:text-indigo-300">${totalApproved}</p>
            </div>
        </div>
    `;
    
    listEl.appendChild(totalRow);
}

/**
 * 渲染待審核的工作日誌（完全多語言版）
 */
function renderPendingWorklogs(worklogs) {
    const listEl = document.getElementById('pending-worklog-list');
    if (!listEl) return;
    
    listEl.innerHTML = '';
    
    // ✅ 安全翻譯函數
    const safeTranslate = (key, fallback) => {
        if (typeof t !== 'function') return fallback;
        const result = t(key);
        return (result && result !== key) ? result : fallback;
    };
    
    // ✅ 預先取得所有翻譯
    const unitHours = safeTranslate('UNIT_HOURS', '小時');
    const submittedAt = safeTranslate('SUBMITTED_AT', '提交於');
    const workContent = safeTranslate('WORK_CONTENT', '工作內容');
    const reviewCommentLabel = safeTranslate('REVIEW_COMMENT', '審核意見');
    const optionalLabel = safeTranslate('OPTIONAL', '選填');
    const reviewCommentPlaceholder = safeTranslate('REVIEW_COMMENT_PLACEHOLDER', '填寫審核意見（選填）...');
    const btnApprove = safeTranslate('BTN_APPROVE', '核准');
    const btnReject = safeTranslate('BTN_REJECT', '拒絕');
    const unknownEmployee = safeTranslate('UNKNOWN_EMPLOYEE', '未知員工');
    const uncategorized = safeTranslate('UNCATEGORIZED', '未分類');
    
    worklogs.forEach((log) => {
        const li = document.createElement('li');
        li.className = 'bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700';
        
        // 格式化工作日期
        let workDateStr = log.date;
        if (log.date) {
            try {
                if (/^\d{4}-\d{2}-\d{2}$/.test(log.date)) {
                    workDateStr = log.date;
                } else if (log.date.includes('T')) {
                    const date = new Date(log.date);
                    const year = date.getFullYear();
                    const month = String(date.getMonth() + 1).padStart(2, '0');
                    const day = String(date.getDate()).padStart(2, '0');
                    workDateStr = `${year}-${month}-${day}`;
                }
            } catch (e) {
                workDateStr = log.date;
            }
        }
        
        // 格式化提交時間
        let submittedTimeStr = '';
        if (log.submittedAt) {
            try {
                const submittedDate = new Date(log.submittedAt);
                submittedTimeStr = submittedDate.toLocaleString('zh-TW', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false
                });
            } catch (e) {
                submittedTimeStr = log.submittedAt;
            }
        }
        
        li.innerHTML = `
            <div class="flex justify-between items-start mb-3">
                <div class="flex-1">
                    <div class="flex items-center space-x-2 mb-2">
                        <span class="font-bold text-gray-800 dark:text-white">${log.userName || unknownEmployee}</span>
                        <span class="text-xs px-2 py-1 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300">
                            ${log.department || uncategorized}
                        </span>
                    </div>
                    <div class="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                        <span>📅 ${workDateStr}</span>
                        <span>⏱️ ${log.hours} ${unitHours}</span>
                        ${submittedTimeStr ? `<span>🕐 ${submittedAt} ${submittedTimeStr}</span>` : ''}
                    </div>
                </div>
            </div>
            
            <div class="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 mb-3">
                <p class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    📝 ${workContent}：
                </p>
                <p class="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">${log.content}</p>
            </div>
            
            <div class="mb-3">
                <label for="review-comment-${log.id}" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    💬 ${reviewCommentLabel} <span class="text-xs text-gray-500">(${optionalLabel})</span>
                </label>
                <textarea id="review-comment-${log.id}" 
                          rows="2" 
                          placeholder="${reviewCommentPlaceholder}"
                          class="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white text-sm"></textarea>
            </div>
            
            <div class="flex space-x-2">
                <button onclick="approveWorklog('${log.id}')" 
                        class="flex-1 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-md font-semibold transition-colors">
                    ✅ ${btnApprove}
                </button>
                <button onclick="rejectWorklog('${log.id}')" 
                        class="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-md font-semibold transition-colors">
                    ❌ ${btnReject}
                </button>
            </div>
        `;
        
        listEl.appendChild(li);
    });
}

/**
 * 核准工作日誌
 */
async function approveWorklog(logId) {
    const commentInput = document.getElementById(`review-comment-${logId}`);
    const comment = commentInput?.value.trim() || '';
    
    try {
        const url = `reviewWorklog&worklogId=${encodeURIComponent(logId)}&reviewAction=approve&reviewComment=${encodeURIComponent(comment)}`;
        const res = await callApifetch(url);
        
        if (res.ok) {
            showNotification(t('WORKLOG_APPROVE_SUCCESS') || '工作日誌已核准', 'success');
            await loadPendingWorklogs();
            await loadWorklogMonthlyStats(); // 刷新統計
        } else {
            showNotification(res.msg || t('APPROVE_FAILED') || '核准失敗', 'error');
        }
        
    } catch (error) {
        console.error('核准失敗:', error);
        showNotification(t('NETWORK_ERROR') || '網路錯誤', 'error');
    }
}

/**
 * 拒絕工作日誌
 */
async function rejectWorklog(logId) {
    const commentInput = document.getElementById(`review-comment-${logId}`);
    const comment = commentInput?.value.trim();
    
    if (!comment) {
        showNotification(t('REJECT_REASON_REQUIRED') || '請填寫拒絕原因', 'error');
        commentInput?.focus();
        return;
    }
    
    try {
        const url = `reviewWorklog&worklogId=${encodeURIComponent(logId)}&reviewAction=reject&reviewComment=${encodeURIComponent(comment)}`;
        const res = await callApifetch(url);
        
        if (res.ok) {
            showNotification(t('WORKLOG_REJECT_SUCCESS') || '工作日誌已拒絕', 'success');
            await loadPendingWorklogs();
            await loadWorklogMonthlyStats(); // 刷新統計
        } else {
            showNotification(res.msg || t('REJECT_FAILED') || '拒絕失敗', 'error');
        }
        
    } catch (error) {
        console.error('拒絕失敗:', error);
        showNotification(t('NETWORK_ERROR') || '網路錯誤', 'error');
    }
}

/**
 * 匯出工作日誌報表（支援全部員工）
 */
async function exportWorklogReport() {
    const employeeSelect = document.getElementById('worklog-export-employee');
    const monthInput = document.getElementById('worklog-export-month');
    const exportBtn = document.getElementById('export-worklog-btn');
    
    if (!employeeSelect || !monthInput) return;
    
    const employeeId = employeeSelect.value;
    const yearMonth = monthInput.value;
    
    if (!employeeId) {
        showNotification(t('SELECT_EMPLOYEE_FIRST') || '請先選擇員工', 'error');
        return;
    }
    
    if (!yearMonth) {
        showNotification(t('SELECT_MONTH_FIRST') || '請先選擇月份', 'error');
        return;
    }
    
    const loadingText = t('PREPARING_REPORT') || '正在準備報表...';
    showNotification(loadingText, 'warning');
    
    if (exportBtn) {
        generalButtonState(exportBtn, 'processing', loadingText);
    }
    
    try {
        let employeeName, worklogs;
        
        if (employeeId === 'ALL') {
            employeeName = t('ALL_EMPLOYEES') || '全部員工';
            
            const res = await callApifetch(`getAllWorklogReport&yearMonth=${yearMonth}`);
            
            if (!res.ok || !res.worklogs || res.worklogs.length === 0) {
                showNotification(t('NO_WORKLOG_THIS_MONTH') || '本月沒有任何工作日誌', 'warning');
                return;
            }
            
            worklogs = res.worklogs;
            
        } else {
            employeeName = employeeSelect.options[employeeSelect.selectedIndex].text.split(' (')[0];
            
            const res = await callApifetch(`getWorklogReport&employeeId=${employeeId}&yearMonth=${yearMonth}`);
            
            if (!res.ok || !res.worklogs || !res.worklogs.length === 0) {
                showNotification(t('NO_WORKLOG_THIS_MONTH') || '本月沒有工作日誌', 'warning');
                return;
            }
            
            worklogs = res.worklogs;
        }
        
        await generateWorklogExcel(employeeName, yearMonth, worklogs);
        
        showNotification(t('EXPORT_SUCCESS') || '報表已成功匯出！', 'success');
        
    } catch (error) {
        console.error('匯出失敗:', error);
        showNotification(t('EXPORT_FAILED') || '匯出失敗，請稍後再試', 'error');
        
    } finally {
        if (exportBtn) {
            generalButtonState(exportBtn, 'idle');
        }
    }
}

/**
 * 生成工作日誌 Excel（支援全部員工）
 */
async function generateWorklogExcel(employeeName, yearMonth, worklogs) {
    const [year, month] = yearMonth.split('-');
    
    const isAllEmployees = (employeeName === (t('ALL_EMPLOYEES') || '全部員工'));
    
    // ✅ 翻譯表頭
    const headers = {
        employeeName: t('EMPLOYEE_NAME') || '員工姓名',
        department: t('DEPARTMENT') || '部門',
        date: t('DATE') || '日期',
        workHours: t('WORK_HOURS') || '工作時數',
        workContent: t('WORK_CONTENT') || '工作內容',
        status: t('STATUS') || '狀態',
        reviewComment: t('REVIEW_COMMENT') || '審核意見',
        submittedTime: t('SUBMITTED_TIME') || '提交時間'
    };
    
    let exportData;
    
    if (isAllEmployees) {
        exportData = worklogs.map(log => ({
            [headers.employeeName]: log.userName || t('UNKNOWN') || '未知',
            [headers.department]: log.department || t('UNCATEGORIZED') || '未分類',
            [headers.date]: log.date,
            [headers.workHours]: log.hours,
            [headers.workContent]: log.content,
            [headers.status]: getStatusText(log.status),
            [headers.reviewComment]: log.reviewComment || '-',
            [headers.submittedTime]: log.submittedAt ? new Date(log.submittedAt).toLocaleString('zh-TW') : '-'
        }));
    } else {
        exportData = worklogs.map(log => ({
            [headers.date]: log.date,
            [headers.workHours]: log.hours,
            [headers.workContent]: log.content,
            [headers.status]: getStatusText(log.status),
            [headers.reviewComment]: log.reviewComment || '-',
            [headers.submittedTime]: log.submittedAt ? new Date(log.submittedAt).toLocaleString('zh-TW') : '-'
        }));
    }
    
    const ws = XLSX.utils.json_to_sheet(exportData);
    
    const wscols = isAllEmployees ? [
        { wch: 12 },
        { wch: 12 },
        { wch: 12 },
        { wch: 10 },
        { wch: 50 },
        { wch: 12 },
        { wch: 30 },
        { wch: 20 }
    ] : [
        { wch: 12 },
        { wch: 10 },
        { wch: 50 },
        { wch: 12 },
        { wch: 30 },
        { wch: 20 }
    ];
    
    ws['!cols'] = wscols;
    
    const wb = XLSX.utils.book_new();
    const sheetName = `${month}${t('MONTH_WORKLOG') || '月工作日誌'}`;
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    
    const fileName = `${employeeName}_${year}${t('YEAR') || '年'}${month}${t('MONTH') || '月'}_${t('WORKLOG') || '工作日誌'}.xlsx`;
    XLSX.writeFile(wb, fileName);
}

/**
 * 獲取狀態文字
 */
function getStatusText(status) {
    const statusMap = {
        'PENDING': t('STATUS_PENDING') || '待審核',
        'APPROVED': t('STATUS_APPROVED') || '已核准',
        'REJECTED': t('STATUS_REJECTED') || '已拒絕'
    };
    return statusMap[status] || status;
}

/**
 * 載入管理員頁面的員工選單（用於匯出工作日誌）
 */
async function loadWorklogExportEmployees() {
    const employeeSelect = document.getElementById('worklog-export-employee');
    
    if (!employeeSelect) return;
    
    try {
        const res = await callApifetch('getAllUsers');
        
        if (res.ok && res.users && res.users.length > 0) {
            employeeSelect.innerHTML = '';
            
            const defaultOption = document.createElement('option');
            defaultOption.value = '';
            defaultOption.textContent = t('SELECT_EMPLOYEE_PLACEHOLDER') || '-- 請選擇員工 --';
            employeeSelect.appendChild(defaultOption);
            
            const allOption = document.createElement('option');
            allOption.value = 'ALL';
            allOption.textContent = t('ALL_EMPLOYEES') || '全部員工';
            employeeSelect.appendChild(allOption);
            
            res.users.forEach(user => {
                const option = document.createElement('option');
                option.value = user.userId;
                option.textContent = `${user.name} (${user.dept || t('UNCATEGORIZED') || '未分類'})`;
                employeeSelect.appendChild(option);
            });
            
            console.log('✅ 員工選單載入成功（含全部員工選項）');
        }
        
    } catch (error) {
        console.error('❌ 載入員工列表失敗:', error);
    }
}

// ==================== 載入所有員工列表 ====================
async function loadAllEmployees() {
    try {
        console.log('📋 載入員工列表...');
        
        const res = await callApifetch('getAllUsers');
        
        if (res.ok && res.users) {
            allEmployeesList = res.users;
            console.log(`✅ 載入 ${allEmployeesList.length} 位員工`);
        } else {
            console.warn('⚠️ 載入員工列表失敗');
            allEmployeesList = [];
        }
        
    } catch (error) {
        console.error('❌ 載入員工列表錯誤:', error);
        allEmployeesList = [];
    }
}

// ==================== 新增員工工作記錄行 ====================
function addEmployeeWorklogRow() {
    worklogEmployeeCounter++;
    const index = worklogEmployeeCounter;
    
    const container = document.getElementById('worklog-employees-container');
    const emptyState = document.getElementById('worklog-empty-state');
    const submitBtn = document.getElementById('batch-submit-worklog-btn');
    const countEl = document.getElementById('worklog-employee-count');
    
    if (!container) return;
    
    console.log(`➕ 新增員工記錄 #${index}`);
    
    // 隱藏空狀態提示
    if (emptyState) {
        emptyState.style.display = 'none';
    }
    
    // 顯示提交按鈕
    if (submitBtn) {
        submitBtn.style.display = 'block';
    }
    
    // 創建員工記錄卡片
    const card = document.createElement('div');
    card.className = 'bg-white dark:bg-gray-800 rounded-lg p-4 border-2 border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow';
    card.id = `worklog-employee-${index}`;
    card.dataset.index = index;
    
    card.innerHTML = `
        <div class="flex justify-between items-start mb-4">
            <h4 class="font-bold text-gray-800 dark:text-white text-lg">
                📄 日誌 #${index}
            </h4>
            <button onclick="removeEmployeeWorklogRow(${index})" 
                    class="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-sm font-medium transition-colors flex items-center">
                <span class="mr-1">🗑️</span>
                刪除
            </button>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- 員工選擇 -->
            <div class="md:col-span-2">
                <label for="worklog-employee-${index}" 
                       class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    👤 員工姓名 <span class="text-red-500">*</span>
                </label>
                <select id="worklog-employee-${index}" 
                        class="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm dark:bg-gray-700 dark:text-white focus:ring-indigo-500 focus:border-indigo-500">
                    <option value="">請選擇員工</option>
                    ${generateEmployeeOptions()}
                </select>
            </div>
            
            <!-- 編號 -->
            <div>
                <label for="worklog-serial-${index}" 
                       class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    🔢 編號
                </label>
                <input type="number" 
                       id="worklog-serial-${index}" 
                       min="1"
                       placeholder="${index}"
                       value="${index}"
                       class="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm dark:bg-gray-700 dark:text-white focus:ring-indigo-500 focus:border-indigo-500">
            </div>
            
            <!-- 工作時數 -->
            <div>
                <label for="worklog-hours-${index}" 
                       class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    ⏱️ 工作時數 <span class="text-red-500">*</span>
                </label>
                <input type="number" 
                       id="worklog-hours-${index}" 
                       step="0.5" 
                       min="0.5" 
                       max="24"
                       placeholder="8.0"
                       value="8.0"
                       class="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm dark:bg-gray-700 dark:text-white focus:ring-indigo-500 focus:border-indigo-500">
            </div>
            
            <!-- 工作內容 -->
            <div class="md:col-span-2">
                <label for="worklog-content-${index}" 
                       class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    📝 工作內容 <span class="text-red-500">*</span>
                </label>
                <textarea id="worklog-content-${index}" 
                          rows="3" 
                          placeholder="請描述該員工的工作內容...（至少 10 個字）"
                          class="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm dark:bg-gray-700 dark:text-white focus:ring-indigo-500 focus:border-indigo-500"></textarea>
                <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    💡 提示：請詳細描述工作項目，例如「建國預留筋、樓梯放樣」
                </p>
            </div>
            
            <!-- 備註 -->
            <div class="md:col-span-2">
                <label for="worklog-note-${index}" 
                       class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    💬 備註
                </label>
                <input type="text" 
                       id="worklog-note-${index}" 
                       placeholder="其他補充說明（選填）"
                       class="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm dark:bg-gray-700 dark:text-white focus:ring-indigo-500 focus:border-indigo-500">
            </div>
        </div>
    `;
    
    container.appendChild(card);
    
    // 更新計數
    updateEmployeeCount();
    
    // 滾動到新增的卡片
    setTimeout(() => {
        card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
}

// ==================== 生成員工選項 ====================
function generateEmployeeOptions() {
    if (!allEmployeesList || allEmployeesList.length === 0) {
        return '<option value="">暫無員工資料</option>';
    }
    
    return allEmployeesList.map(emp => {
        return `<option value="${emp.userId}" data-name="${emp.name}" data-dept="${emp.dept || '未分配'}">
            ${emp.name} ${emp.dept ? '(' + emp.dept + ')' : ''}
        </option>`;
    }).join('');
}

// ==================== 刪除員工工作記錄行 ====================
function removeEmployeeWorklogRow(index) {
    console.log(`🗑️ 刪除員工記錄 #${index}`);
    
    const card = document.getElementById(`worklog-employee-${index}`);
    if (card) {
        // 添加淡出動畫
        card.style.opacity = '0';
        card.style.transform = 'translateX(-20px)';
        card.style.transition = 'all 0.3s ease';
        
        setTimeout(() => {
            card.remove();
            
            // 更新計數
            updateEmployeeCount();
            
            // 檢查是否還有記錄
            const container = document.getElementById('worklog-employees-container');
            const emptyState = document.getElementById('worklog-empty-state');
            const submitBtn = document.getElementById('batch-submit-worklog-btn');
            
            if (container && container.children.length === 0) {
                // 沒有記錄了，顯示空狀態
                if (emptyState) {
                    emptyState.style.display = 'block';
                }
                if (submitBtn) {
                    submitBtn.style.display = 'none';
                }
            }
        }, 300);
    }
}

// ==================== 更新員工計數 ====================
function updateEmployeeCount() {
    const container = document.getElementById('worklog-employees-container');
    const countEl = document.getElementById('worklog-employee-count');
    const submitCountEl = document.getElementById('submit-count');
    
    if (container && countEl) {
        const count = container.children.length;
        countEl.textContent = `(${count} 人)`;
        
        if (submitCountEl) {
            submitCountEl.textContent = count;
        }
    }
}

// ==================== 批量提交工作日誌 ====================
// ==================== 批量提交工作日誌 ====================
async function batchSubmitWorklogs() {
    console.log('📤 開始批量提交工作日誌');
    console.log('═══════════════════════════════════════');
    
    // 取得共用資訊
    const commonDate = document.getElementById('worklog-common-date')?.value;
    const commonWeather = document.getElementById('worklog-common-weather')?.value;
    const commonLocation = document.getElementById('worklog-common-location')?.value.trim();
    
    console.log('📅 共用資訊:');
    console.log('   日期: ' + commonDate);
    console.log('   天氣: ' + commonWeather);
    console.log('   地點: ' + commonLocation);
    console.log('');
    
    // 驗證共用資訊
    if (!commonDate) {
        showNotification('請選擇工作日期', 'error');
        return;
    }
    
    if (!commonWeather) {
        showNotification('請選擇天氣', 'error');
        return;
    }
    
    if (!commonLocation) {
        showNotification('請填寫工作地點', 'error');
        return;
    }
    
    // 收集所有員工記錄
    const container = document.getElementById('worklog-employees-container');
    if (!container || container.children.length === 0) {
        showNotification('請至少新增一位員工的工作記錄', 'error');
        return;
    }
    
    const worklogs = [];
    const cards = container.querySelectorAll('[id^="worklog-employee-"]');
    
    console.log(`📋 收集 ${cards.length} 筆員工記錄...`);
    console.log('');
    
    for (let i = 0; i < cards.length; i++) {
        const card = cards[i];
        const index = card.dataset.index;
        
        const employeeSelect = document.getElementById(`worklog-employee-${index}`);
        const serialInput = document.getElementById(`worklog-serial-${index}`);
        const hoursInput = document.getElementById(`worklog-hours-${index}`);
        const contentInput = document.getElementById(`worklog-content-${index}`);
        const noteInput = document.getElementById(`worklog-note-${index}`);
        
        // 取得員工資訊
        const selectedOption = employeeSelect?.options[employeeSelect.selectedIndex];
        const employeeId = employeeSelect?.value;
        const employeeName = selectedOption?.dataset.name || '';
        const employeeDept = selectedOption?.dataset.dept || '';
        
        const serialNumber = serialInput?.value || '';
        const hours = parseFloat(hoursInput?.value);
        const content = contentInput?.value.trim();
        const note = noteInput?.value.trim() || '';
        
        console.log(`📄 日誌 #${index}:`);
        console.log(`   員工: ${employeeName} (${employeeDept})`);
        console.log(`   編號: ${serialNumber || '無'}`);
        console.log(`   時數: ${hours}`);
        console.log(`   內容長度: ${content.length} 字`);
        console.log('');
        
        // 驗證該員工的記錄
        if (!employeeId) {
            showNotification(`日誌 #${index}：請選擇員工`, 'error');
            return;
        }
        
        if (!hours || hours <= 0) {
            showNotification(`日誌 #${index} (${employeeName})：請輸入工作時數`, 'error');
            return;
        }
        
        if (!content || content.length < 10) {
            showNotification(`日誌 #${index} (${employeeName})：工作內容至少需要 10 個字`, 'error');
            return;
        }
        
        // 加入陣列
        worklogs.push({
            employeeId: employeeId,
            employeeName: employeeName,
            employeeDept: employeeDept,
            date: commonDate,
            weather: commonWeather,
            location: commonLocation,
            serialNumber: serialNumber,
            hours: hours,
            content: content,
            note: note
        });
    }
    
    console.log(`✅ 驗證通過，準備提交 ${worklogs.length} 筆工作日誌`);
    console.log('═══════════════════════════════════════');
    console.log('');
    
    // 顯示載入狀態
    const submitBtn = document.getElementById('batch-submit-worklog-btn');
    const originalHTML = submitBtn?.innerHTML;
    generalButtonState(submitBtn, 'processing', `提交中... (0/${worklogs.length})`);
    
    try {
        let successCount = 0;
        let failCount = 0;
        const failedLogs = [];
        
        // 逐筆提交
        for (let i = 0; i < worklogs.length; i++) {
            const log = worklogs[i];
            
            console.log(`[${i + 1}/${worklogs.length}] 提交 ${log.employeeName} 的工作日誌...`);
            
            // 更新進度
            if (submitBtn) {
                submitBtn.innerHTML = `
                    <span class="inline-block animate-spin mr-2">⏳</span>
                    提交中... (${i + 1}/${worklogs.length})
                `;
            }
            
            // ⭐ 修正：正確建立查詢字串
            try {
                const params = {
                    targetUserId: log.employeeId,
                    targetUserName: log.employeeName,
                    targetUserDept: log.employeeDept,
                    date: log.date,
                    weather: log.weather,
                    location: log.location,
                    serialNumber: log.serialNumber,
                    hours: log.hours,
                    content: log.content,
                    note: log.note
                };
                
                // 建立查詢字串
                const queryString = Object.entries(params)
                    .map(([key, value]) => `${key}=${encodeURIComponent(value || '')}`)
                    .join('&');
                
                const res = await callApifetch(`submitWorklog&${queryString}`);
                
                if (res.ok) {
                    successCount++;
                    console.log(`   ✅ 成功`);
                } else {
                    failCount++;
                    failedLogs.push({ name: log.employeeName, reason: res.msg });
                    console.error(`   ❌ 失敗: ${res.msg}`);
                }
                
            } catch (error) {
                failCount++;
                failedLogs.push({ name: log.employeeName, reason: error.message });
                console.error(`   ❌ 錯誤:`, error);
            }
            
            // 避免請求過快
            await new Promise(resolve => setTimeout(resolve, 200));
        }
        
        console.log('');
        console.log('═══════════════════════════════════════');
        console.log('📊 提交結果統計:');
        console.log(`   成功: ${successCount} 筆`);
        console.log(`   失敗: ${failCount} 筆`);
        console.log('═══════════════════════════════════════');
        
        // 顯示結果
        if (failCount === 0) {
            showNotification(`✅ 成功提交 ${successCount} 筆工作日誌！`, 'success');
            
            // 清空表單
            container.innerHTML = '';
            worklogEmployeeCounter = 0;
            
            // 重置共用欄位
            document.getElementById('worklog-common-weather').value = '';
            document.getElementById('worklog-common-location').value = '';
            
            // 顯示空狀態
            const emptyState = document.getElementById('worklog-empty-state');
            if (emptyState) {
                emptyState.style.display = 'block';
            }
            if (submitBtn) {
                submitBtn.style.display = 'none';
            }
            
            updateEmployeeCount();
            
        } else {
            let errorMsg = `⚠️ 完成提交：成功 ${successCount} 筆，失敗 ${failCount} 筆\n\n失敗的記錄：\n`;
            failedLogs.forEach(log => {
                errorMsg += `• ${log.name}: ${log.reason}\n`;
            });
            
            showNotification(errorMsg, 'warning');
            
            // 不清空表單，讓使用者可以修改後重試
        }
        
    } catch (error) {
        console.error('❌ 批量提交錯誤:', error);
        showNotification('批量提交失敗：' + error.message, 'error');
        
    } finally {
        generalButtonState(submitBtn, 'idle');
        if (submitBtn && originalHTML) {
            submitBtn.innerHTML = originalHTML;
        }
        updateEmployeeCount();
    }
}
// ==================== 快捷功能：複製上一筆記錄 ====================
function duplicateLastWorklogRow() {
    const container = document.getElementById('worklog-employees-container');
    if (!container || container.children.length === 0) {
        addEmployeeWorklogRow();
        return;
    }
    
    // 取得最後一筆記錄
    const lastCard = container.lastElementChild;
    const lastIndex = lastCard.dataset.index;
    
    // 複製資料
    const lastEmployee = document.getElementById(`worklog-employee-${lastIndex}`)?.value;
    const lastHours = document.getElementById(`worklog-hours-${lastIndex}`)?.value;
    const lastContent = document.getElementById(`worklog-content-${lastIndex}`)?.value;
    
    // 新增一筆
    addEmployeeWorklogRow();
    
    // 填入複製的資料（除了員工）
    const newIndex = worklogEmployeeCounter;
    if (lastHours) {
        const hoursInput = document.getElementById(`worklog-hours-${newIndex}`);
        if (hoursInput) hoursInput.value = lastHours;
    }
}
