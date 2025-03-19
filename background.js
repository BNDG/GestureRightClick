// 引入本地的 mathjs 库
importScripts("/libs/math.min.js");
class Direction {
    static Up = 0;
    static Right = 1;
    static Down = 2;
    static Left = 3;
}
// 方位角阈值 ->0(360) ↑90 ←180 ↓270
const azimuthThreshold = 45;
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
const leftUpDirections = [Direction.Left, Direction.Up];
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

// 手势动作映射管理器
class GestureActionManager {
    constructor() {
        // 手势动作映射
        this.gestureMap = new Map();
        // 检查版本并清理旧数据
        this.loadGestures();
    }

    async loadGestures() {
        // 加载默认手势
        this.setDefaultGestures();

        // 从存储中加载自定义手势
        try {
            const result = await chrome.storage.sync.get('customGestures');
            console.log(result.customGestures)
            if (result.customGestures) {
                Object.entries(result.customGestures).forEach(([gestureKey, gestureData]) => {
                    // 将字符串形式的手势转换回数组
                    const gesture = JSON.parse(gestureKey);
                    this.gestureMap.set(gestureKey, {
                        name: gestureData.name,
                        action: this.getActionFunction(gestureData.actionType)
                    });
                });
            }
        } catch (error) {
            console.error('Error loading custom gestures:', error);
        }
    }

    setDefaultGestures() {
        const defaultGestures = {
            [JSON.stringify(downDirections)]: { name: "向下滚动", actionType: "scrollOnePageDown" },
            [JSON.stringify(upDirections)]: { name: "向上滚动", actionType: "scrollOnePageUp" },
            [JSON.stringify(leftDirections)]: { name: "后退", actionType: "goBack" },
            [JSON.stringify(rightDirections)]: { name: "前进", actionType: "goForward" },
            [JSON.stringify(downRightDirections)]: { name: "关闭当前标签页", actionType: "closeCurrentTab" },
            [JSON.stringify(upDownDirections)]: { name: "滚动到底部", actionType: "scrollToBottom" },
            [JSON.stringify(downUpDirections)]: { name: "滚动到顶部", actionType: "scrollToTop" },
            [JSON.stringify(leftUpDirections)]: { name: "恢复关闭的标签页", actionType: "restoreLastClosedTab" },
            [JSON.stringify(rightDownDirections)]: { name: "刷新页面", actionType: "refreshPage" },
            [JSON.stringify(rightUpDirections)]: { name: "打开新标签页", actionType: "openNewTab" },
            [JSON.stringify([Direction.Up, Direction.Left])]: { name: "切换到左边标签页", actionType: "switchLeftTab" },
            [JSON.stringify([Direction.Up, Direction.Right])]: { name: "切换到右边标签页", actionType: "switchRightTab" },
            [JSON.stringify([Direction.Left, Direction.Down, Direction.Right])]: { name: "计算器", actionType: "openCalculator" }
        };

        // 直接将默认手势添加到 gestureMap
        Object.entries(defaultGestures).forEach(([gestureKey, gestureData]) => {
            this.gestureMap.set(gestureKey, {
                name: gestureData.name,
                action: this.getActionFunction(gestureData.actionType)
            });
        });
    }

