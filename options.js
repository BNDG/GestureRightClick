// options.js
// 加载保存的设置
chrome.storage.sync.get(['trackColor', 'brushWidth', 'isShowTips'], function (data) {
    if (data.trackColor) {
        document.getElementById('color-picker').value = data.trackColor;
    }
    if (data.brushWidth) {
        document.getElementById('brush-width').value = data.brushWidth;
    }
    if (data.isShowTips) {
        document.getElementById('show-trace-text').checked = data.isShowTips;
    } else if (data.isShowTips === undefined) {
        document.getElementById('show-trace-text').checked = true;
    }
});

// 保存设置
document.getElementById('save-button').addEventListener('click', function () {
    const color = document.getElementById('color-picker').value;
    const width = document.getElementById('brush-width').value;
    const isShowTips = document.getElementById('show-trace-text').checked;

    chrome.storage.sync.set({ trackColor: color, brushWidth: width, isShowTips: isShowTips }, function () {
        // 创建提示框
        const messageBox = document.createElement('div');
        messageBox.textContent = "设置已保存！";
        messageBox.style.position = "fixed";
        messageBox.style.top = "20px";
        messageBox.style.left = "50%";
        messageBox.style.transform = "translateX(-50%)";
        messageBox.style.backgroundColor = "#4CAF50";
        messageBox.style.color = "#fff";
        messageBox.style.padding = "10px 20px";
        messageBox.style.borderRadius = "5px";
        messageBox.style.zIndex = "1000";
        messageBox.style.fontSize = "16px";
        messageBox.style.textAlign = "center";

        // 将提示框添加到页面中
        document.body.appendChild(messageBox);

        // 设置定时器，3秒后自动消失
        setTimeout(function () {
            messageBox.style.opacity = 0;
            setTimeout(function () {
                messageBox.remove();
            }, 500); // 延迟删除元素，确保淡出效果
        }, 1200); // 提示框显示3秒
    });
});

// 手势管理相关代码
const gestureList = document.getElementById('gesture-list');

// 方向映射
const directionMap = {
    0: '↑',
    1: '→',
    2: '↓',
    3: '←'
};

// 动作映射
const actionNameMap = {
    'nothing': '无操作',
    'scrollOnePageUp': '向上滚动一页',
    'scrollOnePageDown': '向下滚动一页',
    'goBack': '后退',
    'goForward': '前进',
    'closeCurrentTab': '关闭当前标签页',
    'scrollToBottom': '滚动到底部',
    'scrollToTop': '滚动到顶部',
    'restoreLastClosedTab': '恢复关闭的标签页',
    'refreshPage': '刷新页面',
    'openNewTab': '打开新标签页',
    'switchLeftTab': '切换到左边标签页',
    'switchRightTab': '切换到右边标签页'
};

