// pages/trash/trash.js
const noteManager = require('../../utils/noteManager')

Page({
  data: {
    // 回收站笔记列表
    trashedNotes: [],
    
    // 搜索和筛选
    searchKeyword: '',
    selectedCategory: '',
    sortIndex: 0,
    sortOptions: ['删除时间', '创建时间', '标题', '字数'],
    
    // 视图模式
    viewMode: 'list', // list | grid
    
    // 批量操作
    isBatchMode: false,
    selectedNotes: [],
    
    // 统计信息
    totalCount: 0,
    totalWords: 0,
    
    // 自动清理天数
    autoDeleteDays: 30
  },

  onLoad(options) {
    console.log('回收站页面加载')
    this.loadTrashedNotes()
  },

  onShow() {
    console.log('回收站页面显示')
    this.loadTrashedNotes()
  },

  onPullDownRefresh() {
    this.loadTrashedNotes()
    wx.stopPullDownRefresh()
  },

  // 加载回收站笔记
  loadTrashedNotes() {
    try {
      console.log('开始加载回收站笔记')
      
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
      
      // 获取回收站笔记
      const result = noteManager.getTrashedNotes(userInfo.username)
      
      if (result.success) {
        const notes = result.notes || []
        const totalWords = notes.reduce((sum, note) => sum + (note.wordCount || 0), 0)
        
        this.setData({
          trashedNotes: notes,
          totalCount: notes.length,
          totalWords: totalWords
        })
        
        console.log('回收站笔记加载完成:', notes.length, '条')
        
        // 应用筛选和排序
        this.applyFilters()
      } else {
        console.error('加载回收站失败:', result.error)
      }
    } catch (error) {
      console.error('加载回收站异常:', error)
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    }
  },

  // 应用筛选和排序
  applyFilters() {
    let notes = [...this.data.trashedNotes]
    
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
      trashedNotes: notes
    })
  },

  // 排序笔记
  sortNotes(notes) {
    const sortBy = ['deleteTime', 'createTime', 'title', 'wordCount'][this.data.sortIndex]
    
    notes.sort((a, b) => {
      if (sortBy === 'deleteTime') {
        return new Date(b.deleteTime || b.createTime) - new Date(a.deleteTime || a.createTime)
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
    
    wx.showModal({
      title: '查看已删除笔记',
      content: '这是一条已删除的笔记，是否要恢复后查看？',
      confirmText: '恢复',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          this.restoreNote({ currentTarget: { dataset: { id: noteId } } })
        }
      }
    })
  },

  // 恢复笔记
  restoreNote(e) {
    const noteId = e.currentTarget.dataset.id
    const note = this.data.trashedNotes.find(n => n.id === noteId)
    
    if (!note) return
    
    wx.showModal({
      title: '恢复笔记',
      content: `确定要恢复"${note.title}"吗？`,
      confirmColor: '#C0D3E2',
      success: (res) => {
        if (res.confirm) {
          this.confirmRestore(noteId)
        }
      }
    })
  },

  // 确认恢复
  confirmRestore(noteId) {
    try {
      const userInfo = wx.getStorageSync('userInfo')
      const result = noteManager.restoreNote(userInfo.username, noteId)
      
      if (result.success) {
        // 重新加载回收站
        this.loadTrashedNotes()
        
        wx.showToast({
          title: '恢复成功',
          icon: 'success'
        })
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('恢复失败:', error)
      wx.showToast({
        title: '恢复失败',
        icon: 'none'
      })
    }
  },

  // 彻底删除
  permanentDelete(e) {
    const noteId = e.currentTarget.dataset.id
    const note = this.data.trashedNotes.find(n => n.id === noteId)
    
    if (!note) return
    
    wx.showModal({
      title: '彻底删除',
      content: `确定要彻底删除"${note.title}"吗？此操作不可恢复！`,
      confirmColor: '#e53e3e',
      confirmText: '彻底删除',
      success: (res) => {
        if (res.confirm) {
          this.confirmPermanentDelete(noteId)
        }
      }
    })
  },

  // 确认彻底删除
  confirmPermanentDelete(noteId) {
    try {
      const userInfo = wx.getStorageSync('userInfo')
      const result = noteManager.permanentDeleteNote(userInfo.username, noteId)
      
      if (result.success) {
        // 重新加载回收站
        this.loadTrashedNotes()
        
        wx.showToast({
          title: '已彻底删除',
          icon: 'success'
        })
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('彻底删除失败:', error)
      wx.showToast({
        title: '删除失败',
        icon: 'none'
      })
    }
  },

  // 清空回收站
  emptyTrash() {
    if (this.data.trashedNotes.length === 0) {
      wx.showToast({
        title: '回收站已经是空的',
        icon: 'none'
      })
      return
    }
    
    wx.showModal({
      title: '清空回收站',
      content: `确定要清空回收站的所有 ${this.data.trashedNotes.length} 条笔记吗？此操作不可恢复！`,
      confirmColor: '#e53e3e',
      confirmText: '清空',
      success: (res) => {
        if (res.confirm) {
          this.confirmEmptyTrash()
        }
      }
    })
  },

  // 确认清空回收站
  confirmEmptyTrash() {
    try {
      const userInfo = wx.getStorageSync('userInfo')
      const result = noteManager.emptyTrash(userInfo.username)
      
      if (result.success) {
        this.loadTrashedNotes()
        
        wx.showToast({
          title: '回收站已清空',
          icon: 'success'
        })
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('清空回收站失败:', error)
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
    const note = this.data.trashedNotes.find(n => n.id === noteId)
    
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

  // 批量恢复
  batchRestore() {
    if (this.data.selectedNotes.length === 0) {
      wx.showToast({
        title: '请先选择笔记',
        icon: 'none'
      })
      return
    }
    
    wx.showModal({
      title: '批量恢复',
      content: `确定要恢复选中的 ${this.data.selectedNotes.length} 条笔记吗？`,
      confirmColor: '#C0D3E2',
      success: (res) => {
        if (res.confirm) {
          this.confirmBatchRestore()
        }
      }
    })
  },

  // 确认批量恢复
  confirmBatchRestore() {
    try {
      const userInfo = wx.getStorageSync('userInfo')
      let successCount = 0
      
      this.data.selectedNotes.forEach(note => {
        const result = noteManager.restoreNote(userInfo.username, note.id)
        if (result.success) {
          successCount++
        }
      })
      
      // 重新加载
      this.loadTrashedNotes()
      
      // 退出批量模式
      this.setData({
        isBatchMode: false,
        selectedNotes: []
      })
      
      wx.showToast({
        title: `已恢复 ${successCount} 条笔记`,
        icon: 'success'
      })
    } catch (error) {
      console.error('批量恢复失败:', error)
      wx.showToast({
        title: '操作失败',
        icon: 'none'
      })
    }
  },

  // 批量彻底删除
  batchPermanentDelete() {
    if (this.data.selectedNotes.length === 0) {
      wx.showToast({
        title: '请先选择笔记',
        icon: 'none'
      })
      return
    }
    
    wx.showModal({
      title: '批量彻底删除',
      content: `确定要彻底删除选中的 ${this.data.selectedNotes.length} 条笔记吗？此操作不可恢复！`,
      confirmColor: '#e53e3e',
      confirmText: '彻底删除',
      success: (res) => {
        if (res.confirm) {
          this.confirmBatchPermanentDelete()
        }
      }
    })
  },

  // 确认批量彻底删除
  confirmBatchPermanentDelete() {
    try {
      const userInfo = wx.getStorageSync('userInfo')
      let successCount = 0
      
      this.data.selectedNotes.forEach(note => {
        const result = noteManager.permanentDeleteNote(userInfo.username, note.id)
        if (result.success) {
          successCount++
        }
      })
      
      // 重新加载
      this.loadTrashedNotes()
      
      // 退出批量模式
      this.setData({
        isBatchMode: false,
        selectedNotes: []
      })
      
      wx.showToast({
        title: `已删除 ${successCount} 条笔记`,
        icon: 'success'
      })
    } catch (error) {
      console.error('批量删除失败:', error)
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
  },

  // 获取删除天数
  getDaysInTrash(deleteTime) {
    if (!deleteTime) return 0
    
    const now = new Date()
    const deleted = new Date(deleteTime)
    const diffTime = Math.abs(now - deleted)
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    return diffDays
  },

  // 获取剩余天数
  getRemainingDays(deleteTime) {
    const daysInTrash = this.getDaysInTrash(deleteTime)
    const remaining = this.data.autoDeleteDays - daysInTrash
    return remaining > 0 ? remaining : 0
  }
})

