let gestureThreshold = 8; // 手势的阈值，轨迹超过该值才判定为有效手势
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    console.log("收到消息:", msg);

    if (msg.type === "mouseGesture") {
        let trail = msg.trail;
        console.log("手势数据:", trail);

        if (trail.length < gestureThreshold) return; // 如果轨迹太短，忽略

        // 记录手势的状态
        let gestureState = []; // 使用数组记录手势的顺序

        // 检查手势方向
        if (isSwipeDown(trail)) {
            console.log("向下滑动");
            gestureState.push('down'); // 记录当前状态为向下滑动
            // 向当前活动标签页发送消息
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                chrome.tabs.sendMessage(tabs[0].id, { type: "scrollOnePageDown" }); // 发送向下滚动命令
            });
        } else if (isSwipeUp(trail)) {
            console.log("向上滑动");
            gestureState.push('up'); // 记录当前状态为向上滑动
            // 向当前活动标签页发送消息
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                chrome.tabs.sendMessage(tabs[0].id, { type: "scrollOnePageUp" }); // 发送向上滚动命令
            });
        } else if (isSwipeRight(trail)) {
            console.log("向右滑动");

            if (gestureState.includes('down')) {
                console.log("触发关闭标签页");
                closeTab(); // 关闭标签页
                gestureState = []; // 重置手势状态
            } else {
                gestureState.push('right');
                // chrome.tabs.goForward(); // 前进
            }
        } else if (isSwipeLeft(trail)) {
            console.log("向左滑动");
            gestureState.push('left');
            // chrome.tabs.goBack(); // 后退
        }

        sendResponse({status: "success"});
        return true;
    }
});

// 判断手势方向的函数
function isSwipeLeft(trail) {
    console.log("检查向左滑动，轨迹: ", trail);
    return trail[0].x - trail[trail.length - 1].x > gestureThreshold;
}

function isSwipeRight(trail) {
    console.log("检查向右滑动，轨迹: ", trail);
    return trail[0].x - trail[trail.length - 1].x < -gestureThreshold;
}

function isSwipeUp(trail) {
    console.log("检查向上滑动，轨迹: ", trail);
    return trail[0].y - trail[trail.length - 1].y > gestureThreshold;
}

function isSwipeDown(trail) {
    console.log("检查向下滑动，轨迹: ", trail);
    return trail[0].y - trail[trail.length - 1].y < -gestureThreshold;
}

// 滚动到页面顶部
function scrollToTop() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.executeScript(tabs[0].id, {
            code: "window.scrollTo(0, 0);"
        });
    });
}

// 滚动到页面底部
function scrollToBottom() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.executeScript(tabs[0].id, {
            code: "window.scrollTo(0, document.body.scrollHeight);"
        });
    });
}


// 向下滚动一页
function scrollOnePageDown() {
    window.scrollBy({
        top: window.innerHeight, // 滚动页面一页的高度
        behavior: 'smooth' // 平滑滚动
    });
}
