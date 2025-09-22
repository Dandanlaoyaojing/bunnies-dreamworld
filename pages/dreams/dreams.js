// pages/dreams/dreams.js
Page({
  data: {
    noteTitle: '',
    noteContent: '',
    wordCount: 0,
    createTime: '',
    isSynced: false,
    currentMode: 'text',
    tags: ['梦境', '奇幻', '想象']
  },

  onLoad(options) {
    this.setData({
      createTime: this.formatTime(new Date())
    })
    this.updateWordCount()
  },

  onTitleInput(e) {
    this.setData({
      noteTitle: e.detail.value,
      isSynced: false
    })
  },

  onContentInput(e) {
    this.setData({
      noteContent: e.detail.value,
      isSynced: false
    })
    this.updateWordCount()
    this.generateTags()
  },

  updateWordCount() {
    const count = this.data.noteContent.length
    this.setData({ wordCount: count })
  },

  generateTags() {
    const content = this.data.noteContent
    const newTags = []
    
    const dreamKeywords = ['梦境', '奇幻', '想象', '梦幻', '星空', '夜晚', '睡眠', '潜意识', '梦想', '冒险']
    dreamKeywords.forEach(keyword => {
      if (content.includes(keyword) && !this.data.tags.includes(keyword)) {
        newTags.push(keyword)
      }
    })
    
    if (newTags.length > 0) {
      this.setData({
        tags: [...this.data.tags, ...newTags.slice(0, 2)]
      })
    }
  },

  switchMode(e) {
    const mode = e.currentTarget.dataset.mode
    this.setData({ currentMode: mode })
  },

  startVoiceInput() {
    wx.showToast({
      title: '语音功能开发中...',
      icon: 'none'
    })
  },

  chooseImage() {
    wx.chooseImage({
      count: 1,
      success: (res) => {
        wx.showToast({
          title: '图片识别功能开发中...',
          icon: 'none'
        })
      }
    })
  },

  saveNote() {
    if (!this.data.noteTitle.trim() && !this.data.noteContent.trim()) {
      wx.showToast({
        title: '请输入内容',
        icon: 'none'
      })
      return
    }

    wx.showLoading({ title: '保存中...' })
    
    setTimeout(() => {
      wx.hideLoading()
      this.setData({ isSynced: true })
      wx.showToast({
        title: '保存成功',
        icon: 'success'
      })
    }, 1000)
  },

  addTag() {
    wx.showModal({
      title: '添加标签',
      editable: true,
      placeholderText: '输入标签名称',
      success: (res) => {
        if (res.confirm && res.content.trim()) {
          const newTag = res.content.trim()
          if (!this.data.tags.includes(newTag)) {
            this.setData({
              tags: [...this.data.tags, newTag]
            })
          }
        }
      }
    })
  },

  removeTag(e) {
    const tag = e.currentTarget.dataset.tag
    const newTags = this.data.tags.filter(t => t !== tag)
    this.setData({ tags: newTags })
  },

  formatTime(date) {
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    const day = date.getDate()
    const hour = date.getHours()
    const minute = date.getMinutes()
    
    return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')} ${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
  }
})