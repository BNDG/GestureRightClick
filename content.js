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
        findEle = null;
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
    if (isRightClicking && !isDoubleClick) {
        if (findEle == null) {
            findEle = findScrollableContainer();
        }
        handlerPointermove(event, findEle || window);
    }
}, false);
let findEle = null;
let dragText = '';
let enableDragSearch = false;
let searchEngine = 'https://www.bing.com/search?q=%s';
let dragStartPos = null;
const MIN_DRAG_DISTANCE = 60; // px

// 读取设置
// 加载用户设置 - 注意：默认值应与options.js保持一致
if (chrome && chrome.storage && chrome.storage.sync) {
    chrome.storage.sync.get({
        enableDragSearch: false, // 与options.js中的默认值保持一致
        searchEngine: 'https://www.bing.com/search?q=%s'
    }, function (items) {
        enableDragSearch = items.enableDragSearch;
        searchEngine = items.searchEngine;
        console.log('从存储加载的enableDragSearch值:', items.enableDragSearch);
    });
}

// dragstart 记录起点和设置图标
// 注意：setDragImage必须在图片加载后调用
document.addEventListener('dragstart', function (e) {
    console.log('enableDragSearch', enableDragSearch);
    if (!enableDragSearch) return; // 如果拖拽搜索功能已禁用，直接返回
    dragText = window.getSelection().toString().trim();
    dragStartPos = { x: e.clientX, y: e.clientY };
    if (!dragText) return; // 没有选中文本时不触发
    e.dataTransfer.setData('text/plain', dragText); // 必须设置数据，否则浏览器会阻止

    // 用Canvas生成图标
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    // 画圆
    ctx.beginPath();
    ctx.arc(14, 14, 10, 0, 2 * Math.PI);
    ctx.strokeStyle = '#1976d2';
    ctx.lineWidth = 3;
    ctx.stroke();
    // 画把手
    ctx.beginPath();
    ctx.moveTo(22, 22);
    ctx.lineTo(30, 30);
    ctx.stroke();
    // 画“搜”字
    ctx.font = 'bold 14px sans-serif';
    ctx.fillStyle = '#1976d2';
    ctx.fillText('搜', 8, 22);
    e.dataTransfer.setDragImage(canvas, 16, 16);

    e.dataTransfer.effectAllowed = 'copy';
});

document.addEventListener('dragend', function (e) {
    if (!enableDragSearch) return;
    if (!dragText) return;
    if (!dragStartPos) return;
    const dx = e.clientX - dragStartPos.x;
    const dy = e.clientY - dragStartPos.y;
    if (Math.sqrt(dx * dx + dy * dy) >= MIN_DRAG_DISTANCE) {
        const url = searchEngine.replace('%s', encodeURIComponent(dragText));
        window.open(url, '_blank');
    }
    dragText = '';
    dragStartPos = null;
});

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
        translate.service.use('client.edge');
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