    getActionFunction(actionType) {
        const actionMap = {
            'nothing': () => {
                // 无动作，什么都不做
            },
            'scrollOnePageDown': () => {
                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                    chrome.tabs.sendMessage(tabs[0].id, { type: "scrollOnePageDown" });
                });
            },
            'scrollOnePageUp': () => {
                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                    chrome.tabs.sendMessage(tabs[0].id, { type: "scrollOnePageUp" });
                });
            },
            'goBack': () => {
                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                    chrome.tabs.sendMessage(tabs[0].id, { type: "goBack" });
                });
            },
            'goForward': () => {
                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                    chrome.tabs.sendMessage(tabs[0].id, { type: "goForward" });
                });
            },
            'closeCurrentTab': () => {
                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                    if (tabs.length > 0) chrome.tabs.remove(tabs[0].id);
                });
            },
            'scrollToBottom': () => {
                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                    chrome.tabs.sendMessage(tabs[0].id, { type: "scrollToBottom" });
                });
            },
            'scrollToTop': () => {
                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                    chrome.tabs.sendMessage(tabs[0].id, { type: "scrollToTop" });
                });
            },
            'restoreLastClosedTab': () => {
                restoreLastClosedTab();
            },
            'refreshPage': () => {
                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                    chrome.tabs.sendMessage(tabs[0].id, { type: "refreshPage" });
                });
            },
            'openNewTab': () => {
                chrome.tabs.create({});
            },
            'switchLeftTab': () => {
                chrome.tabs.query({ currentWindow: true }, (tabs) => {
                    if (tabs.length <= 1) return; // 只有一个标签页时不执行

                    const activeTab = tabs.find(tab => tab.active);
                    const currentIndex = tabs.indexOf(activeTab);
                    const newIndex = currentIndex === 0 ? tabs.length - 1 : currentIndex - 1;

                    chrome.tabs.update(tabs[newIndex].id, { active: true });
                });
            },
            'switchRightTab': () => {
                chrome.tabs.query({ currentWindow: true }, (tabs) => {
                    if (tabs.length <= 1) return; // 只有一个标签页时不执行

                    const activeTab = tabs.find(tab => tab.active);
                    const currentIndex = tabs.indexOf(activeTab);
                    const newIndex = currentIndex === tabs.length - 1 ? 0 : currentIndex + 1;

                    chrome.tabs.update(tabs[newIndex].id, { active: true });
                });
            },
            'openCalculator': () => {
                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                    chrome.tabs.sendMessage(tabs[0].id, { type: "openCalculator" });
                });
            }
        };
        return actionMap[actionType];
    }

    getActionType(actionFunction) {
        // 通过比较函数字符串来确定动作类型
        if (actionFunction) {
            const actionString = actionFunction.toString();
            for (const [type, func] of Object.entries(this.getActionFunction)) {
                if (func.toString() === actionString) {
                    return type;
                }
            }
        }
        return null;
    }

    // 执行手势对应的动作
    executeGesture(gesture) {
        const gestureKey = JSON.stringify(gesture);
        const actionObj = this.gestureMap.get(gestureKey);
        if (actionObj && actionObj.action && typeof actionObj.action === 'function') {
            actionObj.action();
            return actionObj.name;
        }
        return "无效手势";
    }

    // 获取手势对应的动作名称
    getGestureActionName(gesture) {
        const gestureKey = JSON.stringify(gesture);
        const actionObj = this.gestureMap.get(gestureKey);
        return actionObj ? actionObj.name : "无效手势";
    }
}

// 创建手势动作管理器实例
const gestureManager = new GestureActionManager();

// 修改原有的消息处理逻辑
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === "mousePoint") {
        if (trail.length === 0) {
            trail.push(msg.point);
            console.log("将第一个点加入轨迹:", msg.point);
        } else {
            trail.push(msg.point);
            processAzimuth(trail);
        }
        sendResponse({ status: "success" });
    } else if (msg.type === "mouseAction") {
        console.log("最终方向数组：", allDirections);
        // 使用手势管理器执行动作
        gestureManager.executeGesture(allDirections);
        // 清空方向数组
        trail = [];
        allDirections = [];
        sendResponse({ status: "success" });
    } else if (msg.type === "updateGestures") {
        // 处理手势更新
        const { customGestures } = msg;
        // 重新初始化手势管理器
        gestureManager.gestureMap.clear();
        gestureManager.setDefaultGestures();

        // 应用自定义手势
        Object.entries(customGestures).forEach(([gestureKey, gestureData]) => {
            const gesture = JSON.parse(gestureKey);
            const actionFunction = gestureManager.getActionFunction(gestureData.actionType);
            if (actionFunction) {
                gestureManager.gestureMap.set(gestureKey, {
                    name: gestureData.name,
                    action: actionFunction
                });
            }
        });
        sendResponse({ status: "success" });
    } else if(msg.type === "sendExpression") {
        sendResponse({ status: "success" });
        if(msg.data) {
            var result = msg.data + "\n";
            try {
                result += math.evaluate(msg.data); 
            } catch (error) {
                console.error('Error evaluating expression:', error);
                result += 'Invalid expression';
            }
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                chrome.tabs.sendMessage(tabs[0].id, { type: "calcResult", text: result });
            });
        }
    }
    return true;
});

// 更新发送提示的函数
function sendDirectionTips() {
    const tips = gestureManager.getGestureActionName(allDirections);
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
    console.log("坐标和方位角：", prePoint, currentPoint, bearing);
    // 计算初始方向
    if (allDirections.length === 0) {
        currentDirection = calcDirection(bearing);
        allDirections.push(currentDirection);
        console.log("初始方向：", currentDirection)
    } else {
        currentDirection = allDirections[allDirections.length - 1];
        let nextDirection = calcDirection(bearing);
        // 仅在方向发生变化时记录
        if (nextDirection !== currentDirection) {
            console.log("方向变化：", nextDirection);
            allDirections.push(nextDirection);
            currentDirection = nextDirection; // 更新当前方向
        }
    }
    sendDirectionTips()
}


function calcDirection(startAngle) {
    let direction = Direction.Down;
    // 根据角度计算方向
    if (Math.abs(startAngle) < azimuthThreshold) {
        direction = Direction.Right;
    } else if (Math.abs(startAngle - 90) < azimuthThreshold) {
        direction = Direction.Up;
    } else if (Math.abs(startAngle - 180) < azimuthThreshold) {
        direction = Direction.Left;
    } else if (Math.abs(startAngle - 270) < azimuthThreshold) {
        direction = Direction.Down;
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