// pages/favorites/favorites.js
const noteManager = require('../../utils/noteManager')

Page({
  data: {
    // 收藏笔记列表
    favoriteNotes: [],
    
    // 搜索和筛选
    searchKeyword: '',
    selectedCategory: '',
    sortIndex: 0,
    sortOptions: ['收藏时间', '创建时间', '标题', '字数'],
    
    // 视图模式
    viewMode: 'list', // list | grid
    
    // 批量操作
    isBatchMode: false,
    selectedNotes: [],
    
    // 统计信息
    totalCount: 0,
    totalWords: 0
  },

  onLoad(options) {
    console.log('我的收藏页面加载')
    this.loadFavorites()
  },

  onShow() {
    console.log('我的收藏页面显示')
    this.loadFavorites()
  },

  onPullDownRefresh() {
    this.loadFavorites()
    wx.stopPullDownRefresh()
  },

  // 加载收藏笔记
  loadFavorites() {
    try {
      console.log('开始加载收藏笔记')
      
      // 获取当前用户
      const userInfo = wx.getStorageSync('userInfo')
      if (!userInfo || !userInfo.username) {
        console.log('未登录，跳转到登录页')
        wx.showModal({
          title: '提示',
          content: '请先登录',
          showCancel: false,
          success: () => {
            wx.navigateTo({
              url: '/pages/login/login'
            })
          }
        })
        return
      }
      
      // 获取收藏笔记
      const result = noteManager.getFavoriteNotes(userInfo.username)
      
      if (result.success) {
        const notes = result.notes || []
        const totalWords = notes.reduce((sum, note) => sum + (note.wordCount || 0), 0)
        
        this.setData({
          favoriteNotes: notes,
          totalCount: notes.length,
          totalWords: totalWords
        })
        
        console.log('收藏笔记加载完成:', notes.length, '条')
        
        // 应用筛选和排序
        this.applyFilters()
      } else {
        console.error('加载收藏失败:', result.error)
      }
    } catch (error) {
      console.error('加载收藏异常:', error)
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    }
  },

  // 应用筛选和排序
  applyFilters() {
    let notes = [...this.data.favoriteNotes]
    
    // 关键词搜索
    if (this.data.searchKeyword.trim()) {
      const keyword = this.data.searchKeyword.toLowerCase()
      notes = notes.filter(note => {
        return note.title.toLowerCase().includes(keyword) ||
               note.content.toLowerCase().includes(keyword) ||
               (note.tags && note.tags.some(tag => tag.toLowerCase().includes(keyword)))
      })
    }
    
    // 分类筛选
    if (this.data.selectedCategory) {
      notes = notes.filter(note => note.category === this.data.selectedCategory)
    }
    
    // 排序
    this.sortNotes(notes)
    
    // 添加选中状态标记
    notes = notes.map(note => ({
      ...note,
      isSelected: this.data.selectedNotes.some(n => n.id === note.id)
    }))
    
    this.setData({
      favoriteNotes: notes
    })
  },

  // 排序笔记
  sortNotes(notes) {
    const sortBy = ['favoriteTime', 'createTime', 'title', 'wordCount'][this.data.sortIndex]
    
    notes.sort((a, b) => {
      if (sortBy === 'favoriteTime') {
        return new Date(b.favoriteTime || b.createTime) - new Date(a.favoriteTime || a.createTime)
      } else if (sortBy === 'createTime') {
        return new Date(b.createTime) - new Date(a.createTime)
      } else if (sortBy === 'title') {
        return a.title.localeCompare(b.title)
      } else if (sortBy === 'wordCount') {
        return (b.wordCount || 0) - (a.wordCount || 0)
      }
      return 0
    })
  },

  // 搜索输入
  onSearchInput(e) {
    this.setData({
      searchKeyword: e.detail.value
    })
    this.applyFilters()
  },

  // 分类筛选
  filterByCategory(e) {
    const category = e.currentTarget.dataset.category
    this.setData({
      selectedCategory: category === this.data.selectedCategory ? '' : category
    })
    this.applyFilters()
  },

  // 排序改变
  onSortChange(e) {
    this.setData({
      sortIndex: e.detail.value
    })
    this.applyFilters()
  },

  // 切换视图模式
  toggleViewMode() {
    this.setData({
      viewMode: this.data.viewMode === 'list' ? 'grid' : 'list'
    })
  },

  // 打开笔记详情
  openNote(e) {
    if (this.data.isBatchMode) {
      this.toggleNoteSelection(e)
      return
    }
    
    const noteId = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/note-detail/note-detail?id=${noteId}`
    })
  },

  // 取消收藏
  unfavoriteNote(e) {
    const noteId = e.currentTarget.dataset.id
    const note = this.data.favoriteNotes.find(n => n.id === noteId)
    
    if (!note) return
    
    wx.showModal({
      title: '取消收藏',
      content: `确定要取消收藏"${note.title}"吗？`,
      confirmColor: '#C0D3E2',
      success: (res) => {
        if (res.confirm) {
          this.confirmUnfavorite(noteId)
        }
      }
    })
  },

  // 确认取消收藏
  confirmUnfavorite(noteId) {
    try {
      const userInfo = wx.getStorageSync('userInfo')
      const result = noteManager.toggleFavorite(userInfo.username, noteId, false)
      
      if (result.success) {
        // 重新加载收藏列表
        this.loadFavorites()
        
        wx.showToast({
          title: '已取消收藏',
          icon: 'success'
        })
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('取消收藏失败:', error)
      wx.showToast({
        title: '操作失败',
        icon: 'none'
      })
    }
  },

  // 切换批量模式
  toggleBatchMode() {
    this.setData({
      isBatchMode: !this.data.isBatchMode,
      selectedNotes: []
    })
  },

  // 切换笔记选择
  toggleNoteSelection(e) {
    const noteId = e.currentTarget.dataset.id
    const note = this.data.favoriteNotes.find(n => n.id === noteId)
    
    if (!note) return
    
    const selectedNotes = [...this.data.selectedNotes]
    const index = selectedNotes.findIndex(n => n.id === noteId)
    
    if (index > -1) {
      selectedNotes.splice(index, 1)
    } else {
      selectedNotes.push(note)
    }
    
    this.setData({
      selectedNotes: selectedNotes
    })
    
    // 重新应用筛选以更新isSelected状态
    this.applyFilters()
  },

  // 批量取消收藏
  batchUnfavorite() {
    if (this.data.selectedNotes.length === 0) {
      wx.showToast({
        title: '请先选择笔记',
        icon: 'none'
      })
      return
    }
    
    wx.showModal({
      title: '批量取消收藏',
      content: `确定要取消收藏选中的 ${this.data.selectedNotes.length} 条笔记吗？`,
      confirmColor: '#C0D3E2',
      success: (res) => {
        if (res.confirm) {
          this.confirmBatchUnfavorite()
        }
      }
    })
  },

  // 确认批量取消收藏
  confirmBatchUnfavorite() {
    try {
      const userInfo = wx.getStorageSync('userInfo')
      let successCount = 0
      
      this.data.selectedNotes.forEach(note => {
        const result = noteManager.toggleFavorite(userInfo.username, note.id, false)
        if (result.success) {
          successCount++
        }
      })
      
      // 重新加载
      this.loadFavorites()
      
      // 退出批量模式
      this.setData({
        isBatchMode: false,
        selectedNotes: []
      })
      
      wx.showToast({
        title: `已取消 ${successCount} 条收藏`,
        icon: 'success'
      })
    } catch (error) {
      console.error('批量取消收藏失败:', error)
      wx.showToast({
        title: '操作失败',
        icon: 'none'
      })
    }
  },

  // 返回上一页
  goBack() {
    wx.navigateBack()
  },

  // 获取分类名称
  getCategoryName(category) {
    const categoryNames = {
      'art': '艺术',
      'cute': '萌物',
      'dreams': '梦游',
      'foods': '美食',
      'happiness': '趣事',
      'knowledge': '知识',
      'sights': '风景',
      'thinking': '思考'
    }
    return categoryNames[category] || '未知'
  }
})