// 等待DOM完全加载后再添加事件监听器
document.addEventListener('DOMContentLoaded', function() {
    if (document.body) {
        document.body.addEventListener('dragover', function (e) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
        });
        document.body.addEventListener('drop', function (e) {
            e.preventDefault();
        });
    }
});
// 查找当前页面中的可滚动容器
function findScrollableContainer() {
    // 特殊网站处理 - 基于域名的特定选择器
    const hostname = window.location.hostname;

    // 网站模式配置 - 使用通配符匹配支持更多网站
    const sitePatterns = [
        // YouTube及其相关域名
        {
            pattern: '*youtube*',
            selectors: [
                // 视频播放器页面
                'ytd-watch-flexy',
                '#columns #primary-inner',
                '#columns #primary',
                'ytd-watch-flexy #primary-inner',
                'ytd-watch-flexy #primary',
                // 首页和频道页
                'ytd-browse',
                'ytd-browse #contents',
                'ytd-two-column-browse-results-renderer',
                '#contents.ytd-rich-grid-renderer',
                // 搜索结果页
                'ytd-search',
                'ytd-search #contents',
                // 播放列表
                'ytd-playlist-panel-renderer #items',
                'ytd-playlist-panel-renderer',
                // 备用选择器
                'ytd-page-manager ytd-browse',
                'ytd-page-manager ytd-search',
                'ytd-page-manager',
                '#page-manager',
                '#content',
                '#contents'
            ],
            genericSelectors: [
                'ytd-section-list-renderer',
                'ytd-item-section-renderer',
                'ytd-rich-grid-renderer',
                'ytd-rich-item-renderer',
                'ytd-app'
            ],
            isVideoPage: () => !!document.querySelector('ytd-watch-flexy'),
            videoPageSelector: ['#primary', '#primary-inner']
        },
        // 抖音及相关网站
        {
            pattern: '*douyin*',
            selectors: [
                '.douyin-web__container',
                '.scroll-container',
                '.recommend-list-container',
                '.xgplayer-container'
            ]
        },
        // TikTok (国际版抖音)
        {
            pattern: '*tiktok*',
            selectors: [
                '.tiktok-web__container',
                '.scroll-container',
                '.recommend-list-container',
                '.xgplayer-container',
                '.video-card-container',
                '.feed-content',
                '.for-you-feed'
            ]
        },
        // 爱奇艺及相关网站
        {
            pattern: '*iqiyi*',
            selectors: [
                '.qy-scroll-container',
                '.qy-scroll-content',
                '.m-video-player-wrap',
                '.m-box-items'
            ]
        },
        // 腾讯视频
        {
            pattern: '*v.qq*',
            selectors: [
                '.site_container',
                '.mod_player',
                '.mod_episodes',
                '.container_main',
                '.mod_row_box',
                '.mod_pagination'
            ]
        },
        // Bilibili
        {
            pattern: '*bilibili*',
            selectors: [
                '#bilibiliPlayer',
                '.video-container',
                '.player-wrap',
                '.video-info-container',
                '.main-container',
                '.bili-wrapper',
                '.recommend-list'
            ]
        },
        // 优酷
        {
            pattern: '*youku*',
            selectors: [
                '.youku-film-player',
                '.playerBox',
                '.player-container',
                '.h5-detail-content',
                '.h5-detail-player',
                '.normal-player'
            ]
        },
        // Vimeo
        {
            pattern: '*vimeo*',
            selectors: [
                '.player_container',
                '.player_area',
                '.player',
                '.content',
                '.player_container',
                '.vp-player-layout'
            ]
        },
        // Twitch
        {
            pattern: '*twitch*',
            selectors: [
                '.persistent-player',
                '.video-player',
                '.video-player__container',
                '.twilight-main',
                '.stream-chat',
                '.channel-page'
            ]
        },
        // Netflix
        {
            pattern: '*netflix*',
            selectors: [
                '.watch-video',
                '.nfp',
                '.video-container',
                '.lolomo',
                '.mainView',
                '.gallery'
            ]
        }
    ];

    // 通配符匹配函数
    const matchPattern = (pattern, text) => {
        // 转换通配符为正则表达式
        const regexPattern = pattern
            .replace(/\./g, '\\.')  // 转义点号
            .replace(/\*/g, '.*');  // 星号转换为正则通配符

        const regex = new RegExp(`^${regexPattern}$`);
        return regex.test(text);
    };

    // 检查域名是否匹配任何配置的模式
    const findMatchingPatterns = (hostname) => {
        return sitePatterns.filter(site => {
            // 尝试直接匹配域名
            if (matchPattern(site.pattern, hostname)) {
                return true;
            }

            // 尝试匹配不带www的域名
            const domainWithoutWww = hostname.replace(/^www\./, '');
            if (domainWithoutWww !== hostname && matchPattern(site.pattern, domainWithoutWww)) {
                return true;
            }

            // 或者检查域名是否包含模式
            // 将"*"通配符删除，使用简单的includes检查
            const simplifiedPattern = site.pattern.replace(/\*/g, '');
            return simplifiedPattern && hostname.includes(simplifiedPattern);
        });
    };

    // 获取手势起始点，优先使用这个位置来确定滚动容器
    let gestureStartElement = null;
    if (mouseTrail && mouseTrail.length > 0) {
        const gestureStartX = mouseTrail[0].x;
        const gestureStartY = mouseTrail[0].y;
        gestureStartElement = document.elementFromPoint(gestureStartX, gestureStartY);

        if (gestureStartElement) {
            console.log('手势起始点在元素:', gestureStartElement.tagName,
                gestureStartElement.id || gestureStartElement.className);
        }
    }

    // 如果手势起始点在特定元素上，优先查找它的可滚动父容器
    if (gestureStartElement) {
        let container = gestureStartElement;
        let depth = 0;
        const maxDepth = 5;

        while (container && container !== document.body && container !== document.documentElement && depth < maxDepth) {
            if (isElementScrollable(container)) {
                console.log('在手势起始位置找到滚动容器:', container.tagName,
                    container.id || container.className);
                return container;
            }
            container = container.parentElement;
            depth++;
        }
    }

    // 查找匹配的网站模式
    const matchedSites = findMatchingPatterns(hostname);
    console.log('匹配到的网站模式:', matchedSites.length > 0 ? matchedSites.map(s => s.pattern).join(', ') : '无');

    // 如果找到匹配的网站，尝试使用其特定选择器
    if (matchedSites.length > 0) {
        // 遍历所有匹配的网站模式
        for (const site of matchedSites) {
            // 检查是否是视频页面（如果有此检测函数）
            if (site.isVideoPage && site.isVideoPage() && site.videoPageSelector) {
                // 尝试视频页面特定选择器
                for (const selector of site.videoPageSelector) {
                    const element = document.querySelector(selector);
                    if (element && isElementScrollable(element)) {
                        console.log(`找到${site.pattern}视频页面滚动容器:`, selector);
                        return element;
                    }
                }
            }

            // 尝试网站特定选择器
            if (site.selectors) {
                for (const selector of site.selectors) {
                    const element = document.querySelector(selector);
                    if (element && isElementScrollable(element)) {
                        console.log(`找到${site.pattern}网站滚动容器:`, selector);
                        return element;
                    }
                }
            }

            // 尝试通用选择器（如果有）
            if (site.genericSelectors) {
                for (const selector of site.genericSelectors) {
                    const elements = document.querySelectorAll(selector);
                    for (const element of elements) {
                        if (isElementScrollable(element)) {
                            console.log(`找到${site.pattern}通用滚动容器:`, selector);
                            return element;
                        }
                    }
                }
            }
        }

        // 如果以上都没找到，但有匹配的网站，可能是新版页面结构
        // 我们仍然尝试使用document.documentElement，而不是寻找其他容器
        console.log('识别到特定网站但未找到匹配的滚动容器，使用文档根元素');
        if (isElementScrollable(document.documentElement)) {
            return document.documentElement;
        }
    }

    // 通用选择器 - 已知的视频网站主滚动容器选择器
    const knownScrollSelectors = [
        // 通用视频网站常用的滚动容器class
        '.main-content-container',
        '.main-content',
        '.content-wrapper',
        '.content-container',
        '.video-feed',
        '.video-list',
        '.content-area',
        '.primary-column',
        '.main-column',
        '.scroll-container',
        '.video-container',
        '.player-container',
        '.main-view',
        '.main-section',
        '.video-player-container',
        '.media-player',
        '.watch-container',
        '.player-view',
        '.app-main',
        '.app-content',
        '.media-content',
        '.feed-container'
    ];

    // 先尝试已知的选择器
    for (const selector of knownScrollSelectors) {
        const element = document.querySelector(selector);
        if (element && isElementScrollable(element)) {
            console.log('找到通用滚动容器:', selector);
            return element;
        }
    }

    // 如果没有找到已知的滚动容器，尝试检测页面中的滚动容器
    return detectScrollableContainer();
}
// 检测页面中的滚动容器
function detectScrollableContainer() {
    // 首先检查文档根元素是否可滚动
    if (isElementScrollable(document.documentElement)) {
        return document.documentElement;
    }

    // 然后检查body元素是否可滚动
    if (isElementScrollable(document.body)) {
        return document.body;
    }

    // 使用手势起始点来确定最适合的滚动容器
    // 如果手势起始点可用，则优先从该点寻找可滚动容器
    if (mouseTrail && mouseTrail.length > 0) {
        const gestureStartX = mouseTrail[0].x;
        const gestureStartY = mouseTrail[0].y;

        // 从手势起始点获取元素
        const elementAtGestureStart = document.elementFromPoint(gestureStartX, gestureStartY);

        if (elementAtGestureStart) {
            // 向上查找可能的滚动容器
            let container = elementAtGestureStart;
            let depth = 0;
            const maxDepth = 5; // 限制向上查找深度

            while (container && container !== document.body && container !== document.documentElement && depth < maxDepth) {
                if (isElementScrollable(container)) {
                    const rect = container.getBoundingClientRect();
                    // 确保容器足够大(至少占视口宽度的50%或高度的30%)
                    if (rect.width > window.innerWidth * 0.5 || rect.height > window.innerHeight * 0.3) {
                        console.log('使用手势起始点找到滚动容器:', container);
                        return container;
                    }
                }
                container = container.parentElement;
                depth++;
            }
        }
    }

    // 优先检查这些常见的主内容容器
    const mainContentSelectors = [
        'main',
        '#main',
        '#content',
        '.content',
        '#app',
        '.app',
        '.main-content'
    ];

    for (const selector of mainContentSelectors) {
        const elements = document.querySelectorAll(selector);
        for (const element of elements) {
            if (isElementScrollable(element)) {
                // 如果找到可滚动的主内容容器，优先返回
                return element;
            }
        }
    }

    // 尝试查找视口中心和下半部分的可滚动元素
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const viewportCenter = { x: viewportWidth / 2, y: viewportHeight / 2 };

    // 在视口中心点和下半部分寻找元素
    // 优先在中心区域检查，避免导航栏等边缘元素
    for (let y = viewportCenter.y; y < viewportHeight * 0.9; y += 50) {
        const element = document.elementFromPoint(viewportCenter.x, y);
        if (element) {
            // 向上查找可能的滚动容器
            let container = element;
            let depth = 0;
            // 限制向上查找的深度，以避免到达顶层容器
            const maxDepth = 5;

            while (container && container !== document.body && container !== document.documentElement && depth < maxDepth) {
                if (isElementScrollable(container)) {
                    const rect = container.getBoundingClientRect();
                    // 确保容器足够大(至少占视口宽度的50%和高度的30%)
                    if (rect.width > viewportWidth * 0.5 && rect.height > viewportHeight * 0.3) {
                        return container;
                    }
                }
                container = container.parentElement;
                depth++;
            }
        }
    }

    // 如果在中心区域没找到，检查整个文档中的大型可滚动元素
    const allElements = document.querySelectorAll('*');
    let bestContainer = null;
    let maxArea = 0;

    for (const element of allElements) {
        if (isElementScrollable(element)) {
            const rect = element.getBoundingClientRect();
            const area = rect.width * rect.height;

            // 找出最大的可滚动区域，但避免整个文档
            if (area > maxArea && element !== document.documentElement && element !== document.body) {
                // 额外检查：确保元素不是左侧导航栏或其他辅助UI
                // 通常主内容区域会位于较中央的位置
                const centerOffset = Math.abs((rect.left + rect.right) / 2 - viewportWidth / 2);
                // 如果元素中心与视口中心的水平偏移较小，更可能是主内容
                if (centerOffset < viewportWidth * 0.3) {
                    maxArea = area;
                    bestContainer = element;
                }
            }
        }
    }

    if (bestContainer) {
        return bestContainer;
    }

    // 默认返回document.scrollingElement
    return document.scrollingElement || document.documentElement;
}

