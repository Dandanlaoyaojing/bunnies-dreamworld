# 笔记编辑器图标更新

## 🎨 图标替换

### 更新内容
将笔记编辑器中的三个工具按键图标从emoji替换为自定义图标：

#### 原图标 → 新图标
- **图片按钮**: 📷 → `/images/notes/camera.png`
- **语音按钮**: 🎤 → `/images/notes/phone.png`  
- **保存按钮**: 💾 → `/images/notes/dics.png`

### 文件修改
1. **pages/note-editor/note-editor.wxml**
   - 将 `<text class="tool-icon">📷</text>` 改为 `<image src="/images/notes/camera.png" class="tool-icon" />`
   - 将 `<text class="tool-icon">🎤</text>` 改为 `<image src="/images/notes/phone.png" class="tool-icon" />`
   - 将 `<text class="tool-icon">💾</text>` 改为 `<image src="/images/notes/dics.png" class="tool-icon" />`

2. **pages/note-editor/note-editor.wxss**
   - 将 `.tool-icon` 的 `font-size: 36rpx` 改为 `width: 40rpx; height: 40rpx`

### 图标说明
- **camera.png**: 相机图标，用于图片输入功能
- **phone.png**: 电话图标，用于语音输入功能
- **dics.png**: 磁盘图标，用于保存笔记功能

### 样式特点
- 图标尺寸：50rpx × 50rpx（camera和dics图标）
- 语音图标尺寸：60rpx × 45rpx（适当拉长）
- 保持原有的按钮样式和颜色
- 图标与文字垂直排列
- 支持点击动画效果

现在笔记编辑器的工具按键使用了更专业的自定义图标，提升了整体的视觉效果和用户体验！
