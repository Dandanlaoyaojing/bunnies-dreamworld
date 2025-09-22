// pages/cute/cute.js
const aiService = require('../../utils/aiService')

Page({
  data: {
    noteTitle: '',
    noteContent: '',
    wordCount: 0,
    createTime: '',
    isSynced: false,
    currentMode: 'text',
    tags: ['萌物', '可爱', '宠物']
  },

  onLoad(options) {
    this.setData({
      createTime: this.formatTime(new Date())
    })
    this.updateWordCount()
  },

  // 标题输入
  onTitleInput(e) {
    this.setData({
      noteTitle: e.detail.value,
      isSynced: false
    })
  },

  // 内容输入
  onContentInput(e) {
    this.setData({
      noteContent: e.detail.value,
      isSynced: false
    })
    this.updateWordCount()
    this.generateTags()
  },

  // 更新字数统计
  updateWordCount() {
    const count = this.data.noteContent.length
    this.setData({ wordCount: count })
  },

  // 生成智能标签
  async generateTags() {
    const content = this.data.noteContent
    if (!content.trim()) return

    wx.showLoading({ title: 'AI分析中...' })
    
    try {
      const result = await aiService.generateTags(content, '萌物')
      if (result.success) {
        const existingTags = this.data.tags
        const newTags = result.tags.filter(tag => !existingTags.includes(tag))
        
        if (newTags.length > 0) {
          this.setData({
            tags: [...existingTags, ...newTags.slice(0, 3)]
          })
        }
      }
    } catch (error) {
      wx.showToast({
        title: '标签生成失败',
        icon: 'none'
      })
    } finally {
      wx.hideLoading()
    }
  },

  // 切换输入模式
  switchMode(e) {
    const mode = e.currentTarget.dataset.mode
    this.setData({ currentMode: mode })
  },

  // 语音输入
  startVoiceInput() {
    wx.showToast({
      title: '语音功能开发中...',
      icon: 'none'
    })
  },

  // 选择图片
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

  // 保存笔记
  saveNote() {
    if (!this.data.noteTitle.trim() && !this.data.noteContent.trim()) {
      wx.showToast({
        title: '请输入内容',
        icon: 'none'
      })
      return
    }

    wx.showLoading({ title: '保存中...' })
    
    // 模拟保存过程
    setTimeout(() => {
      wx.hideLoading()
      this.setData({ isSynced: true })
      wx.showToast({
        title: '保存成功',
        icon: 'success'
      })
    }, 1000)
  },

  // 添加标签
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

  // 删除标签
  removeTag(e) {
    const tag = e.currentTarget.dataset.tag
    const newTags = this.data.tags.filter(t => t !== tag)
    this.setData({ tags: newTags })
  },

  // 格式化时间
  formatTime(date) {
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    const day = date.getDate()
    const hour = date.getHours()
    const minute = date.getMinutes()
    
    return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')} ${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
  }
})