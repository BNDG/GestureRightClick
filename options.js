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
    'nothing': '无',
    'scrollOnePageDown': '向下滚动一页',
    'scrollOnePageUp': '向上滚动一页',
    'goBack': '后退',
    'goForward': '前进',
    'closeCurrentTab': '关闭当前标签页',
    'scrollToBottom': '滚动到底部',
    'scrollToTop': '滚动到顶部',
    'restoreLastClosedTab': '恢复关闭的标签页',
    'refreshPage': '刷新页面'
};

// 默认手势配置
const defaultGestures = {
    '[2]': { name: '向下滚动', actionType: 'scrollOnePageDown' },
    '[0]': { name: '向上滚动', actionType: 'scrollOnePageUp' },
    '[3]': { name: '后退', actionType: 'goBack' },
    '[1]': { name: '前进', actionType: 'goForward' },
    '[2,1]': { name: '关闭当前标签页', actionType: 'closeCurrentTab' },
    '[0,2]': { name: '滚动到底部', actionType: 'scrollToBottom' },
    '[2,0]': { name: '滚动到顶部', actionType: 'scrollToTop' },
    '[3,0]': { name: '恢复关闭的标签页', actionType: 'restoreLastClosedTab' },
    '[1,2]': { name: '刷新页面', actionType: 'refreshPage' }
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
            const gestureSymbols = gesture.map(dir => directionMap[dir]).join(' ');
            const item = document.createElement('div');
            item.className = 'gesture-item';
            item.innerHTML = `
                <div class="gesture-info">
                    <span class="gesture-sequence">${gestureSymbols}</span>
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
        const isDefaultGesture = gestureKey in defaultGestures;
        console.log(gestureKey, newActionType)
        // 更新自定义手势
        customGestures[gestureKey] = {
            name: isDefaultGesture ? defaultGestures[gestureKey].name : customGestures[gestureKey]?.name || actionNameMap[newActionType],
            actionType: newActionType
        };

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
