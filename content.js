let mouseTrail = [];
let bndgInputList = [];
// 记录当前历史位置
let historyIndex = -1;
const maxTrailLength = 100;
let isRightClicking = false;
let prePoint = null;
let currentTextTips = null;
// 用于绘制轨迹的 canvas 元素
const canvas = document.createElement("canvas");
canvas.className = "gesture-bndg-canvas";
canvas.style.position = 'fixed'; // 固定定位
canvas.style.top = "0";
canvas.style.left = "0";
canvas.style.pointerEvents = "none"; // 不阻塞其他事件
canvas.style.zIndex = "9999";
const ctx = canvas.getContext("2d");
// 获取设备像素比
const dpr = window.devicePixelRatio || 1;
var trackColor = "#006dce";
var brushWidth = 3;
canvas.style.width = canvas.width + 'px';
canvas.style.height = canvas.height + 'px';
canvas.width = canvas.width * dpr;
canvas.height = canvas.height * dpr;
ctx.scale(dpr, dpr);
// 初始化为 document.documentElement（HTML元素）
var targetElement = document.documentElement;
// const rootFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize);
// // 计算期望的字体大小（例如：1.5rem）
// const desiredFontSizeInRem = 1;
// const fontSizeForCanvas = rootFontSize * desiredFontSizeInRem;
// 记录右键点击的时间
let lastClickTime = 0;
const doubleClickThreshold = 350; // 双击的时间间隔（毫秒）
let isDoubleClick = false; // 用来标记是否为双击
const isWin = navigator.platform.toLowerCase().includes('win');
let isShowTips = true;
// 1. 加载存储的设置（颜色、画笔宽度）
chrome.storage.sync.get(['trackColor', 'brushWidth', 'isShowTips'], function (data) {
    if (data.trackColor) {
        trackColor = data.trackColor; // 你可以把 trackColor 用来设置轨迹颜色
    }
    if (data.brushWidth) {
        brushWidth = data.brushWidth; // 你可以把 brushWidth 用来设置画笔宽度
    }
    isShowTips = data.isShowTips === undefined ? true : data.isShowTips;
});
function updateCanvasSize() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    // 设置实际宽度和高度（物理像素）
    canvas.width = width * dpr;
    canvas.height = height * dpr;

    // 设置样式宽度和高度（逻辑像素）
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    // 缩放上下文以匹配新的尺寸
    ctx.scale(dpr, dpr);
}

updateCanvasSize();
// 监听窗口大小变化并更新 Canvas 尺寸
window.addEventListener('resize', updateCanvasSize);
window.addEventListener('load', function () {
    if (!document.body.contains(canvas)) {

        document.body.appendChild(canvas);
    }
    // 获取所有的 <iframe> 元素
    const iframes = document.querySelectorAll('iframe');
    iframes.forEach((iframe) => {
        setupIframeListener(iframe);
    });
});

function setupIframeListener(iframe) {
    try {
        const iframeWindow = iframe.contentWindow;
        // 检查是否可以直接访问 iframe 内容
        if (iframeWindow && iframeWindow.document) {

            // 同源 iframe，直接添加事件监听
            const setupEventListeners = () => {
                const iframeWindow = iframe.contentWindow;
                // 在 iframe 内部监听事件并调用相关方法
                iframeWindow.addEventListener('contextmenu', handlerContextmenu, false);
                iframeWindow.addEventListener('pointerdown', handlerPointerdown, false);
                iframeWindow.addEventListener('pointerup', handlerPointerup, false);
                iframeWindow.addEventListener('pointermove', (event) => {
                    if (isRightClicking && !isDoubleClick) {
                        const x = event.clientX;
                        const y = event.clientY;
                        ;
                        // 获取iframe相对于主文档的偏移量
                        const iframeRect = event.target.ownerDocument.defaultView.frameElement.getBoundingClientRect();

                        // 调整坐标为相对于主文档的坐标
                        const docX = x + iframeRect.left;
                        const docY = y + iframeRect.top;
                        const adjustedEvent = {
                            type: 'pointermove',
                            clientX: docX,
                            clientY: docY,
                            ...event
                        };
                        handlerPointermove(adjustedEvent, iframeWindow);
                    }
                }, false);
            };
            // 第一次加载时设置事件监听器
            setupEventListeners();
            // 监听 iframe 的 load 事件，每次加载完成时重新设置事件监听器
            iframe.addEventListener('load', setupEventListeners);
        } else {

            // 跨域 iframe，使用 postMessage
            iframe.addEventListener('load', () => {
                iframeWindow.postMessage({
                    type: 'SETUP_GESTURE_LISTENERS',
                    source: 'mouse-gesture-extension'
                }, '*');
            });
        }
    } catch (e) {
        // 如果访问 iframe.contentWindow.document 出错，说明是跨域的

        iframe.addEventListener('load', () => {
            iframe.contentWindow.postMessage({
                type: 'SETUP_GESTURE_LISTENERS',
                source: 'mouse-gesture-extension'
            }, '*');
        });
    }
}

