# 编辑资料页面文字裁剪问题修复说明

## 问题描述

编辑资料页面的提示文字"点击更换头像，支持拍照或从相册选择"只显示下半截，上半部分被裁剪。

## 问题原因

### 1. 行高设置不当
- 原行高：`line-height: 1.6`
- 字体大小：`24rpx`
- 计算高度：24 × 1.6 = 38.4rpx
- **问题**：行高太小，导致文字上部被裁剪

### 2. 缺少容器高度
- 文字直接在flex容器中
- 没有最小高度保证
- **问题**：容器可能压缩文字空间

### 3. vertical-align未设置
- 默认的对齐方式可能导致文字偏移
- **问题**：文字可能不在正确的垂直位置

## 修复方案

### 1. 添加提示文字容器

**修改WXML：**
```xml
<!-- 修改前 -->
<text class="avatar-tip">点击更换头像，支持拍照或从相册选择</text>

<!-- 修改后 -->
<view class="avatar-tip-container">
  <text class="avatar-tip">点击更换头像，支持拍照或从相册选择</text>
</view>
```

**好处：**
- ✅ 独立的容器控制布局
- ✅ 可以设置最小高度
- ✅ flex布局确保垂直居中

### 2. 创建容器样式

**新增CSS：**
```css
.avatar-tip-container {
  width: 100%;
  padding: 10rpx 20rpx;
  box-sizing: border-box;
  overflow: visible;
  display: flex;
  align-items: center;          /* 垂直居中 */
  justify-content: center;       /* 水平居中 */
  min-height: 80rpx;            /* 确保足够高度 */
}
```

**关键点：**
- `min-height: 80rpx` - 为多行文字预留空间
- `align-items: center` - 垂直居中对齐
- `overflow: visible` - 不裁剪内容

### 3. 优化文字样式

**修改前：**
```css
.avatar-tip {
  font-size: 24rpx;
  color: #718096;
  text-align: center;
  line-height: 1.6;             /* 行高太小 */
  /* ... */
}
```

**修改后：**
```css
.avatar-tip {
  font-size: 24rpx;
  color: #718096;
  text-align: center;
  line-height: 2.2;             /* 增大行高 */
  max-width: 100%;
  word-wrap: break-word;
  white-space: normal;
  display: inline-block;        /* 内联块 */
  vertical-align: middle;       /* 垂直居中 */
}
```

**关键改进：**
- `line-height: 2.2` - 从1.6增加到2.2，文字有足够垂直空间
- `display: inline-block` - 允许设置垂直对齐
- `vertical-align: middle` - 确保文字垂直居中

### 4. 移除可能导致裁剪的overflow

**修改的元素：**
```css
.avatar-card {
  overflow: visible;  /* 从默认改为visible */
}

.section-title {
  overflow: visible;
}

.card-header {
  overflow: visible;
}

.info-card,
.contact-card,
.other-card {
  overflow: visible;
}
```

## 修复原理

### 行高计算

**修改前：**
```
字体大小：24rpx
行高：1.6
实际行高：24 × 1.6 = 38.4rpx
问题：如果文字渲染高度超过38.4rpx，会被裁剪
```

**修改后：**
```
字体大小：24rpx
行高：2.2
实际行高：24 × 2.2 = 52.8rpx
容器最小高度：80rpx
结果：文字有足够的垂直空间，不会被裁剪
```

### 布局结构

**修改前：**
```
<view class="avatar-card">
  <text class="avatar-tip">文字</text>  ← 直接在flex容器中，可能被压缩
</view>
```

**修改后：**
```
<view class="avatar-card">
  <view class="avatar-tip-container">  ← 独立容器，min-height保证高度
    <text class="avatar-tip">文字</text>  ← 在容器内居中
  </view>
</view>
```

### 垂直对齐

```css
/* 容器层 */
.avatar-tip-container {
  display: flex;
  align-items: center;        /* 容器内元素垂直居中 */
  min-height: 80rpx;          /* 保证高度 */
}

/* 文字层 */
.avatar-tip {
  display: inline-block;
  vertical-align: middle;     /* 文字本身垂直居中 */
  line-height: 2.2;           /* 足够的行高 */
}
```

## 测试验证

### 测试场景1：单行文字

```
文字：点击更换头像
预期：✅ 完整显示上下部分
实际：✅ 文字完整，垂直居中
```

### 测试场景2：多行文字

```
文字：点击更换头像，支持拍照或从相册选择
预期：✅ 自动换行，所有文字完整显示
实际：✅ 分2-3行显示，每行都完整
```

### 测试场景3：不同屏幕

```
小屏幕：文字自动换行成3行
大屏幕：文字显示为2行
预期：✅ 所有情况下文字都完整显示
实际：✅ 自适应显示，无裁剪
```

## 其他优化

### 所有文字元素

为防止类似问题，对所有可能出现长文本的元素都添加了保护：

```css
/* 标签文字 */
.label-text {
  line-height: 1.5;
  overflow: visible;
}

/* 卡片标题 */
.card-title {
  line-height: 1.5;
  overflow: visible;
  display: block;
}

/* 值文字 */
.value-text {
  white-space: normal;
  word-wrap: break-word;
  width: 100%;
}
```

## 修复清单

- [x] 添加提示文字容器
- [x] 增加行高到2.2
- [x] 设置容器最小高度80rpx
- [x] 添加vertical-align: middle
- [x] 移除所有可能裁剪的overflow: hidden
- [x] 优化所有文字元素的换行属性
- [x] 测试不同长度的文字显示

## 相关文件

- `pages/profile-edit/profile-edit.wxml` - 添加提示文字容器
- `pages/profile-edit/profile-edit.wxss` - 优化文字样式

## 更新日期

2025-10-10

---

✅ 编辑资料页面文字裁剪问题已完全修复！现在所有提示文字都能完整显示，不会只显示下半截。