// 检查元素是否可滚动
function isElementScrollable(element) {
    if (!element) return false;

    try {
        // 检查文档根或body元素（这些总是可滚动的）
        if (element === document.documentElement || element === document.body) {
            return element.scrollHeight > element.clientHeight;
        }

        const style = window.getComputedStyle(element);

        // 检查常见的可滚动样式
        const hasScrollableStyle =
            style.overflow === 'auto' ||
            style.overflow === 'scroll' ||
            style.overflowY === 'auto' ||
            style.overflowY === 'scroll';

        // 有些元素即使是overflow:hidden，但内容超出也可以滚动
        const potentiallyScrollableWithHidden =
            style.overflow === 'hidden' ||
            style.overflowY === 'hidden';

        // 检查元素内容是否超出容器高度
        const hasScrollHeight = element.scrollHeight > element.clientHeight;

        // 额外检查：避免选择太小的容器
        const rect = element.getBoundingClientRect();

        // 检查特殊角色属性
        const role = element.getAttribute('role');
        const isScrollableRole = role === 'scrollbar' || role === 'listbox' ||
            role === 'grid' || role === 'tree';

        // 检查常见的可滚动类名
        const className = element.className || '';
        const hasScrollableClass = /\b(scroll|scrollable|overflow|content)\b/i.test(className);

        // 为特殊元素调整大小要求
        let isLargeEnough = true;
        if (isScrollableRole || hasScrollableClass) {
            // 对于有明确滚动指示的元素，大小要求可以放宽
            isLargeEnough = rect.width > 100 && rect.height > 50;
        } else {
            // 对于普通元素，保持较严格的大小要求
            isLargeEnough = rect.width > 200 && rect.height > 100;
        }

        // 检查是否在视口内
        const isInViewport =
            rect.top < window.innerHeight &&
            rect.left < window.innerWidth &&
            rect.bottom > 0 &&
            rect.right > 0;

        // 普通滚动条件
        if (hasScrollableStyle && hasScrollHeight && isLargeEnough && isInViewport) {
            return true;
        }

        // 特殊处理：即使overflow:hidden，但内容超出且有明确滚动特征的元素
        if (potentiallyScrollableWithHidden && hasScrollHeight &&
            (isScrollableRole || hasScrollableClass) && isInViewport) {
            return true;
        }

        // 特殊处理：无样式但有明显滚动特征的元素
        if (hasScrollHeight && isScrollableRole && isLargeEnough && isInViewport) {
            return true;
        }

        return false;
    } catch (error) {
        // 如果获取样式出错，默认返回false
        return false;
    }
}
