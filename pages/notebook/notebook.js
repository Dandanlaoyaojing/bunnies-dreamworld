// pages/notebook/notebook.js
const noteManager = require('../../utils/noteManager')
const apiService = require('../../utils/apiService')

Page({
  data: {
    category: '',
    categoryTitle: '',
    notes: [],
    filteredNotes: [],
    searchKeyword: ''
  },

  onLoad(options) {
    console.log('=== 笔记簿页面加载 ===')
    console.log('参数:', options)
    console.log('分类:', options.category || '')
    console.log('标题:', options.title || '笔记')
    
    const category = options.category || ''
    const title = options.title || '笔记'
    
    this.setData({
      category: category,
      categoryTitle: title
    })
    
    // 立即显示页面加载提示
    wx.showToast({
      title: '笔记簿页面已加载',
      icon: 'none',
      duration: 1000
    })
    
    // 加载该分类的笔记
    this.loadNotes()
  },

  onShow() {
    // 每次显示页面时重新加载笔记（可能从编辑器返回）
    this.loadNotes()
  },

  // 加载笔记
  loadNotes() {
    try {
      console.log('=== 加载笔记 ===')
      console.log('分类:', this.data.category)
      
      // 使用统一的笔记管理服务
      const categoryNotes = noteManager.getNotesByCategory(this.data.category)
      console.log('获取到的笔记数量:', categoryNotes.length)
      console.log('笔记列表:', categoryNotes)
      
      this.setData({
        notes: categoryNotes,
        filteredNotes: categoryNotes
      })
      
      console.log('笔记加载完成')
      
      // 如果没有笔记，显示提示
      if (categoryNotes.length === 0) {
        wx.showToast({
          title: '当前分类没有笔记',
          icon: 'none',
          duration: 2000
        })
      }
    } catch (error) {
      console.error('加载笔记失败:', error)
      this.setData({
        notes: [],
        filteredNotes: []
      })
    }
  },

  // 搜索输入
  onSearchInput(e) {
    const keyword = e.detail.value
    this.setData({
      searchKeyword: keyword
    })
    
    // 实时搜索
    this.filterNotes(keyword)
  },

  // 筛选笔记
  filterNotes(keyword) {
    if (!keyword.trim()) {
      this.setData({
        filteredNotes: this.data.notes
      })
      return
    }
    
    const filtered = this.data.notes.filter(note => {
      return note.title.toLowerCase().includes(keyword.toLowerCase()) ||
             note.content.toLowerCase().includes(keyword.toLowerCase()) ||
             note.tags.some(tag => tag.toLowerCase().includes(keyword.toLowerCase()))
    })
    
    this.setData({
      filteredNotes: filtered
    })
  },

  // 打开笔记详情
  openNote(e) {
    const note = e.currentTarget.dataset.note
    wx.navigateTo({
      url: `/pages/note-detail/note-detail?id=${note.id}`
    })
  },

  // 编辑笔记
  editNote(e) {
    const note = e.currentTarget.dataset.note
    console.log('准备编辑笔记:', note)
    
    // 将完整的笔记数据传递给编辑器
    const noteData = encodeURIComponent(JSON.stringify({
      id: note.id,
      title: note.title,
      content: note.content,
      url: note.url || '',
      category: note.category,
      tags: note.tags || [],
      images: note.images || [],
      voices: note.voices || [],
      categoryTag: note.categoryTag || '',
      source: note.source || '',
      createTime: note.createTime,
      updateTime: note.updateTime,
      wordCount: note.wordCount || 0
    }))
    
    console.log('传递的笔记数据:', noteData)
    
    // 由于note-editor是tabBar页面，需要先保存编辑数据到本地存储
    // 然后使用switchTab跳转
    try {
      // 保存编辑数据到本地存储
      wx.setStorageSync('editNoteData', noteData)
      console.log('编辑数据已保存到本地存储')
      
      // 使用switchTab跳转到tabBar页面
      wx.switchTab({
        url: '/pages/note-editor/note-editor',
        success: () => {
          console.log('成功跳转到编辑页面')
        },
        fail: (error) => {
          console.error('跳转到编辑页面失败:', error)
          wx.showToast({
            title: '跳转失败',
            icon: 'none'
          })
        }
      })
    } catch (error) {
      console.error('保存编辑数据失败:', error)
      wx.showToast({
        title: '数据保存失败',
        icon: 'none'
      })
    }
  },

  // 删除笔记
  deleteNote(e) {
    const noteId = e.currentTarget.dataset.id
    console.log('=== 删除按钮被点击 ===')
    console.log('笔记ID:', noteId)
    
    if (!noteId) {
      wx.showToast({
        title: '笔记ID无效',
        icon: 'none'
      })
      return
    }
    
    // 获取要删除的笔记
    const note = this.data.notes.find(n => n.id === noteId)
    if (!note) {
      wx.showToast({
        title: '笔记不存在',
        icon: 'none'
      })
      return
    }
    
    // 显示删除确认对话框
    wx.showModal({
      title: '删除笔记',
      content: `确定要删除"${note.title}"吗？\n\n笔记将移到回收站，30天后将自动清理。`,
      confirmColor: '#C0D3E2',
      confirmText: '移到回收站',
      success: (res) => {
        if (res.confirm) {
          this.confirmDeleteNote(noteId)
        }
      }
    })
  },

  // 确认删除笔记（硬删除版本）
  async confirmDeleteNote(noteId) {
    try {
      // 获取当前登录用户
      const userInfo = wx.getStorageSync('userInfo')
      if (!userInfo || !userInfo.username) {
        wx.showToast({
          title: '请先登录',
          icon: 'none'
        })
        return
      }
      
      // 获取要删除的笔记
      const note = this.data.notes.find(n => n.id === noteId)
      if (!note) {
        wx.showToast({
          title: '笔记不存在',
          icon: 'none'
        })
        return
      }
      
      console.log('=== 开始硬删除笔记 ===')
      console.log('笔记ID:', noteId)
      console.log('笔记标题:', note.title)
      console.log('ServerID:', note.serverId)
      
      // ========== 步骤1：先将笔记保存到回收站 ==========
      console.log('📦 先将笔记保存到本地回收站...')
      const saveToTrashResult = noteManager.softDeleteNote(userInfo.username, noteId)
      
      if (!saveToTrashResult.success) {
        console.error('❌ 保存到回收站失败:', saveToTrashResult.error)
        wx.showToast({
          title: '保存到回收站失败',
          icon: 'none'
        })
        return
      }
      console.log('✅ 笔记已保存到本地回收站')
      
      // ========== 步骤2：调用后端API进行硬删除 ==========
      if (userInfo.token && note.serverId) {
        console.log('📤 调用后端API硬删除笔记:', note.serverId)
        const response = await apiService.deleteNote(note.serverId)
        console.log('后端硬删除结果:', response)
        
        if (response.success) {
          console.log('✅ 后端硬删除成功')
        } else {
          console.warn('⚠️ 后端硬删除失败，但已保存到本地回收站:', response.error)
        }
      } else {
        console.log('⚠️ 无Token或无serverId，仅保存到本地回收站')
      }
      
      // ========== 步骤3：从笔记列表中移除 ==========
      console.log('立即更新本地显示...')
      this.removeNoteFromLocalDisplay(noteId)
      
      wx.showToast({
        title: '笔记已移至回收站，30天后将自动清理',
        icon: 'success',
        duration: 3000
      })
    } catch (error) {
      console.error('删除笔记失败:', error)
      wx.showToast({
        title: '删除失败',
        icon: 'error'
      })
    }
  },

  // 从本地显示中移除笔记
  removeNoteFromLocalDisplay(noteId) {
    const updatedNotes = this.data.notes.filter(note => note.id !== noteId)
    this.setData({
      notes: updatedNotes,
      filteredNotes: this.filterNotes(updatedNotes)
    })
    console.log('✅ 本地显示已更新')
  },

  // 跳转到编辑器
  goToEditor() {
    wx.navigateTo({
      url: `/pages/note-editor/note-editor?category=${this.data.category}`
    })
  },

  // 返回上一页
  goBack() {
    wx.navigateBack()
  },

  // 阻止事件冒泡
  stopEvent() {
    // 空方法，用于阻止事件冒泡
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadNotes()
    wx.stopPullDownRefresh()
  }
})
