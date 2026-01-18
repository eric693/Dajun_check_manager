// onboarding.js - 入職切結書前端邏輯（完整版 - 支援 30 個欄位）

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
        
        // ⭐⭐⭐ 關鍵修改：即使找不到資料，也要渲染空表單
        if (res.ok) {
            console.log('✅ API 回傳成功:', res.data);
            
            // 如果有資料，使用現有資料
            const employee = res.data?.employee || {};
            const signature = res.data?.signature || null;
            
            renderEmployeeData(employee, signature);
            
            // 如果已簽核，顯示狀態
            if (signature) {
                renderSignatureStatus(signature);
                
                // 如果已提交或已核准，禁用表單
                if (signature.status !== 'PENDING') {
                    disableOnboardingForm();
                }
            }
        } else {
            // ⭐⭐⭐ 找不到資料時，渲染空白表單讓使用者填寫
            console.log('⚠️ 找不到現有資料，渲染空白表單');
            
            // 渲染空白表單（傳入空物件和 null 簽核）
            renderEmployeeData({}, null);
            
            // 顯示友善提示
            const tipHtml = `
                <div class="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-700 rounded-lg">
                    <p class="text-sm text-blue-800 dark:text-blue-300 font-semibold mb-2">
                        ℹ️ 歡迎新進員工！
                    </p>
                    <p class="text-sm text-blue-700 dark:text-blue-400">
                        這是您的第一次填寫，請詳細填寫所有必填欄位後，點擊「💾 儲存資料」。
                    </p>
                </div>
            `;
            
            // 將提示插入到表單後面
            const form = document.getElementById('employee-data-form');
            if (form) {
                form.insertAdjacentHTML('afterend', tipHtml);
            }
        }
        
    } catch (error) {
        console.error('❌ 載入失敗:', error);
        if (loadingEl) loadingEl.style.display = 'none';
        
        // ⭐⭐⭐ 即使發生錯誤，也渲染空白表單
        console.log('⚠️ 發生錯誤，渲染空白表單');
        renderEmployeeData({}, null);
        
        if (containerEl) {
            const errorHtml = `
                <div class="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-200 dark:border-yellow-700 rounded-lg">
                    <p class="text-sm text-yellow-800 dark:text-yellow-300 font-semibold mb-2">
                        ⚠️ ${error.message || '載入失敗'}
                    </p>
                    <p class="text-sm text-yellow-700 dark:text-yellow-400">
                        您仍可以填寫資料，填寫完成後點擊「💾 儲存資料」即可。
                    </p>
                </div>
            `;
            
            containerEl.insertAdjacentHTML('beforeend', errorHtml);
        }
    }
}

/**
 * ⭐⭐⭐ 動態渲染員工資料（支援所有 30 個欄位）
 */
