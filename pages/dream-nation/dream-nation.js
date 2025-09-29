// pages/dream-nation/dream-nation.js - 梦之国度页面
const noteManager = require('../../utils/noteManager.js')
const aiService = require('../../utils/aiService.js')

Page({
  data: {
    // 数据筛选参数
    timeRange: 'week', // week, month, quarter, year, custom
    customDateRange: {
      startDate: '',
      endDate: ''
    },
    selectedCategories: [], // 选中的笔记类型
    allCategories: [], // 所有可用笔记类型
    emotionFilter: 'all', // all, positive, negative, neutral
    keywordFilter: '',
    minWordCount: 0,
    
    // 梦境生成参数
    dreamType: 'fantasy', // fantasy, poetic, humorous, philosophical, prophetic
    dreamStyle: 'modern', // classical, modern, sci-fi, fantasy, realistic
    emotionTone: 'warm', // warm, inspiring, mysterious, humorous, profound
    dreamLength: 'medium', // short, medium, long
    
    // 个性化设置
    characterSettings: {
      protagonist: '',
      supportingCharacters: [],
      scene: ''
    },
    themePreferences: {
      adventure: 50,
      romance: 30,
      growth: 40,
      technology: 20,
      nature: 60
    },
    
    // 界面状态
    currentStep: 1, // 1: 数据筛选, 2: 梦境设置, 3: 生成中, 4: 结果展示
    filteredNotes: [],
    dreamContent: '',
    isGenerating: false,
    generationProgress: 0,
    
    // 互动功能
    collectedDreams: [],
    dreamHistory: [],
    
    // 预览数据
    previewData: {
      noteCount: 0,
      totalWords: 0,
      keyEmotions: [],
      mainTopics: []
    }
  },

  onLoad() {
    console.log('梦之国度页面加载')
    this.loadInitialData()
  },

  onShow() {
    this.loadCollectedDreams()
  },

  // 加载初始数据
  loadInitialData() {
    try {
      // 获取所有笔记
      const allNotes = noteManager.getAllNotes()
      
      // 定义所有笔记类型（与笔记编辑页面保持一致）
      const allCategories = [
        { name: '艺术', key: 'art', count: 0 },
        { name: '萌物', key: 'cute', count: 0 },
        { name: '梦游', key: 'dreams', count: 0 },
        { name: '美食', key: 'foods', count: 0 },
        { name: '趣事', key: 'happiness', count: 0 },
        { name: '知识', key: 'knowledge', count: 0 },
        { name: '风景', key: 'sights', count: 0 },
        { name: '思考', key: 'thinking', count: 0 }
      ]
      
      // 计算每个分类的笔记数量
      allNotes.forEach(note => {
        const categoryKey = this.getCategoryKey(note.category)
        const category = allCategories.find(cat => cat.key === categoryKey)
        if (category) {
          category.count++
        }
      })
      
      this.setData({
        allCategories,
        selectedCategories: [] // 默认不选择任何分类，需要用户手动选择
      })
      
      console.log('初始数据加载完成:', {
        allCategories: allCategories.length,
        selectedCategories: this.data.selectedCategories
      })
      
      // 初始化预览数据
      this.updatePreviewData()
      
    } catch (error) {
      console.error('加载初始数据失败:', error)
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    }
  },

  // 获取分类键值
  getCategoryKey(categoryName) {
    const categoryMap = {
      '艺术': 'art',
      '萌物': 'cute', 
      '梦游': 'dreams',
      '美食': 'foods',
      '趣事': 'happiness',
      '知识': 'knowledge',
      '风景': 'sights',
      '思考': 'thinking'
    }
    return categoryMap[categoryName] || categoryName.toLowerCase()
  },

  // 更新预览数据
  updatePreviewData() {
    const filteredNotes = this.getFilteredNotes()
    const totalWords = filteredNotes.reduce((sum, note) => sum + (note.wordCount || 0), 0)
    
    // 提取主要情感和话题
    const emotions = this.extractEmotions(filteredNotes)
    const topics = this.extractTopics(filteredNotes)
    
    // 获取选中的分类名称
    const selectedCategoryNames = this.data.selectedCategories.map(key => {
      const category = this.data.allCategories.find(cat => cat.key === key)
      return category ? category.name : key
    })
    
    this.setData({
      previewData: {
        noteCount: filteredNotes.length,
        totalWords,
        keyEmotions: emotions.slice(0, 5),
        mainTopics: topics.slice(0, 5),
        selectedCategories: selectedCategoryNames,
        selectedCategoryCount: this.data.selectedCategories.length
      }
    })
  },

  // 获取筛选后的笔记
  getFilteredNotes() {
    const allNotes = noteManager.getAllNotes()
    let filteredNotes = [...allNotes]
    
    // 时间筛选
    if (this.data.timeRange !== 'all') {
      const dateRange = this.getDateRange()
      filteredNotes = filteredNotes.filter(note => {
        const noteDate = new Date(note.createTime)
        return noteDate >= dateRange.start && noteDate <= dateRange.end
      })
    }
    
    // 分类筛选 - 必须选中至少一个分类才能生成梦境
    if (this.data.selectedCategories.length === 0) {
      // 如果没有选中任何分类，返回空数组
      return []
    } else {
      // 只包含选中的分类
      filteredNotes = filteredNotes.filter(note => 
        this.data.selectedCategories.includes(note.category)
      )
    }
    
    // 情感筛选
    if (this.data.emotionFilter !== 'all') {
      filteredNotes = filteredNotes.filter(note => 
        this.getNoteEmotion(note) === this.data.emotionFilter
      )
    }
    
    // 关键词筛选
    if (this.data.keywordFilter.trim()) {
      const keyword = this.data.keywordFilter.toLowerCase()
      filteredNotes = filteredNotes.filter(note => 
        note.title.toLowerCase().includes(keyword) ||
        note.content.toLowerCase().includes(keyword)
      )
    }
    
    // 字数筛选
    if (this.data.minWordCount > 0) {
      filteredNotes = filteredNotes.filter(note => 
        (note.wordCount || 0) >= this.data.minWordCount
      )
    }
    
    return filteredNotes
  },

  // 获取日期范围
  getDateRange() {
    const now = new Date()
    const start = new Date()
    
    switch (this.data.timeRange) {
      case 'week':
        start.setDate(now.getDate() - 7)
        break
      case 'month':
        start.setMonth(now.getMonth() - 1)
        break
      case 'quarter':
        start.setMonth(now.getMonth() - 3)
        break
      case 'year':
        start.setFullYear(now.getFullYear() - 1)
        break
      case 'custom':
        return {
          start: new Date(this.data.customDateRange.startDate),
          end: new Date(this.data.customDateRange.endDate)
        }
    }
    
    return { start, end: now }
  },

  // 提取情感
  extractEmotions(notes) {
    const emotionMap = {
      '开心': 0, '快乐': 0, '兴奋': 0, '满足': 0, '幸福': 0,
      '难过': 0, '沮丧': 0, '焦虑': 0, '担心': 0, '失落': 0,
      '平静': 0, '思考': 0, '专注': 0, '认真': 0, '冷静': 0
    }
    
    notes.forEach(note => {
      const text = (note.title + ' ' + note.content).toLowerCase()
      Object.keys(emotionMap).forEach(emotion => {
        if (text.includes(emotion)) {
          emotionMap[emotion]++
        }
      })
    })
    
    return Object.entries(emotionMap)
      .filter(([_, count]) => count > 0)
      .sort(([, a], [, b]) => b - a)
      .map(([emotion, count]) => ({ emotion, count }))
  },

  // 提取话题
  extractTopics(notes) {
    const topicMap = {}
    
    notes.forEach(note => {
      if (note.tags && note.tags.length > 0) {
        note.tags.forEach(tag => {
          topicMap[tag] = (topicMap[tag] || 0) + 1
        })
      }
    })
    
    return Object.entries(topicMap)
      .sort(([, a], [, b]) => b - a)
      .map(([topic, count]) => ({ topic, count }))
  },

  // 获取笔记情感倾向
  getNoteEmotion(note) {
    const text = (note.title + ' ' + note.content).toLowerCase()
    const positiveWords = ['开心', '快乐', '兴奋', '满足', '幸福', '喜欢', '爱']
    const negativeWords = ['难过', '沮丧', '焦虑', '担心', '失落', '讨厌', '恨']
    
    let positiveCount = 0
    let negativeCount = 0
    
    positiveWords.forEach(word => {
      if (text.includes(word)) positiveCount++
    })
    
    negativeWords.forEach(word => {
      if (text.includes(word)) negativeCount++
    })
    
    if (positiveCount > negativeCount) return 'positive'
    if (negativeCount > positiveCount) return 'negative'
    return 'neutral'
  },

  // 时间范围选择
  selectTimeRange(e) {
    const range = e.currentTarget.dataset.range
    this.setData({ timeRange: range })
    this.updatePreviewData()
  },

  // 自定义日期选择
  onCustomDateChange(e) {
    const { field } = e.currentTarget.dataset
    const value = e.detail.value
    
    this.setData({
      [`customDateRange.${field}`]: value
    })
    
    if (this.data.customDateRange.startDate && this.data.customDateRange.endDate) {
      this.updatePreviewData()
    }
  },

  // 笔记类型选择
  toggleCategory(e) {
    console.log('=== 开始处理分类点击 ===')
    const categoryKey = e.currentTarget.dataset.key
    console.log('点击分类:', categoryKey)
    console.log('当前选中分类:', this.data.selectedCategories)
    console.log('当前选中分类类型:', typeof this.data.selectedCategories)
    console.log('当前选中分类是否为数组:', Array.isArray(this.data.selectedCategories))
    
    // 确保selectedCategories是数组
    let selectedCategories = Array.isArray(this.data.selectedCategories) 
      ? [...this.data.selectedCategories] 
      : []
    
    const index = selectedCategories.indexOf(categoryKey)
    console.log('查找索引:', index)
    
    if (index > -1) {
      // 如果已选中，则取消选中
      selectedCategories.splice(index, 1)
      console.log('取消选择:', categoryKey)
    } else {
      // 如果未选中，则添加到选中列表
      selectedCategories.push(categoryKey)
      console.log('选择:', categoryKey)
    }
    
    console.log('更新后选中分类:', selectedCategories)
    console.log('更新后选中分类长度:', selectedCategories.length)
    
    this.setData({ 
      selectedCategories: selectedCategories 
    }, () => {
      console.log('setData完成，当前选中分类:', this.data.selectedCategories)
      console.log('setData完成，当前选中分类长度:', this.data.selectedCategories.length)
    })
    
    this.updatePreviewData()
    
    // 显示选择反馈
    wx.showToast({
      title: `已选择 ${selectedCategories.length} 个分类`,
      icon: 'none',
      duration: 1000
    })
    
    console.log('=== 分类点击处理完成 ===')
  },

  // 全选/全不选笔记类型
  toggleAllCategories() {
    if (this.data.selectedCategories.length === this.data.allCategories.length) {
      this.setData({ selectedCategories: [] })
    } else {
      this.setData({ 
        selectedCategories: this.data.allCategories.map(cat => cat.key) 
      })
    }
    this.updatePreviewData()
  },

  // 情感筛选
  selectEmotion(e) {
    const emotion = e.currentTarget.dataset.emotion
    this.setData({ emotionFilter: emotion })
    this.updatePreviewData()
  },

  // 关键词输入
  onKeywordInput(e) {
    this.setData({ keywordFilter: e.detail.value })
    // 防抖处理
    clearTimeout(this.keywordTimer)
    this.keywordTimer = setTimeout(() => {
      this.updatePreviewData()
    }, 500)
  },

  // 字数筛选
  onWordCountChange(e) {
    this.setData({ minWordCount: parseInt(e.detail.value) || 0 })
    this.updatePreviewData()
  },

  // 梦境类型选择
  selectDreamType(e) {
    const type = e.currentTarget.dataset.type
    this.setData({ dreamType: type })
  },

  // 梦境风格选择
  selectDreamStyle(e) {
    const style = e.currentTarget.dataset.style
    this.setData({ dreamStyle: style })
  },

  // 情感基调选择
  selectEmotionTone(e) {
    const tone = e.currentTarget.dataset.tone
    this.setData({ emotionTone: tone })
  },

  // 梦境长度选择
  selectDreamLength(e) {
    const length = e.currentTarget.dataset.length
    this.setData({ dreamLength: length })
  },

  // 主题偏好调整
  adjustThemePreference(e) {
    const { theme } = e.currentTarget.dataset
    const value = e.detail.value
    this.setData({
      [`themePreferences.${theme}`]: value
    })
  },

  // 下一步
  nextStep() {
    if (this.data.currentStep < 4) {
      // 如果要从第2步进入第3步，检查是否选中了笔记类型
      if (this.data.currentStep === 2 && this.data.selectedCategories.length === 0) {
        wx.showModal({
          title: '请选择笔记类型',
          content: '请至少选择一个笔记类型才能继续生成梦境',
          showCancel: false,
          confirmText: '确定'
        })
        return
      }
      
      this.setData({ currentStep: this.data.currentStep + 1 })
      
      if (this.data.currentStep === 3) {
        // 开始生成梦境
        this.generateDream()
      }
    }
  },

  // 上一步
  prevStep() {
    if (this.data.currentStep > 1) {
      this.setData({ currentStep: this.data.currentStep - 1 })
    }
  },

  // 生成梦境
  async generateDream() {
    try {
      // 检查是否选中了笔记类型
      if (this.data.selectedCategories.length === 0) {
        wx.showModal({
          title: '请选择笔记类型',
          content: '请至少选择一个笔记类型才能生成梦境',
          showCancel: false,
          confirmText: '确定'
        })
        return
      }
      
      this.setData({ 
        isGenerating: true,
        generationProgress: 0
      })
      
      const filteredNotes = this.getFilteredNotes()
      
      if (filteredNotes.length === 0) {
        throw new Error('没有找到符合条件的笔记')
      }
      
      // 模拟生成进度
      const progressTimer = setInterval(() => {
        if (this.data.generationProgress < 90) {
          this.setData({
            generationProgress: this.data.generationProgress + Math.random() * 10
          })
        }
      }, 200)
      
      // 准备生成参数
      const generationParams = {
        notes: filteredNotes.slice(0, 20), // 限制笔记数量
        dreamType: this.data.dreamType,
        dreamStyle: this.data.dreamStyle,
        emotionTone: this.data.emotionTone,
        dreamLength: this.data.dreamLength,
        themePreferences: this.data.themePreferences,
        characterSettings: this.data.characterSettings
      }
      
      // 调用AI服务生成梦境
      const dreamContent = await this.callDreamGenerationAPI(generationParams)
      
      clearInterval(progressTimer)
      
      this.setData({
        isGenerating: false,
        generationProgress: 100,
        dreamContent: dreamContent,
        currentStep: 4
      })
      
      // 保存到历史记录
      this.saveDreamToHistory(dreamContent, generationParams)
      
    } catch (error) {
      this.setData({ isGenerating: false })
      console.error('生成梦境失败:', error)
      
      wx.showModal({
        title: '生成失败',
        content: error.message || '梦境生成过程中发生错误，请稍后重试',
        showCancel: false,
        confirmText: '确定'
      })
    }
  },

  // 调用梦境生成API
  async callDreamGenerationAPI(params) {
    // 构建提示词
    const prompt = this.buildDreamPrompt(params)
    
    // 调用AI服务
    const result = await aiService.generateDreamContent(prompt)
    
    if (result.success) {
      // 显示生成方式提示
      if (result.isLocal) {
        wx.showToast({
          title: '已使用本地生成',
          icon: 'none',
          duration: 2000
        })
      }
      return result.content
    } else {
      throw new Error(result.error || '梦境生成失败，请重试')
    }
  },

  // 构建梦境生成提示词
  buildDreamPrompt(params) {
    const { notes, dreamType, dreamStyle, emotionTone, dreamLength, themePreferences } = params
    
    // 提取笔记内容摘要
    const noteSummary = notes.map(note => ({
      title: note.title,
      content: note.content.substring(0, 200),
      tags: note.tags || [],
      emotion: this.getNoteEmotion(note)
    }))
    
    // 梦境类型描述
    const dreamTypeDesc = {
      fantasy: '奇幻冒险故事',
      poetic: '诗意梦境',
      humorous: '幽默趣事',
      philosophical: '哲思对话',
      prophetic: '未来预言'
    }
    
    // 风格描述
    const styleDesc = {
      classical: '古典文学风格',
      modern: '现代文学风格',
      'sci-fi': '科幻风格',
      fantasy: '魔幻风格',
      realistic: '现实主义风格'
    }
    
    // 情感基调描述
    const toneDesc = {
      warm: '温馨',
      inspiring: '激励',
      mysterious: '神秘',
      humorous: '幽默',
      profound: '深沉'
    }
    
    // 长度控制
    const lengthDesc = {
      short: '200字以内',
      medium: '500字左右',
      long: '1000字以内'
    }
    
    const prompt = `
请基于以下用户笔记内容，生成一个${dreamTypeDesc[dreamType]}：

用户笔记摘要：
${JSON.stringify(noteSummary, null, 2)}

生成要求：
- 类型：${dreamTypeDesc[dreamType]}
- 风格：${styleDesc[dreamStyle]}
- 情感基调：${toneDesc[emotionTone]}
- 长度：${lengthDesc[dreamLength]}
- 主题偏好：冒险${themePreferences.adventure}%，浪漫${themePreferences.romance}%，成长${themePreferences.growth}%，科技${themePreferences.technology}%，自然${themePreferences.nature}%

请创作一个富有想象力且贴近用户内心世界的梦境内容，既要保持创意性，又要体现用户笔记中的真实情感和生活轨迹。
`

    return prompt
  },

  // 保存梦境到历史记录
  saveDreamToHistory(content, params) {
    try {
      const dreamHistory = wx.getStorageSync('dreamHistory') || []
      
      const dreamRecord = {
        id: Date.now().toString(),
        content: content,
        params: params,
        createTime: new Date().toISOString(),
        isCollected: false
      }
      
      dreamHistory.unshift(dreamRecord)
      
      // 限制历史记录数量
      if (dreamHistory.length > 50) {
        dreamHistory.splice(50)
      }
      
      wx.setStorageSync('dreamHistory', dreamHistory)
      
    } catch (error) {
      console.error('保存梦境历史失败:', error)
    }
  },

  // 收藏梦境
  collectDream() {
    try {
      const dreamHistory = wx.getStorageSync('dreamHistory') || []
      const currentDream = dreamHistory[0] // 最新的梦境
      
      if (currentDream) {
        currentDream.isCollected = true
        currentDream.collectTime = new Date().toISOString()
        
        wx.setStorageSync('dreamHistory', dreamHistory)
        
        wx.showToast({
          title: '已收藏到梦境收藏夹',
          icon: 'success'
        })
        
        this.loadCollectedDreams()
      }
    } catch (error) {
      console.error('收藏梦境失败:', error)
    }
  },

  // 加载收藏的梦境
  loadCollectedDreams() {
    try {
      const dreamHistory = wx.getStorageSync('dreamHistory') || []
      const collectedDreams = dreamHistory.filter(dream => dream.isCollected)
      
      this.setData({ collectedDreams })
    } catch (error) {
      console.error('加载收藏梦境失败:', error)
    }
  },

  // 分享梦境
  shareDream() {
    const dreamContent = this.data.dreamContent
    if (!dreamContent) return
    
    wx.setClipboardData({
      data: dreamContent,
      success: () => {
        wx.showToast({
          title: '梦境内容已复制',
          icon: 'success'
        })
      }
    })
  },

  // 重新生成
  regenerateDream() {
    this.setData({ currentStep: 3 })
    this.generateDream()
  },

  // 返回首页
  goHome() {
    this.setData({ currentStep: 1 })
  },

  // 查看梦境收藏夹
  viewDreamCollection() {
    wx.navigateTo({
      url: '/pages/dream-collection/dream-collection'
    })
  }
})
