// ==================== 工作日誌功能 ====================
// ==================== 全局變數 ====================
let worklogEmployeeCounter = 0;  // 員工記錄計數器
let allEmployeesList = [];       // 所有員工列表
/**
 * ✅ 初始化工作日誌標籤（批量模式）
 */
// async function initWorklogTab() {
//     console.log('═══════════════════════════════════════');
//     console.log('📝 初始化工作日誌標籤（批量模式）');
//     console.log('═══════════════════════════════════════');
    
//     // Step 1: 載入員工列表
//     console.log('📡 Step 1: 載入員工列表');
//     await loadAllEmployees();
    
//     // Step 2: 載入已提交的工作日誌記錄
//     console.log('📡 Step 2: 載入工作日誌記錄');
//     await loadWorklogRecords();
    
//     // Step 3: 新增第一行員工日誌欄位
//     console.log('📡 Step 3: 新增第一行員工日誌欄位');
//     addEmployeeWorklogRow();
    
//     console.log('✅ 工作日誌標籤初始化完成');
//     console.log('═══════════════════════════════════════');
// }
async function initWorklogTab() {
    console.log('═══════════════════════════════════════');
    console.log('📝 初始化工作日誌標籤（批量模式）');
    console.log('═══════════════════════════════════════');
    
    // Step 1: 載入員工列表
    console.log('📡 Step 1: 載入員工列表');
    await loadAllEmployees();
    
    // Step 2: 載入已提交的工作日誌記錄
    console.log('📡 Step 2: 載入工作日誌記錄');
    await loadWorklogRecords();
    
    // ⭐ 移除自動新增第一行的邏輯，改為完全手動
    console.log('✅ 等待使用者手動新增員工記錄');
    
    console.log('✅ 工作日誌標籤初始化完成');
    console.log('═══════════════════════════════════════');
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
            // ⭐ 修正：根據提交時間過濾（而不是工作日期）
            const threeDaysAgo = new Date();
            threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
            threeDaysAgo.setHours(0, 0, 0, 0);  // 設定為當天 00:00:00
            
            const recentWorklogs = res.worklogs.filter(log => {
                try {
                    // ⭐ 使用 submittedAt（提交時間）而不是 date（工作日期）
                    if (!log.submittedAt) {
                        return false;  // 沒有提交時間的記錄不顯示
                    }
                    
                    const submittedDate = new Date(log.submittedAt);
                    submittedDate.setHours(0, 0, 0, 0);  // 只比較日期部分
                    
                    return submittedDate >= threeDaysAgo;
                    
                } catch (e) {
                    console.error('提交時間解析錯誤:', log.submittedAt, e);
                    return false;
                }
            });
            
            console.log(`📊 工作日誌統計：總數 ${res.worklogs.length} 筆，最近 3 天提交 ${recentWorklogs.length} 筆`);
            
            if (recentWorklogs.length > 0) {
                renderWorklogRecords(recentWorklogs);
            } else {
                if (emptyEl) emptyEl.style.display = 'block';
            }
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
                // ⭐ 恢復編輯和刪除按鈕
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
                // ⭐ 已拒絕的記錄可以重新編輯
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

async function editWorklog(logId) {
    try {
        console.log('📝 開始編輯工作日誌:', logId);
        
        const res = await callApifetch(`getWorklogDetail&id=${logId}`);
        
        if (res.ok && res.worklog) {
            const log = res.worklog;
            
            console.log('✅ 載入工作日誌資料:', log);
            
            // ⭐⭐⭐ 修正：處理日期格式
            let formattedDate = log.date;
            if (log.date) {
                try {
                    // 如果是 ISO 格式（包含 T），轉換成 yyyy-MM-dd
                    if (log.date.includes('T')) {
                        const dateObj = new Date(log.date);
                        const year = dateObj.getFullYear();
                        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
                        const day = String(dateObj.getDate()).padStart(2, '0');
                        formattedDate = `${year}-${month}-${day}`;
                    } else if (/^\d{4}-\d{2}-\d{2}$/.test(log.date)) {
                        // 如果已經是 yyyy-MM-dd 格式，直接使用
                        formattedDate = log.date;
                    } else {
                        // 其他格式，嘗試解析
                        const dateObj = new Date(log.date);
                        const year = dateObj.getFullYear();
                        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
                        const day = String(dateObj.getDate()).padStart(2, '0');
                        formattedDate = `${year}-${month}-${day}`;
                    }
                } catch (e) {
                    console.error('日期格式轉換失敗:', e);
                    formattedDate = log.date;
                }
            }
            
            console.log('📅 格式化後的日期:', formattedDate);
            
            // ⭐ 填入批量表單的共用欄位
            const dateInput = document.getElementById('worklog-common-date');
            const weatherInput = document.getElementById('worklog-common-weather');
            const locationInput = document.getElementById('worklog-common-location');
            const timeslotInput = document.getElementById('worklog-common-timeslot');
            const hoursInput = document.getElementById('worklog-common-hours');
            const contentInput = document.getElementById('worklog-common-content');
            
            if (dateInput) dateInput.value = formattedDate;  // ⭐ 使用格式化後的日期
            if (weatherInput) weatherInput.value = log.weather || '';
            if (locationInput) locationInput.value = log.location || '';
            if (timeslotInput) timeslotInput.value = log.timeSlot || '';
            if (hoursInput) hoursInput.value = log.hours || '';
            if (contentInput) contentInput.value = log.content || '';
            
            // ⭐ 清空員工列表並新增一個員工（編輯模式）
            const container = document.getElementById('worklog-employees-container');
            const emptyState = document.getElementById('worklog-empty-state');
            const submitBtn = document.getElementById('batch-submit-worklog-btn');
            
            if (container) {
                container.innerHTML = '';
                
                // 新增一個員工卡片（預填資料）
                worklogEmployeeCounter++;
                const index = worklogEmployeeCounter;
                
                const card = document.createElement('div');
                card.className = 'employee-worklog-row bg-white dark:bg-gray-800 rounded-lg p-4 border-2 border-blue-400 dark:border-blue-600';
                card.id = `worklog-employee-${index}`;
                
                card.innerHTML = `
                    <div class="flex justify-between items-start mb-4">
                        <h4 class="font-bold text-blue-600 dark:text-blue-400">
                            ✏️ 編輯模式：${log.userName}
                        </h4>
                    </div>
                    
                    <div class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                👤 員工姓名
                            </label>
                            <input type="text" 
                                   value="${log.userName}" 
                                   disabled 
                                   class="employee-name w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-gray-700 dark:text-white">
                            <input type="hidden" class="employee-id" value="${log.userId}">
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                💬 備註
                            </label>
                            <input type="text" 
                                   class="note-input w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                                   value="${log.note || ''}"
                                   placeholder="其他補充說明（選填）">
                        </div>
                    </div>
                `;
                
                container.appendChild(card);
                
                if (emptyState) emptyState.style.display = 'none';
                if (submitBtn) {
                    submitBtn.style.display = 'block';
                    submitBtn.textContent = '💾 更新工作日誌';
                    submitBtn.onclick = () => updateWorklogBatch(logId);
                }
            }
            
            // 滾動到表單
            const formContainer = document.querySelector('#worklog-tab-content');
            if (formContainer) {
                formContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
            
            showNotification('✏️ 進入編輯模式，修改後請點擊「更新工作日誌」', 'info');
        }
        
    } catch (error) {
        console.error('載入工作日誌失敗:', error);
        showNotification('載入失敗', 'error');
    }
}

/**
 * ✅ 更新工作日誌（批量表單模式）
 */
async function updateWorklogBatch(logId) {
    console.log('═══════════════════════════════════════');
    console.log('📝 更新工作日誌:', logId);
    console.log('═══════════════════════════════════════');
    
    // 取得共用資訊
    const commonDate = document.getElementById('worklog-common-date')?.value;
    const commonWeather = document.getElementById('worklog-common-weather')?.value;
    const commonLocation = document.getElementById('worklog-common-location')?.value;
    const commonTimeSlot = document.getElementById('worklog-common-timeslot')?.value;
    const commonHours = document.getElementById('worklog-common-hours')?.value;
    const commonContent = document.getElementById('worklog-common-content')?.value;
    
    // 驗證
    if (!commonDate || !commonWeather || !commonLocation) {
        showNotification('❌ 請填寫完整的共用資訊（日期、天氣、地點）', 'error');
        return;
    }
    
    if (!commonTimeSlot) {
        showNotification('❌ 請填寫工作時段', 'error');
        return;
    }
    
    if (!commonHours) {
        showNotification('❌ 請填寫工作時數', 'error');
        return;
    }
    
    if (!commonContent || commonContent.trim().length < 2) {
        showNotification('❌ 請填寫工作內容（至少 2 個字）', 'error');
        return;
    }
    
    // 取得備註
    const noteInput = document.querySelector('.note-input');
    const note = noteInput?.value || '';
    
    const submitBtn = document.getElementById('batch-submit-worklog-btn');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = '🔄 更新中...';
    }
    
    try {
        // ⭐ 呼叫更新 API
        const params = new URLSearchParams({
            id: logId,
            date: commonDate,
            weather: commonWeather,
            location: commonLocation,
            timeSlot: commonTimeSlot,
            hours: parseFloat(commonHours),
            content: commonContent.trim(),
            note: note.trim()
        });
        
        const result = await callApifetch(`updateWorklog&${params.toString()}`);
        
        console.log('📤 API 回應:', result);
        
        if (result.ok) {
            showNotification('✅ 工作日誌更新成功！', 'success');
            
            // 清空表單
            const container = document.getElementById('worklog-employees-container');
            const emptyState = document.getElementById('worklog-empty-state');
            
            if (container) container.innerHTML = '';
            if (emptyState) emptyState.style.display = 'block';
            if (submitBtn) {
                submitBtn.style.display = 'none';
                submitBtn.textContent = '📤 批量提交';
                submitBtn.onclick = batchSubmitWorklogs;
            }
            
            // 清空共用資訊
            document.getElementById('worklog-common-date').value = '';
            document.getElementById('worklog-common-weather').value = '';
            document.getElementById('worklog-common-location').value = '';
            document.getElementById('worklog-common-timeslot').value = '';
            document.getElementById('worklog-common-hours').value = '';
            document.getElementById('worklog-common-content').value = '';
            
            // 重新載入記錄
            await loadWorklogRecords();
            
        } else {
            showNotification(`❌ 更新失敗：${result.msg}`, 'error');
        }
        
    } catch (error) {
        console.error('❌ 更新異常:', error);
        showNotification('❌ 更新失敗', 'error');
        
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = '💾 更新工作日誌';
        }
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
    
    const safeTranslate = (key, fallback) => {
        if (typeof t !== 'function') return fallback;
        const result = t(key);
        return (result && result !== key) ? result : fallback;
    };
    
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
            showNotification('工作日誌已核准', 'success');
            await loadPendingWorklogs();
        } else {
            showNotification(res.msg || '核准失敗', 'error');
        }
        
    } catch (error) {
        console.error('核准失敗:', error);
        showNotification('網路錯誤', 'error');
    }
}

