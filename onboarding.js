// onboarding.js - 入職切結書前端邏輯（修正版 v2）

/**
 * 初始化入職切結書分頁
 */
async function initOnboardingTab() {
    console.log('📋 初始化入職切結書分頁');
    
    const employeeDataContainer = document.getElementById('employee-data-container');
    if (!employeeDataContainer) {
        console.error('❌ 找不到 employee-data-container 元素');
        showNotification('介面載入失敗，請重新整理頁面', 'error');
        return;
    }
    
    // 載入員工資料
    await loadEmployeeOnboardingData();
    
    // 綁定勾選事件
    setupAgreementCheckboxes();
}

/**
 * 載入員工入職資料
 */
async function loadEmployeeOnboardingData() {
    const loadingEl = document.getElementById('employee-data-loading');
    const containerEl = document.getElementById('employee-data-container');
    
    if (!containerEl) {
        console.error('❌ employee-data-container 不存在');
        return;
    }
    
    try {
        if (loadingEl) loadingEl.style.display = 'block';
        
        const token = localStorage.getItem('sessionToken');
        
        if (!token) {
            throw new Error('未登入，請先登入');
        }
        
        const res = await callApifetch(`getEmployeeOnboardingData&token=${token}`);
        
        if (loadingEl) loadingEl.style.display = 'none';
        
        if (res.ok && res.data) {
            console.log('✅ API 回傳成功:', res.data);
            console.log('   員工資料:', res.data.employee);
            console.log('   簽核狀態:', res.data.signature);
            
            renderEmployeeData(res.data.employee, res.data.signature);
            
            // 如果已簽核，顯示狀態
            if (res.data.signature) {
                renderSignatureStatus(res.data.signature);
                
                // 如果已提交或已核准，禁用表單
                if (res.data.signature.status !== 'PENDING') {
                    disableOnboardingForm();
                }
            }
        } else {
            console.error('❌ API 回傳失敗:', res);
            containerEl.innerHTML = `
                <div class="text-center py-4 text-red-600 dark:text-red-400">
                    ❌ ${res.msg || '無法載入資料，請稍後再試'}
                </div>
            `;
        }
        
    } catch (error) {
        console.error('❌ 載入失敗:', error);
        if (loadingEl) loadingEl.style.display = 'none';
        
        if (containerEl) {
            containerEl.innerHTML = `
                <div class="text-center py-4 text-red-600 dark:text-red-400">
                    ❌ ${error.message || '載入失敗'}
                </div>
            `;
        }
        
        showNotification('載入失敗：' + error.message, 'error');
    }
}

/**
 * 渲染員工資料（加入編輯功能）
 */