// 添加消息监听器，接收来自 iframe 的事件
window.addEventListener('message', (event) => {
    // 验证消息来源
    if (event.data.source !== 'mouse-gesture-iframe') return;

    switch (event.data.type) {
        case 'GESTURE_CONTEXTMENU':
            handlerContextmenu(event.data.event);
            break;
        case 'GESTURE_POINTERDOWN':
            handlerPointerdown(event.data.event);
            break;
        case 'GESTURE_POINTERUP':
            handlerPointerup(event.data.event);
            break;
    }
});

function handlerContextmenu(event) {
    if (isWin) {
        const canvasEl = document.querySelector(".gesture-bndg-canvas");
        if (canvasEl) {
            if (canvasEl.style.pointerEvents !== "none") {
                event.preventDefault();
            }
        }
    } else {
        // 获取当前时间戳
        const currentTime = new Date().getTime();
        // 判断两次点击的间隔是否小于双击的阈值
        if (currentTime - lastClickTime < doubleClickThreshold) {
            // 如果是双击，允许默认的右键菜单弹出
            ;
            isDoubleClick = true;
            return;
        } else {
            // 如果是普通右键点击，阻止右键菜单弹出
            ;
            isDoubleClick = false;
            event.preventDefault();
        }

        // 更新最后一次点击的时间
        lastClickTime = currentTime;
    }
}
function handlerPointerdown(event) {
    if (event.button === 2) {
        ;
        isRightClicking = true;
        mouseTrail = []; // 清空轨迹
        currentTextTips = "";
    }
}
function handlerPointerup(event) {
    if (event.button === 2 && !isDoubleClick) { // 右键
        ctx.clearRect(0, 0, canvas.width, canvas.height); // 清除画布上的内容
        isRightClicking = false;
        setTimeout(() => {
            removeGestureBndgCanvas();
        }, 70)
        if (mouseTrail.length > 0) {
            // 发送手势数据给后台
            ;
            if (chrome.runtime?.id) {
                chrome.runtime.sendMessage({
                    type: "mouseAction"
                }, (response) => {
                    if (chrome.runtime.lastError) {
                        ;
                    } else {
                        ;
                    }
                });
            }
        }
        // 重置双击标记
        isDoubleClick = false;
    }
}
function handlerPointermove(event, target) {
    if (isRightClicking && !isDoubleClick) {
        // 使用 clientX 和 clientY 获取相对于视口的坐标
        const x = event.clientX;
        const y = event.clientY;
        mouseTrail.push({ x: x, y: y });
        if (prePoint === null) {
            prePoint = { x: x, y: y };
        }
        if (mouseTrail.length === 1) {
            // 如果在iframe中，使用传入的target，否则使用文档根元素
            targetElement = target || document.documentElement;
        }
        if (mouseTrail.length > 1) {
            let currentPoint = { x: x, y: y };
            let distance = Math.sqrt(Math.pow(currentPoint.x - prePoint.x, 2) + Math.pow(currentPoint.y - prePoint.y, 2));
            if (distance > 10) {
                prePoint = currentPoint;
                if (chrome.runtime?.id) {
                    chrome.runtime.sendMessage({
                        type: "mousePoint",
                        point: currentPoint
                    }, (response) => {
                        if (chrome.runtime.lastError) {
                            ;
                        } else {
                            ;
                        }
                    });
                }
            } else {
                // 调用公共方法log输出 开发模式可以打印 发布模式关闭
            }
        }
        // 限制轨迹长度 
        if (mouseTrail.length > maxTrailLength) {
            mouseTrail.shift();
        }
        if (document.body == null) {
            ;
            return;
        } else if (!document.body.contains(canvas)) {
            document.body.appendChild(canvas);
        }
        canvas.style.pointerEvents = "auto"; // 阻塞其他事件
        // 绘制轨迹
        ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr); // 清除之前的轨迹
        ctx.beginPath();
        ctx.moveTo(mouseTrail[0].x, mouseTrail[0].y);
        for (let i = 1; i < mouseTrail.length; i++) {
            ctx.lineTo(mouseTrail[i].x, mouseTrail[i].y);
        }
        ctx.strokeStyle = trackColor;
        ctx.lineWidth = brushWidth;
        ctx.stroke();

        // 绘制半透明方框和文字提示
        if (isShowTips && currentTextTips !== null && currentTextTips !== "") {
            drawTextBoxAndMessage();
        } else {
            ;
        }
    }
}
window.addEventListener("contextmenu", handlerContextmenu, false);
// 右键按下时开始记录轨迹
document.addEventListener("pointerdown", handlerPointerdown, false);

