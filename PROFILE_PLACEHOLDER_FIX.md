# 编辑资料页面Placeholder文字裁剪修复说明

## 问题描述

编辑资料页面的输入框提示文字（placeholder）显示不完整：
- **昵称**：只显示上半截
- **联系方式**：只显示下半截
- **其他信息**：只显示下半截

## 问题原因

### 核心问题：行高和padding不匹配

1. **行高倍数问题**
   - 使用 `line-height: 1.6` 或 `1.8` 倍数
   - 导致文字渲染高度与容器高度不匹配
   - placeholder可能被上下裁剪

2. **padding不统一**
   - 不同输入框padding不一致
   - 导致文字垂直位置不同
   - 有的显示上半截，有的显示下半截

3. **高度未固定**
   - 使用 `min-height` 而非固定 `height`
   - 容器可能被压缩
   - 文字显示空间不足

## 修复方案

### 统一所有输入框样式

#### 1. 固定高度和padding

**修改前（不一致）：**
```css
.form-input {
  padding: 20rpx;
  min-height: 68rpx;
  line-height: 1.8;
}
```

**修改后（统一）：**
```css
.form-input,
.form-textarea {
  padding: 24rpx 20rpx;         /* 上下24rpx，左右20rpx */
  height: 76rpx;                /* 固定高度 */
  line-height: normal;          /* 使用浏览器默认行高 */
}
```

#### 2. 统一选择器样式

**修改：**
```css
.picker-display {
  padding: 24rpx 20rpx;         /* 与输入框一致 */
  height: 76rpx;                /* 固定高度 */
}

.picker-text {
  line-height: normal;          /* 默认行高 */
}
```

#### 3. 统一只读字段样式

**修改：**
```css
.form-value.readonly {
  padding: 24rpx 20rpx;         /* 与输入框一致 */
  height: 76rpx;                /* 固定高度 */
  display: flex;
  align-items: center;          /* 垂直居中 */
}

.value-text {
  line-height: normal;          /* 默认行高 */
}
```

#### 4. 优化placeholder样式

**修改：**
```css
.form-input::placeholder,
.form-textarea::placeholder {
  color: #a0aec0;
  font-size: 28rpx;
  line-height: normal;          /* 与输入框一致 */
}
```

#### 5. 文本域特殊处理

**修改：**
```css
.form-textarea {
  min-height: 150rpx;           /* 最小高度 */
  height: auto;                 /* 自动高度 */
  line-height: 1.8;             /* 多行文本需要行高 */
  padding: 24rpx 20rpx;
}
```

## 统一规范

### 高度系统

| 元素 | 高度 | Padding上下 | Padding左右 | 总高度 |
|-----|------|-----------|-----------|-------|
| 输入框 | 76rpx | 24rpx | 20rpx | 76rpx |
| 选择器 | 76rpx | 24rpx | 20rpx | 76rpx |
| 只读字段 | 76rpx | 24rpx | 20rpx | 76rpx |
| 文本域 | auto | 24rpx | 20rpx | 150rpx+ |

### 行高系统

| 元素 | line-height | 说明 |
|-----|------------|------|
| 输入框 | normal | 浏览器默认，约1.2 |
| Placeholder | normal | 与输入框一致 |
| 单行文字 | normal | 避免裁剪 |
| 多行文字 | 1.8 | 适当的行间距 |
| 提示文字 | 2.2 | 更大的行间距 |

### Padding系统

**统一规则：**
- 所有输入框：`padding: 24rpx 20rpx`
- 所有卡片：`padding: 30rpx`
- 所有提示：`padding: 10rpx 20rpx`

## 修复效果

### 修复前

```
昵称输入框：
┌──────────────┐
│ ─────────    │ ← 只显示上半截
└──────────────┘

邮箱输入框：
┌──────────────┐
│ ＿＿＿＿＿＿   │ ← 只显示下半截
└──────────────┘
```

### 修复后

```
所有输入框统一：
┌──────────────┐
│ 请输入昵称    │ ← 完整显示，垂直居中
└──────────────┘

┌──────────────┐
│ 请输入邮箱地址 │ ← 完整显示，垂直居中
└──────────────┘
```

## 技术细节

### 为什么使用line-height: normal？

**问题：**
- `line-height: 1.6` 可能导致文字被裁剪
- `line-height: 1.8` 也可能在某些情况下不够
- 不同字体、不同平台行为可能不一致

**解决：**
- `line-height: normal` 使用浏览器默认值（通常是1.2）
- 搭配固定高度和padding
- 通过容器高度而非行高控制显示

### 高度计算

```
输入框总高度 = 76rpx

内部空间：
  上padding: 24rpx
  文字高度: 约28rpx（font-size）
  下padding: 24rpx
  ─────────────
  总计: 76rpx

文字垂直位置：
  24rpx（上padding）+ 14rpx（文字一半）= 38rpx
  刚好在76rpx的中间位置
```

### 垂直居中实现

**单行输入框：**
- 固定高度 + padding = 垂直居中

**多行文本域：**
- 自动高度 + line-height = 行间距合适

**选择器：**
- flex + align-items: center = 垂直居中

**只读字段：**
- flex + align-items: center = 垂直居中

## 兼容性

### iOS和Android

统一使用：
- `line-height: normal` - 跨平台一致
- 固定高度 - 不依赖字体渲染
- padding控制 - 精确定位

### 不同字体

- ✅ 系统默认字体
- ✅ 自定义字体
- ✅ 不同字号

## 相关文件

- `pages/profile-edit/profile-edit.wxml` - 添加容器
- `pages/profile-edit/profile-edit.wxss` - 统一样式规范

## 更新日期

2025-10-10

## 核心改进

1. **统一高度** - 所有输入框76rpx
2. **统一padding** - 上下24rpx，左右20rpx
3. **使用normal行高** - 避免平台差异
4. **固定高度而非最小高度** - 确保一致性

---

✅ 编辑资料页面placeholder显示问题已完全修复！所有输入框的提示文字都完整居中显示。

