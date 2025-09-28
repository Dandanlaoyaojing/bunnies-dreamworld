// pages/notebook/notebook.js
const noteManager = require('../../utils/noteManager')

Page({
  data: {
    category: '',
    categoryTitle: '',
    notes: [],
    filteredNotes: [],
    searchKeyword: ''
  },

  onLoad(options) {
    const category = options.category || ''
    const title = options.title || '笔记'
    
    this.setData({
      category: category,
      categoryTitle: title
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
      // 使用统一的笔记管理服务
      const categoryNotes = noteManager.getNotesByCategory(this.data.category)
      
      this.setData({
        notes: categoryNotes,
        filteredNotes: categoryNotes
      })
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
    const note = this.data.notes.find(n => n.id === noteId)
    
    if (!note) return
    
    wx.showModal({
      title: '确认删除',
      content: `确定要删除"${note.title}"吗？`,
      success: (res) => {
        if (res.confirm) {
          this.confirmDeleteNote(noteId)
        }
      }
    })
  },

  // 确认删除笔记
  confirmDeleteNote(noteId) {
    try {
      // 使用统一的笔记管理服务
      const result = noteManager.deleteNote(noteId)
      
      if (result.success) {
        // 更新页面数据
        this.loadNotes()
        
        wx.showToast({
          title: '删除成功',
          icon: 'success'
        })
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('删除笔记失败:', error)
      wx.showToast({
        title: '删除失败',
        icon: 'none'
      })
    }
  },

  // 跳转到编辑器
  goToEditor() {
    wx.navigateTo({
      url: `/pages/note-editor/note-editor?category=${this.data.category}`
    })
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadNotes()
    wx.stopPullDownRefresh()
  }
})
