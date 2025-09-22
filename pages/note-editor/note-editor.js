// pages/note-editor/note-editor.js
const aiService = require('../../utils/aiService')
const noteManager = require('../../utils/noteManager')

Page({
  data: {
    noteTitle: '',
    noteContent: '',
    selectedCategory: '',
    wordCount: 0,
    createTime: '',
    isSynced: false,
    tags: []
  },

  onLoad(options) {
    this.setData({
      createTime: this.formatTime(new Date())
    })
    
    // 检查是否是编辑模式
    if (options.edit === 'true' && options.note) {
      this.loadNoteForEdit(options.note)
    } else if (options.category) {
      // 预设分类
      this.setData({
        selectedCategory: options.category
      })
      this.generateDefaultTags(options.category)
    }
    
    this.updateWordCount()
    
    // 检查API状态
    this.checkAPIStatus()
  },

  // 加载要编辑的笔记
  loadNoteForEdit(noteData) {
    try {
      const note = JSON.parse(decodeURIComponent(noteData))
      this.setData({
        noteTitle: note.title || '',
        noteContent: note.content || '',
        selectedCategory: note.category || '',
        tags: note.tags || [],
        isEditMode: true,
        editingNoteId: note.id
      })
    } catch (error) {
      console.error('解析笔记数据失败:', error)
      wx.showToast({
        title: '加载笔记失败',
        icon: 'none'
      })
    }
  },

  // 检查API状态
  async checkAPIStatus() {
    try {
      console.log('开始检查API状态...')
      const result = await aiService.checkAPIStatus()
      console.log('API状态检查结果:', result)
      
      if (!result.success) {
        console.warn('API状态检查失败:', result.error)
        if (result.code === 402) {
          wx.showModal({
            title: 'API配额不足',
            content: '当前AI服务配额不足，部分功能可能无法正常使用。您可以继续使用本地功能。',
            showCancel: false,
            confirmText: '确定'
          })
        } else if (result.code === 401) {
          wx.showModal({
            title: 'API配置错误',
            content: 'API密钥配置有误，请联系管理员',
            showCancel: false,
            confirmText: '确定'
          })
        } else {
          console.log('API连接异常，将使用本地功能')
        }
      } else {
        console.log('API状态正常')
      }
    } catch (error) {
      console.warn('API状态检查异常:', error)
    }
  },

  // 选择分类
  selectCategory(e) {
    const category = e.currentTarget.dataset.category
    this.setData({
      selectedCategory: category,
      isSynced: false
    })
    
    // 生成对应分类的默认标签
    this.generateDefaultTags(category)
  },

  // 生成默认标签
  generateDefaultTags(category) {
    const categoryTags = {
      'art': ['艺术', '创作', '美学'],
      'cute': ['萌物', '可爱', '治愈'],
      'dreams': ['梦境', '奇幻', '想象'],
      'foods': ['美食', '料理', '味道'],
      'happiness': ['趣事', '快乐', '幽默'],
      'knowledge': ['知识', '学习', '智慧'],
      'sights': ['风景', '旅行', '自然'],
      'thinking': ['思考', '哲学', '感悟']
    }
    
    this.setData({
      tags: categoryTags[category] || []
    })
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

    // 防止重复调用
    if (this.isGeneratingTags) return
    this.isGeneratingTags = true

    wx.showLoading({ title: 'AI分析中...' })
    
    try {
      const result = await aiService.generateTags(content, this.data.selectedCategory)
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
        console.warn('AI标签生成失败:', result.error)
        // 使用本地关键词作为备选方案
        this.generateLocalTags(content)
      }
    } catch (error) {
      console.error('AI标签生成异常:', error)
      // 使用本地关键词作为备选方案
      this.generateLocalTags(content)
    } finally {
      wx.hideLoading()
      this.isGeneratingTags = false
    }
  },

  // 本地标签生成（备选方案）
  generateLocalTags(content) {
    const allKeywords = ['艺术', '创作', '灵感', '萌物', '可爱', '治愈', '梦境', '奇幻', '想象', '美食', '料理', '味道', '趣事', '快乐', '幽默', '知识', '学习', '智慧', '风景', '旅行', '自然', '思考', '哲学', '感悟']
    const newTags = []
    
    allKeywords.forEach(keyword => {
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

  // 切换输入模式功能已移除

  // 语音输入
  startVoiceInput() {
    // 防止重复调用
    if (this.isProcessingVoice) return
    this.isProcessingVoice = true

    wx.showModal({
      title: '语音输入',
      content: '点击确定开始语音识别',
      success: (res) => {
        if (res.confirm) {
          this.startVoiceRecognition()
        } else {
          this.isProcessingVoice = false
        }
      },
      fail: () => {
        this.isProcessingVoice = false
      }
    })
  },

  // 开始语音识别
  async startVoiceRecognition() {
    try {
      wx.showLoading({ title: '语音识别中...' })
      
      const result = await aiService.speechToText()
      
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
      console.error('语音识别异常:', error)
      wx.showToast({
        title: '语音识别失败，请重试',
        icon: 'none'
      })
    } finally {
      wx.hideLoading()
      this.isProcessingVoice = false
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
      console.error('图片识别异常:', error)
      wx.showToast({
        title: '图片识别失败，请重试',
        icon: 'none'
      })
    } finally {
      // 确保loading被隐藏
      wx.hideLoading()
    }
  },

  // AI功能已移除，只保留自动生成智能标签功能

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

  // 保存笔记
  saveNote() {
    if (!this.data.selectedCategory) {
      wx.showToast({
        title: '请选择分类',
        icon: 'none'
      })
      return
    }

    if (!this.data.noteTitle.trim() && !this.data.noteContent.trim()) {
      wx.showToast({
        title: '请输入内容',
        icon: 'none'
      })
      return
    }

    wx.showLoading({ title: '保存中...' })
    
    // 创建笔记对象
    const note = {
      id: this.data.isEditMode ? this.data.editingNoteId : Date.now().toString(),
      title: this.data.noteTitle || '无标题笔记',
      content: this.data.noteContent,
      category: this.data.selectedCategory,
      tags: this.data.tags,
      createTime: this.data.isEditMode ? this.data.createTime : this.formatTime(new Date()),
      updateTime: this.formatTime(new Date()),
      wordCount: this.data.wordCount
    }

    // 保存到本地存储
    this.saveNoteToStorage(note)
    
    // 模拟保存过程
    setTimeout(() => {
      wx.hideLoading()
      this.setData({ isSynced: true })
      wx.showToast({
        title: '保存成功',
        icon: 'success'
      })
      
      // 保存成功后可以选择返回或继续编辑
      setTimeout(() => {
        const action = this.data.isEditMode ? '更新' : '保存'
        wx.showModal({
          title: action + '成功',
          content: `笔记已${action}到` + this.getCategoryName(this.data.selectedCategory) + '分类中',
          showCancel: true,
          cancelText: '继续编辑',
          confirmText: this.data.isEditMode ? '返回详情' : '返回首页',
          success: (res) => {
            if (res.confirm) {
              if (this.data.isEditMode) {
                // 编辑模式：返回详情页
                wx.navigateBack()
              } else {
                // 新建模式：返回首页
                wx.navigateBack()
              }
            }
          }
        })
      }, 1000)
    }, 1000)
  },

  // 保存笔记到本地存储
  saveNoteToStorage(note) {
    // 使用统一的笔记管理服务
    const result = noteManager.saveNote(note)
    if (!result.success) {
      console.error('保存笔记失败:', result.error)
      wx.showToast({
        title: '保存失败',
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