function renderEmployeeData(employee, signature) {
    const container = document.getElementById('employee-data-container');
    
    if (!container) {
        console.error('❌ employee-data-container 不存在');
        return;
    }
    
    // 安全取值函數
    const getValue = (field, fallback = '') => {
        return employee[field] || fallback;
    };
    
    // 更新切結書中的姓名
    const nameEl = document.getElementById('agreement-name');
    if (nameEl) {
        nameEl.textContent = getValue('姓名', '___________');
    }
    
    // 處理日期格式
    let hireDate = getValue('到職日', '');
    if (hireDate && hireDate !== '') {
        try {
            const date = new Date(hireDate);
            if (!isNaN(date.getTime())) {
                // 轉換為 YYYY-MM-DD 格式（input type="date" 需要）
                hireDate = date.toISOString().split('T')[0];
            }
        } catch (e) {
            console.log('日期轉換失敗，使用原始值');
        }
    }
    
    // 檢查是否已提交（已提交則禁用編輯）
    const isSubmitted = signature && signature.status !== 'PENDING';
    const isEditable = !isSubmitted;
    
    container.innerHTML = `
        <form id="employee-data-form" class="space-y-4">
            <!-- 姓名 -->
            <div>
                <label for="input-name" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    姓名 <span class="text-red-500">*</span>
                </label>
                <input type="text" 
                       id="input-name" 
                       value="${getValue('姓名')}"
                       ${isEditable ? '' : 'readonly'}
                       class="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg ${isEditable ? '' : 'bg-gray-100 dark:bg-gray-700'} dark:text-white focus:ring-2 focus:ring-indigo-500">
            </div>
            
            <!-- 身分證字號 -->
            <div>
                <label for="input-id-number" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    身分證字號 <span class="text-red-500">*</span>
                </label>
                <input type="text" 
                       id="input-id-number" 
                       value="${getValue('身分證字號')}"
                       ${isEditable ? '' : 'readonly'}
                       maxlength="10"
                       class="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg ${isEditable ? '' : 'bg-gray-100 dark:bg-gray-700'} dark:text-white focus:ring-2 focus:ring-indigo-500">
            </div>
            
            <div class="grid grid-cols-2 gap-4">
                <!-- 職位 -->
                <div>
                    <label for="input-position" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        職位 <span class="text-red-500">*</span>
                    </label>
                    <input type="text" 
                           id="input-position" 
                           value="${getValue('職位')}"
                           ${isEditable ? '' : 'readonly'}
                           class="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg ${isEditable ? '' : 'bg-gray-100 dark:bg-gray-700'} dark:text-white focus:ring-2 focus:ring-indigo-500">
                </div>
                
                <!-- 部門 -->
                <div>
                    <label for="input-department" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        部門 <span class="text-red-500">*</span>
                    </label>
                    <input type="text" 
                           id="input-department" 
                           value="${getValue('部門')}"
                           ${isEditable ? '' : 'readonly'}
                           class="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg ${isEditable ? '' : 'bg-gray-100 dark:bg-gray-700'} dark:text-white focus:ring-2 focus:ring-indigo-500">
                </div>
            </div>
            
            <div class="grid grid-cols-2 gap-4">
                <!-- 到職日 -->
                <div>
                    <label for="input-hire-date" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        到職日 <span class="text-red-500">*</span>
                    </label>
                    <input type="date" 
                           id="input-hire-date" 
                           value="${hireDate}"
                           ${isEditable ? '' : 'readonly'}
                           class="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg ${isEditable ? '' : 'bg-gray-100 dark:bg-gray-700'} dark:text-white focus:ring-2 focus:ring-indigo-500">
                </div>
                
                <!-- 聯絡電話 -->
                <div>
                    <label for="input-phone" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        聯絡電話 <span class="text-red-500">*</span>
                    </label>
                    <input type="tel" 
                           id="input-phone" 
                           value="${getValue('聯絡電話')}"
                           ${isEditable ? '' : 'readonly'}
                           class="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg ${isEditable ? '' : 'bg-gray-100 dark:bg-gray-700'} dark:text-white focus:ring-2 focus:ring-indigo-500">
                </div>
            </div>
            
            ${isEditable ? `
                <div class="flex space-x-3 pt-2">
                    <button type="button" 
                            onclick="saveEmployeeData()"
                            class="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold transition-colors">
                        💾 儲存資料
                    </button>
                    <button type="button" 
                            onclick="loadEmployeeOnboardingData()"
                            class="px-4 py-3 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-lg font-semibold transition-colors">
                        ↻ 重新載入
                    </button>
                </div>
            ` : `
                <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-3">
                    <p class="text-sm text-blue-800 dark:text-blue-300">
                        ℹ️ 已提交簽核，資料無法修改
                    </p>
                </div>
            `}
        </form>
        
        ${!isSubmitted ? `
            <div class="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
                <p class="text-sm text-yellow-800 dark:text-yellow-300">
                    ⚠️ 請確認資料無誤後再提交切結書，提交後將無法修改
                </p>
            </div>
        ` : ''}
    `;
    
    console.log('✅ 員工資料渲染完成');
}

/**
 * 儲存員工資料
 */
async function saveEmployeeData() {
    try {
        // 取得表單資料
        const name = document.getElementById('input-name').value.trim();
        const idNumber = document.getElementById('input-id-number').value.trim();
        const position = document.getElementById('input-position').value.trim();
        const department = document.getElementById('input-department').value.trim();
        const hireDate = document.getElementById('input-hire-date').value;
        const phone = document.getElementById('input-phone').value.trim();
        
        // 驗證必填欄位
        if (!name || !idNumber || !position || !department || !hireDate || !phone) {
            showNotification('❌ 請填寫所有必填欄位', 'error');
            return;
        }
        
        // 驗證身分證格式（台灣）
        const idRegex = /^[A-Z][12]\d{8}$/;
        if (!idRegex.test(idNumber)) {
            showNotification('❌ 身分證字號格式不正確', 'error');
            return;
        }
        
        const token = localStorage.getItem('sessionToken');
        
        if (!token) {
            throw new Error('未登入');
        }
        
        showNotification('儲存中...', 'info');
        
        const res = await callApifetch(
            `updateEmployeeOnboardingData&token=${token}` +
            `&name=${encodeURIComponent(name)}` +
            `&idNumber=${encodeURIComponent(idNumber)}` +
            `&position=${encodeURIComponent(position)}` +
            `&department=${encodeURIComponent(department)}` +
            `&hireDate=${encodeURIComponent(hireDate)}` +
            `&phone=${encodeURIComponent(phone)}`
        );
        
        if (res.ok) {
            showNotification('✅ 資料已成功儲存', 'success');
            await loadEmployeeOnboardingData(); // 重新載入
        } else {
            showNotification(res.msg || '儲存失敗', 'error');
        }
        
    } catch (error) {
        console.error('❌ 儲存失敗:', error);
        showNotification('儲存失敗：' + error.message, 'error');
    }
}