const svgSymbols = {
    '[0]': `<svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg" class="c012526">
                <path
                    d="M3.13196 9.16155C2.94578 9.36549 2.96017 9.68174 3.16412 9.86792C3.36806 10.0541 3.68431 10.0397 3.87049 9.83576L9.50122 3.66791L9.50122 17.4987C9.50122 17.7748 9.72508 17.9987 10.0012 17.9987C10.2774 17.9987 10.5012 17.7748 10.5012 17.4987L10.5012 3.6708L16.1293 9.83576C16.3155 10.0397 16.6317 10.0541 16.8357 9.86792C17.0396 9.68174 17.054 9.36549 16.8678 9.16155L10.5538 2.24519C10.426 2.10525 10.2585 2.02542 10.0854 2.00571C10.058 2.00107 10.0299 1.99866 10.0012 1.99866C9.97435 1.99866 9.94797 2.00078 9.92225 2.00486C9.74634 2.02303 9.57568 2.10315 9.446 2.24519L3.13196 9.16155Z">
                </path>
            </svg>`,
    '[2]': `<svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg" class="c012526">
                <path
                    d="M16.8664 10.8371C17.0526 10.6332 17.0382 10.3169 16.8342 10.1307C16.6303 9.94456 16.314 9.95895 16.1278 10.1629L10.4971 16.3307V2.5C10.4971 2.22386 10.2733 2 9.99712 2C9.72097 2 9.49712 2.22386 9.49712 2.5V16.3279L3.86903 10.1629C3.68285 9.95895 3.36659 9.94456 3.16265 10.1307C2.95871 10.3169 2.94431 10.6332 3.13049 10.8371L9.44454 17.7535C9.5723 17.8934 9.73984 17.9732 9.91298 17.993C9.94033 17.9976 9.96844 18 9.99712 18C10.024 18 10.0504 17.9979 10.0761 17.9938C10.252 17.9756 10.4227 17.8955 10.5523 17.7535L16.8664 10.8371Z">
                </path>
            </svg>`,
    '[3]': `<svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg" class="c012526">
                <path
                    d="M9.15898 16.3666C9.36292 16.5528 9.67918 16.5384 9.86536 16.3345C10.0515 16.1305 10.0371 15.8143 9.8332 15.6281L3.66535 9.99736H17.4961C17.7722 9.99736 17.9961 9.7735 17.9961 9.49736C17.9961 9.22122 17.7722 8.99736 17.4961 8.99736H3.66824L9.8332 3.36927C10.0371 3.18309 10.0515 2.86684 9.86536 2.66289C9.67918 2.45895 9.36292 2.44456 9.15898 2.63074L2.24263 8.94478C2.10268 9.07254 2.02285 9.24008 2.00314 9.41323C1.99851 9.44058 1.99609 9.46869 1.99609 9.49736C1.99609 9.52423 1.99821 9.55061 2.00229 9.57633C2.02047 9.75224 2.10058 9.9229 2.24263 10.0526L9.15898 16.3666Z">
                </path>
            </svg>`,
    '[1]': `<svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg" class="c012526">
                <path
                    d="M10.8371 2.63074C10.6332 2.44456 10.3169 2.45895 10.1307 2.66289C9.94456 2.86683 9.95895 3.18309 10.1629 3.36927L16.3307 9H2.5C2.22386 9 2 9.22386 2 9.5C2 9.77614 2.22386 10 2.5 10H16.3279L10.1629 15.6281C9.95895 15.8143 9.94456 16.1305 10.1307 16.3345C10.3169 16.5384 10.6332 16.5528 10.8371 16.3666L17.7535 10.0526C17.8934 9.92482 17.9732 9.75728 17.993 9.58414C17.9976 9.55678 18 9.52867 18 9.5C18 9.47313 17.9979 9.44675 17.9938 9.42103C17.9756 9.24512 17.8955 9.07446 17.7535 8.94478L10.8371 2.63074Z">
                </path>
            </svg>`,
    '[2,1]': `<svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg" class="c012526">
                <path
                    d="M3.5 3C3.5 2.72386 3.27614 2.5 3 2.5C2.72386 2.5 2.5 2.72386 2.5 3H3.5ZM17.3536 15.3536C17.5488 15.1583 17.5488 14.8417 17.3536 14.6464L14.1716 11.4645C13.9763 11.2692 13.6597 11.2692 13.4645 11.4645C13.2692 11.6597 13.2692 11.9763 13.4645 12.1716L16.2929 15L13.4645 17.8284C13.2692 18.0237 13.2692 18.3403 13.4645 18.5355C13.6597 18.7308 13.9763 18.7308 14.1716 18.5355L17.3536 15.3536ZM2.5 3V14H3.5V3H2.5ZM4 15.5H17V14.5H4V15.5ZM2.5 14C2.5 14.8284 3.17157 15.5 4 15.5V14.5C3.72386 14.5 3.5 14.2761 3.5 14H2.5Z">
                </path>
            </svg>`,
    '[0,2]': `<svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg" class="c012526">
                <path
                    d="M5.51924 16.8626C5.44338 17.1282 5.59712 17.4049 5.86264 17.4808C6.12816 17.5566 6.4049 17.4029 6.48076 17.1374L5.51924 16.8626ZM13.7572 17.4371C13.9986 17.5712 14.303 17.4842 14.4371 17.2428L16.6225 13.3091C16.7566 13.0677 16.6696 12.7633 16.4282 12.6292C16.1868 12.4951 15.8824 12.5821 15.7483 12.8235L13.8057 16.3201L10.3091 14.3775C10.0677 14.2434 9.76332 14.3304 9.62921 14.5718C9.49511 14.8132 9.58208 15.1176 9.82347 15.2517L13.7572 17.4371ZM9.51924 4.68267L9.03848 4.54531L9.51924 4.68267ZM10.4808 4.68267L10 4.82003L10.4808 4.68267ZM6.48076 17.1374L10 4.82003L9.03848 4.54531L5.51924 16.8626L6.48076 17.1374ZM10 4.82003L13.5192 17.1374L14.4808 16.8626L10.9615 4.54531L10 4.82003ZM10 4.82003L10 4.82003L10.9615 4.54531C10.6852 3.57827 9.31477 3.57827 9.03848 4.54531L10 4.82003Z">
                </path>
            </svg>`,
    '[2,0]': `<svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg" class="c012526">
                <path
                    d="M5.51924 3.13736C5.44338 2.87184 5.59712 2.5951 5.86264 2.51924C6.12816 2.44338 6.4049 2.59712 6.48076 2.86264L5.51924 3.13736ZM13.7572 2.56292C13.9986 2.42881 14.303 2.51579 14.4371 2.75718L16.6225 6.69089C16.7566 6.93228 16.6696 7.23668 16.4282 7.37079C16.1868 7.50489 15.8824 7.41792 15.7483 7.17653L13.8057 3.6799L10.3091 5.62247C10.0677 5.75658 9.76332 5.66961 9.62921 5.42822C9.49511 5.18682 9.58208 4.88242 9.82347 4.74831L13.7572 2.56292ZM9.51924 15.3173L9.03848 15.4547L9.51924 15.3173ZM10.4808 15.3173L10 15.18L10.4808 15.3173ZM6.48076 2.86264L10 15.18L9.03848 15.4547L5.51924 3.13736L6.48076 2.86264ZM10 15.18L13.5192 2.86264L14.4808 3.13736L10.9615 15.4547L10 15.18ZM10 15.18L10 15.18L10.9615 15.4547C10.6852 16.4217 9.31477 16.4217 9.03848 15.4547L10 15.18Z">
                </path>
            </svg>`,
    '[3,0]': `<svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg" class="c012526">
                <path
                    d="M17 17.5C17.2761 17.5 17.5 17.2761 17.5 17C17.5 16.7239 17.2761 16.5 17 16.5V17.5ZM5.35355 2.64645C5.15829 2.45118 4.84171 2.45118 4.64645 2.64645L1.46447 5.82843C1.2692 6.02369 1.2692 6.34027 1.46447 6.53553C1.65973 6.7308 1.97631 6.7308 2.17157 6.53553L5 3.70711L7.82843 6.53553C8.02369 6.7308 8.34027 6.7308 8.53553 6.53553C8.7308 6.34027 8.7308 6.02369 8.53553 5.82843L5.35355 2.64645ZM17 16.5H6V17.5H17V16.5ZM5.5 16V3H4.5V16H5.5ZM6 16.5C5.72386 16.5 5.5 16.2761 5.5 16H4.5C4.5 16.8284 5.17157 17.5 6 17.5V16.5Z">
                </path>
            </svg>`,
    '[1,2]': `<svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg" class="c012526">
                <path
                    d="M3 2.5C2.72386 2.5 2.5 2.72386 2.5 3C2.5 3.27614 2.72386 3.5 3 3.5V2.5ZM14.6464 17.3536C14.8417 17.5488 15.1583 17.5488 15.3536 17.3536L18.5355 14.1716C18.7308 13.9763 18.7308 13.6597 18.5355 13.4645C18.3403 13.2692 18.0237 13.2692 17.8284 13.4645L15 16.2929L12.1716 13.4645C11.9763 13.2692 11.6597 13.2692 11.4645 13.4645C11.2692 13.6597 11.2692 13.9763 11.4645 14.1716L14.6464 17.3536ZM3 3.5H14V2.5H3V3.5ZM14.5 4V17H15.5V4H14.5ZM14 3.5C14.2761 3.5 14.5 3.72386 14.5 4H15.5C15.5 3.17157 14.8284 2.5 14 2.5V3.5Z">
                </path>
            </svg>`,
    '[3,1]': `<svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg" class="c012526">
                <path
                    d="M16.8626 5.51924C17.1282 5.44338 17.4049 5.59712 17.4808 5.86264C17.5566 6.12816 17.4029 6.4049 17.1374 6.48076L16.8626 5.51924ZM17.4371 13.7572C17.5712 13.9986 17.4842 14.303 17.2428 14.4371L13.3091 16.6225C13.0677 16.7566 12.7633 16.6696 12.6292 16.4282C12.4951 16.1868 12.5821 15.8824 12.8235 15.7483L16.3201 13.8057L14.3775 10.3091C14.2434 10.0677 14.3304 9.76332 14.5718 9.62921C14.8132 9.49511 15.1176 9.58208 15.2517 9.82347L17.4371 13.7572ZM4.68267 9.51924L4.54531 9.03848L4.68267 9.51924ZM4.68267 10.4808L4.82003 10L4.68267 10.4808ZM17.1374 6.48076L4.82003 10L4.54531 9.03848L16.8626 5.51924L17.1374 6.48076ZM4.82003 10L17.1374 13.5192L16.8626 14.4808L4.54531 10.9615L4.82003 10ZM4.82003 10L4.82003 10L4.54531 10.9615C3.57826 10.6852 3.57827 9.31477 4.54531 9.03848L4.82003 10Z">
                </path>
            </svg>`
};

