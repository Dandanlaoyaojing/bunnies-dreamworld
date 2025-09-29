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
    console.log('准备编辑笔记:', note)
    
    if (!note || !note.id) {
      wx.showToast({
        title: '笔记数据无效',
        icon: 'none'
      })
      return
    }
    
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
    console.log('笔记ID:', note.id, '标题:', note.title)
    
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
  },

  // 返回上一页
  goBack() {
    wx.navigateBack()
  },

  // 预览图片
  previewImage(e) {
    const current = e.currentTarget.dataset.src
    const urls = this.data.note.images.map(img => img.path)
    
    wx.previewImage({
      current: current,
      urls: urls,
      success: () => {
        console.log('图片预览成功')
      },
      fail: (error) => {
        console.error('图片预览失败:', error)
        wx.showToast({
          title: '图片预览失败',
          icon: 'none'
        })
      }
    })
  },

  // 播放语音
  playVoice(e) {
    const voiceId = e.currentTarget.dataset.id
    const voice = this.data.note.voices.find(v => v.id == voiceId)
    
    if (!voice) {
      wx.showToast({
        title: '语音文件不存在',
        icon: 'none'
      })
      return
    }
    
    // 创建音频上下文
    const audioContext = wx.createInnerAudioContext()
    
    // 设置音频源
    audioContext.src = voice.path
    audioContext.volume = 1.0
    
    // 播放开始事件
    audioContext.onPlay(() => {
      console.log('语音开始播放')
      wx.showToast({
        title: '正在播放...',
        icon: 'none',
        duration: 1000
      })
    })
    
    // 播放结束事件
    audioContext.onEnded(() => {
      console.log('语音播放结束')
      wx.showToast({
        title: '播放完成',
        icon: 'none',
        duration: 1000
      })
      audioContext.destroy()
    })
    
    // 播放错误事件
    audioContext.onError((error) => {
      console.error('语音播放失败:', error)
      wx.showToast({
        title: '播放失败',
        icon: 'none'
      })
      audioContext.destroy()
    })
    
    // 开始播放
    try {
      audioContext.play()
    } catch (error) {
      console.error('播放启动失败:', error)
      wx.showToast({
        title: '播放失败',
        icon: 'none'
      })
    }
  }
})
