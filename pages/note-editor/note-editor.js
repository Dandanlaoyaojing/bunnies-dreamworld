// pages/note-editor/note-editor.js
const aiService = require('../../utils/aiService')
const noteManager = require('../../utils/noteManager')
const apiService = require('../../utils/apiService')
const draftCloudService = require('../../utils/draftCloudService')
const { migrateSourceHistoryToCurrentAccount } = require('../../utils/migrateSourceHistory')

Page({
  data: {
    noteTitle: '',
    noteContent: '',
    noteUrl: '',
    selectedCategories: [], // 改为多选分类数组
    wordCount: 0,
    createTime: '',
    isSynced: false,
    tags: [],
    images: [], // 图片列表
    voices: [], // 语音条列表
    categoryTag: '', // 分类默认标签（不显示在智能标签区域）
    source: '', // 笔记来源
    sourceHistory: [], // 来源历史记录
    isRecording: false, // 录音状态
    saveImages: true, // 是否同时保存图片
    saveVoices: true, // 是否同时保存原语音
    
    // 草稿相关
    isDraftMode: false, // 是否为草稿模式
    draftId: null, // 草稿ID
    isEditMode: false, // 是否为编辑模式
    autoSaveEnabled: true, // 是否启用自动保存
    lastAutoSaveTime: null, // 上次自动保存时间
    hasUnsavedChanges: false, // 是否有未保存的更改
    
    // 多选分类的布尔状态
    isArtSelected: false,
    isCuteSelected: false,
    isDreamsSelected: false,
    isFoodsSelected: false,
    isHappinessSelected: false,
    isKnowledgeSelected: false,
    isSightsSelected: false,
    isThinkingSelected: false
  },

  // 当前播放的音频上下文
  currentAudioContext: null,
  
  // 当前录音管理器
  currentRecorderManager: null,
  
  // 播放状态
  isPlaying: false,
  currentPlayingVoiceId: null,

  onLoad(options) {
    console.log('=== 笔记编辑页面加载 ===')
    console.log('页面参数:', options)
    
    this.setData({
      createTime: this.formatTime(new Date())
    })
    
    // 预初始化音频系统
    this.initializeAudioSystem()
    
    // 检查本地存储中是否有草稿编辑数据
    try {
      const editDraftData = wx.getStorageSync('editDraftData')
      console.log('onLoad: 检查本地存储的草稿编辑数据:', editDraftData)
      
      if (editDraftData && editDraftData.mode === 'draft') {
        console.log('onLoad: 从本地存储加载草稿编辑数据:', editDraftData)
        this.setData({ isDraftMode: true })
        
        if (editDraftData.draftId) {
          console.log('onLoad: 开始加载草稿:', editDraftData.draftId)
          this.loadDraft(editDraftData.draftId)
        } else {
          console.log('onLoad: 没有草稿ID，进入新草稿模式')
        }
        
        // 清除本地存储中的编辑数据
        wx.removeStorageSync('editDraftData')
        
        // 草稿模式下的初始化
        this.updateWordCount()
        this.checkAPIStatus()
        this.loadSourceHistory()
        this.loadAccountData()
        
        // 启动自动保存定时器
        if (this.data.autoSaveEnabled) {
          this.startAutoSave()
        }
        return
      } else {
        console.log('onLoad: 没有找到草稿编辑数据，进入普通模式')
      }
    } catch (error) {
      console.error('onLoad: 读取草稿编辑数据失败:', error)
      // 如果读取失败，可能是存储空间问题，尝试清理
      try {
        wx.removeStorageSync('editDraftData')
      } catch (clearError) {
        console.error('清理草稿编辑数据失败:', clearError)
      }
    }
    
    // 检查是否是草稿模式（通过URL参数）
    if (options.mode === 'draft') {
      this.setData({ isDraftMode: true })
      console.log('进入草稿模式，草稿ID:', options.draftId)
      
      // 如果有草稿ID，加载草稿
      if (options.draftId) {
        console.log('开始加载草稿:', options.draftId)
        this.loadDraft(options.draftId)
      } else {
        console.log('没有草稿ID，创建新草稿')
      }
    }
    // 检查是否是编辑模式
    else if (options.edit === 'true' && options.note) {
      this.loadNoteForEdit(options.note)
    } else {
      // 检查本地存储中是否有编辑数据（从tabBar跳转的情况）
      try {
        const editNoteData = wx.getStorageSync('editNoteData')
        if (editNoteData) {
          console.log('从本地存储加载编辑数据:', editNoteData)
          this.loadNoteForEdit(editNoteData)
          // 清除本地存储中的编辑数据
          wx.removeStorageSync('editNoteData')
        } else if (options.category) {
          // 预设分类
          this.setData({
            selectedCategories: [options.category],
            isArtSelected: options.category === 'art',
            isCuteSelected: options.category === 'cute',
            isDreamsSelected: options.category === 'dreams',
            isFoodsSelected: options.category === 'foods',
            isHappinessSelected: options.category === 'happiness',
            isKnowledgeSelected: options.category === 'knowledge',
            isSightsSelected: options.category === 'sights',
            isThinkingSelected: options.category === 'thinking'
          })
          this.generateDefaultTags(options.category)
        }
      } catch (error) {
        console.error('读取编辑数据失败:', error)
        if (options.category) {
          // 预设分类
          this.setData({
            selectedCategories: [options.category],
            isArtSelected: options.category === 'art',
            isCuteSelected: options.category === 'cute',
            isDreamsSelected: options.category === 'dreams',
            isFoodsSelected: options.category === 'foods',
            isHappinessSelected: options.category === 'happiness',
            isKnowledgeSelected: options.category === 'knowledge',
            isSightsSelected: options.category === 'sights',
            isThinkingSelected: options.category === 'thinking'
          })
          this.generateDefaultTags(options.category)
        }
      }
    }
    
    this.updateWordCount()
    this.checkAPIStatus()
    this.loadSourceHistory()
    this.loadAccountData()
    
    // 启动自动保存定时器
    if (this.data.autoSaveEnabled) {
      this.startAutoSave()
    }
  },

  onShow() {
    console.log('=== 笔记编辑页面显示 ===')
    
    // 检查是否有草稿编辑数据需要加载
    try {
      const editDraftData = wx.getStorageSync('editDraftData')
      console.log('onShow: 检查本地存储的草稿编辑数据:', editDraftData)
      
      if (editDraftData && editDraftData.mode === 'draft') {
        console.log('onShow: 从本地存储加载草稿编辑数据:', editDraftData)
        this.setData({ isDraftMode: true })
        
        if (editDraftData.draftId) {
          console.log('onShow: 开始加载草稿:', editDraftData.draftId)
          this.loadDraft(editDraftData.draftId)
        } else {
          console.log('onShow: 没有草稿ID，进入新草稿模式')
        }
        
        // 清除本地存储中的编辑数据
        wx.removeStorageSync('editDraftData')
        
        // 草稿模式下的初始化
        this.updateWordCount()
        this.checkAPIStatus()
        this.loadSourceHistory()
        this.loadAccountData()
        
        // 启动自动保存定时器
        if (this.data.autoSaveEnabled) {
          this.startAutoSave()
        }
        return
      } else {
        console.log('onShow: 没有找到草稿编辑数据')
      }
    } catch (error) {
      console.error('onShow: 读取草稿编辑数据失败:', error)
      // 如果读取失败，可能是存储空间问题，尝试清理
      try {
        wx.removeStorageSync('editDraftData')
      } catch (clearError) {
        console.error('清理草稿编辑数据失败:', clearError)
      }
    }
    
    // 检查是否有编辑数据需要加载（从其他页面跳转过来的情况）
    try {
      const editNoteData = wx.getStorageSync('editNoteData')
      if (editNoteData && !this.data.isEditMode) {
        console.log('onShow: 从本地存储加载编辑数据:', editNoteData)
        this.loadNoteForEdit(editNoteData)
        // 清除本地存储中的编辑数据
        wx.removeStorageSync('editNoteData')
      }
    } catch (error) {
      console.error('onShow: 读取编辑数据失败:', error)
    }
  },

  onUnload() {
    console.log('=== 笔记编辑页面卸载 ===')
    // 清理音频上下文
    if (this.currentAudioContext) {
      this.currentAudioContext.stop()
      this.currentAudioContext.destroy()
      this.currentAudioContext = null
    }
    // 清理录音管理器
    if (this.currentRecorderManager) {
      this.currentRecorderManager.stop()
      this.currentRecorderManager = null
    }
    
    // 停止自动保存
    this.stopAutoSave()
    
    // 如果有未保存的更改，自动保存为草稿
    if (this.data.hasUnsavedChanges && this.data.autoSaveEnabled) {
      this.autoSaveDraft()
    }
  },

  // 设置音频上下文
  setupAudioContext() {
    console.log('🎵 设置音频上下文')
    
    // 预创建音频上下文
    this.currentAudioContext = wx.createInnerAudioContext()
    
    // 设置音频属性
    this.currentAudioContext.volume = 1.0  // 设置音量为最大
    this.currentAudioContext.autoplay = false  // 禁用自动播放
    
    // 设置音频事件监听
    this.currentAudioContext.onPlay(() => {
      console.log('✅ 音频开始播放')
      this.isPlaying = true
      this.setData({ isPlaying: true })
      wx.showToast({
        title: '正在播放...',
        icon: 'none',
        duration: 1000
      })
    })
    
    this.currentAudioContext.onEnded(() => {
      console.log('✅ 音频播放结束')
      this.isPlaying = false
      this.currentPlayingVoiceId = null
      this.setData({ 
        isPlaying: false,
        currentPlayingVoiceId: null
      })
      wx.showToast({
        title: '播放完成',
        icon: 'none',
        duration: 1000
      })
    })
    
    this.currentAudioContext.onError((error) => {
      console.error('❌ 音频播放失败:', error)
      console.error('错误详情:', {
        errCode: error.errCode,
        errMsg: error.errMsg
      })
      this.isPlaying = false
      this.currentPlayingVoiceId = null
      this.setData({ 
        isPlaying: false,
        currentPlayingVoiceId: null
      })
      wx.showToast({
        title: '播放失败: ' + (error.errMsg || '未知错误'),
        icon: 'none'
      })
    })
    
    this.currentAudioContext.onPause(() => {
      console.log('⏸️ 音频播放暂停')
      this.isPlaying = false
      this.setData({ isPlaying: false })
    })
    
    this.currentAudioContext.onStop(() => {
      console.log('⏹️ 音频播放停止')
      this.isPlaying = false
      this.currentPlayingVoiceId = null
      this.setData({ 
        isPlaying: false,
        currentPlayingVoiceId: null
      })
    })
    
    // 添加更多事件监听
    this.currentAudioContext.onCanplay(() => {
      console.log('✅ 音频可以播放')
    })
    
    this.currentAudioContext.onWaiting(() => {
      console.log('⏳ 音频等待中')
    })
    
    this.currentAudioContext.onTimeUpdate(() => {
      console.log('⏰ 播放时间更新:', this.currentAudioContext.currentTime)
    })
  },

  // 加载要编辑的笔记
  loadNoteForEdit(noteData) {
    try {
      console.log('开始加载编辑笔记数据:', noteData)
      const note = JSON.parse(decodeURIComponent(noteData))
      console.log('解析后的笔记数据:', note)
      
      // 处理分类数据（支持单选和多选）
      let selectedCategories = []
      let isArtSelected = false, isCuteSelected = false, isDreamsSelected = false
      let isFoodsSelected = false, isHappinessSelected = false, isKnowledgeSelected = false
      let isSightsSelected = false, isThinkingSelected = false
      
      if (note.category) {
        if (Array.isArray(note.category)) {
          // 如果是数组，说明是多选
          selectedCategories = note.category
        } else {
          // 如果是字符串，说明是单选，转换为数组
          selectedCategories = [note.category]
        }
        
        // 更新布尔状态
        isArtSelected = selectedCategories.includes('art')
        isCuteSelected = selectedCategories.includes('cute')
        isDreamsSelected = selectedCategories.includes('dreams')
        isFoodsSelected = selectedCategories.includes('foods')
        isHappinessSelected = selectedCategories.includes('happiness')
        isKnowledgeSelected = selectedCategories.includes('knowledge')
        isSightsSelected = selectedCategories.includes('sights')
        isThinkingSelected = selectedCategories.includes('thinking')
      }
      
      this.setData({
        noteTitle: note.title || '',
        noteContent: note.content || '',
        selectedCategories: selectedCategories,
        isArtSelected: isArtSelected,
        isCuteSelected: isCuteSelected,
        isDreamsSelected: isDreamsSelected,
        isFoodsSelected: isFoodsSelected,
        isHappinessSelected: isHappinessSelected,
        isKnowledgeSelected: isKnowledgeSelected,
        isSightsSelected: isSightsSelected,
        isThinkingSelected: isThinkingSelected,
        tags: note.tags || [],
        images: note.images || [], // 加载图片
        categoryTag: note.categoryTag || '', // 加载分类标签
        source: note.source || '', // 加载来源
        isEditMode: true,
        editingNoteId: note.id
      })
      
      console.log('笔记编辑数据加载完成:', {
        title: note.title,
        content: note.content ? note.content.substring(0, 50) + '...' : '',
        category: note.category,
        tags: note.tags,
        id: note.id
      })
      
      wx.showToast({
        title: `正在编辑: ${note.title || '无标题笔记'}`,
        icon: 'success',
        duration: 2000
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
    console.log('selectCategory 被调用', e)
    const category = e.currentTarget.dataset.category
    console.log('选择的分类:', category)
    
    if (!category) {
      console.error('分类数据为空')
      return
    }
    
    let selectedCategories = [...this.data.selectedCategories]
    
    // 切换分类选择状态
    if (selectedCategories.includes(category)) {
      // 如果已选中，则取消选择
      selectedCategories = selectedCategories.filter(item => item !== category)
    } else {
      // 如果未选中，则添加到选择列表
      selectedCategories.push(category)
    }
    
    // 更新对应分类的布尔状态
    const isArtSelected = selectedCategories.includes('art')
    const isCuteSelected = selectedCategories.includes('cute')
    const isDreamsSelected = selectedCategories.includes('dreams')
    const isFoodsSelected = selectedCategories.includes('foods')
    const isHappinessSelected = selectedCategories.includes('happiness')
    const isKnowledgeSelected = selectedCategories.includes('knowledge')
    const isSightsSelected = selectedCategories.includes('sights')
    const isThinkingSelected = selectedCategories.includes('thinking')
    
    this.setData({
      selectedCategories: selectedCategories,
      isArtSelected: isArtSelected,
      isCuteSelected: isCuteSelected,
      isDreamsSelected: isDreamsSelected,
      isFoodsSelected: isFoodsSelected,
      isHappinessSelected: isHappinessSelected,
      isKnowledgeSelected: isKnowledgeSelected,
      isSightsSelected: isSightsSelected,
      isThinkingSelected: isThinkingSelected,
      isSynced: false
    })
    
    console.log('更新后的选中分类:', selectedCategories)
    
    // 如果有选中的分类，生成默认标签（使用第一个选中的分类）
    if (selectedCategories.length > 0) {
      this.generateDefaultTags(selectedCategories[0])
    }
    
    // 显示反馈
    const categoryNames = selectedCategories.map(cat => this.getCategoryName(cat)).join('、')
    wx.showToast({
      title: selectedCategories.length > 0 ? `已选择: ${categoryNames}` : '已取消所有分类',
      icon: 'none',
      duration: 2000
    })
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
    return categoryNames[category] || category
  },

  // 生成默认标签（不显示在智能标签区域）
  generateDefaultTags(category) {
    const categoryNames = {
      'art': '艺术',
      'cute': '萌物',
      'dreams': '梦境',
      'foods': '美食',
      'happiness': '趣事',
      'knowledge': '知识',
      'sights': '风景',
      'thinking': '思考'
    }
    
    const defaultTag = categoryNames[category]
    if (defaultTag) {
      // 将默认标签存储为分类标签，不显示在智能标签区域
    this.setData({
        categoryTag: defaultTag
      })
    }
  },

  // 生成初始标签（文字识别后自动调用）
  async generateInitialTags(content) {
    try {
      console.log('开始生成初始标签:', content.substring(0, 100))
      
      // 调用AI服务生成3-5个初始标签
      const result = await aiService.generateTags(content, this.data.selectedCategories.length > 0 ? this.data.selectedCategories[0] : '')
      
      if (result.success && result.tags && result.tags.length > 0) {
        this.setData({
          tags: result.tags,
          isSynced: false
        })
        
        console.log('初始标签生成成功:', result.tags)
      } else {
        console.warn('初始标签生成失败:', result.error)
      }
    } catch (error) {
      console.error('初始标签生成异常:', error)
    }
  },

  // 智能标签生成（增强版）
  async generateSmartTags() {
    console.log('=== AI生成标签开始 ===')
    console.log('页面当前数据状态:', {
      noteContent: this.data.noteContent,
      noteTitle: this.data.noteTitle,
      selectedCategories: this.data.selectedCategories,
      tags: this.data.tags,
      isDraftMode: this.data.isDraftMode,
      isEditMode: this.data.isEditMode
    })
    
    // 强制刷新数据，确保获取最新状态
    const currentData = {
      noteContent: this.data.noteContent || '',
      noteTitle: this.data.noteTitle || '',
      selectedCategories: this.data.selectedCategories || []
    }
    console.log('强制获取的数据:', currentData)
    
    // 如果是草稿模式且数据还未加载完成，等待一下
    if (this.data.isDraftMode && !this.draftDataLoaded) {
      console.log('草稿数据还未加载完成，等待中...')
      wx.showToast({
        title: '数据加载中，请稍候',
        icon: 'loading'
      })
      
      // 等待数据加载完成
      await new Promise(resolve => {
        const checkData = () => {
          if (this.draftDataLoaded || this.data.noteContent || this.data.noteTitle) {
            resolve()
          } else {
            setTimeout(checkData, 100)
          }
        }
        checkData()
      })
    }
    
    // 使用强制获取的数据
    const content = currentData.noteContent.trim()
    const title = currentData.noteTitle.trim()
    const category = currentData.selectedCategories.length > 0 ? currentData.selectedCategories[0] : ''
    const hasExistingTags = this.data.tags && this.data.tags.length > 0
    
    console.log('AI生成标签 - 当前数据:', {
      content: content.length > 0 ? content.substring(0, 100) + '...' : '空内容',
      contentLength: content.length,
      title: title || '空标题',
      titleLength: title.length,
      category: category || '无分类',
      hasExistingTags,
      isDraftMode: this.data.isDraftMode,
      draftDataLoaded: this.draftDataLoaded,
      selectedCategories: this.data.selectedCategories,
      noteContent: currentData.noteContent ? currentData.noteContent.substring(0, 100) + '...' : '空内容',
      noteTitle: currentData.noteTitle || '空标题',
      rawNoteContent: currentData.noteContent,
      rawNoteTitle: currentData.noteTitle
    })
    
    // 检查是否有内容可以生成标签
    if (!content && !title && !category) {
      console.log('没有内容可以生成标签:', { content, title, category })
      wx.showToast({
        title: '请先输入内容或选择分类',
        icon: 'none'
      })
      return
    }
    
    console.log('准备生成标签，数据验证通过:', {
      hasContent: !!content,
      hasTitle: !!title,
      hasCategory: !!category,
      contentLength: content.length,
      titleLength: title.length
    })
    
    // 如果有现有标签，询问用户是否要替换
    if (hasExistingTags) {
      wx.showModal({
        title: '生成智能标签',
        content: `检测到已有 ${this.data.tags.length} 个标签，是否要重新生成新的智能标签？`,
        confirmText: '重新生成',
        cancelText: '追加生成',
        success: (res) => {
          if (res.confirm) {
            // 用户选择重新生成，清空现有标签
            this.performSmartTagGeneration(true)
          } else {
            // 用户选择追加生成，保留现有标签
            this.performSmartTagGeneration(false)
          }
        }
      })
    } else {
      // 没有现有标签时，直接生成
      this.performSmartTagGeneration(true)
    }
  },

  // 执行智能标签生成
  async performSmartTagGeneration(replaceExisting = true) {
    // 如果是草稿模式且数据还未加载完成，等待一下
    if (this.data.isDraftMode && !this.draftDataLoaded) {
      console.log('草稿数据还未加载完成，等待中...')
      wx.showLoading({ title: '数据加载中...' })
      
      // 等待数据加载完成
      await new Promise(resolve => {
        const checkData = () => {
          if (this.draftDataLoaded || this.data.noteContent || this.data.noteTitle) {
            resolve()
          } else {
            setTimeout(checkData, 100)
          }
        }
        checkData()
      })
    }
    
    // 强制刷新数据，确保获取最新状态
    const currentData = {
      noteContent: this.data.noteContent || '',
      noteTitle: this.data.noteTitle || '',
      selectedCategories: this.data.selectedCategories || []
    }
    
    const content = currentData.noteContent.trim()
    const title = currentData.noteTitle.trim()
    const category = currentData.selectedCategories.length > 0 ? currentData.selectedCategories[0] : ''
    
    console.log('执行智能标签生成 - 当前数据:', {
      content: content.length > 0 ? content.substring(0, 100) + '...' : '空内容',
      contentLength: content.length,
      title: title || '空标题',
      titleLength: title.length,
      category: category || '无分类',
      isDraftMode: this.data.isDraftMode,
      draftDataLoaded: this.draftDataLoaded,
      rawNoteContent: currentData.noteContent,
      rawNoteTitle: currentData.noteTitle
    })
    
    wx.showLoading({ title: 'AI生成标签中...' })
    
    try {
      // 构建用于生成标签的文本
      const textForTags = title ? `${title}\n${content}` : content
      
      console.log('开始生成智能标签:', { title, content: content.substring(0, 100), category, replaceExisting })
      
      // 调用AI服务生成3-5个简短标签
      const existingTags = this.data.tags || []
      const result = await aiService.generateTags(textForTags, category)
      
      wx.hideLoading()
      
      if (result.success && result.tags && result.tags.length > 0) {
        let finalTags = result.tags
        let newCount = result.tags.length
        
        if (!replaceExisting) {
          // 追加模式：合并新标签和现有标签，去重
          const existingTags = this.data.tags || []
          const newTags = result.tags.filter(tag => !existingTags.includes(tag))
          finalTags = [...existingTags, ...newTags]
          newCount = newTags.length
          
          console.log('追加模式:', { 
            existingTags, 
            newTags, 
            finalTags, 
            newCount 
          })
        }
        
        this.setData({
          tags: finalTags,
          isSynced: false
        })
        
        const actionText = replaceExisting ? '重新生成了' : '新增了'
        
        if (newCount > 0) {
          wx.showToast({
            title: `${actionText}${newCount}个标签`,
            icon: 'success'
          })
        } else {
          // 如果没有新标签，尝试重新生成
          console.log('没有新标签，尝试重新生成...')
          await this.retryGenerateTags(textForTags, category, existingTags)
        }
        
        console.log('智能标签生成成功:', { finalTags, replaceExisting, newCount })
      } else {
        wx.showToast({
          title: result.error || '标签生成失败',
          icon: 'none'
        })
        console.error('智能标签生成失败:', result.error)
      }
    } catch (error) {
      wx.hideLoading()
      console.error('智能标签生成异常:', error)
      wx.showToast({
        title: '标签生成失败，请重试',
        icon: 'none'
      })
    }
  },

  // 重试生成标签
  async retryGenerateTags(textForTags, category, existingTags) {
    try {
      console.log('重试生成标签...')
      
      // 使用更高的temperature来生成更多样化的标签
      const result = await aiService.generateTags(textForTags, category)
      
      if (result.success && result.tags && result.tags.length > 0) {
        const newTags = result.tags.filter(tag => !existingTags.includes(tag))
        
        if (newTags.length > 0) {
          const finalTags = [...existingTags, ...newTags]
          this.setData({
            tags: finalTags,
            isSynced: false
          })
          
          wx.showToast({
            title: `新增了${newTags.length}个标签`,
            icon: 'success'
          })
          
          console.log('重试生成成功:', { newTags, finalTags })
        } else {
          wx.showToast({
            title: '已生成所有可能的标签',
            icon: 'none'
          })
        }
      } else {
        wx.showToast({
          title: '无法生成更多标签',
          icon: 'none'
        })
      }
    } catch (error) {
      console.error('重试生成标签失败:', error)
      wx.showToast({
        title: '生成失败，请重试',
        icon: 'none'
      })
    }
  },

  // 标题输入
  onTitleInput(e) {
    this.setData({
      noteTitle: e.detail.value,
      isSynced: false
    })
  },

  // URL输入
  onUrlInput(e) {
    this.setData({
      noteUrl: e.detail.value,
      isSynced: false
    })
  },

  // 内容输入
  onContentInput(e) {
    const content = e.detail.value
    this.setData({
      noteContent: content,
      isSynced: false
    })
    this.updateWordCount()
    
    // 如果标题为空，自动设置第一句话为标题
    this.autoSetTitleFromContent(content)
    
    // 移除自动生成智能标签，等待用户手动点击生成
    // this.generateTags()
  },

  // 自动设置标题（从内容第一句话提取）
  autoSetTitleFromContent(content) {
    // 如果标题不为空，不自动设置
    if (this.data.noteTitle && this.data.noteTitle.trim().length > 0) {
      return
    }
    
    // 如果内容为空，不设置标题
    if (!content || content.trim().length === 0) {
      return
    }
    
    // 提取第一句话作为标题
    const firstSentence = this.extractFirstSentence(content)
    
    if (firstSentence && firstSentence.length > 0) {
      // 限制标题长度，避免过长
      const title = firstSentence.length > 20 ? firstSentence.substring(0, 20) + '...' : firstSentence
      
      this.setData({
        noteTitle: title,
        isSynced: false
      })
      
      console.log('自动设置标题:', title)
    }
  },

  // 提取第一句话
  extractFirstSentence(text) {
    if (!text || text.trim().length === 0) {
      return ''
    }
    
    // 清理文本，移除多余的空白字符
    const cleanText = text.trim()
    
    // 按句号、感叹号、问号分割
    const sentences = cleanText.split(/[。！？]/)
    
    if (sentences.length > 0) {
      let firstSentence = sentences[0].trim()
      
      // 如果第一句为空，尝试按换行符分割
      if (firstSentence.length === 0) {
        const lines = cleanText.split('\n')
        if (lines.length > 0) {
          firstSentence = lines[0].trim()
        }
      }
      
      // 如果还是没有内容，尝试按逗号分割
      if (firstSentence.length === 0) {
        const parts = cleanText.split(/[，、]/)
        if (parts.length > 0) {
          firstSentence = parts[0].trim()
        }
      }
      
      // 如果还是没有内容，使用前20个字符
      if (firstSentence.length === 0) {
        firstSentence = cleanText.substring(0, 20)
      }
      
      return firstSentence
    }
    
    return ''
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
      const result = await aiService.generateTags(content, this.data.selectedCategories.length > 0 ? this.data.selectedCategories[0] : '')
      if (result.success) {
        // 合并新标签，去重
        const existingTags = this.data.tags
        const newTags = result.tags.filter(tag => !existingTags.includes(tag))
        
        if (newTags.length > 0) {
          this.setData({
            tags: [...existingTags, ...newTags]
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












  // 选择图片
  chooseImage() {
    wx.showActionSheet({
      itemList: ['拍照', '从相册选择'],
      success: (res) => {
        if (res.tapIndex === 0) {
          // 拍照
          this.takePhoto()
        } else if (res.tapIndex === 1) {
          // 从相册选择
          this.selectFromAlbum()
        }
      }
    })
  },

  // 测试语音按钮点击
  testVoiceButton() {
    console.log('🔊 测试语音按钮点击')
    wx.showToast({
      title: '语音按钮被点击了',
      icon: 'success'
    })
  },

  // 测试播放按钮点击
  testPlayButton(e) {
    console.log('🎵 测试播放按钮点击')
    console.log('事件对象:', e)
    wx.showToast({
      title: '播放按钮测试被点击',
      icon: 'success'
    })
  },

  // 测试音频播放功能
  testAudioPlay() {
    console.log('🔊 测试音频播放功能')
    
    try {
      const innerAudioContext = wx.createInnerAudioContext()
      
      // 使用一个测试音频文件（如果有的话）
      // 这里我们先测试音频上下文是否能正常创建
      console.log('音频上下文创建成功:', innerAudioContext)
      
      innerAudioContext.onPlay(() => {
        console.log('✅ 测试音频开始播放')
        wx.showToast({
          title: '测试音频播放成功',
          icon: 'success'
        })
      })
      
      innerAudioContext.onError((error) => {
        console.error('❌ 测试音频播放失败:', error)
        wx.showToast({
          title: '测试音频播放失败',
          icon: 'none'
        })
      })
      
      // 这里不设置音频源，只是测试音频上下文
      console.log('音频上下文测试完成')
      
      // 清理
      innerAudioContext.destroy()
      
    } catch (error) {
      console.error('音频上下文创建失败:', error)
      wx.showToast({
        title: '音频功能不可用',
        icon: 'none'
      })
    }
  },

  // 选择AI模型
  selectAIModel() {
    const availableModels = aiService.getAvailableModels()
    const currentModel = aiService.getCurrentModel()
    
    console.log('当前模型:', currentModel)
    console.log('可用模型:', availableModels)
    
    // 创建模型选择列表
    const modelList = []
    Object.keys(availableModels).forEach(provider => {
      availableModels[provider].forEach(model => {
        modelList.push(`${provider}: ${model}`)
      })
    })
    
    wx.showActionSheet({
      itemList: modelList,
      success: (res) => {
        const selectedModel = modelList[res.tapIndex]
        const modelName = selectedModel.split(': ')[1]
        
        console.log('选择的模型:', modelName)
        
        // 设置新模型
        aiService.setModel(modelName)
        
        wx.showToast({
          title: `已切换到: ${modelName}`,
          icon: 'success'
        })
      },
      fail: (error) => {
        console.error('模型选择失败:', error)
      }
    })
  },

  // 显示当前AI模型信息
  showAIModelInfo() {
    const currentModel = aiService.getCurrentModel()
    const availableModels = aiService.getAvailableModels()
    
    let infoText = `当前模型: ${currentModel}\n\n可用模型:\n`
    
    Object.keys(availableModels).forEach(provider => {
      infoText += `\n${provider.toUpperCase()}:\n`
      availableModels[provider].forEach(model => {
        const isCurrent = model === currentModel ? ' (当前)' : ''
        infoText += `• ${model}${isCurrent}\n`
      })
    })
    
    wx.showModal({
      title: 'AI模型信息',
      content: infoText,
      showCancel: true,
      cancelText: '关闭',
      confirmText: '切换模型',
      success: (res) => {
        if (res.confirm) {
          this.selectAIModel()
        }
      }
    })
  },

  // 带录音管理器引用的录音方法
  async recordVoiceWithManager() {
    return new Promise((resolve) => {
      console.log('=== 开始录音（带管理器引用）===')
      
      try {
        // 检查录音管理器是否可用
        if (!wx.getRecorderManager) {
          console.error('录音管理器不可用')
          resolve({
            success: false,
            error: '当前微信版本不支持录音功能'
          })
          return
        }
        
        // 获取录音管理器
        const recorderManager = wx.getRecorderManager()
        this.currentRecorderManager = recorderManager
        console.log('录音管理器创建并保存引用')
        
        // 检查系统信息
        const systemInfo = wx.getSystemInfoSync()
        console.log('系统信息:', systemInfo)
        console.log('平台:', systemInfo.platform)
        console.log('微信版本:', systemInfo.version)
        
        // 设置录音事件监听
        recorderManager.onStart(() => {
          console.log('✅ 录音开始')
          this.setData({ isRecording: true })
          wx.showToast({
            title: '正在录音...',
            icon: 'none'
          })
        })
        
        recorderManager.onStop((res) => {
          console.log('✅ 录音结束:', res)
          wx.hideToast()
          this.setData({ isRecording: false })
          this.currentRecorderManager = null
          
          if (res.tempFilePath) {
            const duration = Math.round(res.duration / 1000)
            console.log('录音成功，时长:', duration, '秒')
            resolve({
              success: true,
              audioPath: res.tempFilePath,
              duration: duration
            })
          } else {
            console.error('录音文件路径为空')
            resolve({
              success: false,
              error: '录音文件路径为空'
            })
          }
        })
        
        recorderManager.onError((res) => {
          console.error('❌ 录音错误:', res)
          console.error('错误详情:', {
            errCode: res.errCode,
            errMsg: res.errMsg,
            errNo: res.errNo
          })
          wx.hideToast()
          this.setData({ isRecording: false })
          this.currentRecorderManager = null
          
          let errorMsg = '录音失败'
          if (res.errMsg) {
            if (res.errMsg.includes('NotAllowedError')) {
              errorMsg = '录音权限被拒绝，请在设置中开启录音权限'
            } else if (res.errMsg.includes('NotFoundError')) {
              errorMsg = '未找到录音设备，请检查设备是否支持录音'
            } else if (res.errMsg.includes('NotSupportedError')) {
              errorMsg = '设备不支持录音功能'
            } else if (res.errMsg.includes('format')) {
              errorMsg = '录音格式不支持，已自动调整格式'
            } else if (res.errMsg.includes('encodeBitRate')) {
              errorMsg = '录音参数不兼容，已使用默认参数'
            } else {
              errorMsg = `录音失败: ${res.errMsg}`
            }
          }
          
          // 显示详细的错误信息
          wx.showModal({
            title: '录音失败',
            content: errorMsg + '\n\n错误代码: ' + (res.errCode || '未知') + '\n错误信息: ' + (res.errMsg || '未知'),
            showCancel: false,
            confirmText: '确定'
          })
          
          resolve({
            success: false,
            error: errorMsg
          })
        })
        
        // 录音参数 - 使用最基础的配置
        const options = {
          duration: 60000 // 只设置录音时长，其他参数使用默认值
        }
        console.log('录音配置:', options)
        
        // 开始录音
        recorderManager.start(options)
        console.log('录音启动命令已发送')
        
        // 10秒后自动停止
        setTimeout(() => {
          if (this.currentRecorderManager) {
            console.log('自动停止录音')
            this.currentRecorderManager.stop()
          }
        }, 10000)
        
      } catch (error) {
        console.error('录音初始化失败:', error)
        this.currentRecorderManager = null
        resolve({
          success: false,
          error: `录音初始化失败: ${error.message}`
        })
      }
    })
  },

  // 停止录音
  stopRecording() {
    console.log('🛑 手动停止录音')
    
    if (this.currentRecorderManager) {
      try {
        this.currentRecorderManager.stop()
        console.log('录音停止命令已发送')
        this.setData({ isRecording: false })
        wx.showToast({
          title: '录音已停止',
          icon: 'success'
        })
      } catch (error) {
        console.error('停止录音失败:', error)
        this.setData({ isRecording: false })
        wx.showToast({
          title: '停止录音失败',
          icon: 'none'
        })
      }
    } else {
      console.log('当前没有录音进行中')
      this.setData({ isRecording: false })
      wx.showToast({
        title: '当前没有录音',
        icon: 'none'
      })
    }
  },

  // 开始语音录制（生成语音条）
  async startVoiceRecording() {
    console.log('🎤 语音按钮被点击了！')
    console.log('=== 开始录制语音条 ===')
    
    // 先显示一个简单的提示，确认方法被调用
    wx.showToast({
      title: '语音按钮被点击',
      icon: 'none',
      duration: 1000
    })
    
    try {
      console.log('步骤1: 检查录音权限')
      // 检查录音权限
      const authResult = await this.checkRecordAuthStatus()
      console.log('录音权限检查结果:', authResult)
      
      if (!authResult.success) {
        console.log('步骤2: 权限未授权，申请权限')
        // 权限未授权，申请权限
        const requestResult = await this.requestRecordPermission()
        console.log('权限申请结果:', requestResult)
        
        if (!requestResult.success) {
          console.log('权限申请失败，显示提示')
          wx.showModal({
            title: '录音权限',
            content: '需要录音权限才能使用语音条功能，请在设置中开启录音权限。',
            showCancel: false,
            confirmText: '知道了'
          })
      return
        }
      }
      
      console.log('步骤3: 权限检查通过，开始录音')
      
      // 如果当前有音频在播放，先停止
      if (this.currentAudioContext) {
        console.log('停止当前播放的音频，准备录音')
        this.currentAudioContext.stop()
        this.currentAudioContext.destroy()
        this.currentAudioContext = null
      }
      
      // 显示录音提示
      wx.showToast({
        title: '正在录音...',
        icon: 'none'
      })
      
      console.log('步骤4: 调用语音条录制服务')
      // 直接调用语音条录制服务
      const result = await this.recordVoiceWithManager()
      console.log('步骤5: 语音条录制服务返回结果:', result)
      
      if (result.success && result.audioPath) {
        console.log('步骤6: 录音成功，创建语音条对象')
        // 创建语音条对象
        const voiceItem = {
          id: Date.now(),
          path: result.audioPath,
          duration: result.duration || 0,
          createTime: this.formatTime(new Date()),
          uploaded: false
        }
        
        console.log('创建语音条对象:', voiceItem)
        
        console.log('步骤7: 添加到语音条列表')
        // 添加到语音条列表
        const currentVoices = this.data.voices || []
        const newVoices = [...currentVoices, voiceItem]
        
        console.log('更新语音条列表:', { currentVoices, newVoices })
        
        this.setData({
          voices: newVoices,
          isSynced: false
        })
        
        wx.showToast({
          title: '语音条录制完成',
          icon: 'success'
        })
        
        console.log('步骤8: 语音条录制成功，已添加到列表')
      } else {
        console.error('步骤6: 语音条录制失败:', result)
        wx.showToast({
          title: result.error || '语音条录制失败',
          icon: 'none'
        })
      }
    } catch (error) {
      console.error('语音条录制异常:', error)
      console.error('异常详情:', error.stack)
      wx.showToast({
        title: '语音条录制失败，请重试',
        icon: 'none'
      })
    }
  },

  // 测试录音权限
  async testRecordPermission() {
    try {
      console.log('开始测试录音权限')
      
      // 显示测试提示
      wx.showToast({
        title: '测试录音权限...',
        icon: 'none'
      })
      
      // 检查录音管理器是否可用
      if (!wx.getRecorderManager) {
        wx.showModal({
          title: '录音权限测试',
          content: '❌ 当前微信版本过低，无法使用录音功能',
          showCancel: false,
          confirmText: '确定'
        })
      return
    }
    
      // 检查录音权限状态
      const authResult = await this.checkRecordAuthStatus()
      
      if (authResult.success) {
        // 权限已授权，测试录音功能
        await this.testRecordingFunction()
      } else {
        // 权限未授权，申请权限
        await this.requestRecordPermission()
      }
      
    } catch (error) {
      console.error('录音权限测试异常:', error)
      wx.showModal({
        title: '录音权限测试',
        content: '❌ 测试过程中发生异常: ' + error.message,
        showCancel: false,
        confirmText: '确定'
      })
    }
  },

  // 检查录音权限状态
  checkRecordAuthStatus() {
    return new Promise((resolve) => {
      wx.getSetting({
        success: (res) => {
          console.log('权限设置:', res.authSetting)
          
          if (res.authSetting['scope.record'] === true) {
            console.log('✅ 录音权限已授权')
            resolve({
              success: true,
              message: '录音权限已授权'
            })
          } else if (res.authSetting['scope.record'] === false) {
            console.log('❌ 录音权限被拒绝')
            resolve({
              success: false,
              message: '录音权限被拒绝'
            })
          } else {
            console.log('⚠️ 录音权限未设置')
            resolve({
              success: false,
              message: '录音权限未设置'
            })
          }
        },
        fail: (error) => {
          console.error('获取权限设置失败:', error)
          resolve({
            success: false,
            message: '获取权限设置失败'
          })
        }
      })
    })
  },

  // 申请录音权限
  async requestRecordPermission() {
    return new Promise((resolve) => {
      wx.authorize({
        scope: 'scope.record',
        success: () => {
          console.log('✅ 录音权限申请成功')
          wx.showModal({
            title: '录音权限测试',
            content: '✅ 录音权限申请成功！现在可以测试录音功能了。',
            showCancel: false,
            confirmText: '确定',
            success: () => {
              // 权限申请成功后，测试录音功能
              this.testRecordingFunction()
            }
          })
          resolve({
            success: true,
            message: '录音权限申请成功'
          })
        },
        fail: (error) => {
          console.error('❌ 录音权限申请失败:', error)
          wx.showModal({
            title: '录音权限测试',
            content: '❌ 录音权限申请失败！\n\n请按以下步骤手动开启权限：\n1. 点击右上角"..."\n2. 选择"设置"\n3. 选择"权限管理"\n4. 开启"录音"权限',
            showCancel: false,
            confirmText: '确定'
          })
          resolve({
            success: false,
            message: '录音权限申请失败'
          })
        }
      })
    })
  },

  // 测试录音功能
  async testRecordingFunction() {
    try {
      console.log('开始测试录音功能')
      
      // 检查是否在真机环境
      const systemInfo = wx.getSystemInfoSync()
      console.log('系统信息:', systemInfo)
      
      // 检查录音管理器是否可用
      if (!wx.getRecorderManager) {
        wx.showModal({
          title: '录音功能测试',
          content: '❌ 当前环境不支持录音功能\n\n请在真机上测试录音功能',
          showCancel: false,
          confirmText: '确定'
        })
        return
      }
      
      const recorderManager = wx.getRecorderManager()
      
      // 录音配置 - 根据环境动态调整
      const options = this.getCompatibleRecordOptions()
      
      console.log('录音配置:', options)
      
      // 录音开始事件
      recorderManager.onStart(() => {
        console.log('✅ 录音开始成功')
    wx.showToast({
          title: '录音开始成功！',
          icon: 'success'
        })
      })
      
      // 录音结束事件
      recorderManager.onStop((res) => {
        console.log('✅ 录音结束成功:', res)
        wx.showModal({
          title: '录音功能测试',
          content: '✅ 录音功能测试成功！\n\n录音文件路径: ' + (res.tempFilePath || '未知') + '\n\n录音时长: ' + (res.duration || 0) + 'ms',
          showCancel: false,
          confirmText: '确定'
        })
      })
      
      // 录音错误事件
      recorderManager.onError((error) => {
        console.error('❌ 录音功能测试失败:', error)
        
        let errorMessage = '录音功能测试失败！\n\n错误信息: ' + error.errMsg
        
        // 根据错误类型提供不同的解决方案
        if (error.errMsg.includes('NotFoundError')) {
          errorMessage += '\n\n解决方案:\n1. 请在真机上测试录音功能\n2. 开发工具可能不支持录音功能\n3. 检查设备是否支持录音'
        } else if (error.errMsg.includes('NotAllowedError')) {
          errorMessage += '\n\n解决方案:\n1. 检查录音权限是否已授权\n2. 重新申请录音权限\n3. 检查系统录音权限设置'
        } else if (error.errMsg.includes('NotSupportedError')) {
          errorMessage += '\n\n解决方案:\n1. 检查设备是否支持录音\n2. 更新微信版本\n3. 检查录音格式是否支持'
        } else if (error.errMsg.includes('encodeBitRate')) {
          errorMessage += '\n\n解决方案:\n1. 录音配置参数不兼容\n2. 已移除不兼容的参数\n3. 请重新测试录音功能'
        } else if (error.errMsg.includes('format')) {
          errorMessage += '\n\n解决方案:\n1. 录音格式不支持\n2. 已使用默认格式\n3. 请重新测试录音功能'
        }
        
        wx.showModal({
          title: '录音功能测试',
          content: errorMessage,
          showCancel: false,
          confirmText: '确定'
        })
      })
      
      // 录音暂停事件
      recorderManager.onPause(() => {
        console.log('录音暂停')
      })
      
      // 录音恢复事件
      recorderManager.onResume(() => {
        console.log('录音恢复')
      })
      
      // 开始录音
      try {
        recorderManager.start(options)
        console.log('录音启动命令已发送')
      } catch (startError) {
        console.error('录音启动失败:', startError)
        wx.showModal({
          title: '录音功能测试',
          content: '❌ 录音启动失败！\n\n错误信息: ' + startError.message + '\n\n请在真机上测试录音功能',
          showCancel: false,
          confirmText: '确定'
        })
        return
      }
      
      // 显示测试控制界面
      wx.showModal({
        title: '录音功能测试',
        content: '正在测试录音功能，请说话测试录音效果。\n\n注意：开发工具可能不支持录音功能，请在真机上测试。',
        showCancel: true,
        cancelText: '取消测试',
        confirmText: '结束测试',
        success: (res) => {
          if (res.confirm) {
            // 用户点击确定，停止录音
            try {
              recorderManager.stop()
            } catch (stopError) {
              console.error('停止录音失败:', stopError)
            }
          } else if (res.cancel) {
            // 用户点击取消，停止录音
            try {
              recorderManager.stop()
            } catch (stopError) {
              console.error('停止录音失败:', stopError)
            }
          }
        }
      })
      
    } catch (error) {
      console.error('录音功能测试异常:', error)
      wx.showModal({
        title: '录音功能测试',
        content: '❌ 录音功能测试异常: ' + error.message + '\n\n请在真机上测试录音功能',
        showCancel: false,
        confirmText: '确定'
      })
    }
  },

  // 获取兼容的录音配置
  getCompatibleRecordOptions() {
    const systemInfo = wx.getSystemInfoSync()
    console.log('系统信息:', systemInfo)
    
    // 使用最基础的配置，只包含录音时长
    const options = {
      duration: 10000 // 10秒录音时长
    }
    
    console.log('使用最基础录音配置:', options)
    return options
  },

  // 测试百度云API连接
  async testBaiduAPI() {
    try {
      console.log('开始测试百度云API连接')
      
          wx.showToast({
        title: '测试API连接...',
            icon: 'none'
          })
      
      // 测试获取访问令牌
      const result = await aiService.getBaiduAccessToken('Zakw6jROYh5FQkZ9jTVU11li', 'ohARLcJP7PVUCK3irFEeZoPemLfY2hlD')
      
      if (result.success) {
        wx.showModal({
          title: 'API连接测试',
          content: '✅ 百度云API连接成功！\n\n访问令牌获取正常，可以正常使用语音识别功能。',
          showCancel: false,
          confirmText: '确定'
        })
        console.log('百度云API连接测试成功')
    } else {
        wx.showModal({
          title: 'API连接测试',
          content: '❌ 百度云API连接失败！\n\n错误信息: ' + result.error + '\n\n请检查API密钥是否正确。',
          showCancel: false,
          confirmText: '确定'
        })
        console.error('百度云API连接测试失败:', result.error)
      }
    } catch (error) {
      console.error('API连接测试异常:', error)
      wx.showModal({
        title: 'API连接测试',
        content: '❌ API连接测试异常！\n\n错误信息: ' + error.message,
        showCancel: false,
        confirmText: '确定'
      })
    }
  },

  // 测试网络连接
  async testNetworkConnection() {
    try {
      console.log('开始测试网络连接')
      
          wx.showToast({
        title: '测试网络连接...',
            icon: 'none'
      })
      
      // 测试基本网络连接
      const testResult = await new Promise((resolve) => {
        wx.request({
          url: 'https://www.baidu.com',
          method: 'GET',
          timeout: 10000,
          success: (res) => {
            console.log('网络连接测试成功:', res)
            resolve({
              success: true,
              message: '网络连接正常'
            })
          },
          fail: (error) => {
            console.error('网络连接测试失败:', error)
            resolve({
              success: false,
              error: error.errMsg || '网络连接失败'
          })
        }
      })
      })
      
      if (testResult.success) {
        wx.showModal({
          title: '网络连接测试',
          content: '✅ 网络连接正常！\n\n可以正常访问外网，网络环境良好。',
          showCancel: false,
          confirmText: '确定'
      })
    } else {
        wx.showModal({
          title: '网络连接测试',
          content: '❌ 网络连接失败！\n\n错误信息: ' + testResult.error + '\n\n请检查网络设置。',
          showCancel: false,
          confirmText: '确定'
        })
      }
    } catch (error) {
      console.error('网络连接测试异常:', error)
      wx.showModal({
        title: '网络连接测试',
        content: '❌ 网络连接测试异常！\n\n错误信息: ' + error.message,
        showCancel: false,
        confirmText: '确定'
      })
    }
  },

  // 格式化时间
  formatTime(date) {
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    const day = date.getDate()
    const hour = date.getHours()
    const minute = date.getMinutes()
    const second = date.getSeconds()

    return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')} ${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:${second.toString().padStart(2, '0')}`
  },

  // 播放语音条（独立方法）
  playVoice(e) {
    console.log('🎵 播放按钮被点击 - 独立播放方法')
    console.log('事件对象:', e)
    console.log('当前页面数据:', this.data)
    
    // 获取语音条ID
    const voiceId = e.currentTarget.dataset.id
    console.log('要播放的语音条ID:', voiceId)
    
    if (!voiceId) {
      console.error('语音条ID为空')
      wx.showToast({
        title: '语音条ID错误',
        icon: 'none'
      })
      return
    }
    
    // 查找语音条
    const voice = this.data.voices.find(v => v.id == voiceId)
    console.log('找到的语音条:', voice)
    console.log('当前所有语音条:', this.data.voices)
    
    if (!voice) {
      console.error('未找到对应的语音条')
      wx.showToast({
        title: '语音条不存在',
        icon: 'none'
      })
      return
    }
    
    if (!voice.path) {
      console.error('语音条文件路径为空')
      wx.showToast({
        title: '语音条文件路径错误',
        icon: 'none'
      })
      return
    }
    
    console.log('语音条文件路径:', voice.path)
    
    // 确保录音状态为false，防止播放时触发录音
    this.setData({ isRecording: false })
    
    // 停止任何正在进行的录音
    if (this.currentRecorderManager) {
      try {
        this.currentRecorderManager.stop()
        this.currentRecorderManager = null
      } catch (error) {
        console.error('停止录音失败:', error)
      }
    }
    
    // 使用最可靠的播放方法：创建新的音频上下文并立即播放
    this.playVoiceWithNewContext(voice.path, voiceId)
  },

  // 使用新音频上下文播放语音条（最可靠的方法）
  playVoiceWithNewContext(audioPath, voiceId) {
    console.log('🎵 使用新音频上下文播放:', audioPath)
    console.log('语音条ID:', voiceId)
    
    try {
      // 停止当前播放的音频
      if (this.currentAudioContext) {
        try {
          this.currentAudioContext.stop()
          this.currentAudioContext.destroy()
        } catch (error) {
          console.error('停止当前音频失败:', error)
        }
        this.currentAudioContext = null
      }
      
      // 创建新的音频上下文
      const audioContext = wx.createInnerAudioContext()
      this.currentAudioContext = audioContext
      
      console.log('✅ 音频上下文创建成功')
      
      // 设置音频源
      audioContext.src = audioPath
      console.log('✅ 音频源设置成功:', audioPath)
      
      // 设置音频属性
      audioContext.volume = 1.0  // 设置音量为最大
      audioContext.autoplay = false  // 禁用自动播放
      
      // 播放开始事件
      audioContext.onPlay(() => {
        console.log('✅ 音频开始播放:', voiceId)
        this.isPlaying = true
        this.currentPlayingVoiceId = voiceId
        wx.showToast({
          title: '正在播放...',
          icon: 'none',
          duration: 1000
        })
      })
      
      // 播放结束事件
      audioContext.onEnded(() => {
        console.log('✅ 音频播放结束:', voiceId)
        this.isPlaying = false
        this.currentPlayingVoiceId = null
        wx.showToast({
          title: '播放完成',
          icon: 'none',
          duration: 1000
        })
        try {
          audioContext.destroy()
        } catch (error) {
          console.error('销毁音频上下文失败:', error)
        }
        this.currentAudioContext = null
      })
      
      // 播放错误事件
      audioContext.onError((error) => {
        console.error('❌ 音频播放失败:', error)
        console.error('错误详情:', {
          errCode: error.errCode,
          errMsg: error.errMsg
        })
        this.isPlaying = false
        this.currentPlayingVoiceId = null
        wx.showToast({
          title: '播放失败: ' + (error.errMsg || '未知错误'),
          icon: 'none'
        })
        try {
          audioContext.destroy()
        } catch (destroyError) {
          console.error('销毁音频上下文失败:', destroyError)
        }
        this.currentAudioContext = null
      })
      
      // 播放停止事件
      audioContext.onStop(() => {
        console.log('⏹️ 音频播放停止:', voiceId)
        this.isPlaying = false
        this.currentPlayingVoiceId = null
        try {
          audioContext.destroy()
        } catch (error) {
          console.error('销毁音频上下文失败:', error)
        }
        this.currentAudioContext = null
      })
      
      // 可以播放事件
      audioContext.onCanplay(() => {
        console.log('✅ 音频可以播放:', voiceId)
      })
      
      // 等待事件
      audioContext.onWaiting(() => {
        console.log('⏳ 音频等待中:', voiceId)
      })
      
      // 立即开始播放
      console.log('🚀 开始播放音频...')
      try {
        audioContext.play()
        console.log('播放命令已发送')
        
        // 显示开始播放提示
        wx.showToast({
          title: '开始播放...',
          icon: 'none',
          duration: 1000
        })
        
        // 添加播放状态检查
        setTimeout(() => {
          console.log('播放状态检查:')
          console.log('- 音频上下文:', audioContext)
          console.log('- 音频源:', audioContext.src)
          console.log('- 是否暂停:', audioContext.paused)
          console.log('- 当前时间:', audioContext.currentTime)
          console.log('- 音频时长:', audioContext.duration)
          console.log('- 音量:', audioContext.volume)
        }, 500)
        
      } catch (playError) {
        console.error('播放启动失败:', playError)
        wx.showToast({
          title: '播放启动失败: ' + playError.message,
          icon: 'none'
        })
        try {
          audioContext.destroy()
        } catch (destroyError) {
          console.error('销毁音频上下文失败:', destroyError)
        }
        this.currentAudioContext = null
      }
      
    } catch (error) {
      console.error('❌ 创建音频上下文失败:', error)
      wx.showToast({
        title: '播放失败: ' + error.message,
        icon: 'none'
      })
    }
  },

  // 使用系统API播放语音条
  playVoiceWithSystemAPI(audioPath, voiceId) {
    console.log('🎵 使用系统API播放:', audioPath)
    console.log('语音条ID:', voiceId)
    
    // 先激活音频系统
    this.activateAudioSystemBeforePlay(audioPath, voiceId)
  },

  // 激活音频系统后播放
  activateAudioSystemBeforePlay(audioPath, voiceId) {
    console.log('🔊 激活音频系统后播放')
    
    try {
      // 创建一个临时的录音管理器来激活音频系统
      const tempRecorderManager = wx.getRecorderManager()
      console.log('临时录音管理器创建成功，音频系统已激活')
      
      // 立即显示播放提示
      wx.showToast({
        title: '正在播放...',
        icon: 'none',
        duration: 2000
      })
      
      // 音频系统激活后立即播放
      wx.playVoice({
        filePath: audioPath,
        success: () => {
          console.log('✅ 系统API播放成功:', voiceId)
          wx.showToast({
            title: '播放完成',
            icon: 'success',
            duration: 1000
          })
        },
        fail: (error) => {
          console.error('❌ 系统API播放失败:', error)
          console.error('错误详情:', {
            errCode: error.errCode,
            errMsg: error.errMsg
          })
          
          // 显示详细错误信息
          wx.showModal({
            title: '播放失败',
            content: '播放失败: ' + (error.errMsg || '未知错误') + '\n\n文件路径: ' + audioPath,
            showCancel: false,
            confirmText: '确定'
          })
        }
      })
      
    } catch (error) {
      console.error('激活音频系统失败:', error)
      wx.showModal({
        title: '播放异常',
        content: '激活音频系统失败: ' + error.message,
        showCancel: false,
        confirmText: '确定'
      })
    }
  },

  // 播放按钮点击处理 - 使用最佳实践
  testPlayButton(e) {
    console.log('🎵 播放按钮被点击')
    
    // 获取语音条ID
    const voiceId = e.currentTarget.dataset.id
    console.log('要播放的语音条ID:', voiceId)
    
    if (!voiceId) {
      console.error('语音条ID为空')
      wx.showToast({
        title: '语音条ID错误',
        icon: 'none'
      })
      return
    }
    
    // 查找语音条
    const voice = this.data.voices.find(v => v.id == voiceId)
    console.log('找到的语音条:', voice)
    
    if (!voice || !voice.path) {
      console.error('语音条不存在或路径错误')
      wx.showToast({
        title: '语音条不存在或路径错误',
        icon: 'none'
      })
      return
    }
    
    console.log('语音条文件路径:', voice.path)
    
    // 直接使用简单播放方法，确保能听到声音
    this.simplePlayMethod(voice.path, voiceId)
  },

  // 优化的播放方法 - 遵循微信音频播放最佳实践
  playVoiceOptimized(audioPath, voiceId) {
    console.log('🎵 优化播放方法:', audioPath)
    console.log('当前音频上下文状态:', this.currentAudioContext)
    console.log('当前播放状态:', this.isPlaying)
    console.log('当前播放的语音条ID:', this.currentPlayingVoiceId)
    
    // 确保音频上下文存在
    if (!this.currentAudioContext) {
      console.log('音频上下文不存在，重新创建')
      this.setupAudioContext()
    }
    
    // 如果正在播放同一个音频，则暂停
    if (this.isPlaying && this.currentPlayingVoiceId === voiceId) {
      console.log('暂停当前播放')
      this.currentAudioContext.pause()
      return
    }
    
    // 停止当前播放
    if (this.isPlaying) {
      console.log('停止当前播放')
      this.currentAudioContext.stop()
    }
    
    // 确保录音状态为false，防止播放时触发录音
    this.setData({ isRecording: false })
    
    // 停止任何正在进行的录音
    if (this.currentRecorderManager) {
      try {
        this.currentRecorderManager.stop()
        this.currentRecorderManager = null
      } catch (error) {
        console.error('停止录音失败:', error)
      }
    }
    
    // 设置新的音频源并播放
    console.log('设置音频源:', audioPath)
    this.currentAudioContext.src = audioPath
    this.currentPlayingVoiceId = voiceId
    
    console.log('🚀 开始播放音频...')
    console.log('音频上下文src:', this.currentAudioContext.src)
    console.log('音频上下文状态:', {
      paused: this.currentAudioContext.paused,
      volume: this.currentAudioContext.volume
    })
    
    try {
      this.currentAudioContext.play()
      console.log('播放命令已发送')
      
      // 添加播放状态检查
      setTimeout(() => {
        console.log('播放状态检查:')
        console.log('- 是否暂停:', this.currentAudioContext.paused)
        console.log('- 当前时间:', this.currentAudioContext.currentTime)
        console.log('- 音频时长:', this.currentAudioContext.duration)
        console.log('- 播放状态:', this.isPlaying)
      }, 1000)
      
    } catch (error) {
      console.error('播放启动失败:', error)
      wx.showToast({
        title: '播放启动失败: ' + error.message,
        icon: 'none'
      })
    }
  },

  // 简单的播放方法 - 确保能听到声音
  simplePlayMethod(audioPath, voiceId) {
    console.log('🎵 简单播放方法:', audioPath)
    
    // 确保录音状态为false
    this.setData({ isRecording: false })
    
    // 停止任何正在进行的录音
    if (this.currentRecorderManager) {
      try {
        this.currentRecorderManager.stop()
        this.currentRecorderManager = null
      } catch (error) {
        console.error('停止录音失败:', error)
      }
    }
    
    // 创建新的音频上下文
    const audioContext = wx.createInnerAudioContext()
    
    // 设置音频属性
    audioContext.volume = 1.0  // 设置音量为最大
    audioContext.autoplay = false  // 禁用自动播放
    
    // 设置音频源
    audioContext.src = audioPath
    console.log('音频源设置:', audioPath)
    
    // 播放开始事件
    audioContext.onPlay(() => {
      console.log('✅ 简单方法 - 音频开始播放:', voiceId)
      this.isPlaying = true
      this.currentPlayingVoiceId = voiceId
      wx.showToast({
        title: '正在播放...',
        icon: 'none',
        duration: 1000
      })
    })
    
    // 播放结束事件
    audioContext.onEnded(() => {
      console.log('✅ 简单方法 - 音频播放结束:', voiceId)
      this.isPlaying = false
      this.currentPlayingVoiceId = null
      wx.showToast({
        title: '播放完成',
        icon: 'none',
        duration: 1000
      })
      try {
        audioContext.destroy()
      } catch (error) {
        console.error('销毁音频上下文失败:', error)
      }
    })
    
    // 播放错误事件
    audioContext.onError((error) => {
      console.error('❌ 简单方法 - 音频播放失败:', error)
      console.error('错误详情:', {
        errCode: error.errCode,
        errMsg: error.errMsg
      })
      this.isPlaying = false
      this.currentPlayingVoiceId = null
      wx.showToast({
        title: '播放失败: ' + (error.errMsg || '未知错误'),
        icon: 'none'
      })
      try {
        audioContext.destroy()
      } catch (destroyError) {
        console.error('销毁音频上下文失败:', destroyError)
      }
    })
    
    // 可以播放事件
    audioContext.onCanplay(() => {
      console.log('✅ 简单方法 - 音频可以播放:', voiceId)
    })
    
    // 等待事件
    audioContext.onWaiting(() => {
      console.log('⏳ 简单方法 - 音频等待中:', voiceId)
    })
    
    // 立即开始播放
    console.log('🚀 简单方法 - 开始播放音频...')
    console.log('音频上下文状态:', {
      src: audioContext.src,
      volume: audioContext.volume,
      paused: audioContext.paused
    })
    
    try {
      audioContext.play()
      console.log('简单方法播放命令已发送')
      
      // 添加播放状态检查
      setTimeout(() => {
        console.log('简单方法播放状态检查:')
        console.log('- 是否暂停:', audioContext.paused)
        console.log('- 当前时间:', audioContext.currentTime)
        console.log('- 音频时长:', audioContext.duration)
        console.log('- 音量:', audioContext.volume)
      }, 1000)
      
    } catch (error) {
      console.error('简单方法播放启动失败:', error)
      wx.showToast({
        title: '播放启动失败: ' + error.message,
        icon: 'none'
      })
    }
  },

  // 完全独立的播放方法 - 遵循微信音频播放策略
  fullyIndependentPlay(audioPath, voiceId) {
    console.log('🎵 完全独立播放:', audioPath)
    
    // 确保录音状态为false，防止播放时触发录音
    this.setData({ isRecording: false })
    
    // 停止任何正在进行的录音
    if (this.currentRecorderManager) {
      try {
        this.currentRecorderManager.stop()
        this.currentRecorderManager = null
      } catch (error) {
        console.error('停止录音失败:', error)
      }
    }
    
    // 在用户交互事件中立即创建音频上下文（关键！）
    const audioContext = wx.createInnerAudioContext()
    
    // 设置音频源
    audioContext.src = audioPath
    console.log('音频源设置:', audioPath)
    
    // 设置音量
    audioContext.volume = 1.0
    
    // 播放开始事件
    audioContext.onPlay(() => {
      console.log('✅ 独立播放 - 音频开始播放:', voiceId)
      wx.showToast({
        title: '正在播放...',
        icon: 'none',
        duration: 1000
      })
    })
    
    // 播放结束事件
    audioContext.onEnded(() => {
      console.log('✅ 独立播放 - 音频播放结束:', voiceId)
      wx.showToast({
        title: '播放完成',
        icon: 'none',
        duration: 1000
      })
      // 销毁音频上下文
      try {
        audioContext.destroy()
      } catch (error) {
        console.error('销毁音频上下文失败:', error)
      }
    })
    
    // 播放错误事件
    audioContext.onError((error) => {
      console.error('❌ 独立播放 - 音频播放失败:', error)
      wx.showToast({
        title: '播放失败: ' + (error.errMsg || '未知错误'),
        icon: 'none'
      })
      // 销毁音频上下文
      try {
        audioContext.destroy()
      } catch (destroyError) {
        console.error('销毁音频上下文失败:', destroyError)
      }
    })
    
    // 可以播放事件
    audioContext.onCanplay(() => {
      console.log('✅ 独立播放 - 音频可以播放:', voiceId)
    })
    
    // 等待事件
    audioContext.onWaiting(() => {
      console.log('⏳ 独立播放 - 音频等待中:', voiceId)
    })
    
    // 立即开始播放（在用户交互事件中直接调用）
    console.log('🚀 独立播放 - 开始播放音频...')
    try {
      audioContext.play()
      console.log('独立播放命令已发送')
      
      // 显示开始播放提示
      wx.showToast({
        title: '开始播放...',
        icon: 'none',
        duration: 1000
      })
    } catch (error) {
      console.error('独立播放启动失败:', error)
      wx.showToast({
        title: '播放启动失败: ' + error.message,
        icon: 'none'
      })
    }
  },

  // 系统播放按钮测试
  testSystemPlay(e) {
    console.log('🔊 系统播放按钮被点击')
    console.log('事件对象:', e)
    console.log('数据集:', e.currentTarget.dataset)
    
    // 确保录音状态为false，防止播放时触发录音
    this.setData({ isRecording: false })
    
    // 停止任何正在进行的录音
    if (this.currentRecorderManager) {
      try {
        this.currentRecorderManager.stop()
        this.currentRecorderManager = null
      } catch (error) {
        console.error('停止录音失败:', error)
      }
    }
    
    // 获取语音条ID
    const voiceId = e.currentTarget.dataset.id
    console.log('要播放的语音条ID:', voiceId)
    
    if (!voiceId) {
      wx.showToast({
        title: '语音条ID错误',
        icon: 'none'
      })
      return
    }
    
    // 查找语音条
    const voice = this.data.voices.find(v => v.id == voiceId)
    console.log('找到的语音条:', voice)
    
    if (!voice || !voice.path) {
      wx.showToast({
        title: '语音条不存在或路径错误',
        icon: 'none'
      })
      return
    }
    
    console.log('语音条文件路径:', voice.path)
    
    // 使用系统音频播放
    this.systemAudioTest(voice.path, voiceId)
  },

  // 备用播放方法 - 使用不同的配置
  alternativePlayTest(audioPath, voiceId) {
    console.log('🎵 备用播放测试:', audioPath)
    
    wx.showToast({
      title: '使用备用播放方法...',
      icon: 'none',
      duration: 1000
    })
    
    // 创建音频上下文
    const audioContext = wx.createInnerAudioContext()
    
    // 设置音频源
    audioContext.src = audioPath
    
    // 设置音量
    audioContext.volume = 1.0
    
    // 播放开始事件
    audioContext.onPlay(() => {
      console.log('✅ 备用方法 - 音频开始播放:', voiceId)
      wx.showToast({
        title: '备用方法播放中...',
        icon: 'none',
        duration: 1000
      })
    })
    
    // 播放结束事件
    audioContext.onEnded(() => {
      console.log('✅ 备用方法 - 音频播放结束:', voiceId)
      wx.showToast({
        title: '备用方法播放完成',
        icon: 'none',
        duration: 1000
      })
      audioContext.destroy()
    })
    
    // 播放错误事件
    audioContext.onError((error) => {
      console.error('❌ 备用方法 - 音频播放失败:', error)
      wx.showToast({
        title: '备用方法播放失败',
        icon: 'none'
      })
      audioContext.destroy()
    })
    
    // 可以播放事件
    audioContext.onCanplay(() => {
      console.log('✅ 备用方法 - 音频可以播放:', voiceId)
      // 在可以播放时立即开始播放
      audioContext.play()
    })
    
    // 等待音频可以播放
    console.log('🚀 备用方法 - 等待音频准备...')
  },

  // 系统音频播放测试 - 遵循微信音频播放策略
  systemAudioTest(audioPath, voiceId) {
    console.log('🎵 系统音频播放测试:', audioPath)
    
    // 在用户交互事件中立即调用系统播放（关键！）
    wx.playVoice({
      filePath: audioPath,
      success: () => {
        console.log('✅ 系统音频播放成功:', voiceId)
        wx.showToast({
          title: '系统音频播放成功',
          icon: 'none',
          duration: 1000
        })
      },
      fail: (error) => {
        console.error('❌ 系统音频播放失败:', error)
        wx.showToast({
          title: '系统音频播放失败: ' + (error.errMsg || '未知错误'),
          icon: 'none'
        })
      }
    })
    
    // 显示开始播放提示
    wx.showToast({
      title: '使用系统音频播放...',
      icon: 'none',
      duration: 1000
    })
  },

  // 最简单的播放测试方法
  simplePlayTest(audioPath, voiceId) {
    console.log('🎵 简单播放测试:', audioPath)
    
    // 显示开始播放提示
    wx.showToast({
      title: '开始播放测试...',
      icon: 'none',
      duration: 1000
    })
    
    // 创建音频上下文
    const audioContext = wx.createInnerAudioContext()
    
    // 配置音频上下文
    audioContext.volume = 1.0  // 设置音量为最大
    audioContext.autoplay = false  // 禁用自动播放
    
    // 设置音频源
    audioContext.src = audioPath
    console.log('音频源设置:', audioPath)
    
    // 播放开始事件
    audioContext.onPlay(() => {
      console.log('✅ 音频开始播放:', voiceId)
      console.log('播放状态:', {
        paused: audioContext.paused,
        currentTime: audioContext.currentTime,
        duration: audioContext.duration,
        volume: audioContext.volume
      })
      wx.showToast({
        title: '正在播放...',
        icon: 'none',
        duration: 1000
      })
    })
    
    // 播放结束事件
    audioContext.onEnded(() => {
      console.log('✅ 音频播放结束:', voiceId)
      wx.showToast({
        title: '播放完成',
        icon: 'none',
        duration: 1000
      })
      audioContext.destroy()
    })
    
    // 播放错误事件
    audioContext.onError((error) => {
      console.error('❌ 音频播放失败:', error)
      console.error('错误详情:', {
        errCode: error.errCode,
        errMsg: error.errMsg
      })
      wx.showToast({
        title: '播放失败: ' + (error.errMsg || '未知错误'),
        icon: 'none'
      })
      audioContext.destroy()
    })
    
    // 播放暂停事件
    audioContext.onPause(() => {
      console.log('⏸️ 音频播放暂停:', voiceId)
    })
    
    // 播放停止事件
    audioContext.onStop(() => {
      console.log('⏹️ 音频播放停止:', voiceId)
    })
    
    // 等待事件
    audioContext.onWaiting(() => {
      console.log('⏳ 音频等待中:', voiceId)
    })
    
    // 可以播放事件
    audioContext.onCanplay(() => {
      console.log('✅ 音频可以播放:', voiceId)
    })
    
    // 立即开始播放
    console.log('🚀 开始播放音频...')
    try {
      audioContext.play()
      console.log('播放命令已发送')
      
      // 添加播放状态检查
      setTimeout(() => {
        console.log('播放状态检查:')
        console.log('- 是否暂停:', audioContext.paused)
        console.log('- 当前时间:', audioContext.currentTime)
        console.log('- 音频时长:', audioContext.duration)
        console.log('- 音量:', audioContext.volume)
        console.log('- 音频源:', audioContext.src)
      }, 1000)
      
    } catch (error) {
      console.error('播放启动失败:', error)
      wx.showToast({
        title: '播放启动失败: ' + error.message,
        icon: 'none'
      })
    }
  },

  // 完全独立的播放方法
  standalonePlayAudio(audioPath, voiceId) {
    console.log('🎵 独立播放音频:', audioPath)
    
    // 显示开始播放提示
    wx.showToast({
      title: '开始播放...',
      icon: 'none',
      duration: 1000
    })
    
    // 停止任何现有的音频播放
    if (this.currentAudioContext) {
      try {
        this.currentAudioContext.stop()
        this.currentAudioContext.destroy()
      } catch (error) {
        console.error('停止当前音频失败:', error)
      }
      this.currentAudioContext = null
    }
    
    // 创建全新的音频上下文
    try {
      const audioContext = wx.createInnerAudioContext()
      this.currentAudioContext = audioContext
      
      console.log('✅ 音频上下文创建成功')
      
      // 设置音频源
      audioContext.src = audioPath
      console.log('✅ 音频源设置成功:', audioPath)
      
      // 播放开始事件
      audioContext.onPlay(() => {
        console.log('✅ 音频开始播放:', voiceId)
        wx.showToast({
          title: '正在播放...',
          icon: 'none',
          duration: 1000
        })
      })
      
      // 播放结束事件
      audioContext.onEnded(() => {
        console.log('✅ 音频播放结束:', voiceId)
        wx.showToast({
          title: '播放完成',
          icon: 'none',
          duration: 1000
        })
        try {
          audioContext.destroy()
        } catch (error) {
          console.error('销毁音频上下文失败:', error)
        }
        this.currentAudioContext = null
      })
      
      // 播放错误事件
      audioContext.onError((error) => {
        console.error('❌ 音频播放失败:', error)
        wx.showToast({
          title: '播放失败: ' + (error.errMsg || '未知错误'),
          icon: 'none'
        })
        try {
          audioContext.destroy()
        } catch (destroyError) {
          console.error('销毁音频上下文失败:', destroyError)
        }
        this.currentAudioContext = null
      })
      
      // 播放停止事件
      audioContext.onStop(() => {
        console.log('⏹️ 音频播放停止:', voiceId)
        try {
          audioContext.destroy()
        } catch (error) {
          console.error('销毁音频上下文失败:', error)
        }
        this.currentAudioContext = null
      })
      
      // 立即开始播放
      console.log('🚀 开始播放音频...')
      audioContext.play()
      
      // 添加播放状态检查
      setTimeout(() => {
        console.log('播放状态检查:')
        console.log('- 音频上下文:', audioContext)
        console.log('- 音频源:', audioContext.src)
        console.log('- 是否暂停:', audioContext.paused)
        console.log('- 当前时间:', audioContext.currentTime)
        console.log('- 音频时长:', audioContext.duration)
      }, 500)
      
    } catch (error) {
      console.error('❌ 创建音频上下文失败:', error)
      wx.showToast({
        title: '播放失败: ' + error.message,
        icon: 'none'
      })
    }
  },

  // 直接播放音频的简化方法
  playAudioDirectly(audioPath, voiceId) {
    console.log('🎵 直接播放音频:', audioPath)
    
    // 停止当前播放
    if (this.currentAudioContext) {
      try {
        this.currentAudioContext.stop()
        this.currentAudioContext.destroy()
      } catch (error) {
        console.error('停止当前音频失败:', error)
      }
      this.currentAudioContext = null
    }
    
    // 创建新的音频上下文
    const audioContext = wx.createInnerAudioContext()
    this.currentAudioContext = audioContext
    
    // 设置音频源
    audioContext.src = audioPath
    
    // 播放开始
    audioContext.onPlay(() => {
      console.log('✅ 开始播放:', voiceId)
      wx.showToast({
        title: '正在播放...',
        icon: 'none',
        duration: 1000
      })
    })
    
    // 播放结束
    audioContext.onEnded(() => {
      console.log('✅ 播放结束:', voiceId)
      try {
        audioContext.destroy()
      } catch (error) {
        console.error('销毁音频上下文失败:', error)
      }
      this.currentAudioContext = null
    })
    
    // 播放错误
    audioContext.onError((error) => {
      console.error('❌ 播放失败:', error)
      wx.showToast({
        title: '播放失败',
        icon: 'none'
      })
      try {
        audioContext.destroy()
      } catch (destroyError) {
        console.error('销毁音频上下文失败:', destroyError)
      }
      this.currentAudioContext = null
    })
    
    // 开始播放
    try {
      audioContext.play()
      console.log('播放命令已发送')
    } catch (error) {
      console.error('播放启动失败:', error)
      wx.showToast({
        title: '播放启动失败',
        icon: 'none'
      })
    }
  },

  // 删除语音条
  deleteVoice(e) {
    const voiceId = e.currentTarget.dataset.id
    
      wx.showModal({
      title: '确认删除',
      content: '确定要删除这个语音条吗？',
        success: (res) => {
          if (res.confirm) {
          const voices = this.data.voices.filter(v => v.id !== voiceId)
            this.setData({
            voices: voices,
              isSynced: false
            })
            
            wx.showToast({
            title: '语音条已删除',
              icon: 'success'
            })
          }
        }
    })
  },

  // 语音转文字
  async convertVoiceToText(e) {
    const voiceId = e.currentTarget.dataset.id
    const voice = this.data.voices.find(v => v.id === voiceId)
    
    if (!voice) return
    
    try {
      wx.showLoading({
        title: '语音识别中...',
        mask: true
      })
      
      // 调用语音转文字服务
      const result = await aiService.speechToTextWithBaidu(voice.path)
      
      wx.hideLoading()
      
      if (result.success && result.text) {
        // 将识别结果添加到笔记内容
        const currentContent = this.data.noteContent
        const newContent = currentContent + (currentContent ? '\n' : '') + result.text
        
            this.setData({
          noteContent: newContent,
              isSynced: false
            })
        
        this.updateWordCount()
        
        // 如果标题为空，自动设置第一句话为标题
        this.autoSetTitleFromContent(newContent)
        
        // 移除自动生成智能标签，等待用户手动点击生成
        // this.generateTags()
            
            wx.showToast({
          title: '语音识别完成',
              icon: 'success'
            })
        
        console.log('语音识别结果:', result.text)
      } else {
        wx.showToast({
          title: result.error || '语音识别失败',
          icon: 'none'
        })
      }
    } catch (error) {
      wx.hideLoading()
      console.error('语音识别异常:', error)
      wx.showToast({
        title: '语音识别失败，请重试',
        icon: 'none'
      })
    }
  },

  // 拍照
  takePhoto() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['camera'],
      camera: 'back',
      success: (res) => {
        if (res.tempFiles && res.tempFiles.length > 0) {
          this.addImage(res.tempFiles[0].tempFilePath)
        }
      },
      fail: (error) => {
        console.error('拍照失败:', error)
      wx.showToast({
          title: '拍照失败',
        icon: 'none'
      })
    }
    })
  },

  // 从相册选择
  selectFromAlbum() {
    wx.chooseMedia({
      count: 9, // 最多选择9张图片
      mediaType: ['image'],
      sourceType: ['album'],
      success: (res) => {
        if (res.tempFiles && res.tempFiles.length > 0) {
          // 批量添加图片
          res.tempFiles.forEach(file => {
            this.addImage(file.tempFilePath)
          })
        }
        },
        fail: (error) => {
        console.error('选择图片失败:', error)
        wx.showToast({
          title: '选择图片失败',
          icon: 'none'
        })
      }
      })
  },

  // 添加图片（带压缩功能）
  async addImage(imagePath) {
    wx.showLoading({ title: '压缩图片中...' })
    
    try {
      // 获取原始图片信息
      const imageInfo = await new Promise((resolve, reject) => {
        wx.getImageInfo({
          src: imagePath,
          success: resolve,
          fail: reject
        })
      })
      
      const originalSize = imageInfo.size || 0
      console.log('原始图片大小:', (originalSize / 1024).toFixed(2), 'KB')
      
      let finalPath = imagePath
      let compressedSize = originalSize
      
      // 如果图片大于500KB，进行压缩
      if (originalSize > 500 * 1024) {
        console.log('图片较大，开始压缩...')
        
        try {
          const compressResult = await new Promise((resolve, reject) => {
            wx.compressImage({
              src: imagePath,
              quality: 70, // 压缩质量70%
              success: resolve,
              fail: reject
            })
          })
          
          finalPath = compressResult.tempFilePath
          
          // 获取压缩后的大小
          const compressedInfo = await new Promise((resolve, reject) => {
            wx.getImageInfo({
              src: finalPath,
              success: resolve,
              fail: reject
            })
          })
          
          compressedSize = compressedInfo.size || originalSize
          console.log('压缩后大小:', (compressedSize / 1024).toFixed(2), 'KB')
          console.log('压缩率:', ((1 - compressedSize / originalSize) * 100).toFixed(1), '%')
          
          wx.showToast({
            title: `图片已压缩${((1 - compressedSize / originalSize) * 100).toFixed(0)}%`,
            icon: 'success',
            duration: 1500
          })
        } catch (compressError) {
          console.warn('图片压缩失败，使用原图:', compressError)
        }
      }
      
      const imageData = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        path: finalPath,
        originalPath: imagePath,
        width: imageInfo.width,
        height: imageInfo.height,
        size: compressedSize,
        originalSize: originalSize,
        compressed: compressedSize < originalSize,
        createTime: this.formatTime(new Date())
      }
      
      // 添加到图片列表
      const images = [...this.data.images, imageData]
      this.setData({ 
        images: images,
        isSynced: false
      })
      
      wx.hideLoading()
      
      // 可选：自动进行AI识别
      this.processImageInput(finalPath)
    } catch (error) {
      wx.hideLoading()
      console.error('添加图片失败:', error)
      wx.showToast({
        title: '添加图片失败',
        icon: 'none'
      })
    }
  },

  // 处理图片输入
  async processImageInput(imagePath) {
    wx.showLoading({ title: '识别中...' })
    try {
      const result = await aiService.imageToText(imagePath)
      
      if (result.success) {
        // 清理和格式化识别文字
        const cleanedText = this.cleanOCRText(result.text)
        
        const currentContent = this.data.noteContent
        const newContent = currentContent + (currentContent ? '\n' : '') + cleanedText
        this.setData({
          noteContent: newContent,
          isSynced: false
        })
        this.updateWordCount()
        
        // 如果标题为空，自动设置第一句话为标题
        this.autoSetTitleFromContent(newContent)
        
        // 移除自动生成智能标签，等待用户手动点击生成
        // await this.generateInitialTags(newContent)
        
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

  // 清理OCR识别文字
  cleanOCRText(text) {
    if (!text) return ''
    
    console.log('原始OCR文字:', text)
    
    // 1. 移除多余的换行符和空格
    let cleaned = text
      .replace(/\r\n/g, '\n')           // 统一换行符
      .replace(/\r/g, '\n')             // 统一换行符
      .replace(/\n{3,}/g, '\n\n')       // 多个连续换行符替换为两个
      .replace(/[ \t]+/g, ' ')          // 多个连续空格替换为一个
      .replace(/[ \t]*\n[ \t]*/g, '\n') // 移除换行符前后的空格
      .trim()                           // 移除首尾空白
    
    // 2. 处理中文字符间的换行（可能是OCR误识别）
    cleaned = cleaned
      .replace(/([一-龯])\n([一-龯])/g, '$1$2')  // 中文字符间的换行
      .replace(/([a-zA-Z])\n([a-zA-Z])/g, '$1 $2') // 英文字符间的换行改为空格
    
    // 3. 处理标点符号后的换行
    cleaned = cleaned
      .replace(/([。！？；：])\n/g, '$1')         // 句号、感叹号、问号、分号、冒号后的换行
      .replace(/([，、])\n/g, '$1 ')              // 逗号、顿号后的换行改为空格
      .replace(/([）】」』])\n/g, '$1')           // 右括号后的换行
    
    // 4. 处理数字和字母的换行
    cleaned = cleaned
      .replace(/(\d)\n(\d)/g, '$1$2')            // 数字间的换行
      .replace(/([a-zA-Z])\n(\d)/g, '$1 $2')     // 字母和数字间的换行
      .replace(/(\d)\n([a-zA-Z])/g, '$1 $2')     // 数字和字母间的换行
    
    // 5. 处理特殊符号
    cleaned = cleaned
      .replace(/([（【「『])\n/g, '$1')           // 左括号后的换行
      .replace(/\n([）】」』])/g, '$1')           // 右括号前的换行
      .replace(/([（【「『])\n([^）】」』])/g, '$1$2') // 左括号后到右括号前的内容
    
    // 6. 最终清理
    cleaned = cleaned
      .replace(/\n{2,}/g, '\n\n')       // 再次处理多个连续换行
      .replace(/[ \t]+/g, ' ')          // 再次处理多个连续空格
      .trim()                           // 最终移除首尾空白
    
    console.log('清理后OCR文字:', cleaned)
    
    return cleaned
  },

  // 预览图片
  previewImage(e) {
    const current = e.currentTarget.dataset.src
    const urls = this.data.images.map(img => img.path)
    
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

  // 删除图片
  deleteImage(e) {
    const imageId = e.currentTarget.dataset.id
    const image = this.data.images.find(img => img.id === imageId)
    
    if (image) {
      wx.showModal({
        title: '删除图片',
        content: '确定要删除这张图片吗？',
        success: (res) => {
          if (res.confirm) {
            const images = this.data.images.filter(img => img.id !== imageId)
            this.setData({
              images: images,
              isSynced: false
            })
            
            wx.showToast({
              title: '删除成功',
              icon: 'success'
            })
          }
        }
      })
    }
  },

  // 上传图片到服务器
  uploadImage(e) {
    const imageId = e.currentTarget.dataset.id
    const image = this.data.images.find(img => img.id === imageId)
    
    if (!image) {
      wx.showToast({
        title: '图片不存在',
        icon: 'none'
      })
      return
    }
    
    // 检查网络状态
    wx.getNetworkType({
      success: (res) => {
        if (res.networkType === 'none') {
          wx.showToast({
            title: '网络连接失败',
            icon: 'none'
          })
          return
        }
        
        this.performImageUpload(image, imageId)
      },
      fail: () => {
        wx.showToast({
          title: '网络检查失败',
          icon: 'none'
        })
      }
    })
  },

  // 执行图片上传
  performImageUpload(image, imageId) {
    wx.showLoading({ title: '上传中...' })
    
    // 检查是否有配置的上传接口
    const uploadUrl = this.getUploadUrl()
    if (!uploadUrl) {
      wx.hideLoading()
      wx.showModal({
        title: '上传功能未配置',
        content: '请先配置图片上传接口URL',
        showCancel: false,
        confirmText: '知道了'
      })
      return
    }
    
    console.log('开始上传图片:', {
      imageId: imageId,
      filePath: image.path,
      uploadUrl: uploadUrl
    })
    
    wx.uploadFile({
      url: uploadUrl,
      filePath: image.path,
      name: 'file',
      formData: {
        'noteId': this.data.editingNoteId || 'new',
        'imageId': imageId,
        'timestamp': Date.now()
      },
      success: (res) => {
        wx.hideLoading()
        console.log('上传响应:', res)
        
        try {
          // 尝试解析响应数据
          let result
          if (typeof res.data === 'string') {
            result = JSON.parse(res.data)
          } else {
            result = res.data
          }
          
          if (result && result.success) {
            // 更新图片信息，添加服务器URL
            const images = this.data.images.map(img => {
              if (img.id === imageId) {
                return {
                  ...img,
                  serverUrl: result.url || result.data?.url,
                  uploaded: true,
                  uploadTime: this.formatTime(new Date())
                }
              }
              return img
            })
            
            this.setData({ images })
        
        wx.showToast({
              title: '上传成功',
          icon: 'success'
        })
      } else {
            const errorMsg = result?.message || result?.error || '服务器返回错误'
            console.error('上传失败:', errorMsg)
        wx.showToast({
              title: `上传失败: ${errorMsg}`,
              icon: 'none',
              duration: 3000
        })
      }
    } catch (error) {
          console.error('解析上传结果失败:', error)
          console.error('原始响应数据:', res.data)
      wx.showToast({
            title: '服务器响应格式错误',
            icon: 'none',
            duration: 3000
      })
    }
  },
      fail: (error) => {
        wx.hideLoading()
        console.error('上传请求失败:', error)
        
        let errorMessage = '上传失败'
        if (error.errMsg) {
          if (error.errMsg.includes('timeout')) {
            errorMessage = '上传超时，请检查网络'
          } else if (error.errMsg.includes('fail')) {
            errorMessage = '网络连接失败'
          } else {
            errorMessage = `上传失败: ${error.errMsg}`
          }
        }
        
        wx.showToast({
          title: errorMessage,
          icon: 'none',
          duration: 3000
        })
      }
    })
  },

  // 配置上传接口
  configUploadUrl() {
    const currentUrl = this.getUploadUrl()
    
      wx.showModal({
      title: '配置上传接口',
      editable: true,
      placeholderText: '请输入图片上传接口URL',
      content: currentUrl || '',
        success: (res) => {
        if (res.confirm && res.content.trim()) {
          const newUrl = res.content.trim()
          
          // 验证URL格式
          if (!this.isValidUrl(newUrl)) {
            wx.showToast({
              title: 'URL格式不正确',
        icon: 'none'
      })
            return
          }
          
          // 保存到本地存储
          wx.setStorageSync('uploadUrl', newUrl)
            
            wx.showToast({
            title: '配置保存成功',
              icon: 'success'
            })
          }
        }
      })
  },

  // 验证URL格式
  isValidUrl(string) {
    try {
      new URL(string)
      return true
    } catch (_) {
      return false
    }
  },

  // 获取上传URL配置
  getUploadUrl() {
    // 从本地存储读取配置的URL
    return wx.getStorageSync('uploadUrl') || null
  },

  // 测试OCR连接
  async testOCRConnection() {
    wx.showLoading({ title: '测试OCR连接...' })
    
    try {
      const result = await aiService.testBaiduOCRConnection()
      
      wx.hideLoading()
      
      if (result.success) {
        wx.showModal({
          title: 'OCR连接测试',
          content: `✅ ${result.message}\n\n访问令牌获取成功，OCR功能可用。`,
          showCancel: false,
          confirmText: '知道了'
        })
      } else {
        wx.showModal({
          title: 'OCR连接测试',
          content: `❌ 连接失败\n\n错误信息：${result.error}\n\n请检查API密钥配置。`,
          showCancel: false,
          confirmText: '知道了'
        })
      }
    } catch (error) {
      wx.hideLoading()
      console.error('OCR连接测试异常:', error)
      wx.showModal({
        title: 'OCR连接测试',
        content: `❌ 测试异常\n\n${error.message}`,
        showCancel: false,
        confirmText: '知道了'
      })
    }
  },

  // 批量上传所有图片
  uploadAllImages() {
    if (this.data.images.length === 0) {
      wx.showToast({
        title: '没有图片需要上传',
        icon: 'none'
      })
      return
    }
    
    wx.showModal({
      title: '批量上传',
      content: `确定要上传 ${this.data.images.length} 张图片吗？`,
      success: (res) => {
        if (res.confirm) {
          this.data.images.forEach((image, index) => {
            if (!image.uploaded) {
              setTimeout(() => {
                this.uploadImage({ currentTarget: { dataset: { id: image.id } } })
              }, index * 1000) // 每张图片间隔1秒上传
            }
          })
        }
      }
    })
  },

  // AI功能已移除，只保留自动生成智能标签功能

  // 清空所有标签
  clearAllTags() {
    if (this.data.tags.length === 0) {
      wx.showToast({
        title: '没有标签可清空',
        icon: 'none'
      })
      return
    }

    wx.showModal({
      title: '确认清空',
      content: `确定要清空所有 ${this.data.tags.length} 个标签吗？`,
      success: (res) => {
        if (res.confirm) {
          this.setData({
            tags: [],
            isSynced: false
          })
          
          wx.showToast({
            title: '标签已清空',
            icon: 'success',
            duration: 1000
          })
          
          console.log('所有标签已清空')
        }
      }
    })
  },

  // 添加标签
  addTag() {
    wx.showModal({
      title: '添加标签',
      editable: true,
      placeholderText: '输入标签名称（无字数限制）',
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
    this.setData({ 
      tags: newTags,
      isSynced: false
    })
  },

  // 加载来源历史记录
  loadSourceHistory() {
    try {
      const history = noteManager.getSourceHistory()
      this.setData({
        sourceHistory: history
      })
      console.log('来源历史记录加载完成:', history)
    } catch (error) {
      console.error('加载来源历史记录失败:', error)
    }
  },

  // 保存来源历史记录
  saveSourceHistory(source) {
    try {
      const history = noteManager.saveSourceHistory(source)
      this.setData({
        sourceHistory: history
      })
    } catch (error) {
      console.error('保存来源历史记录失败:', error)
    }
  },

  // 点击来源标签
  onSourceTagClick() {
    if (this.data.sourceHistory.length > 0) {
      // 显示历史记录选择器
      wx.showActionSheet({
        itemList: ['手动输入', ...this.data.sourceHistory],
        success: (res) => {
          if (res.tapIndex === 0) {
            // 手动输入
            this.showSourceInput()
          } else {
            // 选择历史记录
            const selectedSource = this.data.sourceHistory[res.tapIndex - 1]
            this.setData({
              source: selectedSource,
              isSynced: false
            })
          }
        }
      })
    } else {
      // 直接显示输入框
      this.showSourceInput()
    }
  },

  // 显示来源输入框
  showSourceInput() {
    wx.showModal({
      title: '添加笔记来源',
      editable: true,
      placeholderText: '输入笔记来源，如：书籍名称、网站、讲座等',
      success: (res) => {
        if (res.confirm && res.content.trim()) {
          const source = res.content.trim()
          this.setData({
            source: source,
            isSynced: false
          })
          this.saveSourceHistory(source)
        }
      }
    })
  },

  // 清除来源
  clearSource() {
    wx.showModal({
      title: '确认清除',
      content: '确定要清除笔记来源吗？',
      success: (res) => {
        if (res.confirm) {
          this.setData({
            source: '',
            isSynced: false
          })
        }
      }
    })
  },

  // 清空所有标签
  clearAllTags() {
    if (this.data.tags.length === 0) {
      wx.showToast({
        title: '没有标签需要清空',
        icon: 'none'
      })
      return
    }
    
    wx.showModal({
      title: '清空标签',
      content: `确定要清空所有 ${this.data.tags.length} 个标签吗？`,
      success: (res) => {
        if (res.confirm) {
          this.setData({
            tags: [],
            isSynced: false
          })
          
          wx.showToast({
            title: '标签已清空',
            icon: 'success'
          })
        }
      }
    })
  },

  // 创建新笔记
  createNewNote() {
    // 检查当前是否有未保存的内容
    const hasUnsavedContent = this.data.noteTitle.trim() || this.data.noteContent.trim() || this.data.tags.length > 0
    
    if (hasUnsavedContent && !this.data.isSynced) {
      wx.showModal({
        title: '创建新笔记',
        content: '当前笔记尚未保存，确定要创建新笔记吗？',
        showCancel: true,
        cancelText: '取消',
        confirmText: '确定',
        success: (res) => {
          if (res.confirm) {
            this.clearCurrentNote()
          }
        }
      })
    } else {
      this.clearCurrentNote()
    }
  },

  // 清空当前笔记内容
  clearCurrentNote() {
    this.setData({
      noteTitle: '',
      noteContent: '',
      noteUrl: '',
      selectedCategories: [],
      isArtSelected: false,
      isCuteSelected: false,
      isDreamsSelected: false,
      isFoodsSelected: false,
      isHappinessSelected: false,
      isKnowledgeSelected: false,
      isSightsSelected: false,
      isThinkingSelected: false,
      tags: [],
      images: [],
      voices: [],
      categoryTag: '',
      source: '',
      wordCount: 0,
      createTime: this.formatTime(new Date()),
      isEditMode: false,
      editingNoteId: null,
      isSynced: false
    })
    
    // 重新生成默认标签
    if (this.data.selectedCategories.length > 0) {
      this.generateDefaultTags(this.data.selectedCategories[0])
    }
    
    wx.showToast({
      title: '已创建新笔记',
      icon: 'success'
    })
  },

  // 加载账户数据
  loadAccountData() {
    try {
      // 获取当前用户信息
      const userInfo = wx.getStorageSync('userInfo')
      if (!userInfo || !userInfo.username) {
        console.log('未找到用户信息，跳过账户数据加载')
        return
      }
      
      const accountName = userInfo.username
      console.log('加载账户数据:', accountName)
      
      // 获取账户信息
      const accountInfo = noteManager.getAccountInfo(accountName)
      if (accountInfo.success) {
        console.log('账户信息:', accountInfo)
        console.log(`账户 ${accountName} 包含 ${accountInfo.noteCount} 条笔记`)
      } else {
        console.log('账户不存在或为空:', accountInfo.error)
      }
    } catch (error) {
      console.error('加载账户数据异常:', error)
    }
  },

  // 保存笔记

  // 保存笔记到本地存储
  saveNoteToStorage(note) {
    // 使用统一的笔记管理服务保存
    // noteManager.saveNote 会自动保存到当前登录账户
    const result = noteManager.saveNote(note)
    if (!result.success) {
      console.error('保存笔记失败:', result.error)
      
      // 如果是需要登录的错误，显示登录提示
      if (result.needLogin) {
        wx.showModal({
          title: '需要登录',
          content: '保存笔记需要先登录账户，是否前往登录？',
          confirmText: '去登录',
          cancelText: '取消',
          success: (res) => {
            if (res.confirm) {
              wx.navigateTo({
                url: '/pages/login/login'
              })
            }
          }
        })
        return false
      }
      
      wx.showToast({
        title: '保存失败: ' + result.error,
        icon: 'none',
        duration: 3000
      })
      return false
    }
    
    console.log('✅ 笔记已保存')
    console.log('账户:', result.account || '未登录')
    console.log('笔记ID:', result.note ? result.note.id : '未知')
    
    // 尝试同步到服务器（如果服务器可用）
    this.syncNoteToServer(note).catch(error => {
      console.log('服务器同步失败，但本地保存成功:', error.message)
    })
    
    return true
  },

  // 同步笔记到服务器（可选）
  async syncNoteToServer(note) {
    try {
      const userInfo = wx.getStorageSync('userInfo')
      if (!userInfo || !userInfo.token) {
        console.log('用户未登录或没有token，跳过服务器同步')
        return
      }

      console.log('📤 尝试同步笔记到服务器...')
      
      const noteData = {
        title: note.title,
        content: note.content,
        category: note.category,
        tags: note.tags || []
      }
      
      let apiResult
      if (note.serverId) {
        // 更新现有笔记
        apiResult = await apiService.updateNote(note.serverId, noteData)
      } else {
        // 创建新笔记
        apiResult = await apiService.createNote(noteData)
      }
      
      if (apiResult.success) {
        console.log('✅ 笔记已同步到服务器')
        // 更新本地笔记的服务器ID
        if (apiResult.data && apiResult.data.id) {
          note.serverId = apiResult.data.id
          note.lastSyncTime = new Date().toISOString()
          // 更新本地存储
          noteManager.saveNote(note)
        }
      } else {
        console.log('⚠️ 服务器同步失败，但本地保存成功')
      }
    } catch (error) {
      console.log('⚠️ 服务器同步异常，但本地保存成功:', error.message)
    }
  },

  // 保存笔记到当前登录账户（同时保存到服务器）
  async saveNoteToCurrentAccount(note) {
    try {
      // 获取当前用户信息
      const userInfo = wx.getStorageSync('userInfo')
      if (!userInfo || !userInfo.username) {
        console.warn('未找到用户信息，跳过账户保存')
        return
      }
      
      const accountName = userInfo.username
      console.log('保存笔记到账户:', accountName)
      
      // ========== 新增：保存到API服务器 ==========
      try {
        if (userInfo.token) {
          console.log('📤 开始保存笔记到服务器...')
          
          const noteData = {
            title: note.title,
            content: note.content,
            category: note.category,
            tags: note.tags || []
          }
          
          let apiResult
          if (note.serverId) {
            // 更新现有笔记
            console.log('更新服务器笔记:', note.serverId)
            apiResult = await apiService.updateNote(note.serverId, noteData)
          } else {
            // 创建新笔记
            console.log('创建服务器笔记')
            apiResult = await apiService.createNote(noteData)
          }
          
          if (apiResult.success) {
            console.log('✅ 笔记已保存到服务器')
            // 保存服务器返回的ID
            if (apiResult.data && apiResult.data.id) {
              note.serverId = apiResult.data.id
            }
            note.lastSyncTime = new Date().toISOString()
          }
        }
      } catch (apiError) {
        console.error('❌ 保存到服务器失败:', apiError)
        // API保存失败不影响本地保存
      }
      // ========== API保存结束 ==========
      
      // 获取当前账户的所有笔记（本地存储）
      const accountResult = noteManager.getNotesFromAccount(accountName)
      let accountNotes = []
      
      if (accountResult.success && accountResult.notes) {
        accountNotes = accountResult.notes
        console.log('当前账户已有笔记数量:', accountNotes.length)
      } else {
        console.log('当前账户还没有笔记，创建新的笔记列表')
      }
      
      // 检查是否已存在相同ID的笔记（更新模式）
      const existingIndex = accountNotes.findIndex(n => n.id === note.id)
      if (existingIndex !== -1) {
        // 更新现有笔记
        accountNotes[existingIndex] = note
        console.log('更新账户中的笔记:', note.id)
      } else {
        // 添加新笔记
        accountNotes.push(note)
        console.log('添加新笔记到账户:', note.id)
      }
      
      // 保存到账户（本地存储）
      const saveResult = noteManager.saveNotesToAccount(accountName, accountNotes)
      if (saveResult.success) {
        console.log('笔记已保存到本地账户:', accountName, '总数:', accountNotes.length)
        
        // 同时更新全局存储，确保页面显示最新数据
        wx.setStorageSync('notes', accountNotes)
        console.log('已同步更新全局存储')
      } else {
        console.error('保存到账户失败:', saveResult.error)
      }
    } catch (error) {
      console.error('保存到账户异常:', error)
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
  },

  // 初始化音频系统
  initializeAudioSystem() {
    console.log('🔊 初始化音频系统')
    
    try {
      // 检查录音管理器是否可用（这会激活音频系统）
      if (wx.getRecorderManager) {
        console.log('录音管理器可用，创建临时录音管理器激活音频系统')
        
        // 创建一个临时的录音管理器来激活音频系统
        const tempRecorderManager = wx.getRecorderManager()
        console.log('临时录音管理器创建成功')
        
        // 立即销毁临时录音管理器
        setTimeout(() => {
          try {
            // 不需要显式销毁录音管理器，它会在页面卸载时自动清理
            console.log('临时录音管理器已清理')
          } catch (error) {
            console.error('清理临时录音管理器失败:', error)
          }
        }, 100)
      } else {
        console.log('录音管理器不可用')
      }
      
      // 检查音频上下文是否可用
      if (wx.createInnerAudioContext) {
        console.log('音频上下文API可用')
      } else {
        console.log('音频上下文API不可用')
      }
      
    } catch (error) {
      console.error('初始化音频系统失败:', error)
    }
  },

  // 确保音频系统已激活
  ensureAudioSystemReady() {
    console.log('🔊 确保音频系统已激活')
    
    try {
      // 检查录音管理器是否可用（这会激活音频系统）
      if (wx.getRecorderManager) {
        console.log('录音管理器可用，音频系统已激活')
      } else {
        console.log('录音管理器不可用')
      }
      
    } catch (error) {
      console.error('激活音频系统失败:', error)
    }
  },

  // 返回上一页
  goBack() {
    // 检查是否有未保存的内容
    const hasUnsavedContent = this.data.noteTitle.trim() || this.data.noteContent.trim() || this.data.tags.length > 0
    
    if (hasUnsavedContent && !this.data.isSynced) {
      wx.showModal({
        title: '提示',
        content: '当前笔记尚未保存，确定要离开吗？',
        showCancel: true,
        cancelText: '取消',
        confirmText: '确定',
        success: (res) => {
          if (res.confirm) {
            this.navigateToHome()
          }
        }
      })
    } else {
      this.navigateToHome()
    }
  },

  // 跳转到首页
  navigateToHome() {
    try {
      // 尝试使用switchTab跳转到首页
      wx.switchTab({
        url: '/pages/1/1',
        success: () => {
          console.log('成功跳转到首页')
        },
        fail: (error) => {
          console.log('switchTab失败，尝试其他方式:', error)
          // 如果switchTab失败，尝试使用navigateTo
          wx.navigateTo({
            url: '/pages/1/1',
            fail: (error2) => {
              console.log('navigateTo也失败，使用reLaunch:', error2)
              // 最后尝试使用reLaunch
              wx.reLaunch({
                url: '/pages/1/1'
              })
            }
          })
        }
      })
    } catch (error) {
      console.error('跳转首页失败:', error)
      // 如果所有方法都失败，使用navigateBack作为备选
      wx.navigateBack()
    }
  },

  // 切换保存图片选项
  toggleSaveImages() {
    this.setData({
      saveImages: !this.data.saveImages
    })
  },

  // 切换保存语音选项
  toggleSaveVoices() {
    this.setData({
      saveVoices: !this.data.saveVoices
    })
  },

  // 图片转文字输入
  convertImageToText(e) {
    const imageId = e.currentTarget.dataset.id
    const image = this.data.images.find(img => img.id === imageId)
    
    if (!image) {
      wx.showToast({
        title: '图片不存在',
        icon: 'none'
      })
      return
    }
    
    this.processImageInput(image.path)
  },

  // 优化的保存笔记方法
  saveNote() {
    if (this.data.selectedCategories.length === 0) {
      wx.showToast({
        title: '请选择至少一个分类',
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
    
    // 创建笔记对象，根据保存选项决定是否包含附件
    const note = {
      id: this.data.isEditMode ? this.data.editingNoteId : Date.now().toString(),
      title: this.data.noteTitle || '无标题笔记',
      content: this.data.noteContent,
      url: this.data.noteUrl,
      category: this.data.selectedCategories,
      tags: this.data.tags,
      categoryTag: this.data.categoryTag,
      source: this.data.source, // 保存来源
      createTime: this.data.isEditMode ? this.data.createTime : this.formatTime(new Date()),
      updateTime: this.formatTime(new Date()),
      wordCount: this.data.wordCount
    }

    // 根据保存选项决定是否保存附件
    if (this.data.saveImages) {
      note.images = this.data.images
    } else {
      note.images = []
    }

    if (this.data.saveVoices) {
      note.voices = this.data.voices
    } else {
      note.voices = []
    }

    // 保存到本地存储和账户
    const saveSuccess = this.saveNoteToStorage(note)
    
    // 模拟保存过程
    setTimeout(() => {
      wx.hideLoading()
      this.setData({ isSynced: true })
      
      if (saveSuccess) {
        wx.showToast({
          title: '保存成功',
          icon: 'success'
        })
      } else {
        wx.showToast({
          title: '保存失败',
          icon: 'none'
        })
        return
      }
      
      // 保存成功后可以选择返回或继续编辑
      setTimeout(() => {
        const action = this.data.isEditMode ? '更新' : '保存'
        const attachmentInfo = this.getAttachmentInfo()
        // 获取当前用户信息
        const userInfo = wx.getStorageSync('userInfo')
        const accountName = userInfo ? userInfo.username : '当前账户'
        
        wx.showModal({
          title: action + '成功',
          content: `笔记已${action}到${this.data.selectedCategories.map(cat => this.getCategoryName(cat)).join('、')}分类中${attachmentInfo}\n\n✅ 已同步保存到账户：${accountName}\n✅ 退出登录后数据不会丢失`,
          showCancel: true,
          cancelText: '继续编辑',
          confirmText: this.data.isEditMode ? '返回详情' : '返回首页',
          success: (res) => {
            if (res.confirm) {
              if (this.data.isEditMode) {
                wx.navigateBack()
              } else {
                wx.navigateBack()
              }
            }
          }
        })
      }, 1000)
    }, 1000)
  },

  // 获取附件信息
  getAttachmentInfo() {
    let info = ''
    if (this.data.saveImages && this.data.images.length > 0) {
      info += `\n包含 ${this.data.images.length} 张图片`
    }
    if (this.data.saveVoices && this.data.voices.length > 0) {
      info += `\n包含 ${this.data.voices.length} 条语音`
    }
    return info
  },

  // ==================== 草稿相关方法 ====================

  // 加载草稿
  loadDraft(draftId) {
    try {
      console.log('loadDraft 被调用，草稿ID:', draftId)
      const drafts = noteManager.getAccountStorage('drafts', [])
      console.log('所有草稿:', drafts)
      const draft = drafts.find(d => d.id === draftId)
      console.log('找到的草稿:', draft)
      
      if (draft) {
        console.log('开始加载草稿数据:', draft)
        console.log('草稿标题:', draft.title)
        console.log('草稿内容:', draft.content)
        console.log('草稿内容长度:', draft.content ? draft.content.length : 0)
        
        const newData = {
          noteTitle: draft.title || '',
          noteContent: draft.content || '',
          selectedCategories: Array.isArray(draft.category) ? draft.category : (draft.category ? [draft.category] : []),
          isArtSelected: Array.isArray(draft.category) ? draft.category.includes('art') : (draft.category === 'art'),
          isCuteSelected: Array.isArray(draft.category) ? draft.category.includes('cute') : (draft.category === 'cute'),
          isDreamsSelected: Array.isArray(draft.category) ? draft.category.includes('dreams') : (draft.category === 'dreams'),
          isFoodsSelected: Array.isArray(draft.category) ? draft.category.includes('foods') : (draft.category === 'foods'),
          isHappinessSelected: Array.isArray(draft.category) ? draft.category.includes('happiness') : (draft.category === 'happiness'),
          isKnowledgeSelected: Array.isArray(draft.category) ? draft.category.includes('knowledge') : (draft.category === 'knowledge'),
          isSightsSelected: Array.isArray(draft.category) ? draft.category.includes('sights') : (draft.category === 'sights'),
          isThinkingSelected: Array.isArray(draft.category) ? draft.category.includes('thinking') : (draft.category === 'thinking'),
          tags: draft.tags || [],
          images: draft.images || [],
          voices: draft.voices || [],
          source: draft.source || '',
          draftId: draft.id,
          isEditMode: true,
          hasUnsavedChanges: false
        }
        
        console.log('设置页面数据:', newData)
        this.setData(newData)
        
        // 确保数据设置完成后再执行其他操作（微信小程序使用setTimeout替代$nextTick）
        setTimeout(() => {
          console.log('数据设置完成 - 当前noteTitle:', this.data.noteTitle)
          console.log('数据设置完成 - 当前noteContent:', this.data.noteContent)
          console.log('数据设置完成 - 当前isDraftMode:', this.data.isDraftMode)
          console.log('数据设置完成 - 当前draftId:', this.data.draftId)
          
          // 标记草稿数据已加载完成
          this.draftDataLoaded = true
        }, 0)
        
        this.updateWordCount()
        // 生成分类默认标签
        const category = Array.isArray(draft.category) ? draft.category[0] : draft.category
        if (category) {
          this.generateDefaultTags(category)
        }
        
        wx.showToast({
          title: '草稿已加载',
          icon: 'success'
        })
      } else {
        console.error('草稿不存在:', draftId)
        wx.showToast({
          title: '草稿不存在',
          icon: 'none'
        })
      }
    } catch (error) {
      console.error('加载草稿失败:', error)
      wx.showToast({
        title: '加载草稿失败',
        icon: 'none'
      })
    }
  },

  // 保存草稿
  async saveDraft() {
    try {
      const draft = {
        id: this.data.draftId || Date.now().toString(),
        title: this.data.noteTitle || '无标题草稿',
        content: this.data.noteContent || '',
        category: this.data.selectedCategories.length > 0 ? this.data.selectedCategories : ['thinking'],
        tags: this.data.tags || [],
        images: this.data.images || [],
        voices: this.data.voices || [],
        source: this.data.source || '',
        createTime: this.data.draftId ? this.getDraftCreateTime() : new Date().toISOString(),
        updateTime: new Date().toISOString(),
        wordCount: this.data.wordCount || 0
      }
      
      const drafts = noteManager.getAccountStorage('drafts', [])
      const existingIndex = drafts.findIndex(d => d.id === draft.id)
      
      if (existingIndex > -1) {
        // 更新现有草稿
        drafts[existingIndex] = draft
      } else {
        // 添加新草稿
        drafts.unshift(draft)
      }
      
      noteManager.setAccountStorage('drafts', drafts)
      
      // 尝试同步到云端
      try {
        if (draft.cloudId) {
          // 更新云端草稿
          await draftCloudService.updateDraft(draft.cloudId, draft)
          console.log('✅ 草稿已同步到云端')
        } else {
          // 上传新草稿到云端
          const cloudResult = await draftCloudService.uploadDraft(draft)
          if (cloudResult.success) {
            draft.cloudId = cloudResult.cloudId
            // 更新本地草稿，添加云端ID
            if (existingIndex > -1) {
              drafts[existingIndex] = draft
            } else {
              drafts[0] = draft
            }
            noteManager.setAccountStorage('drafts', drafts)
            console.log('✅ 新草稿已上传到云端')
          }
        }
      } catch (cloudError) {
        console.warn('⚠️ 云端同步失败，但本地保存成功:', cloudError.message)
      }
      
      this.setData({
        draftId: draft.id,
        hasUnsavedChanges: false,
        lastAutoSaveTime: new Date().toISOString()
      })
      
      console.log('草稿已保存:', draft.id)
      return true
    } catch (error) {
      console.error('保存草稿失败:', error)
      return false
    }
  },

  // 获取草稿创建时间
  getDraftCreateTime() {
    try {
      const drafts = noteManager.getAccountStorage('drafts', [])
      const draft = drafts.find(d => d.id === this.data.draftId)
      return draft ? draft.createTime : new Date().toISOString()
    } catch (error) {
      return new Date().toISOString()
    }
  },

  // 自动保存草稿
  autoSaveDraft() {
    if (!this.data.autoSaveEnabled) return
    
    // 检查是否有内容需要保存
    if (!this.data.noteTitle.trim() && !this.data.noteContent.trim()) {
      return
    }
    
    const success = this.saveDraft()
    if (success) {
      console.log('自动保存草稿成功')
    }
  },

  // 启动自动保存
  startAutoSave() {
    // 每30秒自动保存一次
    this.autoSaveTimer = setInterval(() => {
      this.autoSaveDraft()
    }, 30000)
  },

  // 停止自动保存
  stopAutoSave() {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer)
      this.autoSaveTimer = null
    }
  },

  // 发布草稿为正式笔记
  publishDraft() {
    if (!this.data.noteTitle.trim()) {
      wx.showToast({
        title: '请输入标题',
        icon: 'none'
      })
      return
    }
    
    if (this.data.selectedCategories.length === 0) {
      wx.showToast({
        title: '请选择至少一个分类',
        icon: 'none'
      })
      return
    }
    
    // 检查登录状态
    const userInfo = wx.getStorageSync('userInfo')
    if (!userInfo || !userInfo.username || !userInfo.isLoggedIn) {
      wx.showModal({
        title: '需要登录',
        content: '发布笔记需要先登录账户，是否前往登录？',
        confirmText: '去登录',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({
              url: '/pages/login/login'
            })
          }
        }
      })
      return
    }
    
    // 创建正式笔记
    const note = {
      id: Date.now().toString(),
      title: this.data.noteTitle,
      content: this.data.noteContent,
      category: this.data.selectedCategories,
      tags: this.data.tags,
      images: this.data.saveImages ? this.data.images : [],
      voices: this.data.saveVoices ? this.data.voices : [],
      source: this.data.source,
      createTime: new Date().toISOString(),
      updateTime: new Date().toISOString(),
      wordCount: this.data.wordCount,
      isDraft: false
    }
    
    // 保存为正式笔记
    console.log('开始保存笔记:', note)
    const saveSuccess = this.saveNoteToStorage(note)
    console.log('保存结果:', saveSuccess)
    
    // 验证保存是否真的成功
    if (saveSuccess) {
      // 立即验证笔记是否保存成功
      const currentAccount = noteManager.getCurrentAccountName()
      const accountResult = noteManager.getNotesFromAccount(currentAccount)
      
      if (accountResult.success) {
        const savedNote = accountResult.notes.find(n => n.id === note.id)
        if (savedNote) {
          console.log('✅ 验证成功：笔记已保存到账户')
          
      // 删除草稿
          console.log('删除草稿:', this.data.draftId)
      this.deleteDraft()
      
      wx.showToast({
        title: '发布成功',
        icon: 'success'
      })
      
      // 返回上一页
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
        } else {
          console.error('❌ 验证失败：笔记未找到')
          wx.showToast({
            title: '保存验证失败，请重试',
            icon: 'none'
          })
        }
      } else {
        console.error('❌ 验证失败：无法读取账户数据')
        wx.showToast({
          title: '账户数据读取失败',
          icon: 'none'
        })
      }
    } else {
      console.error('发布失败，保存不成功')
      wx.showToast({
        title: '发布失败，请重试',
        icon: 'none'
      })
    }
  },

  // 删除草稿
  deleteDraft() {
    if (!this.data.draftId) return
    
    try {
      const drafts = noteManager.getAccountStorage('drafts', [])
      const updatedDrafts = drafts.filter(d => d.id !== this.data.draftId)
      noteManager.setAccountStorage('drafts', updatedDrafts)
      
      console.log('草稿已删除:', this.data.draftId)
    } catch (error) {
      console.error('删除草稿失败:', error)
    }
  },

  // 标记有未保存的更改
  markAsChanged() {
    this.setData({ hasUnsavedChanges: true })
  },

  // 输入事件处理（标记为已更改）
  onTitleInput(e) {
    this.setData({ noteTitle: e.detail.value })
    this.markAsChanged()
    this.updateWordCount()
  },

  onContentInput(e) {
    this.setData({ noteContent: e.detail.value })
    this.markAsChanged()
    this.updateWordCount()
  },

  // ==================== 分享功能 ====================

  // 分享笔记
  shareNote() {
    const { noteTitle, noteContent } = this.data
    
    if (!noteTitle && !noteContent) {
      wx.showToast({
        title: '请先输入笔记内容',
        icon: 'none'
      })
      return
    }

    wx.showActionSheet({
      itemList: ['复制到剪贴板', '分享给朋友', '生成分享图片'],
      success: (res) => {
        switch (res.tapIndex) {
          case 0:
            // 复制到剪贴板
            this.copyToClipboard()
            break
          case 1:
            // 分享给朋友
            this.shareToFriends()
            break
          case 2:
            // 生成分享图片（功能开发中）
            wx.showToast({
              title: '分享图片功能开发中',
              icon: 'none'
            })
            break
        }
      }
    })
  },

  // 复制到剪贴板
  copyToClipboard() {
    const { noteTitle, noteContent } = this.data
    const shareContent = this.formatShareContent(noteTitle, noteContent)
    
    wx.setClipboardData({
      data: shareContent,
      success: () => {
        wx.showToast({
          title: '内容已复制到剪贴板',
          icon: 'success'
        })
      }
    })
  },

  // 分享给朋友
  shareToFriends() {
    const { noteTitle, noteContent } = this.data
    const shareContent = this.formatShareContent(noteTitle, noteContent)
    
    // 设置分享内容
    this.setData({
      shareTitle: noteTitle || '我的笔记',
      shareContent: shareContent,
      sharePath: '/pages/note-editor/note-editor'
    })
    
    // 显示分享菜单
    wx.showShareMenu({
      withShareTicket: true,
      success: () => {
        wx.showToast({
          title: '请选择分享方式',
          icon: 'none'
        })
      }
    })
  },

  // 格式化分享内容
  formatShareContent(title, content) {
    let shareText = ''
    
    if (title) {
      shareText += `📝 ${title}\n\n`
    }
    
    if (content) {
      // 限制内容长度，避免分享内容过长
      const maxLength = 500
      const displayContent = content.length > maxLength 
        ? content.substring(0, maxLength) + '...' 
        : content
      shareText += displayContent
    }
    
    shareText += '\n\n--- 来自小兔的梦幻世界笔记本'
    
    return shareText
  },

  // 微信分享配置
  onShareAppMessage() {
    const { noteTitle, noteContent } = this.data
    
    return {
      title: noteTitle || '我的笔记',
      path: '/pages/note-editor/note-editor',
      imageUrl: '', // 可以设置分享图片
      success: (res) => {
        console.log('分享成功', res)
      },
      fail: (err) => {
        console.error('分享失败', err)
      }
    }
  },

  // 分享到朋友圈
  onShareTimeline() {
    const { noteTitle, noteContent } = this.data
    
    return {
      title: noteTitle || '我的笔记',
      query: '',
      imageUrl: '', // 可以设置分享图片
      success: (res) => {
        console.log('分享到朋友圈成功', res)
      },
      fail: (err) => {
        console.error('分享到朋友圈失败', err)
      }
    }
  }
})

