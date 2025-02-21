function log(message) {
    if (true) {
        console.log(message);
    }
}
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
canvas.style.pointerEvents = "auto"; // 不阻塞其他事件
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
// const rootFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize);
// // 计算期望的字体大小（例如：1.5rem）
// const desiredFontSizeInRem = 1;
// const fontSizeForCanvas = rootFontSize * desiredFontSizeInRem;
// 记录右键点击的时间
let lastClickTime = 0;
const doubleClickThreshold = 350; // 双击的时间间隔（毫秒）
let isDoubleClick = false; // 用来标记是否为双击
// 1. 加载存储的设置（颜色、画笔宽度）
chrome.storage.sync.get(['trackColor', 'brushWidth'], function (data) {
    if (data.trackColor) {
        trackColor = data.trackColor; // 你可以把 trackColor 用来设置轨迹颜色
    }
    if (data.brushWidth) {
        brushWidth = data.brushWidth; // 你可以把 brushWidth 用来设置画笔宽度
    }
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
window.addEventListener("contextmenu", (event) => {
    // 获取当前时间戳
    const currentTime = new Date().getTime();

    // 判断两次点击的间隔是否小于双击的阈值
    if (currentTime - lastClickTime < doubleClickThreshold) {
        // 如果是双击，允许默认的右键菜单弹出
        log("允许默认的右键菜单弹出");
        isDoubleClick = true;
        return;
    } else {
        // 如果是普通右键点击，阻止右键菜单弹出
        log("普通右键点击，阻止右键菜单弹出");
        isDoubleClick = false;
        event.preventDefault();
    }

    // 更新最后一次点击的时间
    lastClickTime = currentTime;
}, false);
// 右键按下时开始记录轨迹
document.addEventListener("pointerdown", (event) => {
    if (event.button === 2 && !isDoubleClick) {
        log("右键按下时开始记录轨迹")
        isRightClicking = true;
        mouseTrail = []; // 清空轨迹
        currentTextTips = "";
    }
}, false);

// 右键释放时结束手势轨迹
document.addEventListener("pointerup", (event) => {
    if (isDoubleClick) {
        return;
    }
    if (event.button === 2) { // 右键
        isRightClicking = false;
        if (mouseTrail.length > 0) {
            // 发送手势数据给后台
            log("pointerup发送手势数据给后台");
            chrome.runtime.sendMessage({
                type: "mouseAction"
            }, (response) => {
                if (chrome.runtime.lastError) {
                    log("pointerup发送消息失败: ", chrome.runtime.lastError);
                } else {
                    log("pointerup消息发送成功:", response);
                }
            });
        }
        // 重置双击标记
        isDoubleClick = false;
        ctx.clearRect(0, 0, canvas.width, canvas.height); // 清除画布上的内容
        removeGestureBndgCanvas();
    }
}, false);

// 记录鼠标移动轨迹并绘制
document.addEventListener("pointermove", (event) => {
    if (isDoubleClick) {
        return;
    }
    if (isRightClicking) {
        // 使用 clientX 和 clientY 获取相对于视口的坐标
        const x = event.clientX;
        const y = event.clientY;
        mouseTrail.push({ x: x, y: y });
        if (prePoint === null) {
            prePoint = { x: x, y: y };
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
                        log("move发送消息失败: ", chrome.runtime.lastError);
                    } else {
                        log("move消息发送成功:", response);
                    }
                });
            } else {
                // 调用公共方法log输出 开发模式可以打印 发布模式关闭
                log("忽略变化小点");
            }
        }
        // 限制轨迹长度 
        if (mouseTrail.length > maxTrailLength) {
            mouseTrail.shift();
        }
        if (document.body == null) {
            log("body == null");
            return;
        } else if (!document.body.contains(canvas)) {
            document.body.appendChild(canvas);
            return;
        }
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
        if (currentTextTips !== null && currentTextTips !== "") {
            drawTextBoxAndMessage();
        }
    }
}, false);

function removeGestureBndgCanvas() {
    const canvas = document.querySelector(".gesture-bndg-canvas");
    if (canvas) {
        document.body.removeChild(canvas);
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
// 向页面滚动一页
function scrollOnePageDown() {
    window.scrollBy({
        top: window.innerHeight, // 滚动页面一页的高度
        behavior: 'smooth' // 平滑滚动
    });
}

// 向页面滚动一页向上
function scrollOnePageUp() {
    window.scrollBy({
        top: -window.innerHeight, // 向上滚动一页的高度
        behavior: 'smooth' // 平滑滚动
    });
}

// 监听来自背景脚本的消息
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    log("收到来自background的消息：", msg);
    if (msg.type === "scrollOnePageDown") {
        log("执行向下滚动操作")
        scrollOnePageDown(); // 执行向下滚动操作
        sendResponse({ status: "success" });
    } else if (msg.type === "scrollOnePageUp") {
        log("执行向上滚动操作")
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
            log("No more pages to go forward.");
        }
    } else if (msg.type === "goBack") {
        if (window.history.length > 1) {
            window.history.back();
        } else {
            log("No previous pages.");
        }
    } else if (msg.type === "refreshPage") {
        window.location.reload();
    } else if (msg.type === "directionTips") {
        currentTextTips = msg.text;
    }
});

function scrollToTop() {
    window.scrollTo(0, 0);
}

// 滚动到页面底部
function scrollToBottom() {
    window.scrollTo(0, document.body.scrollHeight);
}