// 默认手势配置
const defaultGestures = {
    '[0]': { name: '向上滚动', actionType: 'scrollOnePageUp' },
    '[2]': { name: '向下滚动', actionType: 'scrollOnePageDown' },
    '[3]': { name: '后退', actionType: 'goBack' },
    '[1]': { name: '前进', actionType: 'goForward' },
    '[2,1]': { name: '关闭当前标签页', actionType: 'closeCurrentTab' },
    '[0,2]': { name: '滚动到底部', actionType: 'scrollToBottom' },
    '[2,0]': { name: '滚动到顶部', actionType: 'scrollToTop' },
    '[3,0]': { name: '恢复关闭的标签页', actionType: 'restoreLastClosedTab' },
    '[1,2]': { name: '刷新页面', actionType: 'refreshPage' },
    '[1,0]': { name: '打开新标签页', actionType: 'openNewTab' },
    '[0,3]': { name: '切换到左边标签页', actionType: 'switchLeftTab' },
    '[0,1]': { name: '切换到右边标签页', actionType: 'switchRightTab' }

};

// 加载已保存的手势
function loadGestures() {
    chrome.storage.sync.get(['customGestures'], function (result) {
        const customGestures = result.customGestures || {};
        gestureList.innerHTML = ''; // 清空列表

        // 合并默认手势和自定义手势，确保默认手势不被覆盖
        const allGestures = {};
        // 先加载所有默认手势
        Object.entries(defaultGestures).forEach(([key, value]) => {
            console.log(key, value);
            allGestures[key] = { ...value };
        });
        // 再加载自定义手势
        Object.entries(customGestures).forEach(([key, value]) => {
            console.log("customGestures " + key, value);
            allGestures[key] = { ...value };
        });

        console.log(allGestures)
        // 渲染所有手势
        Object.entries(allGestures).forEach(([gestureKey, gestureData]) => {
            const gesture = JSON.parse(gestureKey);
            const svgSymbol = svgSymbols[gestureKey] || '';
            const item = document.createElement('div');
            item.className = 'gesture-item';
            item.innerHTML = `
                <div class="gesture-info">
                    <span class="gesture-sequence">${svgSymbol}</span>
                </div>
                <div class="gesture-actions">
                    <select class="action-select" data-gesture='${gestureKey}'>
                        ${Object.entries(actionNameMap).map(([actionType, actionName]) => `
                            <option value="${actionType}" ${actionType === gestureData.actionType ? 'selected' : ''}>
                                ${actionName}
                            </option>
                        `).join('')}
                    </select>
                </div>
            `;
            gestureList.appendChild(item);

            // 为select添加change事件监听器
            const select = item.querySelector('.action-select');
            select.addEventListener('change', function (e) {
                const gestureKey = this.dataset.gesture;
                const newActionType = this.value;
                updateGestureAction(gestureKey, newActionType);
            });
        });
    });
}