// 右键释放时结束手势轨迹
document.addEventListener("pointerup", handlerPointerup, false);

// 记录鼠标移动轨迹并绘制
document.addEventListener("pointermove", (event) => {
    handlerPointermove(event, window);
}, false);

function removeGestureBndgCanvas() {
    const canvas = document.querySelector(".gesture-bndg-canvas");
    if (canvas) {
        // document.body.removeChild(canvas);
        canvas.style.pointerEvents = "none";
    }
}
// 添加函数来绘制提示框和文字
function drawTextBoxAndMessage() {
    // 计算屏幕中心坐标
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;

    // 设置方框的宽度和高度
    const boxWidth = 280;
    const boxHeight = 130;

    // 计算方框左上角坐标，使其位于屏幕中央
    const boxX = centerX - boxWidth / 2;
    const boxY = centerY - boxHeight / 2;

    // 设置Canvas的字体大小
    ctx.font = `20px Arial`;
    // 绘制半透明矩形背景
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";  // 半透明黑色
    ctx.fillRect(boxX, boxY, boxWidth, boxHeight);

    ctx.fillStyle = "white";  // 文字颜色
    ctx.textAlign = "center";  // 水平居中对齐
    ctx.textBaseline = "middle";  // 垂直居中对齐

    // 计算文本在矩形框内的位置
    const textX = centerX;  // 水平居中
    const textY = centerY;  // 垂直居中

    // 绘制文本
    ctx.fillText(currentTextTips, textX, textY);
}

// 监听来自背景脚本的消息
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    ;
    if (msg.type === "scrollOnePageDown") {

        scrollOnePageDown(); // 执行向下滚动操作
        sendResponse({ status: "success" });
    } else if (msg.type === "scrollOnePageUp") {

        scrollOnePageUp(); // 执行向上滚动操作
        sendResponse({ status: "success" });
    } else if (msg.type === "scrollToBottom") {
        scrollToBottom();
        sendResponse({ status: "success" });
    } else if (msg.type === "scrollToTop") {
        scrollToTop();
        sendResponse({ status: "success" });
    } else if (msg.type === "goForward") {
        if (window.history.length > 1) {
            window.history.forward();
        } else {
            ;
        }
    } else if (msg.type === "goBack") {
        if (window.history.length > 1) {
            window.history.back();
        } else {
            ;
        }
    } else if (msg.type === "refreshPage") {
        window.location.reload();
    } else if (msg.type === "directionTips") {
        currentTextTips = msg.text;
    } else if (msg.type === "openCalculator") {
        createCalcElement("calc");
    } else if (msg.type === "calcResult") {
        const popup = document.getElementById('bndg-popup-content');
        if (popup !== null) {
            const shadowRoot = popup.shadowRoot;
            const resultArea = shadowRoot.getElementById('bndg-popup-result');
            var result = resultArea.innerText;
            if (result !== "") {
                result += "\n" + msg.text;
            } else {
                result = msg.text;
            }
            shadowRoot.getElementById('bndg-popup-result').innerText = result;
            resultArea.scrollTo(0, resultArea.scrollHeight);
        }
    } else if (msg.type === "translateScriptInjected") {
        createCalcElement("translate");
    }
});
// 向页面滚动
function scrollOnePageDown() {
    ;
    // 确保 targetElement 是正确的滚动元素
    if (!targetElement || targetElement === window) {
        targetElement = window;
    }

    targetElement.scrollBy({
        top: window.innerHeight,
        behavior: 'smooth'
    });
}

// 向上滚动
function scrollOnePageUp() {
    // 确保 targetElement 是正确的滚动元素
    if (!targetElement || targetElement === window) {
        targetElement = window;
    }
    // 获取可视区域高度
    const viewportHeight = window.innerHeight;
    // h.min(viewpo currentScroll);
    targetElement.scrollBy({
        top: -viewportHeight,
        behavior: 'smooth'
    });
}