/**
 * 渲染簽核狀態
 */
function renderSignatureStatus(signature) {
    const statusCard = document.getElementById('onboarding-status-card');
    const statusContent = document.getElementById('onboarding-status-content');
    
    if (!statusCard || !statusContent) {
        console.error('❌ 簽核狀態元素不存在');
        return;
    }
    
    let statusHtml = '';
    let statusClass = '';
    let statusIcon = '';
    
    switch (signature.status) {
        case 'SUBMITTED':
            statusClass = 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700';
            statusIcon = '⏳';
            statusHtml = `
                <div class="${statusClass} border-2 rounded-lg p-4">
                    <p class="font-semibold text-yellow-800 dark:text-yellow-300 mb-2">
                        ${statusIcon} 您的切結書已提交，等待主管審核
                    </p>
                    <p class="text-sm text-yellow-700 dark:text-yellow-400">
                        提交時間：${new Date(signature.signedAt).toLocaleString()}
                    </p>
                </div>
            `;
            break;
            
        case 'APPROVED':
            statusClass = 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700';
            statusIcon = '✅';
            statusHtml = `
                <div class="${statusClass} border-2 rounded-lg p-4">
                    <p class="font-semibold text-green-800 dark:text-green-300 mb-2">
                        ${statusIcon} 您的切結書已核准
                    </p>
                    <p class="text-sm text-green-700 dark:text-green-400">
                        核准者：${signature.approvedBy}<br>
                        核准時間：${new Date(signature.approvedAt).toLocaleString()}
                    </p>
                </div>
            `;
            break;
            
        case 'REJECTED':
            statusClass = 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700';
            statusIcon = '❌';
            statusHtml = `
                <div class="${statusClass} border-2 rounded-lg p-4">
                    <p class="font-semibold text-red-800 dark:text-red-300 mb-2">
                        ${statusIcon} 您的切結書被拒絕
                    </p>
                    <p class="text-sm text-red-700 dark:text-red-400">
                        請聯絡人資部門了解原因
                    </p>
                </div>
            `;
            break;
    }
    
    statusContent.innerHTML = statusHtml;
    statusCard.style.display = 'block';
}

/**
 * 設定勾選框邏輯
 */
function setupAgreementCheckboxes() {
    const checkboxes = [
        'agree-confidentiality',
        'agree-non-compete',
        'agree-ip-rights',
        'agree-liability'
    ];
    
    const submitBtn = document.getElementById('submit-onboarding-btn');
    
    if (!submitBtn) {
        console.error('❌ 提交按鈕不存在');
        return;
    }
    
    // 監聽所有勾選框
    checkboxes.forEach(id => {
        const checkbox = document.getElementById(id);
        if (checkbox) {
            checkbox.addEventListener('change', () => {
                checkAllAgreed();
            });
        }
    });
    
    function checkAllAgreed() {
        const allChecked = checkboxes.every(id => {
            const checkbox = document.getElementById(id);
            return checkbox && checkbox.checked;
        });
        
        if (submitBtn) {
            submitBtn.disabled = !allChecked;
        }
    }
    
    // 綁定提交按鈕
    submitBtn.addEventListener('click', submitOnboardingAgreement);
}

/**
 * 提交切結書
 */
async function submitOnboardingAgreement() {
    const submitBtn = document.getElementById('submit-onboarding-btn');
    
    if (!confirm('確定要提交入職切結書嗎？提交後將無法修改。')) {
        return;
    }
    
    try {
        if (submitBtn) {
            generalButtonState(submitBtn, 'processing', '提交中...');
        }
        
        const token = localStorage.getItem('sessionToken');
        
        if (!token) {
            throw new Error('未登入，請先登入');
        }
        
        // 取得 IP (可選)
        let ipAddress = 'Unknown';
        try {
            const ipRes = await fetch('https://api.ipify.org?format=json');
            const ipData = await ipRes.json();
            ipAddress = ipData.ip;
        } catch (e) {
            console.log('無法取得 IP');
        }
        
        const res = await callApifetch(
            `submitOnboardingAgreement&token=${token}&agreedTerms=true&ipAddress=${ipAddress}`
        );
        
        if (res.ok) {
            showNotification('✅ 切結書已成功提交！', 'success');
            
            // 重新載入資料
            await loadEmployeeOnboardingData();
            
            // 禁用表單
            disableOnboardingForm();
        } else {
            showNotification(res.msg || '提交失敗', 'error');
        }
        
    } catch (error) {
        console.error('❌ 提交失敗:', error);
        showNotification('提交失敗：' + error.message, 'error');
        
    } finally {
        if (submitBtn) {
            generalButtonState(submitBtn, 'idle');
        }
    }
}

