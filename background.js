let gestureThreshold = 8; // 手势的阈值，轨迹超过该值才判定为有效手势
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    console.log("收到消息:", msg);
    if (msg.type === "mouseGesture") {
        let trail = msg.trail;
        if (trail.length < gestureThreshold) return; // 如果轨迹太短，忽略

        // 调用时判断轨迹是否符合 L 形
        if (isLShape(trail)) {
            console.log('这是一个 L 形轨迹！触发关闭标签页');
            // closeTab();
        } else {
            console.log('这不是一个 L 形轨迹。');
            // 判断轨迹
            if (isSwipeDown(trail)) {
                console.log("向下滑动");
                chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
                    chrome.tabs.sendMessage(tabs[0].id, {type: "scrollOnePageDown"}); // 发送向下滚动命令
                });
            } else if (isSwipeUp(trail)) {
                console.log("向上滑动");
                chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
                    chrome.tabs.sendMessage(tabs[0].id, {type: "scrollOnePageUp"}); // 发送向上滚动命令
                });
            } else if (isSwipeRight(trail)) {
                console.log("向右滑动");
                // chrome.tabs.goForward(); // 前进
            } else if (isSwipeLeft(trail)) {
                console.log("向左滑动");
                // chrome.tabs.goBack(); // 后退
            }
        }
        sendResponse({status: "success"});
        return true;
    }
});

let threshold = 0.15; // 斜率接近 0 视为水平线
function isLShape(mouseTrail) {
    if (mouseTrail.length < 3) return false; // 至少需要3个点才能形成轨迹

    let directionChanges = 0; // 记录轨迹的转折次数
    let horizontalSegment = false;
    let verticalSegment = false;

    for (let i = 1; i < mouseTrail.length - 1; i++) {
        const prev = mouseTrail[i - 1];
        const curr = mouseTrail[i];
        const next = mouseTrail[i + 1];

        // 计算前后两段的斜率
        const slope1 = (curr.y - prev.y) / (curr.x - prev.x);
        const slope2 = (next.y - curr.y) / (next.x - curr.x);

        // 判断是否出现水平转垂直
        if (Math.abs(slope1) < threshold && Math.abs(slope2) > 1 / threshold) {
            directionChanges++;
            horizontalSegment = true;
        } else if (Math.abs(slope1) > 1 / threshold && Math.abs(slope2) < threshold) {
            directionChanges++;
            verticalSegment = true;
        }
    }

    // L形需要水平和竖直两个方向的变化
    return directionChanges >= 1 && horizontalSegment && verticalSegment;
}


function isSwipeLeft(trail) {
    return trail[0].x - trail[trail.length - 1].x > gestureThreshold;
}

function isSwipeRight(trail) {
    return trail[0].x - trail[trail.length - 1].x < -gestureThreshold;
}

function isSwipeUp(trail) {
    return trail[0].y - trail[trail.length - 1].y > gestureThreshold;
}

function isSwipeDown(trail) {
    return trail[0].y - trail[trail.length - 1].y < -gestureThreshold;
}
