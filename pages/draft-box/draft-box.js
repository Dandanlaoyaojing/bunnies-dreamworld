// pages/draft-box/draft-box.js - 草稿箱页面
const noteManager = require('../../utils/noteManager.js')

Page({
  data: {
    // 草稿列表
    drafts: [],
    
    // 筛选和排序
    sortBy: 'updateTime', // updateTime, createTime, title, category
    sortOrder: 'desc', // asc, desc
    filterCategory: 'all', // all, art, cute, dreams, foods, happiness, knowledge, sights, thinking
    searchKeyword: '',
    
    // 界面状态
    isLoading: false,
    isEmpty: false,
    selectedDrafts: [], // 批量操作选中的草稿
    
    // 统计信息
    stats: {
      totalCount: 0,
      categoryCount: {},
      oldestDraft: null,
      newestDraft: null
    },
    
    // 操作模式
    isBatchMode: false,
    isEditing: false,
    
    // 分类选项
    categories: [
      { name: '全部', key: 'all', icon: '📝' },
      { name: '艺术', key: 'art', icon: '🎨' },
      { name: '萌物', key: 'cute', icon: '🐰' },
      { name: '梦游', key: 'dreams', icon: '🌙' },
      { name: '美食', key: 'foods', icon: '🍰' },
      { name: '趣事', key: 'happiness', icon: '😊' },
      { name: '知识', key: 'knowledge', icon: '📚' },
      { name: '风景', key: 'sights', icon: '🌅' },
      { name: '思考', key: 'thinking', icon: '🤔' }
    ]
  },

  onLoad() {
    console.log('草稿箱页面加载')
    this.loadDrafts()
  },

  onShow() {
    // 每次显示时重新加载草稿，以防其他页面有更新
    this.loadDrafts()
  },

  // 下拉刷新
  onPullDownRefresh() {
    console.log('草稿箱下拉刷新')
    this.loadDrafts()
    
    // 延迟停止下拉刷新动画
    setTimeout(() => {
      wx.stopPullDownRefresh()
    }, 1000)
  },

  // 加载草稿列表
  loadDrafts() {
    this.setData({ isLoading: true })
    
    try {
      // 从本地存储获取草稿
      const drafts = wx.getStorageSync('drafts') || []
      
      console.log('加载草稿:', drafts.length)
      
      // 处理草稿数据
      const processedDrafts = drafts.map(draft => ({
        ...draft,
        // 确保有必要的字段
        id: draft.id || Date.now().toString(),
        title: draft.title || '无标题',
        content: draft.content || '',
        category: draft.category || 'thinking',
        createTime: draft.createTime || new Date().toISOString(),
        updateTime: draft.updateTime || new Date().toISOString(),
        wordCount: draft.wordCount || (draft.content ? draft.content.length : 0),
        // 计算预览内容
        preview: this.generatePreview(draft.content || ''),
        // 格式化时间
        createTimeFormatted: this.formatTime(draft.createTime),
        updateTimeFormatted: this.formatTime(draft.updateTime)
      }))
      
      // 应用筛选和排序
      const filteredDrafts = this.applyFiltersAndSort(processedDrafts)
      
      // 计算统计信息
      const stats = this.calculateStats(processedDrafts)
      
      this.setData({
        drafts: filteredDrafts,
        stats,
        isEmpty: filteredDrafts.length === 0,
        isLoading: false
      })
      
    } catch (error) {
      console.error('加载草稿失败:', error)
      this.setData({ isLoading: false })
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    }
  },

  // 生成预览内容
  generatePreview(content) {
    if (!content) return '暂无内容'
    
    // 移除HTML标签和特殊字符
    const cleanContent = content.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ')
    
    // 截取前100个字符
    return cleanContent.length > 100 ? cleanContent.substring(0, 100) + '...' : cleanContent
  },

  // 应用筛选和排序
  applyFiltersAndSort(drafts) {
    let filteredDrafts = [...drafts]
    
    // 分类筛选
    if (this.data.filterCategory !== 'all') {
      filteredDrafts = filteredDrafts.filter(draft => draft.category === this.data.filterCategory)
    }
    
    // 关键词搜索
    if (this.data.searchKeyword.trim()) {
      const keyword = this.data.searchKeyword.toLowerCase()
      filteredDrafts = filteredDrafts.filter(draft => 
        draft.title.toLowerCase().includes(keyword) ||
        draft.content.toLowerCase().includes(keyword)
      )
    }
    
    // 排序
    filteredDrafts.sort((a, b) => {
      let aValue, bValue
      
      switch (this.data.sortBy) {
        case 'title':
          aValue = a.title.toLowerCase()
          bValue = b.title.toLowerCase()
          break
        case 'category':
          aValue = a.category
          bValue = b.category
          break
        case 'createTime':
          aValue = new Date(a.createTime)
          bValue = new Date(b.createTime)
          break
        case 'updateTime':
        default:
          aValue = new Date(a.updateTime)
          bValue = new Date(b.updateTime)
          break
      }
      
      if (this.data.sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })
    
    return filteredDrafts
  },

  // 计算统计信息
  calculateStats(drafts) {
    const stats = {
      totalCount: drafts.length,
      categoryCount: {},
      oldestDraft: null,
      newestDraft: null
    }
    
    if (drafts.length === 0) return stats
    
    // 统计各分类数量
    drafts.forEach(draft => {
      const category = draft.category || 'thinking'
      stats.categoryCount[category] = (stats.categoryCount[category] || 0) + 1
    })
    
    // 找到最早和最晚的草稿
    const sortedByTime = drafts.sort((a, b) => new Date(a.createTime) - new Date(b.createTime))
    stats.oldestDraft = sortedByTime[0]
    stats.newestDraft = sortedByTime[sortedByTime.length - 1]
    
    return stats
  },

  // 格式化时间
  formatTime(timeString) {
    if (!timeString) return ''
    
    const date = new Date(timeString)
    const now = new Date()
    const diff = now - date
    
    // 小于1分钟
    if (diff < 60000) {
      return '刚刚'
    }
    
    // 小于1小时
    if (diff < 3600000) {
      return Math.floor(diff / 60000) + '分钟前'
    }
    
    // 小于1天
    if (diff < 86400000) {
      return Math.floor(diff / 3600000) + '小时前'
    }
    
    // 小于7天
    if (diff < 604800000) {
      return Math.floor(diff / 86400000) + '天前'
    }
    
    // 超过7天显示具体日期
    return date.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  },

  // 搜索输入
  onSearchInput(e) {
    this.setData({ searchKeyword: e.detail.value })
    // 防抖处理
    clearTimeout(this.searchTimer)
    this.searchTimer = setTimeout(() => {
      this.loadDrafts()
    }, 300)
  },

  // 分类筛选
  selectCategory(e) {
    const category = e.currentTarget.dataset.category
    this.setData({ filterCategory: category })
    this.loadDrafts()
  },

  // 排序方式选择
  selectSortBy(e) {
    const sortBy = e.currentTarget.dataset.sort
    this.setData({ sortBy })
    this.loadDrafts()
  },

  // 切换排序顺序
  toggleSortOrder() {
    this.setData({ 
      sortOrder: this.data.sortOrder === 'asc' ? 'desc' : 'asc' 
    })
    this.loadDrafts()
  },

  // 点击草稿项
  onDraftTap(e) {
    const draftId = e.currentTarget.dataset.id
    
    if (this.data.isBatchMode) {
      // 批量选择模式
      this.toggleDraftSelection(draftId)
    } else {
      // 编辑模式
      this.editDraft(draftId)
    }
  },

  // 长按草稿项
  onDraftLongPress(e) {
    const draftId = e.currentTarget.dataset.id
    
    if (!this.data.isBatchMode) {
      // 进入批量选择模式
      this.setData({ 
        isBatchMode: true,
        selectedDrafts: [draftId]
      })
    }
  },

  // 切换草稿选择状态
  toggleDraftSelection(draftId) {
    const selectedDrafts = [...this.data.selectedDrafts]
    const index = selectedDrafts.indexOf(draftId)
    
    if (index > -1) {
      selectedDrafts.splice(index, 1)
    } else {
      selectedDrafts.push(draftId)
    }
    
    this.setData({ selectedDrafts })
  },

  // 编辑草稿
  editDraft(draftId) {
    const draft = this.data.drafts.find(d => d.id === draftId)
    if (!draft) return
    
    // 跳转到笔记编辑器，传递草稿数据
    wx.navigateTo({
      url: `/pages/note-editor/note-editor?draftId=${draftId}&mode=draft`
    })
  },

  // 删除草稿
  deleteDraft(draftId) {
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个草稿吗？删除后无法恢复。',
      showCancel: true,
      cancelText: '取消',
      confirmText: '删除',
      confirmColor: '#e53e3e',
      success: (res) => {
        if (res.confirm) {
          this.performDeleteDraft(draftId)
        }
      }
    })
  },

  // 执行删除草稿
  performDeleteDraft(draftId) {
    try {
      const drafts = wx.getStorageSync('drafts') || []
      const updatedDrafts = drafts.filter(draft => draft.id !== draftId)
      
      wx.setStorageSync('drafts', updatedDrafts)
      
      wx.showToast({
        title: '删除成功',
        icon: 'success'
      })
      
      this.loadDrafts()
    } catch (error) {
      console.error('删除草稿失败:', error)
      wx.showToast({
        title: '删除失败',
        icon: 'none'
      })
    }
  },

  // 发布草稿
  publishDraft(draftId) {
    const draft = this.data.drafts.find(d => d.id === draftId)
    if (!draft) return
    
    wx.showModal({
      title: '发布草稿',
      content: '确定要将这个草稿发布为正式笔记吗？',
      showCancel: true,
      cancelText: '取消',
      confirmText: '发布',
      success: (res) => {
        if (res.confirm) {
          this.performPublishDraft(draft)
        }
      }
    })
  },

  // 执行发布草稿
  performPublishDraft(draft) {
    try {
      // 创建正式笔记
      const note = {
        id: Date.now().toString(),
        title: draft.title,
        content: draft.content,
        category: draft.category,
        tags: draft.tags || [],
        createTime: new Date().toISOString(),
        updateTime: new Date().toISOString(),
        wordCount: draft.content ? draft.content.length : 0,
        isDraft: false
      }
      
      // 保存到笔记存储
      const result = noteManager.saveNote(note)
      
      if (result.success) {
        // 从草稿中删除
        const drafts = wx.getStorageSync('drafts') || []
        const updatedDrafts = drafts.filter(d => d.id !== draft.id)
        wx.setStorageSync('drafts', updatedDrafts)
        
        wx.showToast({
          title: '发布成功',
          icon: 'success'
        })
        
        this.loadDrafts()
      } else {
        throw new Error(result.error || '保存失败')
      }
    } catch (error) {
      console.error('发布草稿失败:', error)
      wx.showToast({
        title: '发布失败',
        icon: 'none'
      })
    }
  },

  // 批量操作
  toggleBatchMode() {
    this.setData({
      isBatchMode: !this.data.isBatchMode,
      selectedDrafts: []
    })
  },

  // 全选/全不选
  toggleSelectAll() {
    if (this.data.selectedDrafts.length === this.data.drafts.length) {
      this.setData({ selectedDrafts: [] })
    } else {
      this.setData({ 
        selectedDrafts: this.data.drafts.map(draft => draft.id) 
      })
    }
  },

  // 批量删除
  batchDelete() {
    if (this.data.selectedDrafts.length === 0) {
      wx.showToast({
        title: '请选择要删除的草稿',
        icon: 'none'
      })
      return
    }
    
    wx.showModal({
      title: '批量删除',
      content: `确定要删除选中的 ${this.data.selectedDrafts.length} 个草稿吗？删除后无法恢复。`,
      showCancel: true,
      cancelText: '取消',
      confirmText: '删除',
      confirmColor: '#e53e3e',
      success: (res) => {
        if (res.confirm) {
          this.performBatchDelete()
        }
      }
    })
  },

  // 执行批量删除
  performBatchDelete() {
    try {
      const drafts = wx.getStorageSync('drafts') || []
      const updatedDrafts = drafts.filter(draft => 
        !this.data.selectedDrafts.includes(draft.id)
      )
      
      wx.setStorageSync('drafts', updatedDrafts)
      
      wx.showToast({
        title: `已删除 ${this.data.selectedDrafts.length} 个草稿`,
        icon: 'success'
      })
      
      this.setData({
        isBatchMode: false,
        selectedDrafts: []
      })
      
      this.loadDrafts()
    } catch (error) {
      console.error('批量删除失败:', error)
      wx.showToast({
        title: '删除失败',
        icon: 'none'
      })
    }
  },

  // 批量发布
  batchPublish() {
    if (this.data.selectedDrafts.length === 0) {
      wx.showToast({
        title: '请选择要发布的草稿',
        icon: 'none'
      })
      return
    }
    
    wx.showModal({
      title: '批量发布',
      content: `确定要将选中的 ${this.data.selectedDrafts.length} 个草稿发布为正式笔记吗？`,
      showCancel: true,
      cancelText: '取消',
      confirmText: '发布',
      success: (res) => {
        if (res.confirm) {
          this.performBatchPublish()
        }
      }
    })
  },

  // 执行批量发布
  performBatchPublish() {
    try {
      const selectedDrafts = this.data.drafts.filter(draft => 
        this.data.selectedDrafts.includes(draft.id)
      )
      
      let successCount = 0
      let failCount = 0
      
      selectedDrafts.forEach(draft => {
        try {
          const note = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            title: draft.title,
            content: draft.content,
            category: draft.category,
            tags: draft.tags || [],
            createTime: new Date().toISOString(),
            updateTime: new Date().toISOString(),
            wordCount: draft.content ? draft.content.length : 0,
            isDraft: false
          }
          
          const result = noteManager.saveNote(note)
          if (result.success) {
            successCount++
          } else {
            failCount++
          }
        } catch (error) {
          failCount++
        }
      })
      
      // 删除已发布的草稿
      const drafts = wx.getStorageSync('drafts') || []
      const updatedDrafts = drafts.filter(draft => 
        !this.data.selectedDrafts.includes(draft.id)
      )
      wx.setStorageSync('drafts', updatedDrafts)
      
      wx.showToast({
        title: `发布完成：成功 ${successCount} 个，失败 ${failCount} 个`,
        icon: successCount > 0 ? 'success' : 'none'
      })
      
      this.setData({
        isBatchMode: false,
        selectedDrafts: []
      })
      
      this.loadDrafts()
    } catch (error) {
      console.error('批量发布失败:', error)
      wx.showToast({
        title: '发布失败',
        icon: 'none'
      })
    }
  },

  // 清空草稿箱
  clearAllDrafts() {
    if (this.data.drafts.length === 0) {
      wx.showToast({
        title: '草稿箱已为空',
        icon: 'none'
      })
      return
    }
    
    wx.showModal({
      title: '清空草稿箱',
      content: `确定要清空所有 ${this.data.drafts.length} 个草稿吗？此操作无法撤销。`,
      showCancel: true,
      cancelText: '取消',
      confirmText: '清空',
      confirmColor: '#e53e3e',
      success: (res) => {
        if (res.confirm) {
          this.performClearAll()
        }
      }
    })
  },

  // 执行清空所有草稿
  performClearAll() {
    try {
      wx.setStorageSync('drafts', [])
      
      wx.showToast({
        title: '草稿箱已清空',
        icon: 'success'
      })
      
      this.loadDrafts()
    } catch (error) {
      console.error('清空草稿箱失败:', error)
      wx.showToast({
        title: '清空失败',
        icon: 'none'
      })
    }
  },

  // 创建新草稿
  createNewDraft() {
    wx.navigateTo({
      url: '/pages/note-editor/note-editor?mode=draft'
    })
  },

  // 返回上一页
  goBack() {
    wx.navigateBack()
  }
})