// 更新手势动作
function updateGestureAction(gestureKey, newActionType) {
    chrome.storage.sync.get(['customGestures'], function (result) {
        const customGestures = result.customGestures || {};
        // 更新自定义手势
        customGestures[gestureKey] = {
            name: actionNameMap[newActionType],
            actionType: newActionType
        };
        console.log(gestureKey, newActionType, customGestures)
        // 保存更新
        chrome.storage.sync.set({ customGestures }, function () {
            // 通知 background.js 更新手势
            chrome.runtime.sendMessage({
                type: 'updateGestures',
                customGestures: customGestures
            }, function (response) {
                showMessage('手势动作已更新');
            });
        });
    });
}

// 重置为默认配置
function resetGestures() {
    if (confirm('确定要重置所有手势为默认配置吗？这将删除所有自定义手势。')) {
        chrome.storage.sync.set({ customGestures: {} }, function () {
            loadGestures(); // 重新加载手势列表
            // 显示成功提示
            showMessage('已重置为默认配置');
        });
    }
}

// 显示消息提示
function showMessage(text) {
    const messageBox = document.createElement('div');
    messageBox.textContent = text;
    messageBox.style.position = "fixed";
    messageBox.style.top = "20px";
    messageBox.style.left = "50%";
    messageBox.style.transform = "translateX(-50%)";
    messageBox.style.backgroundColor = "#4CAF50";
    messageBox.style.color = "#fff";
    messageBox.style.padding = "10px 20px";
    messageBox.style.borderRadius = "5px";
    messageBox.style.zIndex = "1000";
    messageBox.style.fontSize = "16px";
    messageBox.style.textAlign = "center";

    document.body.appendChild(messageBox);

    setTimeout(function () {
        messageBox.style.opacity = 0;
        setTimeout(function () {
            messageBox.remove();
        }, 500);
    }, 1200);
}

