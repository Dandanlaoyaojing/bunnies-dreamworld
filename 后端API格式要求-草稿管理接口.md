# 后端API格式要求 - 草稿管理接口

## 📋 接口概述

为了修复前端草稿同步功能中的 `forEach` 错误，需要确保后端API返回正确的数据格式。

## 🔧 需要修复的接口

### 1. 获取草稿列表接口

**接口路径**：`GET /api/v1/drafts`

**当前问题**：返回的数据格式可能导致前端 `forEach` 错误

**要求格式**：
```json
{
  "success": true,
  "message": "获取草稿列表成功",
  "data": [
    {
      "id": "draft_001",
      "title": "草稿标题",
      "content": "草稿内容",
      "category": "knowledge",
      "tags": ["标签1", "标签2"],
      "createTime": "2024-01-01T00:00:00.000Z",
      "updateTime": "2024-01-01T00:00:00.000Z",
      "userId": "username"
    }
  ]
}
```

**关键要求**：
- ✅ `data` 字段必须是**数组**类型
- ✅ 即使没有草稿，也要返回空数组 `[]`
- ✅ 不要返回 `null` 或 `undefined`

## ❌ 错误的格式示例

### 错误格式1：data不是数组
```json
{
  "success": true,
  "data": {
    "drafts": [
      // 草稿数组
    ]
  }
}
```

### 错误格式2：data为null
```json
{
  "success": true,
  "data": null
}
```

### 错误格式3：data为undefined
```json
{
  "success": true
  // 缺少data字段
}
```

## ✅ 正确的格式示例

### 有草稿时：
```json
{
  "success": true,
  "message": "获取草稿列表成功",
  "data": [
    {
      "id": "draft_001",
      "title": "我的第一个草稿",
      "content": "这是草稿内容...",
      "category": "knowledge",
      "tags": ["学习", "笔记"],
      "createTime": "2024-01-01T00:00:00.000Z",
      "updateTime": "2024-01-01T00:00:00.000Z",
      "userId": "username"
    },
    {
      "id": "draft_002",
      "title": "第二个草稿",
      "content": "更多内容...",
      "category": "art",
      "tags": ["创作", "艺术"],
      "createTime": "2024-01-02T00:00:00.000Z",
      "updateTime": "2024-01-02T00:00:00.000Z",
      "userId": "username"
    }
  ]
}
```

### 没有草稿时：
```json
{
  "success": true,
  "message": "获取草稿列表成功",
  "data": []
}
```

## 🔍 前端代码逻辑

前端代码会进行以下检查：

```javascript
// 1. 检查API响应
if (result.success) {
  // 2. 确保data是数组
  const drafts = Array.isArray(result.data) ? result.data : []
  
  // 3. 如果data不是数组，会记录错误
  if (!Array.isArray(result.data)) {
    console.error('❌ 后端返回的data不是数组:', result.data)
  }
  
  return {
    success: true,
    drafts: drafts,  // 确保是数组
    count: drafts.length
  }
}
```

## 🚨 错误影响

如果后端返回的 `data` 不是数组，会导致：

1. **前端错误**：`cloudDrafts.forEach is not a function`
2. **功能失效**：草稿同步功能无法正常工作
3. **用户体验**：用户无法同步草稿数据

## 📝 修复建议

### 对于后端开发人员：

1. **检查当前实现**：
   - 确认 `/api/v1/drafts` 接口返回的数据格式
   - 确保 `data` 字段始终是数组类型

2. **修复代码**：
   ```javascript
   // 确保返回数组格式
   const drafts = await getDraftsFromDatabase(userId)
   
   return {
     success: true,
     message: "获取草稿列表成功",
     data: Array.isArray(drafts) ? drafts : []  // 确保是数组
   }
   ```

3. **测试验证**：
   - 测试有草稿的情况
   - 测试没有草稿的情况
   - 测试数据库连接失败的情况

## 🧪 测试方法

可以使用前端调试工具验证：

1. 访问 `pages/draft-sync-debug/draft-sync-debug` 页面
2. 点击"测试API服务获取草稿"按钮
3. 查看返回的数据格式是否正确

## 📞 联系信息

如有疑问，请联系前端开发人员确认具体要求。

---

**重要提醒**：请确保 `data` 字段始终是数组类型，这是修复前端 `forEach` 错误的关键！
