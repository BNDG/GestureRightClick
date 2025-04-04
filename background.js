// 引入本地的 mathjs 库
importScripts("/libs/math.min.js");
class Direction {
    static Up = 0;
    static Right = 1;
    static Down = 2;
    static Left = 3;
}
let injectedTabs = {}; // 用于存储已注入脚本的标签页ID
// 方位角阈值 ->0(360) ↑90 ←180 ↓270
const azimuthThreshold = 45;
let fracDigits = 3; // 小数位数
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
            ;
        }
    });
}
chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
    delete injectedTabs[tabId]; // 页面关闭时移除记录
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete') {
        delete injectedTabs[tabId]; // 页面刷新时移除记录
    }
});
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
            [JSON.stringify([Direction.Down, Direction.Left])]: { name: "计算器", actionType: "openCalculator" },
            [JSON.stringify([Direction.Right, Direction.Left])]: { name: "翻译", actionType: "openTranslate" },
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
            },
            'openTranslate': () => {
                // 在页面头部添加翻译脚本  
                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                    const tabId = tabs[0].id;

                    // 使用 chrome.runtime.getURL 来获取扩展的 options 页面真实 URL
                    const optionsPageUrl = chrome.runtime.getURL("options.html");

                    // 检查 URL 是否是扩展页面（以 chrome:// 或 extension:// 开头）
                    if (tabs[0].url === optionsPageUrl) {
                        chrome.tabs.sendMessage(tabId, { type: "translateScriptInjected" });
                        return;
                    }
                    // 检查是否已经注入
                    if (!injectedTabs[tabId]) {
                        chrome.scripting.executeScript({
                            target: { tabId: tabId },
                            files: ["libs/translate.min.js"]
                        }, () => {
                            if (chrome.runtime.lastError) {
                                console.error(chrome.runtime.lastError.message);
                            } else {
                                // 注入完成后发送消息给 content script 并标记为已注入
                                chrome.tabs.sendMessage(tabId, { type: "translateScriptInjected" });
                                injectedTabs[tabId] = true; // 标记此标签页已注入
                                ;
                            }
                        });
                    } else {
                        ;
                        // 如果需要，可以在这里再次发送消息给 content script
                        chrome.tabs.sendMessage(tabId, { type: "translateScriptInjected" });
                    }
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
            ;
        } else {
            trail.push(msg.point);
            processAzimuth(trail);
        }
        sendResponse({ status: "success" });
    } else if (msg.type === "mouseAction") {
        ;
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
    } else if (msg.type === "sendExpression") {
        sendResponse({ status: "success" });
        if (msg.data) {
            let inputExpression = msg.data.toString();
            // 1. 去除多余空格
            inputExpression = inputExpression.trim().replace(/\s+/g, ' ');
            let result = inputExpression + "\n";
            // 2. 使用正则表达式匹配 scale = <数字> 格式
            let scaleMatch = inputExpression.match(/^scale\s*=\s*(-?\d+)$/i);
            if (scaleMatch) {
                // 3. 提取数字并转换为整数
                fracDigits = parseInt(scaleMatch[1], 10); // 获取 scale 的值
                // 4. 验证范围
                if (fracDigits < 0 || fracDigits > 10) {
                    result += "= Invalid scale value";
                    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                        chrome.tabs.sendMessage(tabs[0].id, { type: "calcResult", text: result });
                    });
                    return;
                }
                result += `小数位数设为 ${fracDigits}`;
                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                    chrome.tabs.sendMessage(tabs[0].id, { type: "calcResult", text: result });
                });
                return;
            }
            try {
                let calcResult = math.evaluate(inputExpression);
                result += "= " + parseFloat(calcResult.toFixed(fracDigits));
            } catch (error) {
                console.error('Error evaluating expression:', error);
                result += '= Invalid expression';
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
    ;
    // 计算初始方向
    if (allDirections.length === 0) {
        currentDirection = calcDirection(bearing);
        allDirections.push(currentDirection);

    } else {
        currentDirection = allDirections[allDirections.length - 1];
        let nextDirection = calcDirection(bearing);
        // 仅在方向发生变化时记录
        if (nextDirection !== currentDirection) {
            ;
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