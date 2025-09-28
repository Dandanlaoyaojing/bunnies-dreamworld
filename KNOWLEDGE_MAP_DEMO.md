# 知识星图功能演示

## 🎯 快速开始指南

### 第一步：优化搜索功能

#### 1.1 添加搜索建议功能
在 `knowledge-map.js` 中添加以下代码：

```javascript
// 搜索建议管理器
class SearchSuggestionManager {
  constructor() {
    this.searchHistory = this.loadSearchHistory()
  }
  
  loadSearchHistory() {
    return wx.getStorageSync('searchHistory') || []
  }
  
  saveSearchHistory(keyword) {
    if (!this.searchHistory.includes(keyword)) {
      this.searchHistory.unshift(keyword)
      this.searchHistory = this.searchHistory.slice(0, 10)
      wx.setStorageSync('searchHistory', this.searchHistory)
    }
  }
  
  getSuggestions(keyword) {
    if (!keyword) return []
    
    return this.searchHistory.filter(item => 
      item.toLowerCase().includes(keyword.toLowerCase())
    ).slice(0, 5)
  }
}

// 在 Page 中添加
data: {
  // ... 现有数据
  showSuggestions: false,
  searchSuggestions: [],
  suggestionManager: new SearchSuggestionManager()
},

// 搜索输入事件
onSearchInput(e) {
  const keyword = e.detail.value
  this.setData({
    searchKeyword: keyword,
    showSuggestions: keyword.length > 0,
    searchSuggestions: this.data.suggestionManager.getSuggestions(keyword)
  })
},

// 选择建议
selectSuggestion(e) {
  const suggestion = e.currentTarget.dataset.suggestion
  this.setData({
    searchKeyword: suggestion,
    showSuggestions: false
  })
  this.generateMap()
},

// 搜索确认
onSearchConfirm() {
  const keyword = this.data.searchKeyword.trim()
  if (!keyword) {
    wx.showToast({
      title: '请输入搜索关键词',
      icon: 'none'
    })
    return
  }
  
  // 保存搜索历史
  this.data.suggestionManager.saveSearchHistory(keyword)
  
  this.generateMap()
}
```

#### 1.2 更新搜索框UI
在 `knowledge-map.wxml` 中更新搜索部分：

```xml
<!-- 搜索容器 -->
<view class="search-container">
  <view class="search-input-wrapper">
    <input class="search-input" 
           placeholder="输入关键词搜索知识关联..."
           value="{{searchKeyword}}"
           bindinput="onSearchInput"
           bindconfirm="onSearchConfirm"
           bindfocus="onSearchFocus"
           bindblur="onSearchBlur" />
    
    <!-- 搜索建议 -->
    <view class="search-suggestions" wx:if="{{showSuggestions && searchSuggestions.length > 0}}">
      <view class="suggestion-item" 
            wx:for="{{searchSuggestions}}" 
            wx:key="*this"
            bindtap="selectSuggestion" 
            data-suggestion="{{item}}">
        <text class="suggestion-icon">🔍</text>
        <text class="suggestion-text">{{item}}</text>
      </view>
    </view>
  </view>
</view>
```

### 第二步：优化图谱生成

#### 2.1 改进概念提取算法
在 `knowledge-map.js` 中优化 `extractConceptsFromNote` 方法：

```javascript
// 改进的概念提取方法
extractConceptsFromNote(note, keyword) {
  const concepts = new Set()
  const keywordLower = keyword.toLowerCase()
  
  // 1. 从标题中提取概念
  if (note.title) {
    const titleConcepts = this.extractConceptsFromText(note.title, keywordLower)
    titleConcepts.forEach(concept => concepts.add(concept))
  }
  
  // 2. 从内容中提取概念
  if (note.content) {
    const contentConcepts = this.extractConceptsFromText(note.content, keywordLower)
    contentConcepts.forEach(concept => concepts.add(concept))
  }
  
  // 3. 从标签中提取相关概念
  if (note.tags) {
    note.tags.forEach(tag => {
      if (tag.toLowerCase().includes(keywordLower)) {
        concepts.add(tag)
      }
    })
  }
  
  // 4. 使用AI服务提取概念（可选）
  if (concepts.size < 3) {
    this.extractAIConcepts(note, keyword).then(aiConcepts => {
      aiConcepts.forEach(concept => concepts.add(concept))
    })
  }
  
  return Array.from(concepts).slice(0, 5)
},

// 从文本中提取概念
extractConceptsFromText(text, keyword) {
  const concepts = []
  const words = text.split(/[\s,，。！？；：""''（）【】]/)
  
  words.forEach(word => {
    if (word.length > 1 && word.toLowerCase().includes(keyword)) {
      concepts.push(word.trim())
    }
  })
  
  return concepts
},

// AI概念提取
async extractAIConcepts(note, keyword) {
  try {
    const messages = [
      {
        role: 'system',
        content: `从以下笔记内容中提取与"${keyword}"相关的3-5个关键概念，用逗号分隔。`
      },
      {
        role: 'user',
        content: `标题：${note.title}\n内容：${note.content}`
      }
    ]
    
    const result = await aiService.sendRequest(messages, { max_tokens: 100 })
    if (result.success) {
      return result.content.split(',').map(c => c.trim()).filter(c => c.length > 0)
    }
  } catch (error) {
    console.error('AI概念提取失败:', error)
  }
  
  return []
}
```

#### 2.2 优化节点布局算法
改进 `calculateNodePosition` 方法：

