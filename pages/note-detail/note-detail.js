// pages/note-detail/note-detail.js
Page({
  data: {
    note: {},
    categoryName: ''
  },

  onLoad(options) {
    const noteId = options.id
    if (noteId) {
      this.loadNote(noteId)
    }
  },

  // 加载笔记详情
  loadNote(noteId) {
    try {
      const allNotes = wx.getStorageSync('notes') || []
      const note = allNotes.find(n => n.id === noteId)
      
      if (note) {
        this.setData({
          note: note,
          categoryName: this.getCategoryName(note.category)
        })
      } else {
        wx.showToast({
          title: '笔记不存在',
          icon: 'none'
        })
        setTimeout(() => {
          wx.navigateBack()
        }, 1500)
      }
    } catch (error) {
      console.error('加载笔记失败:', error)
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    }
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

  // 编辑笔记
  editNote() {
    const note = this.data.note
    const noteData = encodeURIComponent(JSON.stringify({
      id: note.id,
      title: note.title,
      content: note.content,
      category: note.category,
      tags: note.tags
    }))
    
    wx.navigateTo({
      url: `/pages/note-editor/note-editor?edit=true&note=${noteData}`
    })
  },

  // 分享笔记
  shareNote() {
    wx.showActionSheet({
      itemList: ['复制内容', '分享给朋友'],
      success: (res) => {
        if (res.tapIndex === 0) {
          // 复制内容
          wx.setClipboardData({
            data: `${this.data.note.title}\n\n${this.data.note.content}`,
            success: () => {
              wx.showToast({
                title: '已复制到剪贴板',
                icon: 'success'
              })
            }
          })
        } else if (res.tapIndex === 1) {
          // 分享给朋友
          wx.showToast({
            title: '分享功能开发中',
            icon: 'none'
          })
        }
      }
    })
  },

  // 删除笔记
  deleteNote() {
    wx.showModal({
      title: '确认删除',
      content: `确定要删除"${this.data.note.title}"吗？`,
      success: (res) => {
        if (res.confirm) {
          this.confirmDeleteNote()
        }
      }
    })
  },

  // 确认删除
  confirmDeleteNote() {
    try {
      const allNotes = wx.getStorageSync('notes') || []
      const updatedNotes = allNotes.filter(note => note.id !== this.data.note.id)
      wx.setStorageSync('notes', updatedNotes)
      
      wx.showToast({
        title: '删除成功',
        icon: 'success'
      })
      
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
    } catch (error) {
      console.error('删除笔记失败:', error)
      wx.showToast({
        title: '删除失败',
        icon: 'none'
      })
    }
  }
})