function renderEmployeeData(employee, signature) {
    const container = document.getElementById('employee-data-container');
    
    if (!container) {
        console.error('❌ employee-data-container 不存在');
        return;
    }
    
    // ⭐ 修改：如果沒有員工資料，初始化為空物件
    if (!employee) {
        console.log('⚠️ 沒有現有資料，允許新填寫');
        employee = {}; // 空物件，讓所有欄位都是空的
    }
    
    // 安全取值函數
    const getValue = (field, fallback = '') => {
        return employee[field] || fallback;
    };
    
    // 更新切結書中的姓名
    const nameEl = document.getElementById('agreement-name');
    if (nameEl) {
        const userName = getValue('姓名');
        nameEl.textContent = userName || '___________'; // 如果沒有名字，顯示底線
    }
    
    // ⭐⭐⭐ 修改：判斷是否可編輯
    // 規則：只有在「已提交」狀態時才禁用編輯
    const isSubmitted = signature && signature.status !== 'PENDING';
    const isEditable = !isSubmitted; // 未提交或沒有簽核記錄 = 可編輯
    
    // ⭐⭐⭐ 根據 Google Sheets 實際欄位定義（共 30 個欄位）
    const fieldGroups = [
        {
            title: '基本資料',
            fields: [
                { key: '姓名', label: '姓名', type: 'text', required: true },
                { key: '出生日期', label: '出生日期', type: 'date', required: true },
                { key: '部門', label: '部門', type: 'text', required: true },
                { key: '性別', label: '性別', type: 'select', required: true, options: ['男', '女'] },
                { key: '身分證字號', label: '身分證字號', type: 'text', required: true, maxlength: 10 },
                { key: '血型', label: '血型', type: 'select', required: false, options: ['A', 'B', 'O', 'AB', '不清楚'] }
            ]
        },
        {
            title: '聯絡資訊',
            fields: [
                { key: '通訊地址', label: '通訊地址', type: 'text', required: false, width: 'full' },
                { key: '戶籍地址', label: '戶籍地址', type: 'text', required: false, width: 'full' },
                { key: '聯絡電話', label: '聯絡電話', type: 'tel', required: true },
                { key: '行動電話', label: '行動電話', type: 'tel', required: false },
                { key: 'E-mail', label: 'E-mail', type: 'email', required: false },
                { key: '籍貫', label: '籍貫', type: 'text', required: false }
            ]
        },
        {
            title: '緊急聯絡人',
            fields: [
                { key: '緊急連絡人', label: '緊急聯絡人姓名', type: 'text', required: true },
                { key: '緊急連絡電話', label: '緊急聯絡人電話', type: 'tel', required: true },
                { key: '緊急連絡人關係', label: '與本人關係', type: 'select', required: false, options: ['父母', '配偶', '子女', '兄弟姐妹', '其他親屬', '朋友'] }
            ]
        },
        {
            title: '學歷資訊',
            fields: [
                { key: '最高學歷', label: '最高學歷', type: 'select', required: false, options: ['國中', '高中職', '專科', '大學', '碩士', '博士'] },
                { key: '學校', label: '畢業學校', type: 'text', required: false }
            ]
        },
        {
            title: '保險資訊',
            fields: [
                { key: '勞保單位', label: '勞保投保單位', type: 'text', required: false },
                { key: '勞保投保日期', label: '勞保投保日期', type: 'date', required: false },
                { key: '健保單位', label: '健保投保單位', type: 'text', required: false },
                { key: '健保投保日期', label: '健保投保日期', type: 'date', required: false }
            ]
        },
        {
            title: '職務資訊',
            fields: [
                { key: '職位', label: '職位', type: 'text', required: false },
                { key: '到職日', label: '到職日', type: 'date', required: false },
                { key: '離職日', label: '離職日', type: 'date', required: false }
            ]
        },
        {
            title: '學經歷與證照',
            fields: [
                { key: '相關學經歷或證照', label: '相關學經歷或證照', type: 'textarea', required: false, rows: 4, width: 'full', placeholder: '請詳細填寫您的相關學經歷或證照...' }
            ]
        },
        {
            title: '其他資訊',
            fields: [
                { key: '其他應記載事項', label: '其他應記載事項', type: 'textarea', required: false, rows: 3, width: 'full', placeholder: '如有其他需要說明的事項，請在此填寫...' },
                { key: '備註', label: '備註', type: 'textarea', required: false, rows: 2, width: 'full', placeholder: '管理員備註...' }
            ]
        },
        {
            title: '匯款資訊',
            fields: [
                { key: '銀行', label: '銀行名稱', type: 'text', required: false },
                { key: '匯款帳號', label: '匯款帳號', type: 'text', required: false, placeholder: '請填寫完整帳號' }
            ]
        }
    ];
    
    // 生成表單 HTML
    let formHTML = '<form id="employee-data-form" class="space-y-6">';
    
    fieldGroups.forEach(group => {
        formHTML += `
            <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <h3 class="text-lg font-bold text-gray-800 dark:text-white mb-4">${group.title}</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        `;
        
        group.fields.forEach(field => {
            const value = getValue(field.key);
            const fieldId = `input-${encodeURIComponent(field.key).replace(/%/g, '_')}`;
            const requiredMark = field.required ? '<span class="text-red-500">*</span>' : '';
            const isFullWidth = field.width === 'full';
            const placeholder = field.placeholder || '';
            
            formHTML += `
                <div class="${isFullWidth ? 'md:col-span-2' : ''}">
                    <label for="${fieldId}" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        ${field.label} ${requiredMark}
                    </label>
            `;
            
            // ⭐⭐⭐ 關鍵修改：移除所有 readonly 和 disabled 屬性
            // 根據類型生成不同的輸入元件
            if (field.type === 'select') {
                formHTML += `
                    <select id="${fieldId}" 
                            data-field="${field.key}"
                            ${field.required ? 'required' : ''}
                            class="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-indigo-500">
                        <option value="">請選擇</option>
                `;
                field.options.forEach(option => {
                    const selected = value === option ? 'selected' : '';
                    formHTML += `<option value="${option}" ${selected}>${option}</option>`;
                });
                formHTML += `</select>`;
                
            } else if (field.type === 'textarea') {
                const rows = field.rows || 3;
                formHTML += `
                    <textarea id="${fieldId}" 
                              data-field="${field.key}"
                              rows="${rows}"
                              ${field.required ? 'required' : ''}
                              placeholder="${placeholder}"
                              class="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-indigo-500 resize-none">${value}</textarea>
                `;
                
            } else {
                // 處理日期格式
                let displayValue = value;
                if (field.type === 'date' && value && value !== '') {
                    try {
                        const date = new Date(value);
                        if (!isNaN(date.getTime())) {
                            displayValue = date.toISOString().split('T')[0];
                        }
                    } catch (e) {
                        console.log('日期轉換失敗，使用原始值');
                    }
                }
                
                formHTML += `
                    <input type="${field.type}" 
                           id="${fieldId}" 
                           data-field="${field.key}"
                           value="${displayValue}"
                           ${field.required ? 'required' : ''}
                           ${field.maxlength ? `maxlength="${field.maxlength}"` : ''}
                           ${placeholder ? `placeholder="${placeholder}"` : ''}
                           class="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-indigo-500">
                `;
            }
            
            formHTML += `</div>`;
        });
        
        formHTML += `
                </div>
            </div>
        `;
    });
    
    // ⭐⭐⭐ 修改：只在已提交後顯示「無法修改」提示
    if (isEditable) {
        formHTML += `
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
        `;
    } else {
        formHTML += `
            <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-3">
                <p class="text-sm text-blue-800 dark:text-blue-300">
                    ℹ️ 已提交簽核，資料無法修改
                </p>
            </div>
        `;
    }
    
    formHTML += '</form>';
    
    if (!isSubmitted) {
        formHTML += `
            <div class="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
                <p class="text-sm text-yellow-800 dark:text-yellow-300">
                    ⚠️ 請確認資料無誤後再提交切結書，提交後將無法修改
                </p>
            </div>
        `;
    }
    
    container.innerHTML = formHTML;
    console.log('✅ 員工資料渲染完成');
}

