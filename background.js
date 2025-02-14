import { log } from './logUtils.js';
class Direction {
    static Up = 0;
    static Right = 1;
    static Down = 2;
    static Left = 3;
}
// 方位角阈值
const azimuthThreshold = 35;
let trail = [];
let allDirections = [];
let currentDirection = Direction.Down;
const downDirections = [Direction.Down];
const upDirections = [Direction.Up];
const leftDirections = [Direction.Left];
const rightDirections = [Direction.Right];
const downRightDirections = [Direction.Down, Direction.Right];
const upDownDirections = [Direction.Up, Direction.Down];
const downUpDirections = [Direction.Down, Direction.Up];
const rightUpDirections = [Direction.Right, Direction.Up];
const rightDownDirections = [Direction.Right, Direction.Down];
let restoredSessionIds = [];
// 获取最近关闭的标签页，限制数量为所有
function restoreLastClosedTab() {
    chrome.sessions.getRecentlyClosed({}, (sessions) => {
        // 过滤掉已经恢复的标签页
        const unrecoveredTabs = sessions.filter(session => session.tab && !restoredSessionIds.includes(session.tab.sessionId));
    
        if (unrecoveredTabs.length > 0) {
            const nextTab = unrecoveredTabs[0].tab;
            // 记录恢复的会话ID
            restoredSessionIds.push(nextTab.sessionId);
            // 恢复标签页
            chrome.sessions.restore(nextTab.sessionId);
        } else {
            console.log("No more closed tabs to restore.");
        }
    });
}


chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === "mousePoint") {
        if (trail.length === 0) {
            // 将第一个点加入轨迹
            trail.push(msg.point);
            log("将第一个点加入轨迹:", msg.point);
        } else {
            trail.push(msg.point);
            // 有了两个点 可以计算方位角
            processAzimuth(trail);
        }
        sendResponse({ status: "success" });
    } else if (msg.type === "mouseAction") {
        log("最终方向数组：", allDirections);
        // 处理手势
        if (isSameDirection(allDirections, downRightDirections)) {
            log('这是一个 L 形轨迹！触发关闭标签页');
            // 获取当前活动的标签页并关闭
            chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
                if (tabs.length > 0) {
                    let tab = tabs[0];  // 获取当前标签页
                    chrome.tabs.remove(tab.id, function () {
                        log(`标签页 ${tab.id} 已关闭`);
                    });
                }
            });
        } else if (isSameDirection(allDirections, upDownDirections)) {
            log('这是一个 ^ 形轨迹！');
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                const tab = tabs[0];
                chrome.tabs.sendMessage(tab.id, { type: 'scrollToBottom' });
            });
        } else if (isSameDirection(allDirections, downUpDirections)) {
            log('这是一个 V 形轨迹！');
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                const tab = tabs[0];
                chrome.tabs.sendMessage(tab.id, { type: 'scrollToTop' });
            });
        } else if (isSameDirection(allDirections, downDirections)) {
            log("向下滑动");
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                chrome.tabs.sendMessage(tabs[0].id, { type: "scrollOnePageDown" }); // 发送向下滚动命令
            });
        } else if (isSameDirection(allDirections, upDirections)) {
            log("向上滑动");
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                chrome.tabs.sendMessage(tabs[0].id, { type: "scrollOnePageUp" }); // 发送向上滚动命令
            });
        } else if (isSameDirection(allDirections, rightDirections)) {
            log("向右滑动");
            // 例子：执行前进操作
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                chrome.tabs.sendMessage(tabs[0].id, { type: "goForward" });
            });
        } else if (isSameDirection(allDirections, leftDirections)) {
            log("向左滑动");
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                chrome.tabs.sendMessage(tabs[0].id, { type: "goBack" });
            });
        } else if (isSameDirection(allDirections, rightDownDirections)) {
            log("⎤形轨迹");
            // 刷新页面
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                chrome.tabs.sendMessage(tabs[0].id, { type: "refreshPage" });
            });
        } else if (isSameDirection(allDirections, rightUpDirections)) {
            log("⎦形轨迹");
            restoreLastClosedTab();
        } else {
            log("没有匹配到任何手势");
        }
        // 清空方向数组
        trail = [];
        allDirections = [];
        sendResponse({ status: "success" });
    }
    return true;
});

function sendDirectionTips() {
    let tips = "";
    if (isSameDirection(allDirections, rightDownDirections)) {
        tips = "刷新页面";
    } else if (isSameDirection(allDirections, downRightDirections)) {
        tips = "关闭标签页";
    } else if (isSameDirection(allDirections, downUpDirections)) {
        tips = "回到顶部";
    } else if (isSameDirection(allDirections, upDownDirections)) {
        tips = "回到底部";
    } else if (isSameDirection(allDirections, downDirections)) {
        tips = "向下滚动";
    } else if (isSameDirection(allDirections, upDirections)) {
        tips = "向上滚动";
    } else if (isSameDirection(allDirections, rightDirections)) {
        tips = "前进";
    } else if (isSameDirection(allDirections, leftDirections)) {
        tips = "后退";
    } else if (isSameDirection(allDirections, rightUpDirections)){
        tips = "重新打开已关闭的标签页";
    } else {
        tips = "无效手势";
    }
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, { type: "directionTips", text: tips });
    });
}

// 计算方位角
function processAzimuth(simpleTrail) {
    let prePoint = simpleTrail[simpleTrail.length - 2];
    let currentPoint = simpleTrail[simpleTrail.length - 1];
    let bearing = calculateBearing(prePoint, currentPoint);
    if (bearing > 360 - azimuthThreshold) {
        bearing = 360 - bearing;
    }
    // 输出两个点坐标和方位角
    log("坐标和方位角：", prePoint, currentPoint, bearing);
    // 计算初始方向
    if (allDirections.length === 0) {
        currentDirection = calcDirection(bearing);
        allDirections.push(currentDirection);
    } else {
        currentDirection = allDirections[allDirections.length - 1];
        let nextDirection = calcDirection(bearing);
        // 仅在方向发生变化时记录
        if (nextDirection !== currentDirection) {
            allDirections.push(nextDirection);
            currentDirection = nextDirection; // 更新当前方向
        }
    }
    sendDirectionTips()
}


function calcDirection(startAngle) {
    let direction = Direction.Down;
    // 根据角度计算方向
    if (Math.abs(startAngle - 270) < azimuthThreshold) {
        direction = Direction.Down;
    } else if (Math.abs(startAngle - 90) < azimuthThreshold) {
        direction = Direction.Up;
    } else if (Math.abs(startAngle - 180) < azimuthThreshold) {
        direction = Direction.Left;
    } else if (Math.abs(startAngle) < azimuthThreshold) {
        direction = Direction.Right;
    }
    return direction;
}

function calculateBearing(p1, p2) {
    let X = p2.x - p1.x; // 水平方向的差值
    let Y = -(p2.y - p1.y); // 垂直方向的差值，取反，使得Y向上的正方向

    let angle = Math.atan2(Y, X) * (180 / Math.PI); // 转换为角度
    let correctedAngle = (angle + 360) % 360; // 保证角度在0到360度之间

    // 由于你希望0°指向右侧（屏幕的x轴正方向）
    if (correctedAngle === 0) {
        correctedAngle = 360;
    }

    return correctedAngle;
}
function isSameDirection(directions, presetDirections) {
    return JSON.stringify(directions) === JSON.stringify(presetDirections);
}