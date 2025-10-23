// 统计服务
// 处理数据统计、分析、可视化等功能

const apiService = require('./apiService.js')

class StatsService {
  constructor() {
    this.cache = new Map()
    this.cacheTimeout = 10 * 60 * 1000 // 10分钟缓存
    this.localStats = null
    this.loadLocalStats()
  }

  /**
   * 加载本地统计数据
   */
  loadLocalStats() {
    try {
      const localData = wx.getStorageSync('localStats')
      if (localData) {
        this.localStats = localData
      }
    } catch (err) {
      console.error('加载本地统计失败:', err)
    }
  }

  /**
   * 保存本地统计数据
   */
  saveLocalStats() {
    try {
      wx.setStorageSync('localStats', this.localStats)
    } catch (err) {
      console.error('保存本地统计失败:', err)
    }
  }

  /**
   * 获取缓存键
   */
  getCacheKey(method, params) {
    return `${method}_${JSON.stringify(params)}`
  }

  /**
   * 检查缓存
   */
  getFromCache(key) {
    const cached = this.cache.get(key)
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data
    }
    this.cache.delete(key)
    return null
  }

  /**
   * 设置缓存
   */
  setCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    })
  }

  /**
   * 获取仪表盘数据
   */
  async getDashboard() {
    try {
      const cacheKey = this.getCacheKey('getDashboard', {})
      const cached = this.getFromCache(cacheKey)
      if (cached) {
        console.log('📊 使用缓存的仪表盘数据')
        return cached
      }

      console.log('📊 获取仪表盘数据...')
      const result = await apiService.getDashboard()
      
      if (result.success) {
        this.setCache(cacheKey, result.data)
        return {
          success: true,
          data: result.data
        }
      } else {
        throw new Error(result.message || '获取仪表盘数据失败')
      }
    } catch (err) {
      console.error('❌ 获取仪表盘数据失败:', err)
      return {
        success: false,
        message: err.message || '获取仪表盘数据失败',
        error: err
      }
    }
  }

  /**
   * 获取时间线数据
   */
  async getTimeline(params = {}) {
    try {
      const cacheKey = this.getCacheKey('getTimeline', params)
      const cached = this.getFromCache(cacheKey)
      if (cached) {
        console.log('📅 使用缓存的时间线数据')
        return cached
      }

      console.log('📅 获取时间线数据...')
      const result = await apiService.getTimeline(params)
      
      if (result.success) {
        this.setCache(cacheKey, result.data)
        return {
          success: true,
          data: result.data
        }
      } else {
        throw new Error(result.message || '获取时间线数据失败')
      }
    } catch (err) {
      console.error('❌ 获取时间线数据失败:', err)
      return {
        success: false,
        message: err.message || '获取时间线数据失败',
        error: err
      }
    }
  }

  /**
   * 获取词云数据
   */
  async getWordCloud(params = {}) {
    try {
      const cacheKey = this.getCacheKey('getWordCloud', params)
      const cached = this.getFromCache(cacheKey)
      if (cached) {
        console.log('☁️ 使用缓存的词云数据')
        return cached
      }

      console.log('☁️ 获取词云数据...')
      const result = await apiService.getWordCloud(params)
      
      if (result.success) {
        this.setCache(cacheKey, result.data)
        return {
          success: true,
          data: result.data
        }
      } else {
        throw new Error(result.message || '获取词云数据失败')
      }
    } catch (err) {
      console.error('❌ 获取词云数据失败:', err)
      return {
        success: false,
        message: err.message || '获取词云数据失败',
        error: err
      }
    }
  }

  /**
   * 获取分类分布数据
   */
  async getCategoryDistribution() {
    try {
      const cacheKey = this.getCacheKey('getCategoryDistribution', {})
      const cached = this.getFromCache(cacheKey)
      if (cached) {
        console.log('📊 使用缓存的分类分布数据')
        return cached
      }

      console.log('📊 获取分类分布数据...')
      const result = await apiService.getCategoryDistribution()
      
      if (result.success) {
        this.setCache(cacheKey, result.data)
        return {
          success: true,
          data: result.data
        }
      } else {
        throw new Error(result.message || '获取分类分布数据失败')
      }
    } catch (err) {
      console.error('❌ 获取分类分布数据失败:', err)
      return {
        success: false,
        message: err.message || '获取分类分布数据失败',
        error: err
      }
    }
  }

  /**
   * 获取写作习惯分析
   */
  async getWritingHabits() {
    try {
      const cacheKey = this.getCacheKey('getWritingHabits', {})
      const cached = this.getFromCache(cacheKey)
      if (cached) {
        console.log('📝 使用缓存的写作习惯数据')
        return cached
      }

      console.log('📝 获取写作习惯分析...')
      const result = await apiService.getWritingHabits()
      
      if (result.success) {
        this.setCache(cacheKey, result.data)
        return {
          success: true,
          data: result.data
        }
      } else {
        throw new Error(result.message || '获取写作习惯分析失败')
      }
    } catch (err) {
      console.error('❌ 获取写作习惯分析失败:', err)
      return {
        success: false,
        message: err.message || '获取写作习惯分析失败',
        error: err
      }
    }
  }

  /**
   * 获取详细统计报告
   */
  async getStatsReport(params = {}) {
    try {
      const cacheKey = this.getCacheKey('getStatsReport', params)
      const cached = this.getFromCache(cacheKey)
      if (cached) {
        console.log('📋 使用缓存的统计报告')
        return cached
      }

      console.log('📋 获取详细统计报告...')
      const result = await apiService.getStatsReport(params)
      
      if (result.success) {
        this.setCache(cacheKey, result.data)
        return {
          success: true,
          data: result.data
        }
      } else {
        throw new Error(result.message || '获取统计报告失败')
      }
    } catch (err) {
      console.error('❌ 获取统计报告失败:', err)
      return {
        success: false,
        message: err.message || '获取统计报告失败',
        error: err
      }
    }
  }

  /**
   * 计算本地统计数据
   */
  calculateLocalStats() {
    try {
      const notes = wx.getStorageSync('notes') || []
      const tags = wx.getStorageSync('tags') || []
      const drafts = wx.getStorageSync('drafts') || []

      const activeNotes = notes.filter(note => !note.is_deleted)
      
      // 基础统计
      const basicStats = {
        totalNotes: activeNotes.length,
        totalWords: activeNotes.reduce((sum, note) => sum + (note.word_count || 0), 0),
        totalTags: tags.length,
        totalDrafts: drafts.length,
        favoriteNotes: activeNotes.filter(note => note.is_favorite).length
      }

      // 分类统计
      const categoryStats = {}
      activeNotes.forEach(note => {
        const category = note.category || 'knowledge'
        categoryStats[category] = (categoryStats[category] || 0) + 1
      })

      // 标签统计
      const tagStats = tags.map(tag => ({
        name: tag.name,
        count: tag.use_count || 0,
        color: tag.color || '#5470C6'
      })).sort((a, b) => b.count - a.count)

      // 时间统计
      const now = new Date()
      const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      
      const weeklyNotes = activeNotes.filter(note => 
        new Date(note.created_at) >= thisWeek
      )
      const monthlyNotes = activeNotes.filter(note => 
        new Date(note.created_at) >= thisMonth
      )

      // 写作习惯
      const hourlyStats = new Array(24).fill(0)
      const weeklyStats = new Array(7).fill(0)
      
      activeNotes.forEach(note => {
        const date = new Date(note.created_at)
        hourlyStats[date.getHours()]++
        weeklyStats[date.getDay()]++
      })

      const localStats = {
        basicStats,
        categoryStats,
        tagStats,
        timeStats: {
          weekly: weeklyNotes.length,
          monthly: monthlyNotes.length
        },
        writingHabits: {
          hourlyDistribution: hourlyStats.map((count, hour) => ({ hour, count })),
          weeklyDistribution: weeklyStats.map((count, day) => ({ day_of_week: day, count }))
        },
        lastUpdated: new Date().toISOString()
      }

      this.localStats = localStats
      this.saveLocalStats()
      
      return {
        success: true,
        data: localStats
      }
    } catch (err) {
      console.error('❌ 计算本地统计失败:', err)
      return {
        success: false,
        message: err.message || '计算统计失败',
        error: err
      }
    }
  }

  /**
   * 获取本地统计数据
   */
  getLocalStats() {
    if (!this.localStats) {
      return this.calculateLocalStats()
    }
    
    return {
      success: true,
      data: this.localStats
    }
  }

  /**
   * 更新本地统计
   */
  updateLocalStats() {
    return this.calculateLocalStats()
  }

  /**
   * 获取写作进度
   */
  getWritingProgress() {
    try {
      const localStats = this.getLocalStats()
      if (!localStats.success) {
        return localStats
      }

      const stats = localStats.data
      const now = new Date()
      const startOfYear = new Date(now.getFullYear(), 0, 1)
      const daysInYear = Math.ceil((now - startOfYear) / (1000 * 60 * 60 * 24))
      
      // 计算年度目标进度
      const yearlyGoal = 365 // 一年365篇笔记
      const yearlyProgress = Math.min(stats.basicStats.totalNotes / yearlyGoal * 100, 100)
      
      // 计算月度目标进度
      const monthlyGoal = 30 // 一个月30篇笔记
      const monthlyProgress = Math.min(stats.timeStats.monthly / monthlyGoal * 100, 100)
      
      // 计算周度目标进度
      const weeklyGoal = 7 // 一周7篇笔记
      const weeklyProgress = Math.min(stats.timeStats.weekly / weeklyGoal * 100, 100)

      return {
        success: true,
        data: {
          yearly: {
            goal: yearlyGoal,
            current: stats.basicStats.totalNotes,
            progress: yearlyProgress,
            remaining: Math.max(0, yearlyGoal - stats.basicStats.totalNotes)
          },
          monthly: {
            goal: monthlyGoal,
            current: stats.timeStats.monthly,
            progress: monthlyProgress,
            remaining: Math.max(0, monthlyGoal - stats.timeStats.monthly)
          },
          weekly: {
            goal: weeklyGoal,
            current: stats.timeStats.weekly,
            progress: weeklyProgress,
            remaining: Math.max(0, weeklyGoal - stats.timeStats.weekly)
          }
        }
      }
    } catch (err) {
      console.error('❌ 获取写作进度失败:', err)
      return {
        success: false,
        message: err.message || '获取写作进度失败',
        error: err
      }
    }
  }

  /**
   * 获取成就徽章
   */
  getAchievements() {
    try {
      const localStats = this.getLocalStats()
      if (!localStats.success) {
        return localStats
      }

      const stats = localStats.data
      const achievements = []

      // 笔记数量成就
      if (stats.basicStats.totalNotes >= 1) {
        achievements.push({
          id: 'first_note',
          name: '初出茅庐',
          description: '写下第一篇笔记',
          icon: '📝',
          unlocked: true
        })
      }
      
      if (stats.basicStats.totalNotes >= 10) {
        achievements.push({
          id: 'ten_notes',
          name: '小试牛刀',
          description: '写下10篇笔记',
          icon: '📚',
          unlocked: true
        })
      }
      
      if (stats.basicStats.totalNotes >= 100) {
        achievements.push({
          id: 'hundred_notes',
          name: '笔耕不辍',
          description: '写下100篇笔记',
          icon: '📖',
          unlocked: true
        })
      }

      // 字数成就
      if (stats.basicStats.totalWords >= 1000) {
        achievements.push({
          id: 'thousand_words',
          name: '千字文',
          description: '累计写作1000字',
          icon: '✍️',
          unlocked: true
        })
      }
      
      if (stats.basicStats.totalWords >= 10000) {
        achievements.push({
          id: 'ten_thousand_words',
          name: '万字长文',
          description: '累计写作10000字',
          icon: '📜',
          unlocked: true
        })
      }

      // 收藏成就
      if (stats.basicStats.favoriteNotes >= 5) {
        achievements.push({
          id: 'collector',
          name: '收藏家',
          description: '收藏5篇笔记',
          icon: '⭐',
          unlocked: true
        })
      }

      // 分类成就
      const categoryCount = Object.keys(stats.categoryStats).length
      if (categoryCount >= 5) {
        achievements.push({
          id: 'categorizer',
          name: '分类达人',
          description: '使用5个不同分类',
          icon: '🏷️',
          unlocked: true
        })
      }

      return {
        success: true,
        data: {
          achievements,
          totalUnlocked: achievements.filter(a => a.unlocked).length,
          totalAchievements: achievements.length
        }
      }
    } catch (err) {
      console.error('❌ 获取成就失败:', err)
      return {
        success: false,
        message: err.message || '获取成就失败',
        error: err
      }
    }
  }

  /**
   * 清除缓存
   */
  clearCache() {
    this.cache.clear()
    console.log('✅ 统计服务缓存已清除')
  }

  /**
   * 获取缓存统计
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      timeout: this.cacheTimeout,
      keys: Array.from(this.cache.keys())
    }
  }
}

// 创建单例实例
const statsService = new StatsService()

module.exports = statsService