/**
 * ⭐⭐⭐ 儲存員工資料（支援所有欄位）
 */
async function saveEmployeeData() {
    try {
        // 收集所有欄位的值
        const form = document.getElementById('employee-data-form');
        const inputs = form.querySelectorAll('input[data-field], select[data-field], textarea[data-field]');
        
        const updateData = {};
        let hasRequiredEmpty = false;
        let emptyFields = [];
        
        inputs.forEach(input => {
            const fieldName = input.getAttribute('data-field');
            const value = input.value.trim();
            
            // 檢查必填欄位
            if (input.hasAttribute('required') && !value) {
                hasRequiredEmpty = true;
                const label = input.previousElementSibling;
                if (label) {
                    emptyFields.push(label.textContent.replace('*', '').trim());
                }
            }
            
            updateData[fieldName] = value;
        });
        
        if (hasRequiredEmpty) {
            showNotification('❌ 請填寫所有必填欄位：\n' + emptyFields.join('、'), 'error');
            return;
        }
        
        // 特殊驗證：身分證格式
        const idNumber = updateData['身分證字號'];
        if (idNumber) {
            const idRegex = /^[A-Z][12]\d{8}$/;
            if (!idRegex.test(idNumber)) {
                showNotification('❌ 身分證字號格式不正確', 'error');
                return;
            }
        }
        
        const token = localStorage.getItem('sessionToken');
        
        if (!token) {
            throw new Error('未登入');
        }
        
        showNotification('儲存中...', 'info');
        
        // 將所有欄位轉換為 URL 參數
        let params = `updateEmployeeOnboardingData&token=${token}`;
        
        for (const [key, value] of Object.entries(updateData)) {
            if (value) {
                params += `&${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
            }
        }
        
        const res = await callApifetch(params);
        
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
        
        // 修正：改為正確的 API action 名稱（大寫 O）
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