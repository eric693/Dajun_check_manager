// onboarding.js - 入職切結書前端邏輯

/**
 * 初始化入職切結書分頁
 */
async function initOnboardingTab() {
    console.log('📋 初始化入職切結書分頁');
    
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
    
    try {
        loadingEl.style.display = 'block';
        
        const token = localStorage.getItem('sessionToken');
        const res = await callApifetch(`getEmployeeOnboardingData&token=${token}`);
        
        loadingEl.style.display = 'none';
        
        if (res.ok && res.data) {
            renderEmployeeData(res.data.employee);
            
            // 如果已簽核，顯示狀態
            if (res.data.signature) {
                renderSignatureStatus(res.data.signature);
                
                // 如果已提交或已核准，禁用表單
                if (res.data.signature.status !== 'PENDING') {
                    disableOnboardingForm();
                }
            }
        } else {
            containerEl.innerHTML = `
                <div class="text-center py-4 text-red-600">
                    ${res.msg || '無法載入資料'}
                </div>
            `;
        }
        
    } catch (error) {
        console.error('載入失敗:', error);
        loadingEl.style.display = 'none';
        showNotification('載入失敗', 'error');
    }
}

/**
 * 渲染員工資料
 */
function renderEmployeeData(employee) {
    const container = document.getElementById('employee-data-container');
    
    // 更新切結書中的姓名
    const nameEl = document.getElementById('agreement-name');
    if (nameEl) {
        nameEl.textContent = employee.姓名 || employee.name || '___________';
    }
    
    container.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="flex justify-between p-3 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                <span class="text-gray-600 dark:text-gray-400">姓名</span>
                <span class="font-semibold text-gray-800 dark:text-white">${employee.姓名 || '-'}</span>
            </div>
            <div class="flex justify-between p-3 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                <span class="text-gray-600 dark:text-gray-400">身分證字號</span>
                <span class="font-semibold text-gray-800 dark:text-white">${employee.身分證字號 || '-'}</span>
            </div>
            <div class="flex justify-between p-3 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                <span class="text-gray-600 dark:text-gray-400">職位</span>
                <span class="font-semibold text-gray-800 dark:text-white">${employee.職位 || '-'}</span>
            </div>
            <div class="flex justify-between p-3 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                <span class="text-gray-600 dark:text-gray-400">部門</span>
                <span class="font-semibold text-gray-800 dark:text-white">${employee.部門 || '-'}</span>
            </div>
            <div class="flex justify-between p-3 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                <span class="text-gray-600 dark:text-gray-400">到職日</span>
                <span class="font-semibold text-gray-800 dark:text-white">${employee.到職日 || '-'}</span>
            </div>
            <div class="flex justify-between p-3 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                <span class="text-gray-600 dark:text-gray-400">聯絡電話</span>
                <span class="font-semibold text-gray-800 dark:text-white">${employee.聯絡電話 || '-'}</span>
            </div>
        </div>
        
        <div class="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
            <p class="text-sm text-blue-800 dark:text-blue-300">
                ℹ️ 如資料有誤，請聯絡人資部門進行更正
            </p>
        </div>
    `;
}

/**
 * 渲染簽核狀態
 */
function renderSignatureStatus(signature) {
    const statusCard = document.getElementById('onboarding-status-card');
    const statusContent = document.getElementById('onboarding-status-content');
    
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
    if (submitBtn) {
        submitBtn.addEventListener('click', submitOnboardingAgreement);
    }
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
        generalButtonState(submitBtn, 'processing', '提交中...');
        
        const token = localStorage.getItem('sessionToken');
        
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
        console.error('提交失敗:', error);
        showNotification('提交失敗', 'error');
        
    } finally {
        generalButtonState(submitBtn, 'idle');
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
        console.error('載入失敗:', error);
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
        li.className = 'p-4 bg-gray-50 dark:bg-gray-700 rounded-lg';
        
        li.innerHTML = `
            <div class="flex justify-between items-start">
                <div class="flex-1">
                    <p class="font-semibold text-gray-800 dark:text-white">
                        ${req.name}
                    </p>
                    <p class="text-sm text-gray-600 dark:text-gray-400">
                        ${req.position} | ${req.department}
                    </p>
                    <p class="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        提交時間：${new Date(req.submittedAt).toLocaleString()}
                    </p>
                    ${req.note ? `<p class="text-xs text-gray-500 mt-1">備註：${req.note}</p>` : ''}
                </div>
                <div class="flex space-x-2 ml-4">
                    <button onclick="reviewOnboarding(${req.id}, 'approve')"
                            class="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold">
                        ✓ 核准
                    </button>
                    <button onclick="reviewOnboarding(${req.id}, 'reject')"
                            class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold">
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
        const res = await callApifetch(
            `reviewOnboarding&token=${token}&rowId=${rowId}&action=${action}&comment=${encodeURIComponent(comment)}`
        );
        
        if (res.ok) {
            showNotification(res.msg, 'success');
            await loadPendingOnboardingRequests();
        } else {
            showNotification(res.msg || '操作失敗', 'error');
        }
        
    } catch (error) {
        console.error('審核失敗:', error);
        showNotification('操作失敗', 'error');
    }
}