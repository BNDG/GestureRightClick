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
