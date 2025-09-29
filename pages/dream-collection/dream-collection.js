// pages/dream-collection/dream-collection.js - 梦境收藏页面
Page({
  data: {
    collectedDreams: [],
    currentTab: 'all', // all, recent, favorites
    searchKeyword: '',
    sortBy: 'time', // time, type, length
    sortOrder: 'desc', // asc, desc
    selectedDream: null,
    showDreamDetail: false
  },

  onLoad() {
    this.loadCollectedDreams()
  },

  onShow() {
    this.loadCollectedDreams()
  },

  // 加载收藏的梦境
  loadCollectedDreams() {
    try {
      const dreamHistory = wx.getStorageSync('dreamHistory') || []
      const collectedDreams = dreamHistory.filter(dream => dream.isCollected)
      
      this.setData({ collectedDreams })
      this.applyFilters()
    } catch (error) {
      console.error('加载收藏梦境失败:', error)
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    }
  },

  // 应用筛选和排序
  applyFilters() {
    let filteredDreams = [...this.data.collectedDreams]
    
    // 搜索筛选
    if (this.data.searchKeyword.trim()) {
      const keyword = this.data.searchKeyword.toLowerCase()
      filteredDreams = filteredDreams.filter(dream => 
        dream.content.toLowerCase().includes(keyword) ||
        dream.params.dreamType.toLowerCase().includes(keyword)
      )
    }
    
    // 排序
    filteredDreams.sort((a, b) => {
      let aValue, bValue
      
      switch (this.data.sortBy) {
        case 'time':
          aValue = new Date(a.collectTime || a.createTime)
          bValue = new Date(b.collectTime || b.createTime)
          break
        case 'type':
          aValue = a.params.dreamType
          bValue = b.params.dreamType
          break
        case 'length':
          aValue = a.content.length
          bValue = b.content.length
          break
        default:
          aValue = new Date(a.collectTime || a.createTime)
          bValue = new Date(b.collectTime || b.createTime)
      }
      
      if (this.data.sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })
    
    this.setData({ filteredDreams })
  },

  // 切换标签页
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab
    this.setData({ currentTab: tab })
    this.applyFilters()
  },

  // 搜索输入
  onSearchInput(e) {
    this.setData({ searchKeyword: e.detail.value })
    // 防抖处理
    clearTimeout(this.searchTimer)
    this.searchTimer = setTimeout(() => {
      this.applyFilters()
    }, 300)
  },

  // 排序选择
  selectSort(e) {
    const { sort, order } = e.currentTarget.dataset
    this.setData({ 
      sortBy: sort,
      sortOrder: order
    })
    this.applyFilters()
  },

  // 查看梦境详情
  viewDreamDetail(e) {
    const dreamId = e.currentTarget.dataset.id
    const dream = this.data.collectedDreams.find(d => d.id === dreamId)
    
    if (dream) {
      this.setData({
        selectedDream: dream,
        showDreamDetail: true
      })
    }
  },

  // 关闭详情
  closeDreamDetail() {
    this.setData({
      selectedDream: null,
      showDreamDetail: false
    })
  },

  // 取消收藏
  uncollectDream(e) {
    const dreamId = e.currentTarget.dataset.id
    
    wx.showModal({
      title: '确认取消收藏',
      content: '确定要取消收藏这个梦境吗？',
      success: (res) => {
        if (res.confirm) {
          try {
            const dreamHistory = wx.getStorageSync('dreamHistory') || []
            const updatedHistory = dreamHistory.map(dream => {
              if (dream.id === dreamId) {
                return { ...dream, isCollected: false }
              }
              return dream
            })
            
            wx.setStorageSync('dreamHistory', updatedHistory)
            this.loadCollectedDreams()
            
            wx.showToast({
              title: '已取消收藏',
              icon: 'success'
            })
          } catch (error) {
            console.error('取消收藏失败:', error)
            wx.showToast({
              title: '操作失败',
              icon: 'none'
            })
          }
        }
      }
    })
  },

  // 分享梦境
  shareDream(e) {
    const dreamId = e.currentTarget.dataset.id
    const dream = this.data.collectedDreams.find(d => d.id === dreamId)
    
    if (dream) {
      wx.setClipboardData({
        data: dream.content,
        success: () => {
          wx.showToast({
            title: '梦境内容已复制',
            icon: 'success'
          })
        }
      })
    }
  },

  // 删除梦境
  deleteDream(e) {
    const dreamId = e.currentTarget.dataset.id
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个梦境吗？删除后无法恢复。',
      success: (res) => {
        if (res.confirm) {
          try {
            const dreamHistory = wx.getStorageSync('dreamHistory') || []
            const updatedHistory = dreamHistory.filter(dream => dream.id !== dreamId)
            
            wx.setStorageSync('dreamHistory', updatedHistory)
            this.loadCollectedDreams()
            
            wx.showToast({
              title: '已删除',
              icon: 'success'
            })
          } catch (error) {
            console.error('删除梦境失败:', error)
            wx.showToast({
              title: '删除失败',
              icon: 'none'
            })
          }
        }
      }
    })
  },

  // 获取梦境类型图标
  getDreamTypeIcon(type) {
    const iconMap = {
      fantasy: '🏰',
      poetic: '🌸',
      humorous: '😄',
      philosophical: '🤔',
      prophetic: '🔮'
    }
    return iconMap[type] || '✨'
  },

  // 获取梦境类型名称
  getDreamTypeName(type) {
    const nameMap = {
      fantasy: '奇幻故事',
      poetic: '诗意梦境',
      humorous: '幽默笑话',
      philosophical: '哲思对话',
      prophetic: '未来预言'
    }
    return nameMap[type] || '未知类型'
  },

  // 格式化时间
  formatTime(timeString) {
    const date = new Date(timeString)
    const now = new Date()
    const diff = now - date
    
    if (diff < 60000) { // 1分钟内
      return '刚刚'
    } else if (diff < 3600000) { // 1小时内
      return Math.floor(diff / 60000) + '分钟前'
    } else if (diff < 86400000) { // 1天内
      return Math.floor(diff / 3600000) + '小时前'
    } else if (diff < 604800000) { // 1周内
      return Math.floor(diff / 86400000) + '天前'
    } else {
      return date.toLocaleDateString()
    }
  },

  // 返回上一页
  goBack() {
    wx.navigateBack()
  }
})
