let mouseTrail = [];
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
        console.log("canvas不存在，创建canvas")
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
            console.log(" 同源 iframe，直接添加事件监听")
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
                        console.log("iframe client", x, y);
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
            console.log(" 跨域 iframe")
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
        console.log(" 出错，说明是跨域的")
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
            console.log("允许默认的右键菜单弹出");
            isDoubleClick = true;
            return;
        } else {
            // 如果是普通右键点击，阻止右键菜单弹出
            console.log("普通右键点击，阻止右键菜单弹出");
            isDoubleClick = false;
            event.preventDefault();
        }

        // 更新最后一次点击的时间
        lastClickTime = currentTime;
    }
}
function handlerPointerdown(event) {
    if (event.button === 2) {
        console.log("右键按下时开始记录轨迹");
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
            console.log("pointerup发送手势数据给后台");
            chrome.runtime.sendMessage({
                type: "mouseAction"
            }, (response) => {
                if (chrome.runtime.lastError) {
                    console.log("pointerup发送消息失败: ", chrome.runtime.lastError);
                } else {
                    console.log("pointerup消息发送成功:", response);
                }
            });
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
                chrome.runtime.sendMessage({
                    type: "mousePoint",
                    point: currentPoint
                }, (response) => {
                    if (chrome.runtime.lastError) {
                        console.log("move发送消息失败: ", chrome.runtime.lastError);
                    } else {
                        console.log("move消息发送成功:", response);
                    }
                });
            } else {
                // 调用公共方法log输出 开发模式可以打印 发布模式关闭
            }
        }
        // 限制轨迹长度 
        if (mouseTrail.length > maxTrailLength) {
            mouseTrail.shift();
        }
        if (document.body == null) {
            console.log("body == null");
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
            console.log("不绘制半透明方框和文字提示 因为isShowTips " + isShowTips + " || " + currentTextTips);
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

    // 测量文本宽度
    const textWidth = ctx.measureText(currentTextTips).width;

    // 计算文本在矩形框内的位置
    const textX = centerX;  // 水平居中
    const textY = centerY;  // 垂直居中

    // 绘制文本
    ctx.fillText(currentTextTips, textX, textY);
}

// 监听来自背景脚本的消息
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    console.log("收到来自background的消息：", msg.type);
    if (msg.type === "scrollOnePageDown") {
        console.log("执行向下滚动操作")
        scrollOnePageDown(); // 执行向下滚动操作
        sendResponse({ status: "success" });
    } else if (msg.type === "scrollOnePageUp") {
        console.log("执行向上滚动操作")
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
            console.log("No more pages to go forward.");
        }
    } else if (msg.type === "goBack") {
        if (window.history.length > 1) {
            window.history.back();
        } else {
            console.log("No previous pages.");
        }
    } else if (msg.type === "refreshPage") {
        window.location.reload();
    } else if (msg.type === "directionTips") {
        currentTextTips = msg.text;
    } else if (msg.type === "openCalculator") {
        createPopup();
    } else if (msg.type === "calcResult") {
        const resultArea = document.getElementById('calc-result');
        var result = resultArea.innerText;
        if (result !== "") {
            result += "\n" + msg.text;
        } else {
            result = msg.text;
        }
        document.getElementById('calc-result').innerText = result;
        resultArea.scrollTo(0, resultArea.scrollHeight);
    }
});

// 向页面滚动
function scrollOnePageDown() {
    console.log(`执行向下滚动操作 ${window.innerHeight}`);
    // 确保 targetElement 是正确的滚动元素
    if (!targetElement || targetElement === window) {
        targetElement = document.documentElement;
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
        targetElement = document.documentElement;
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
        targetElement = document.documentElement;
    }
    targetElement.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

function scrollToBottom() {
    // 确保 targetElement 是正确的滚动元素
    if (!targetElement || targetElement === window) {
        targetElement = document.documentElement;
    }
    // 获取实际的滚动高度
    const scrollHeight = Math.max(
        document.documentElement.scrollHeight,
        document.body.scrollHeight
    );

    targetElement.scrollTo({
        top: scrollHeight,
        behavior: 'smooth'
    });
}
function createPopup() {
    if (document.getElementById('calculator-popup')) {
        document.getElementById('calculator-popup').remove();
        return;
    }
    const popup = document.createElement('div');
    popup.id = 'calculator-popup';
    popup.innerHTML = `
      <style>
            /* 整体弹出框样式 */
            #calculator-popup {
                position: fixed;
                top: 20px;
                right: 120px;
                width: 320px;
                background-color: #f9f9f9;
                border: 1px solid #ddd;
                border-radius: 8px;
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
                z-index: 9999;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
                display: flex;
                flex-direction: column;
            }

            /* 关闭按钮样式 */
            .close-button {
                cursor: pointer;
                position: absolute;
                top: 4px;
                left: 12px;
                font-size: 20px;
                color: #777;
                transition: color 0.3s ease;
                z-index: 1; /* 确保关闭按钮在最上面 */
            }

            .close-button:hover {
                color: #333;
            }

            /* 结果显示区域样式 */
            .result {
                padding: 20px;
                border-bottom: 1px solid #ddd;
                font-size: 18px;
                color: #333;
                min-height: calc(18px * 6 + 20px);
                max-height: calc(18px * 6 + 20px);
                overflow-y: auto;
                margin-top: 30px; /* 给result区域留出空间，避免覆盖close-button */
            }

            /* 输入容器样式 */
            .input-container {
                padding: 20px;
            }

            /* 输入框样式 */
            #calc-input {
                width: 100%;
                padding: 10px;
                font-size: 16px;
                border: 1px solid #ccc;
                border-radius: 4px;
                box-sizing: border-box;
                transition: border-color 0.3s ease;
            }

            #calc-input:focus {
                border-color: #007BFF;
                outline: none;
            }
            </style>

            <div id="calculator-popup">
            <span class="close-button">&times;</span>
            <div class="result" id="calc-result"></div>
            <div class="input-container">
                <input type="text" id="calc-input" placeholder="请输入表达式（例如：1+(2*5)）" />
            </div>
            </div>
    `;

    document.body.appendChild(popup);

    // 关闭按钮事件监听器
    const closeButton = popup.querySelector('.close-button');
    closeButton.addEventListener('click', () => {
        document.body.removeChild(popup);
    });

    // 输入框事件监听器
    const inputField = document.getElementById('calc-input');
    inputField.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            const expression = event.target.value;
            chrome.runtime.sendMessage({
                type: "sendExpression",
                data: expression
            });
            inputField.value = '';
        }
    });
}

