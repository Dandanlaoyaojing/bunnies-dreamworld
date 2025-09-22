// pages/art/art.js
const aiService = require('../../utils/aiService')

Page({
  data: {
    noteTitle: '',
    noteContent: '',
    wordCount: 0,
    createTime: '',
    isSynced: false,
    currentMode: 'text',
    tags: ['艺术', '创作', '灵感']
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
      const result = await aiService.generateTags(content, '艺术')
      if (result.success) {
        // 合并新标签，去重
        const existingTags = this.data.tags
        const newTags = result.tags.filter(tag => !existingTags.includes(tag))
        
        if (newTags.length > 0) {
          this.setData({
            tags: [...existingTags, ...newTags.slice(0, 3)]
          })
        }
      } else {
        wx.showToast({
          title: result.error || '标签生成失败',
          icon: 'none'
        })
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
    const recorderManager = wx.getRecorderManager()
    
    wx.showModal({
      title: '语音输入',
      content: '点击确定开始录音，再次点击停止录音',
      success: (res) => {
        if (res.confirm) {
          this.startRecording()
        }
      }
    })
  },

  // 开始录音
  startRecording() {
    const recorderManager = wx.getRecorderManager()
    
    recorderManager.onStart(() => {
      wx.showToast({
        title: '开始录音...',
        icon: 'none'
      })
    })

    recorderManager.onStop((res) => {
      wx.showLoading({ title: 'AI识别中...' })
      this.processVoiceInput(res.tempFilePath)
    })

    recorderManager.onError((error) => {
      wx.showToast({
        title: '录音失败',
        icon: 'none'
      })
    })

    // 开始录音
    recorderManager.start({
      duration: 60000, // 最长60秒
      sampleRate: 16000,
      numberOfChannels: 1,
      encodeBitRate: 96000,
      format: 'mp3'
    })

    // 3秒后自动停止
    setTimeout(() => {
      recorderManager.stop()
    }, 3000)
  },

  // 处理语音输入
  async processVoiceInput(audioPath) {
    try {
      const result = await aiService.speechToText(audioPath)
      if (result.success) {
        const currentContent = this.data.noteContent
        const newContent = currentContent + (currentContent ? '\n' : '') + result.text
        this.setData({
          noteContent: newContent,
          isSynced: false
        })
        this.updateWordCount()
        this.generateTags()
        
        wx.showToast({
          title: '语音识别完成',
          icon: 'success'
        })
      } else {
        wx.showToast({
          title: result.error || '语音识别失败',
          icon: 'none'
        })
      }
    } catch (error) {
      wx.showToast({
        title: '语音识别失败',
        icon: 'none'
      })
    } finally {
      wx.hideLoading()
    }
  },

  // 选择图片
  chooseImage() {
    wx.chooseImage({
      count: 1,
      success: (res) => {
        wx.showLoading({ title: 'AI识别中...' })
        this.processImageInput(res.tempFilePaths[0])
      },
      fail: (error) => {
        wx.showToast({
          title: '选择图片失败',
          icon: 'none'
        })
      }
    })
  },

  // 处理图片输入
  async processImageInput(imagePath) {
    try {
      // 先转换为base64
      const base64 = await this.imageToBase64(imagePath)
      
      // 调用AI进行图片识别
      const result = await aiService.imageToText(imagePath)
      
      if (result.success) {
        const currentContent = this.data.noteContent
        const newContent = currentContent + (currentContent ? '\n' : '') + result.text
        this.setData({
          noteContent: newContent,
          isSynced: false
        })
        this.updateWordCount()
        this.generateTags()
        
        wx.showToast({
          title: '图片识别完成',
          icon: 'success'
        })
      } else {
        wx.showToast({
          title: result.error || '图片识别失败',
          icon: 'none'
        })
      }
    } catch (error) {
      wx.showToast({
        title: '图片识别失败',
        icon: 'none'
      })
    } finally {
      wx.hideLoading()
    }
  },

  // 图片转base64
  imageToBase64(imagePath) {
    return new Promise((resolve, reject) => {
      wx.getFileSystemManager().readFile({
        filePath: imagePath,
        encoding: 'base64',
        success: (res) => {
          resolve(res.data)
        },
        fail: reject
      })
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

  // AI写作助手
  showAIHelper() {
    const content = this.data.noteContent
    if (!content.trim()) {
      wx.showToast({
        title: '请先输入内容',
        icon: 'none'
      })
      return
    }

    wx.showActionSheet({
      itemList: ['优化表达', '生成摘要', '扩展内容', '检查语法', '情感分析'],
      success: (res) => {
        const actions = ['优化表达', '生成摘要', '扩展内容', '检查语法', '情感分析']
        const selectedAction = actions[res.tapIndex]
        this.performAIAction(selectedAction, content)
      }
    })
  },

  // 执行AI操作
  async performAIAction(action, content) {
    wx.showLoading({ title: 'AI处理中...' })
    
    try {
      let result
      switch (action) {
        case '优化表达':
          result = await aiService.writingAssistant(content, '请帮我优化这段文字的表达，让它更加生动有趣')
          break
        case '生成摘要':
          result = await aiService.generateSummary(content)
          break
        case '扩展内容':
          result = await aiService.writingAssistant(content, '请帮我扩展这段内容，添加更多细节和描述')
          break
        case '检查语法':
          result = await aiService.writingAssistant(content, '请检查这段文字的语法和表达，提出改进建议')
          break
        case '情感分析':
          result = await aiService.analyzeContent(content)
          break
        default:
          throw new Error('未知的AI操作')
      }

      if (result.success) {
        if (action === '情感分析') {
          this.showAnalysisResult(result.analysis)
        } else if (action === '生成摘要') {
          this.showSummaryResult(result.summary)
        } else {
          this.showAIAssistantResult(result.result)
        }
      } else {
        wx.showToast({
          title: result.error || 'AI处理失败',
          icon: 'none'
        })
      }
    } catch (error) {
      wx.showToast({
        title: 'AI处理失败',
        icon: 'none'
      })
    } finally {
      wx.hideLoading()
    }
  },

  // 显示AI助手结果
  showAIAssistantResult(result) {
    wx.showModal({
      title: 'AI助手建议',
      content: result,
      showCancel: true,
      cancelText: '取消',
      confirmText: '应用',
      success: (res) => {
        if (res.confirm) {
          this.setData({
            noteContent: result,
            isSynced: false
          })
          this.updateWordCount()
          this.generateTags()
        }
      }
    })
  },

  // 显示摘要结果
  showSummaryResult(summary) {
    wx.showModal({
      title: '内容摘要',
      content: summary,
      showCancel: false,
      confirmText: '确定'
    })
  },

  // 显示情感分析结果
  showAnalysisResult(analysis) {
    const content = `内容类型: ${analysis.type}\n情感色彩: ${analysis.emotion}\n关键词: ${analysis.keywords.join(', ')}\n建议: ${analysis.suggestion}`
    
    wx.showModal({
      title: '情感分析',
      content: content,
      showCancel: false,
      confirmText: '确定'
    })
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