function scrollToTop() {
    // 确保 targetElement 是正确的滚动元素
    if (!targetElement || targetElement === window) {
        targetElement = window;
    }
    targetElement.scrollTo({
        top: 0,
    });
}

function scrollToBottom() {
    // 确保 targetElement 是正确的滚动元素
    if (!targetElement || targetElement === window) {
        targetElement = window;
    }
    // 获取实际的滚动高度
    const scrollHeight = Math.max(
        document.documentElement.scrollHeight,
        document.body.scrollHeight
    );

    targetElement.scrollTo({
        top: scrollHeight,
    });
}
async function createCalcElement(action) {
    if (document.getElementById('bndg-popup-content')) {
        document.getElementById('bndg-popup-content').remove();
        return;
    }

    try {
        // 从外部文件加载模板
        const response = await fetch(chrome.runtime.getURL('popup-content.html'));
        const templateHtml = await response.text();

        const popup = document.createElement('div');
        popup.id = 'bndg-popup-content';

        // 为 popup 创建 Shadow DOM
        const shadowRoot = popup.attachShadow({ mode: 'open' });
        shadowRoot.innerHTML = templateHtml;

        // 将 popup 添加到 body
        document.body.appendChild(popup);

        // 关闭按钮事件监听器
        const closeButton = shadowRoot.getElementById('bndg-popup-close');
        if (closeButton) {
            closeButton.addEventListener('click', () => {
                document.body.removeChild(popup);
            });
        }

        // 输入框事件监听器
        const inputField = shadowRoot.getElementById('bndg-popup-input');
        if (inputField) {
            if (action === "translate") {
                inputField.placeholder = "请输入要翻译的文本";
            }
            inputField.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') {
                    const expression = event.target.value;
                    if (expression === "") {
                        return;
                    }
                    bndgInputList.push(expression);
                    historyIndex = -1;
                    if (action === "translate") {
                        inputField.placeholder = "翻译中...";
                        let fromLang = containsChinese(expression) ? 'chinese_simplified' : 'english';
                        let toLang = containsChinese(expression) ? 'english' : 'chinese_simplified';
                        var obj = {
                            from: fromLang,
                            to: toLang,
                            texts: [expression]
                        }
                        translate.request.translateText(obj, function (data) {
                            inputField.placeholder = "请输入要翻译的文本";
                            let translation = expression + "\n";
                            if (data.result === 1) {
                                translation += "= " + data.text[0];
                            } else {
                                translation += '= 翻译失败';
                            }
                            const resultArea = shadowRoot.getElementById('bndg-popup-result');
                            var result = resultArea.innerText;
                            if (result !== "") {
                                result += "\n" + translation;
                            } else {
                                result = translation;
                            }
                            shadowRoot.getElementById('bndg-popup-result').innerText = result;
                            resultArea.scrollTo(0, resultArea.scrollHeight);
                        });
                    } else {
                        chrome.runtime.sendMessage({
                            type: "sendExpression",
                            data: expression
                        });
                    }
                    inputField.value = ''; // 清空输入框
                } else if (event.key === 'ArrowUp') {
                    if (historyIndex < bndgInputList.length - 1) {
                        historyIndex++;
                        inputField.value = bndgInputList[bndgInputList.length - 1 - historyIndex];
                    }
                    setTimeout(() => {
                        inputField.setSelectionRange(inputField.value.length, inputField.value.length);
                    }, 100); 
                } else if (event.key === 'ArrowDown') {
                    if (historyIndex > 0) {
                        historyIndex--;
                        inputField.value = bndgInputList[bndgInputList.length - 1 - historyIndex];
                        setTimeout(() => {
                            inputField.setSelectionRange(inputField.value.length, inputField.value.length);
                        }, 100); 
                    } else if (historyIndex === 0) {
                        historyIndex--;
                        inputField.value = ''; // 清空输入框
                    }
                }
            });
        }

        setTimeout(() => {
            const inputField = shadowRoot.getElementById('bndg-popup-input');
            if (inputField) {
                inputField.focus();
            }
        }, 100);
    } catch (error) {
        console.error('Failed to load template:', error);
    }

}

function containsChinese(text) {
    // 正则表达式匹配中文字符
    const chineseRegex = /[\u4e00-\u9fa5]/;
    return chineseRegex.test(text);
}

