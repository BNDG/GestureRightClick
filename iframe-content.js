// 检查是否在 iframe 中
if (window !== window.top) {
    // 监听来自主页面的设置请求
    window.addEventListener('message', (event) => {
        if (event.data.type === 'SETUP_GESTURE_LISTENERS' &&
            event.data.source === 'mouse-gesture-extension') {

            // 设置事件监听器
            window.addEventListener('contextmenu', (e) => {
                window.top.postMessage({
                    type: 'GESTURE_CONTEXTMENU',
                    source: 'mouse-gesture-iframe',
                    event: {
                        clientX: e.clientX,
                        clientY: e.clientY,
                        button: e.button,
                        buttons: e.buttons,
                        // 添加其他需要的事件属性
                    }
                }, '*');
            }, false);

            window.addEventListener('pointerdown', (e) => {
                window.top.postMessage({
                    type: 'GESTURE_POINTERDOWN',
                    source: 'mouse-gesture-iframe',
                    event: {
                        clientX: e.clientX,
                        clientY: e.clientY,
                        button: e.button,
                        buttons: e.buttons,
                    }
                }, '*');
            }, false);

            window.addEventListener('pointerup', (e) => {
                window.top.postMessage({
                    type: 'GESTURE_POINTERUP',
                    source: 'mouse-gesture-iframe',
                    event: {
                        clientX: e.clientX,
                        clientY: e.clientY,
                        button: e.button,
                        buttons: e.buttons,
                    }
                }, '*');
            }, false);

            window.addEventListener('pointermove', (e) => {
                window.top.postMessage({
                    type: 'GESTURE_POINTERMOVE',
                    source: 'mouse-gesture-iframe',
                    event: {
                        clientX: e.clientX,
                        clientY: e.clientY,
                        button: e.button,
                        buttons: e.buttons,
                    }
                }, '*');
            }, false);
        }
    });
} 