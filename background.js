let gestureThreshold = 30; // 手势的阈值，轨迹超过该值才判定为有效手势
let isInvertedV = false;
let isV = false;
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    console.log("收到消息:", msg);
    if (msg.type === "mouseGesture") {
        isInvertedV = false;
        isV = false;
        let trail = msg.trail;
        if (trail.length < 6) return; // 如果轨迹太短，忽略
        // 调用时判断轨迹是否符合 L 形
        if (isLShape(trail)) {
            console.log('这是一个 L 形轨迹！触发关闭标签页');
            // 获取当前活动的标签页并关闭
            chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
                if (tabs.length > 0) {
                    let tab = tabs[0];  // 获取当前标签页
                    chrome.tabs.remove(tab.id, function () {
                        console.log(`标签页 ${tab.id} 已关闭`);
                    });
                }
            });
        } else if (isInvertedV) {
            console.log('这是一个 ^ 形轨迹！');
            chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
                const tab = tabs[0];
                chrome.tabs.sendMessage(tab.id, {type: 'scrollToBottom'});
            });
        } else if (isV) {
            console.log('这是一个 V 形轨迹！');
            chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
                const tab = tabs[0];
                chrome.tabs.sendMessage(tab.id, {type: 'scrollToTop'});
            });
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
                // 例子：执行前进操作
                chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
                    chrome.tabs.sendMessage(tabs[0].id, {type: "goForward"});
                });
            } else if (isSwipeLeft(trail)) {
                console.log("向左滑动");
                chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
                    chrome.tabs.sendMessage(tabs[0].id, {type: "goBack"});
                });
            }
        }
        sendResponse({status: "success"});
        return true;
    }
});

// 线性拟合，返回斜率
function fitLine(points) {
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    const n = points.length;

    points.forEach(p => {
        sumX += p.x;
        sumY += p.y;
        sumXY += p.x * p.y;
        sumX2 += p.x * p.x;
    });

    return (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX); // 返回斜率
}

// 计算两条线段的夹角
function calculateAngle(slope1, slope2) {
    const angle1 = Math.atan(slope1);
    const angle2 = Math.atan(slope2);
    const angle = Math.abs(angle1 - angle2) * (180 / Math.PI);
    return Math.min(angle, 180 - angle); // 返回最小夹角
}

// 处理轨迹数据，判断是否为竖向或横向线段
function processTrackData(mouseTrail, xThreshold = 8) {
    for (let i = 1; i < mouseTrail.length; i++) {
        const prev = mouseTrail[i - 1];
        const curr = mouseTrail[i];

        const deltaX = Math.abs(curr.x - prev.x);
        const deltaY = Math.abs(curr.y - prev.y);

        if (deltaY > deltaX && deltaX <= xThreshold) {
            curr.x = prev.x; // 竖向线段，将当前点的 x 设置为前一个点的 x
        } else if (deltaX > deltaY && deltaX <= xThreshold) {
            curr.y = prev.y; // 横向线段，将当前点的 y 设置为前一个点的 y
        }
    }
}

function removeDuplicates(points) {
    const filteredPoints = [points[0]]; // 保留第一个点

    for (let i = 1; i < points.length; i++) {
        const lastPoint = filteredPoints[filteredPoints.length - 1];
        const currentPoint = points[i];

        // 判断 x 和 y 坐标的变化是否都在 8 以内
        if (Math.abs(lastPoint.x - currentPoint.x) > 8 || Math.abs(lastPoint.y - currentPoint.y) > 8) {
            filteredPoints.push(currentPoint);
        }
    }
    if (filteredPoints.length === 1) {
        filteredPoints.push(points[points.length - 1]);
    }
    console.log("filter = " + filteredPoints.length);
    return filteredPoints;
}

function isLShape(originTrail) {
    const mouseTrail = removeDuplicates(originTrail);
    const [fittingPoints1, fittingPoints2] = [
        mouseTrail.slice(0, mouseTrail.length / 2),   // 第一个轨迹段
        mouseTrail.slice(mouseTrail.length / 2)       // 第二个轨迹段
    ];
    const slope1L = fitLine(fittingPoints1);
    const slope2L = fitLine(fittingPoints2);
    const angleL = calculateAngle(slope1L, slope2L);

    const [originP1, originP2] = [
        originTrail.slice(0, originTrail.length / 2),   // 第一个轨迹段
        originTrail.slice(originTrail.length / 2)       // 第二个轨迹段
    ];
    console.log(`angle = ${angleL} slope1 = ${slope1L} slope2 = ${slope2L}`);
    const originSlope1 = fitLine(originP1);
    const originSlope2 = fitLine(originP2);
    const originAngle = calculateAngle(originSlope1, originSlope2);
    console.log(`originAngle = ${originAngle} originSlope1 = ${originSlope1} originSlope2 = ${originSlope2}`);
    const distanceX = originTrail[0].x - originTrail[originTrail.length - 1].x;
    if (Math.abs(angleL) > 65 && Math.abs(angleL) < 105) {
        // L 65--105
        return true;
    } else if (Math.abs(distanceX) > 30 && Math.abs(originAngle) > 10 && Math.abs(originAngle) < 65) {
        //
        if (originSlope1 < 0 && originSlope2 > 0) {
            // ^
            isInvertedV = true;
        }
        if (originSlope1 > 0 && originSlope2 < 0) {
            // V
            isV = true;
        }
    } else {
        return false;
    }
}

function isInvertedVShape(mouseTrail) {
    if (mouseTrail.length < 3) return false;

    let upSegment = null;
    let downSegment = null;

    for (let i = 1; i < mouseTrail.length - 1; i++) {
        const prev = mouseTrail[i - 1];
        const curr = mouseTrail[i];
        const next = mouseTrail[i + 1];

        const Y1 = curr.y - prev.y;  // 上一个点到当前点的y坐标差
        const Y2 = next.y - curr.y;  // 当前点到下一个点的y坐标差

        // 寻找下降段
        if (!upSegment && Y1 < 0) {
            upSegment = {start: prev, end: curr};
        }
        // 寻找上升段
        else if (upSegment && Y2 > 0) {
            downSegment = {start: curr, end: next};
            break;
        }
    }

    if (upSegment && downSegment) {
        // 确保上升段的结束点高于下降段的起点
        return upSegment.end.y > downSegment.start.y;
    }

    return false;
}

function isVShape(mouseTrail) {
    if (mouseTrail.length < 3) return false;

    let downSegment = null;
    let upSegment = null;

    for (let i = 1; i < mouseTrail.length - 1; i++) {
        const prev = mouseTrail[i - 1];
        const curr = mouseTrail[i];
        const next = mouseTrail[i + 1];

        const Y1 = curr.y - prev.y;  // 上一个点到当前点的y坐标差
        const Y2 = next.y - curr.y;  // 当前点到下一个点的y坐标差

        // 寻找上升段
        if (!downSegment && Y1 > 0) {
            downSegment = {start: prev, end: curr};
        }
        // 寻找下降段
        else if (downSegment && Y2 < 0) {
            upSegment = {start: curr, end: next};
            break;
        }
    }

    if (downSegment && upSegment) {
        // 确保下降段的结束点低于上升段的起点
        return downSegment.end.y < upSegment.start.y;
    }

    return false;
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