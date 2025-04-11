# Mac上Edge鼠标右键手势插件

Mac上的Edge一直没有内置的手势，扩展市场里也找不到crxMouse Gestures了，好像以前还经常以安全问题不让使用，于是配合gpt写了个简单的插件，
只实现了几个基本的手势。
- **双击右键**：调用系统菜单。
- **左**：后退。
- **右**：前进。
- **上**：向上滚动。
- **下**：向下滚动。
- **向右然后向下**：刷新。
- **先向下再向右**：关闭标签页。
- **先向下再向上**：滚动到顶部。
- **先向上再向下**：滚动到底部。
- **先向左再向上**：重新打开已关闭的标签页。
- **先向下再向左**：打开计算器。
- **先向右再向左**：打开翻译。
Double Right-Click: Opens the system menu.
Swipe Left: Navigates back to the previous page.
Swipe Right: Moves forward to the next page.
Swipe Up: Scrolls the page upward.
Swipe Down: Scrolls the page downward.
Right then Down: Refreshes the current page.
Down then Right: Closes the active tab.
Down then Up: Scrolls to the top of the page.
Up then Down: Scrolls to the bottom of the page.
Left then Up: Reopens the last closed tab.
Down then Left: Opens the calculator application.
Right then Left: Opens the translation tool.
<img src="./edgeMouse.png" alt="示例图片" style="width: 80%; height: auto;">

## 使用
### 加载扩展程序
   1. 下载项目。
   2. Edge在地址栏输入 edge://extensions/ 并按回车键。
   3. 打开左边栏“开发者模式”开关。
   4. 点击“加载解压缩的扩展”。
   5. 选择项目的根目录进行加载。