/**
 * 禁用入職表單
 */
function disableOnboardingForm() {
    const checkboxes = document.querySelectorAll('#onboarding-view input[type="checkbox"]');
    checkboxes.forEach(cb => {
        cb.disabled = true;
        cb.checked = true;
    });
    
    const submitBtn = document.getElementById('submit-onboarding-btn');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = '✅ 已提交';
        submitBtn.classList.remove('bg-indigo-600', 'hover:bg-indigo-700');
        submitBtn.classList.add('bg-gray-400', 'cursor-not-allowed');
    }
}

// ==================== 管理員功能 ====================

/**
 * 載入待審核的入職簽核（管理員）
 */
async function loadPendingOnboardingRequests() {
    const loadingEl = document.getElementById('onboarding-requests-loading');
    const emptyEl = document.getElementById('onboarding-requests-empty');
    const listEl = document.getElementById('pending-onboarding-list');
    
    try {
        if (loadingEl) loadingEl.style.display = 'block';
        if (emptyEl) emptyEl.style.display = 'none';
        if (listEl) listEl.innerHTML = '';
        
        const token = localStorage.getItem('sessionToken');
        const res = await callApifetch(`getPendingOnboardingRequests&token=${token}`);
        
        if (loadingEl) loadingEl.style.display = 'none';
        
        if (res.ok && res.requests && res.requests.length > 0) {
            renderOnboardingRequests(res.requests);
        } else {
            if (emptyEl) emptyEl.style.display = 'block';
        }
        
    } catch (error) {
        console.error('❌ 載入失敗:', error);
        if (loadingEl) loadingEl.style.display = 'none';
    }
}

/**
 * 渲染待審核列表
 */
function renderOnboardingRequests(requests) {
    const listEl = document.getElementById('pending-onboarding-list');
    if (!listEl) return;
    
    listEl.innerHTML = '';
    
    requests.forEach(req => {
        const li = document.createElement('li');
        li.className = 'p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600';
        
        li.innerHTML = `
            <div class="flex justify-between items-start">
                <div class="flex-1">
                    <p class="font-semibold text-gray-800 dark:text-white text-lg mb-1">
                        ${req.name}
                    </p>
                    <div class="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                        <p>👔 ${req.position} | 🏢 ${req.department}</p>
                        <p>🆔 ${req.idNumber}</p>
                        <p>📅 提交時間：${new Date(req.submittedAt).toLocaleString()}</p>
                        <p>🌐 IP：${req.ipAddress}</p>
                        ${req.note ? `<p>📝 備註：${req.note}</p>` : ''}
                    </div>
                </div>
                <div class="flex flex-col space-y-2 ml-4">
                    <button onclick="reviewOnboarding(${req.id}, 'approve')"
                            class="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-md">
                        ✓ 核准
                    </button>
                    <button onclick="reviewOnboarding(${req.id}, 'reject')"
                            class="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-md">
                        ✗ 拒絕
                    </button>
                </div>
            </div>
        `;
        
        listEl.appendChild(li);
    });
}

/**
 * 審核入職簽核
 */
async function reviewOnboarding(rowId, action) {
    console.log('═══════════════════════════════════════');
    console.log('📋 開始審核入職簽核');
    console.log('   rowId:', rowId);
    console.log('   action:', action);
    console.log('═══════════════════════════════════════');
    
    const actionText = action === 'approve' ? '核准' : '拒絕';
    
    let comment = '';
    if (action === 'reject') {
        comment = prompt('請輸入拒絕原因：');
        if (!comment) return;
    }
    
    if (!confirm(`確定要${actionText}此入職簽核嗎？`)) {
        return;
    }
    
    try {
        const token = localStorage.getItem('sessionToken');
        
        console.log('📤 準備發送請求...');
        console.log('   token:', token ? '已設定' : '未設定');
        console.log('   rowId:', rowId);
        console.log('   action:', action);
        console.log('   comment:', comment);
        
        const res = await callApifetch(
            `reviewOnboarding&token=${token}&rowId=${rowId}&action=${action}&comment=${encodeURIComponent(comment)}`
        );
        
        console.log('📥 API 回應:', res);
        
        if (res.ok) {
            showNotification(res.msg, 'success');
            await loadPendingOnboardingRequests();
        } else {
            showNotification(res.msg || '操作失敗', 'error');
        }
        
    } catch (error) {
        console.error('❌ 審核失敗:', error);
        showNotification('操作失敗', 'error');
    }
}