async function rejectWorklog(logId) {
    const commentInput = document.getElementById(`review-comment-${logId}`);
    const comment = commentInput?.value.trim();
    
    if (!comment) {
        showNotification('請填寫拒絕原因', 'error');
        commentInput?.focus();
        return;
    }
    
    try {
        const url = `reviewWorklog&worklogId=${encodeURIComponent(logId)}&reviewAction=reject&reviewComment=${encodeURIComponent(comment)}`;
        const res = await callApifetch(url);
        
        if (res.ok) {
            showNotification('工作日誌已拒絕', 'success');
            await loadPendingWorklogs();
        } else {
            showNotification(res.msg || '拒絕失敗', 'error');
        }
        
    } catch (error) {
        console.error('拒絕失敗:', error);
        showNotification('網路錯誤', 'error');
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
/**
 * ✅ 載入所有員工列表（增強版）
 */
async function loadAllEmployees() {
    try {
        console.log('═══════════════════════════════════════');
        console.log('📋 loadAllEmployees 開始');
        console.log('═══════════════════════════════════════');
        
        console.log('📡 呼叫 API: getAllUsers');
        const res = await callApifetch('getAllUsers');
        
        console.log('');
        console.log('📤 API 回應:');
        console.log('   ok: ' + res.ok);
        console.log('   msg: ' + (res.msg || '無'));
        console.log('   users: ' + (res.users ? res.users.length + ' 筆' : '無'));
        
        if (!res || !res.ok || !res.users || !Array.isArray(res.users) || res.users.length === 0) {
            console.error('❌ API 回應無效');
            allEmployeesList = [];
            return false;
        }
        
        allEmployeesList = res.users;
        
        console.log('');
        console.log('✅ 員工列表載入成功');
        console.log('   總數: ' + allEmployeesList.length);
        console.log('═══════════════════════════════════════');
        return true;
        
    } catch (error) {
        console.error('');
        console.error('❌❌❌ loadAllEmployees 發生錯誤');
        console.error('錯誤訊息: ' + error.message);
        console.error('═══════════════════════════════════════');
        
        allEmployeesList = [];
        return false;
    }
}

// ==================== 新增員工工作記錄行 ====================
function addEmployeeWorklogRow() {
    worklogEmployeeCounter++;
    const index = worklogEmployeeCounter;
    
    const container = document.getElementById('worklog-employees-container');
    const emptyState = document.getElementById('worklog-empty-state');
    const submitBtn = document.getElementById('batch-submit-worklog-btn');
    
    if (!container) {
        console.error('❌ 找不到 worklog-employees-container');
        return;
    }
    
    console.log(`➕ 新增員工記錄 #${index}`);
    
    // 隱藏空狀態
    if (emptyState) {
        emptyState.style.display = 'none';
    }
    
    // 顯示提交按鈕
    if (submitBtn) {
        submitBtn.style.display = 'block';
    }
    
    // ⭐ 創建員工記錄卡片（含員工選擇 + 備註）
    const card = document.createElement('div');
    card.className = 'employee-worklog-row bg-white dark:bg-gray-800 rounded-lg p-4 border-2 border-gray-200 dark:border-gray-700';
    card.id = `worklog-employee-${index}`;
    
    card.innerHTML = `
        <div class="flex justify-between items-start mb-4">
            <h4 class="font-bold text-gray-800 dark:text-white">
                📄 員工 #${index}
            </h4>
            <button onclick="removeEmployeeWorklogRow(${index})" 
                    class="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded">
                🗑️ 刪除
            </button>
        </div>
        
        <div class="space-y-4">
            <!-- 員工選擇 -->
            <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    👤 員工姓名 <span class="text-red-500">*</span>
                </label>
                <select class="employee-select w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white">
                    <option value="">請選擇員工</option>
                    ${generateEmployeeOptions()}
                </select>
            </div>
            
            <!-- ⭐ 備註欄位 -->
            <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    💬 備註
                </label>
                <input type="text" 
                       class="note-input w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                       placeholder="其他補充說明（選填）">
            </div>
        </div>
    `;
    
    container.appendChild(card);
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
        card.style.opacity = '0';
        card.style.transform = 'translateX(-20px)';
        card.style.transition = 'all 0.3s ease';
        
        setTimeout(() => {
            card.remove();
            updateEmployeeCount();
            
            const container = document.getElementById('worklog-employees-container');
            const emptyState = document.getElementById('worklog-empty-state');
            const submitBtn = document.getElementById('batch-submit-worklog-btn');
            
            if (container && container.children.length === 0) {
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
async function batchSubmitWorklogs() {
    console.log('═══════════════════════════════════════');
    console.log('📝 批量提交工作日誌');
    console.log('═══════════════════════════════════════');
    
    // ⭐ 取得共用資訊（包含新的工作內容等欄位）
    const commonDate = document.getElementById('worklog-common-date')?.value;
    const commonWeather = document.getElementById('worklog-common-weather')?.value;
    const commonLocation = document.getElementById('worklog-common-location')?.value;
    const commonTimeSlot = document.getElementById('worklog-common-timeslot')?.value;  // ⭐ 新增
    const commonHours = document.getElementById('worklog-common-hours')?.value;        // ⭐ 新增
    const commonContent = document.getElementById('worklog-common-content')?.value;    // ⭐ 新增
    
    console.log('📋 共用資訊:');
    console.log('   日期:', commonDate);
    console.log('   天氣:', commonWeather);
    console.log('   地點:', commonLocation);
    console.log('   工作時段:', commonTimeSlot);
    console.log('   工作時數:', commonHours);
    console.log('   工作內容:', commonContent);
    
    // ⭐ 驗證共用資訊
    if (!commonDate || !commonWeather || !commonLocation) {
        showNotification('❌ 請填寫完整的共用資訊（日期、天氣、地點）', 'error');
        return;
    }
    
    if (!commonTimeSlot) {
        showNotification('❌ 請填寫工作時段', 'error');
        return;
    }
    
    if (!commonHours) {
        showNotification('❌ 請填寫工作時數', 'error');
        return;
    }
    
    if (!commonContent || commonContent.trim().length < 2) {
        showNotification('❌ 請填寫工作內容（至少 2 個字）', 'error');
        return;
    }
    
    // 取得所有員工記錄行
    const rows = document.querySelectorAll('.employee-worklog-row');
    
    console.log('📊 員工記錄數:', rows.length);
    
    if (rows.length === 0) {
        showNotification('❌ 請至少新增一筆員工記錄', 'error');
        return;
    }
    
    // 開始處理每一行
    for (let index = 0; index < rows.length; index++) {
        const row = rows[index];
        
        console.log(`\n📝 處理日誌 #${index + 1}:`);
        
        // 取得員工ID和備註
        const employeeId = row.querySelector('.employee-select')?.value;
        const employeeNote = row.querySelector('.note-input')?.value || '';  // ⭐ 讀取員工備註
        
        console.log(`   員工ID: "${employeeId}"`);
        console.log(`   備註: "${employeeNote}"`);
        
        // 查找員工
        const employee = allEmployeesList.find(emp => emp.userId === employeeId);
        
        if (!employee) {
            console.error(`   ❌ 找不到員工資料`);
            showNotification(`日誌 #${index + 1}：請選擇員工`, 'error');
            return;
        }
        
        console.log(`   ✅ 找到員工: ${employee.name}`);
        console.log(`   📡 提交中...`);
        
        try {
            // ⭐ 使用 URLSearchParams 傳遞參數（包含員工個別備註）
            const params = new URLSearchParams({
                targetUserId: employee.userId,
                targetUserName: employee.name,
                targetUserDept: employee.dept || '未分配',
                date: commonDate,
                weather: commonWeather,
                location: commonLocation,
                serialNumber: commonTimeSlot,      // ⭐ 工作時段
                hours: parseFloat(commonHours),    // ⭐ 工作時數
                content: commonContent.trim(),     // ⭐ 工作內容
                note: employeeNote.trim()          // ⭐ 員工個別備註
            });
            
            const result = await callApifetch(`submitWorklog&${params.toString()}`);
            
            console.log(`   📤 API 回應:`, result);
            
            if (result.ok) {
                console.log(`   ✅ 日誌 #${index + 1} 提交成功`);
            } else {
                console.error(`   ❌ 日誌 #${index + 1} 提交失敗:`, result.msg);
                showNotification(`日誌 #${index + 1}：${result.msg}`, 'error');
                return;
            }
            
        } catch (error) {
            console.error(`   ❌ 日誌 #${index + 1} 提交異常:`, error);
            showNotification(`日誌 #${index + 1}：提交失敗`, 'error');
            return;
        }
    }
    
    console.log('\n✅✅✅ 批量提交完成！');
    console.log('   成功提交:', rows.length, '筆');
    console.log('═══════════════════════════════════════');
    
    showNotification(`✅ 成功提交 ${rows.length} 筆工作日誌！`, 'success');
    
    // 清空表單
    const container = document.getElementById('worklog-employees-container');
    const emptyState = document.getElementById('worklog-empty-state');
    const submitBtn = document.getElementById('batch-submit-worklog-btn');
    
    if (container) container.innerHTML = '';
    if (emptyState) emptyState.style.display = 'block';
    if (submitBtn) submitBtn.style.display = 'none';
    
    // 清空共用資訊
    const dateInput = document.getElementById('worklog-common-date');
    const weatherInput = document.getElementById('worklog-common-weather');
    const locationInput = document.getElementById('worklog-common-location');
    const timeslotInput = document.getElementById('worklog-common-timeslot');
    const hoursInput = document.getElementById('worklog-common-hours');
    const contentInput = document.getElementById('worklog-common-content');
    
    if (dateInput) dateInput.value = '';
    if (weatherInput) weatherInput.value = '';
    if (locationInput) locationInput.value = '';
    if (timeslotInput) timeslotInput.value = '';
    if (hoursInput) hoursInput.value = '';
    if (contentInput) contentInput.value = '';
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
