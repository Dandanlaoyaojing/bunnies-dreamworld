// 统计页面
const statsService = require('../../utils/statsService.js')
const syncService = require('../../utils/syncService.js')

Page({
  data: {
    loading: true,
    activeTab: 'dashboard', // dashboard, timeline, habits, achievements
    
    // 仪表盘数据
    dashboardData: null,
    
    // 时间线数据
    timelineData: [],
    
    // 写作习惯数据
    habitsData: null,
    
    // 成就数据
    achievementsData: null,
    
    // 同步状态
    syncStatus: null,
    
    // 错误信息
    error: null
  },

  onLoad() {
    console.log('📊 统计页面加载')
    this.loadDashboardData()
  },

  onShow() {
    // 页面显示时刷新数据
    this.refreshData()
  },

  onPullDownRefresh() {
    console.log('🔄 下拉刷新')
    this.refreshData().finally(() => {
      wx.stopPullDownRefresh()
    })
  },

  /**
   * 刷新数据
   */
  async refreshData() {
    try {
      this.setData({ loading: true, error: null })
      
      // 更新本地统计
      statsService.updateLocalStats()
      
      // 根据当前标签页加载对应数据
      switch (this.data.activeTab) {
        case 'dashboard':
          await this.loadDashboardData()
          break
        case 'timeline':
          await this.loadTimelineData()
          break
        case 'habits':
          await this.loadHabitsData()
          break
        case 'achievements':
          await this.loadAchievementsData()
          break
      }
      
      // 获取同步状态
      await this.loadSyncStatus()
      
    } catch (err) {
      console.error('刷新数据失败:', err)
      this.setData({
        error: err.message || '刷新数据失败'
      })
    } finally {
      this.setData({ loading: false })
    }
  },

  /**
   * 加载仪表盘数据
   */
  async loadDashboardData() {
    try {
      console.log('📊 加载仪表盘数据...')
      
      // 获取本地统计
      const localStats = statsService.getLocalStats()
      if (localStats.success) {
        this.setData({
          dashboardData: localStats.data
        })
      }
      
      // 尝试获取服务器统计
      try {
        const serverStats = await statsService.getDashboard()
        if (serverStats.success) {
          this.setData({
            dashboardData: serverStats.data
          })
        }
      } catch (err) {
        console.warn('获取服务器统计失败，使用本地数据:', err)
      }
      
    } catch (err) {
      console.error('加载仪表盘数据失败:', err)
      this.setData({
        error: '加载仪表盘数据失败'
      })
    }
  },

  /**
   * 加载时间线数据
   */
  async loadTimelineData() {
    try {
      console.log('📅 加载时间线数据...')
      
      const result = await statsService.getTimeline()
      if (result.success) {
        this.setData({
          timelineData: result.data.timeline || []
        })
      } else {
        throw new Error(result.message || '获取时间线数据失败')
      }
    } catch (err) {
      console.error('加载时间线数据失败:', err)
      this.setData({
        error: '加载时间线数据失败'
      })
    }
  },

  /**
   * 加载写作习惯数据
   */
  async loadHabitsData() {
    try {
      console.log('📝 加载写作习惯数据...')
      
      const result = await statsService.getWritingHabits()
      if (result.success) {
        this.setData({
          habitsData: result.data.habits
        })
      } else {
        throw new Error(result.message || '获取写作习惯数据失败')
      }
    } catch (err) {
      console.error('加载写作习惯数据失败:', err)
      this.setData({
        error: '加载写作习惯数据失败'
      })
    }
  },

  /**
   * 加载成就数据
   */
  async loadAchievementsData() {
    try {
      console.log('🏆 加载成就数据...')
      
      const result = statsService.getAchievements()
      if (result.success) {
        this.setData({
          achievementsData: result.data
        })
      } else {
        throw new Error(result.message || '获取成就数据失败')
      }
    } catch (err) {
      console.error('加载成就数据失败:', err)
      this.setData({
        error: '加载成就数据失败'
      })
    }
  },

  /**
   * 加载同步状态
   */
  async loadSyncStatus() {
    try {
      const result = await syncService.getSyncStatus()
      if (result.success) {
        this.setData({
          syncStatus: result.data
        })
      }
    } catch (err) {
      console.warn('获取同步状态失败:', err)
    }
  },

  /**
   * 切换标签页
   */
  onTabChange(e) {
    const tab = e.currentTarget.dataset.tab
    if (tab === this.data.activeTab) return
    
    this.setData({ activeTab: tab })
    
    // 加载对应数据
    switch (tab) {
      case 'dashboard':
        this.loadDashboardData()
        break
      case 'timeline':
        this.loadTimelineData()
        break
      case 'habits':
        this.loadHabitsData()
        break
      case 'achievements':
        this.loadAchievementsData()
        break
    }
  },

  /**
   * 同步数据
   */
  async onSync() {
    try {
      wx.showLoading({ title: '同步中...' })
      
      const result = await syncService.smartSync()
      
      if (result.success) {
        wx.showToast({
          title: '同步成功',
          icon: 'success'
        })
        
        // 刷新数据
        await this.refreshData()
      } else {
        wx.showModal({
          title: '同步失败',
          content: result.message || '同步失败，请重试',
          showCancel: false
        })
      }
    } catch (err) {
      console.error('同步失败:', err)
      wx.showModal({
        title: '同步失败',
        content: err.message || '同步失败，请重试',
        showCancel: false
      })
    } finally {
      wx.hideLoading()
    }
  },

  /**
   * 查看详细统计
   */
  async onViewDetailedStats() {
    try {
      wx.showLoading({ title: '加载中...' })
      
      const result = await statsService.getStatsReport()
      if (result.success) {
        wx.hideLoading()
        
        // 跳转到详细统计页面
        wx.navigateTo({
          url: '/pages/stats-detail/stats-detail?data=' + encodeURIComponent(JSON.stringify(result.data))
        })
      } else {
        throw new Error(result.message || '获取详细统计失败')
      }
    } catch (err) {
      wx.hideLoading()
      wx.showModal({
        title: '加载失败',
        content: err.message || '获取详细统计失败',
        showCancel: false
      })
    }
  },

  /**
   * 查看词云
   */
  async onViewWordCloud() {
    try {
      wx.showLoading({ title: '加载中...' })
      
      const result = await statsService.getWordCloud()
      if (result.success) {
        wx.hideLoading()
        
        // 跳转到词云页面
        wx.navigateTo({
          url: '/pages/word-cloud/word-cloud?data=' + encodeURIComponent(JSON.stringify(result.data))
        })
      } else {
        throw new Error(result.message || '获取词云数据失败')
      }
    } catch (err) {
      wx.hideLoading()
      wx.showModal({
        title: '加载失败',
        content: err.message || '获取词云数据失败',
        showCancel: false
      })
    }
  },

  /**
   * 查看分类分布
   */
  async onViewCategoryDistribution() {
    try {
      wx.showLoading({ title: '加载中...' })
      
      const result = await statsService.getCategoryDistribution()
      if (result.success) {
        wx.hideLoading()
        
        // 跳转到分类分布页面
        wx.navigateTo({
          url: '/pages/category-stats/category-stats?data=' + encodeURIComponent(JSON.stringify(result.data))
        })
      } else {
        throw new Error(result.message || '获取分类分布失败')
      }
    } catch (err) {
      wx.hideLoading()
      wx.showModal({
        title: '加载失败',
        content: err.message || '获取分类分布失败',
        showCancel: false
      })
    }
  },

  /**
   * 分享统计
   */
  onShare() {
    const dashboardData = this.data.dashboardData
    if (!dashboardData) return
    
    const shareText = `我在小兔的梦幻世界笔记本中已经写了${dashboardData.basicStats?.totalNotes || 0}篇笔记，累计${dashboardData.basicStats?.totalWords || 0}字！`
    
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline']
    })
    
    return {
      title: '我的写作统计',
      path: '/pages/stats/stats',
      imageUrl: '', // 可以添加统计图片
      success: () => {
        console.log('分享成功')
      },
      fail: (err) => {
        console.error('分享失败:', err)
      }
    }
  },

  /**
   * 重试加载
   */
  onRetry() {
    this.setData({ error: null })
    this.refreshData()
  }
})

