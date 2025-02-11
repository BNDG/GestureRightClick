let mouseTrail = [];
const maxTrailLength = 100;
let isRightClicking = false;

// 用于绘制轨迹的 canvas 元素
const canvas = document.createElement("canvas");
canvas.style.position = 'fixed'; // 固定定位
canvas.style.top = "0";
canvas.style.left = "0";
canvas.style.pointerEvents = "none"; // 不阻塞其他事件
canvas.width = window.innerWidth; // 设置为窗口的宽度
canvas.height = window.innerHeight; // 设置为窗口的高度
canvas.style.zIndex = "9999";
document.body.appendChild(canvas);

const ctx = canvas.getContext("2d");

function updateCanvasSize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

updateCanvasSize();
window.addEventListener("resize", updateCanvasSize);

// 记录右键点击的时间
let lastClickTime = 0;
const doubleClickThreshold = 200; // 双击的时间间隔（毫秒）
let isDoubleClick = false; // 用来标记是否为双击

document.addEventListener("contextmenu", (event) => {
    // 获取当前时间戳
    const currentTime = new Date().getTime();

    // 判断两次点击的间隔是否小于双击的阈值
    if (currentTime - lastClickTime < doubleClickThreshold) {
        // 如果是双击，允许默认的右键菜单弹出
        console.log("允许默认的右键菜单弹出");
        isDoubleClick = true; // 标记为双击
        return;  // 不阻止右键菜单弹出
    } else {
        // 如果是普通右键点击，阻止右键菜单弹出
        isDoubleClick = false;
        event.preventDefault();
    }

    // 更新最后一次点击的时间
    lastClickTime = currentTime;
});

// 右键按下时开始记录轨迹
document.addEventListener("mousedown", (event) => {
    if (event.button === 2 && !isDoubleClick) { // 只有不是双击的右键按下才记录轨迹
        isRightClicking = true;
        mouseTrail = []; // 清空轨迹
    }
});

// 右键释放时结束手势轨迹
document.addEventListener("mouseup", (event) => {
    if (isDoubleClick) {
        return;
    }
    if (event.button === 2) { // 右键
        isRightClicking = false;
        if (mouseTrail.length > 0) {
            // 发送手势数据给后台
            console.log("发送手势数据给后台");
            chrome.runtime.sendMessage({
                type: "mouseGesture",
                trail: mouseTrail,
            }, (response) => {
                if (chrome.runtime.lastError) {
                    console.log("发送消息失败: ", chrome.runtime.lastError);
                } else {
                    console.log("消息发送成功:", response);
                }
            });
        }
        // 重置双击标记
        isDoubleClick = false;
        ctx.clearRect(0, 0, canvas.width, canvas.height); // 清除画布上的内容
    }
});

// 记录鼠标移动轨迹并绘制
document.addEventListener("mousemove", (event) => {
    if (isDoubleClick) {
        return;
    }
    if (isRightClicking) {
        // 使用 clientX 和 clientY 获取相对于视口的坐标
        const x = event.clientX;
        const y = event.clientY;

        mouseTrail.push({x: x, y: y});

        // 限制轨迹长度
        if (mouseTrail.length > maxTrailLength) {
            mouseTrail.shift();
        }

        // 绘制轨迹
        ctx.clearRect(0, 0, canvas.width, canvas.height); // 清除之前的轨迹
        ctx.beginPath();
        ctx.moveTo(mouseTrail[0].x, mouseTrail[0].y);
        for (let i = 1; i < mouseTrail.length; i++) {
            ctx.lineTo(mouseTrail[i].x, mouseTrail[i].y);
        }
        ctx.strokeStyle = "rgba(0, 0, 255, 0.7)";
        ctx.lineWidth = 3;
        ctx.stroke();
    }
});

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
    if (msg.type === "scrollOnePageDown") {
        console.log("执行向下滚动操作")
        scrollOnePageDown(); // 执行向下滚动操作
        sendResponse({status: "success"});
    } else if (msg.type === "scrollOnePageUp") {
        console.log("执行向上滚动操作")
        scrollOnePageUp(); // 执行向上滚动操作
        sendResponse({status: "success"});
    } else if (msg.type === "scrollToBottom") {
        scrollToBottom();
        sendResponse({status: "success"});
    } else if (msg.type === "scrollToTop") {
        scrollToTop();
        sendResponse({status: "success"});
    } else if(msg.type === "goForward") {
        if (window.history.length > 1) {
            window.history.forward();
        } else {
            console.log("No more pages to go forward.");
        }
    } else if(msg.type === "goBack") {
        if (window.history.length > 1) {
            window.history.back();
        } else {
            console.log("No previous pages.");
        }
    }
});

function scrollToTop() {
    window.scrollTo(0, 0);
}

// 滚动到页面底部
function scrollToBottom() {
    window.scrollTo(0, document.body.scrollHeight);
}