```javascript
// 改进的节点位置计算
calculateNodePosition(index, level, totalTags) {
  const centerX = 375
  const centerY = 300
  
  // 根据层级确定半径
  const radius = level * 100 + 80
  
  // 计算角度 - 使用黄金角度分布
  const goldenAngle = Math.PI * (3 - Math.sqrt(5))
  const angle = index * goldenAngle
  
  // 计算位置
  const x = centerX + radius * Math.cos(angle) - 40
  const y = centerY + radius * Math.sin(angle) - 40
  
  return { 
    x: Math.max(20, Math.min(750, x)), 
    y: Math.max(20, Math.min(580, y)) 
  }
}
```

### 第三步：增强交互功能

#### 3.1 添加节点拖拽功能
在 `knowledge-map.js` 中添加：

```javascript
data: {
  // ... 现有数据
  draggingNode: null,
  dragStartPos: null
},

// 节点触摸开始
onNodeTouchStart(e) {
  const node = e.currentTarget.dataset.node
  this.setData({
    draggingNode: node,
    dragStartPos: { x: e.touches[0].clientX, y: e.touches[0].clientY }
  })
},

// 节点触摸移动
onNodeTouchMove(e) {
  if (!this.data.draggingNode) return
  
  const deltaX = e.touches[0].clientX - this.data.dragStartPos.x
  const deltaY = e.touches[0].clientY - this.data.dragStartPos.y
  
  // 更新节点位置
  const updatedNodes = this.data.knowledgeMap.nodes.map(node => {
    if (node.id === this.data.draggingNode.id) {
      return {
        ...node,
        x: Math.max(20, Math.min(750, node.x + deltaX)),
        y: Math.max(20, Math.min(580, node.y + deltaY))
      }
    }
    return node
  })
  
  this.setData({
    'knowledgeMap.nodes': updatedNodes,
    dragStartPos: { x: e.touches[0].clientX, y: e.touches[0].clientY }
  })
},

// 节点触摸结束
onNodeTouchEnd(e) {
  this.setData({
    draggingNode: null,
    dragStartPos: null
  })
}
```

#### 3.2 更新节点UI以支持拖拽
在 `knowledge-map.wxml` 中更新节点：

```xml
<view class="knowledge-node {{item.level === 1 ? 'level-1' : item.level === 2 ? 'level-2' : 'level-3'}}" 
      wx:for="{{knowledgeMap.nodes}}" wx:key="id"
      style="left: {{item.x}}rpx; top: {{item.y}}rpx;"
      bindtap="onNodeTap" 
      bindtouchstart="onNodeTouchStart"
      bindtouchmove="onNodeTouchMove"
      bindtouchend="onNodeTouchEnd"
      data-node="{{item}}">
  <!-- 节点内容 -->
</view>
```

### 第四步：添加样式优化

#### 4.1 搜索建议样式
在 `knowledge-map.wxss` 中添加：

```css
/* 搜索容器 */
.search-container {
  position: relative;
  margin: 20rpx 30rpx;
}

.search-input-wrapper {
  position: relative;
}

.search-input {
  width: 100%;
  height: 80rpx;
  background: #ffffff;
  border: 2rpx solid #e2e8f0;
  border-radius: 16rpx;
  padding: 0 30rpx;
  font-size: 28rpx;
  color: #2d3748;
}

.search-input:focus {
  border-color: #C0D3E2;
  box-shadow: 0 0 0 4rpx rgba(192, 211, 226, 0.1);
}

/* 搜索建议 */
.search-suggestions {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: #ffffff;
  border: 2rpx solid #e2e8f0;
  border-top: none;
  border-radius: 0 0 16rpx 16rpx;
  box-shadow: 0 8rpx 30rpx rgba(0, 0, 0, 0.1);
  z-index: 100;
}

.suggestion-item {
  display: flex;
  align-items: center;
  padding: 20rpx 30rpx;
  border-bottom: 1rpx solid #f7fafc;
  transition: background-color 0.3s ease;
}

.suggestion-item:last-child {
  border-bottom: none;
}

.suggestion-item:active {
  background: #f7fafc;
}

.suggestion-icon {
  font-size: 24rpx;
  margin-right: 15rpx;
  color: #a0aec0;
}

.suggestion-text {
  font-size: 26rpx;
  color: #4a5568;
}
```

#### 4.2 节点拖拽样式
```css
/* 节点拖拽样式 */
.knowledge-node {
  position: absolute;
  transition: transform 0.3s ease;
  cursor: pointer;
  user-select: none;
}

.knowledge-node.dragging {
  transition: none;
  z-index: 1000;
  transform: scale(1.1);
  box-shadow: 0 12rpx 40rpx rgba(0, 0, 0, 0.2);
}

.knowledge-node:active {
  transform: scale(1.05);
}
```

## 🚀 测试功能

### 测试步骤：
1. **搜索功能测试**
   - 输入关键词，查看搜索建议
   - 选择建议项，验证搜索历史保存
   - 测试空搜索和无效输入

2. **图谱生成测试**
   - 输入不同关键词生成图谱
   - 验证节点位置和关联线
   - 测试不同筛选条件

3. **交互功能测试**
   - 拖拽节点调整位置
   - 点击节点查看详情
   - 测试长按和双击操作

4. **性能测试**
   - 大量笔记数据下的图谱生成
   - 频繁操作下的响应速度
   - 内存使用情况

## 📋 下一步计划

### 短期优化（1周内）
- [ ] 完善搜索建议算法
- [ ] 优化图谱生成性能
- [ ] 添加更多交互操作
- [ ] 完善错误处理

### 中期规划（1个月内）
- [ ] 集成AI概念提取
- [ ] 实现智能推荐功能
- [ ] 添加个性化设置
- [ ] 优化用户体验

### 长期目标（3个月内）
- [ ] 实现协作分享功能
- [ ] 添加高级分析功能
- [ ] 支持多模态输入
- [ ] 构建知识社区

---

*这个演示版本提供了核心功能的实现方案，您可以根据需要逐步完善和扩展功能。*