// 添加一个清除存储数据的函数
function clearStorageData() {
    chrome.storage.sync.clear(() => {
        console.log('存储数据已清除');
        // 重新加载手势列表
        loadGestures();
        showMessage('存储数据已清除');
    });
}

// 初始加载
document.addEventListener('DOMContentLoaded', loadGestures);

// 添加重置按钮事件监听器
document.getElementById('reset-gesture').addEventListener('click', function () {
    if (confirm('确定要重置所有手势为默认配置吗？这将删除所有自定义手势。')) {
        clearStorageData();
    }
});

// 添加新样式
const style = document.createElement('style');
style.textContent = `
    .gesture-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 15px;
        margin-bottom: 10px;
        background-color: #f5f5f5;
        border-radius: 8px;
        transition: background-color 0.3s;
    }

    .gesture-item:hover {
        background-color: #e9e9e9;
    }

    .gesture-sequence {
        font-size: 18px;
        font-weight: bold;
        margin-right: 10px;
    }

    .default-badge {
        background-color: #6c757d;
        color: white;
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 12px;
        margin-left: 8px;
    }

    .action-select {
        padding: 8px;
        border: 1px solid #ddd;
        border-radius: 4px;
        background-color: white;
        min-width: 200px;
        font-size: 14px;
    }

    .action-select:focus {
        outline: none;
        border-color: #007bff;
        box-shadow: 0 0 0 2px rgba(0,123,255,0.25);
    }
`;
document.head.appendChild(style);
