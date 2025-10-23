// API集成测试页面
const apiService = require('../../utils/apiService.js')
const syncService = require('../../utils/syncService.js')
const statsService = require('../../utils/statsService.js')
const aiService = require('../../utils/aiService.js')
const notificationService = require('../../utils/notificationService.js')
const fileService = require('../../utils/fileService.js')

Page({
  data: {
    testResults: [],
    loading: false,
    currentTest: null,
    successCount: 0,
    failCount: 0
  },

  onLoad() {
    console.log('🧪 API集成测试页面加载')
    this.runAllTests()
  },

  /**
   * 运行所有测试
   */
  async runAllTests() {
    this.setData({ loading: true, testResults: [] })
    
    const tests = [
      { name: '基础API连接', method: this.testBasicConnection },
      { name: '云同步服务', method: this.testSyncService },
      { name: '统计服务', method: this.testStatsService },
      { name: 'AI服务', method: this.testAIService },
      { name: '通知服务', method: this.testNotificationService },
      { name: '文件服务', method: this.testFileService }
    ]

    for (const test of tests) {
      this.setData({ currentTest: test.name })
      const result = await test.method.call(this)
      const newResults = [...this.data.testResults, {
        name: test.name,
        ...result
      }]
      
      // 计算成功和失败的数量
      const successCount = newResults.filter(r => r.success).length
      const failCount = newResults.filter(r => !r.success).length
      
      this.setData({
        testResults: newResults,
        successCount,
        failCount
      })
      
      // 添加延迟，避免请求过于频繁
      await new Promise(resolve => setTimeout(resolve, 500))
    }

    this.setData({ loading: false, currentTest: null })
  },

  /**
   * 测试基础API连接
   */
  async testBasicConnection() {
    try {
      console.log('🔍 测试基础API连接...')
      
      // 测试健康检查
      const healthResult = await apiService.healthCheck()
      if (!healthResult.success) {
        throw new Error('健康检查失败')
      }

      // 测试系统版本
      const versionResult = await apiService.getSystemVersion()
      if (!versionResult.success) {
        throw new Error('获取系统版本失败')
      }

      return {
        success: true,
        message: '基础API连接正常',
        details: {
          health: healthResult.data,
          version: versionResult.data
        }
      }
    } catch (err) {
      console.error('基础API连接测试失败:', err)
      return {
        success: false,
        message: err.message || '基础API连接失败',
        error: err
      }
    }
  },

  /**
   * 测试云同步服务
   */
  async testSyncService() {
    try {
      console.log('🔄 测试云同步服务...')
      
      // 测试获取同步状态
      const statusResult = await syncService.getSyncStatus()
      if (!statusResult.success) {
        throw new Error('获取同步状态失败')
      }

      return {
        success: true,
        message: '云同步服务正常',
        details: {
          syncStatus: statusResult.data
        }
      }
    } catch (err) {
      console.error('云同步服务测试失败:', err)
      return {
        success: false,
        message: err.message || '云同步服务失败',
        error: err
      }
    }
  },

  /**
   * 测试统计服务
   */
  async testStatsService() {
    try {
      console.log('📊 测试统计服务...')
      
      // 测试获取本地统计
      const localStats = statsService.getLocalStats()
      if (!localStats.success) {
        throw new Error('获取本地统计失败')
      }

      // 测试获取仪表盘数据
      const dashboardResult = await statsService.getDashboard()
      
      return {
        success: true,
        message: '统计服务正常',
        details: {
          localStats: localStats.data,
          dashboardAvailable: dashboardResult.success
        }
      }
    } catch (err) {
      console.error('统计服务测试失败:', err)
      return {
        success: false,
        message: err.message || '统计服务失败',
        error: err
      }
    }
  },

  /**
   * 测试AI服务
   */
  async testAIService() {
    try {
      console.log('🤖 测试AI服务...')
      
      // 测试AI服务基本功能
      const testResult = aiService.testService()
      if (!testResult.success) {
        throw new Error('AI服务测试失败')
      }

      // 测试智能标签生成
      const tagsResult = await aiService.generateTags('测试标题', '这是一篇测试笔记的内容')
      
      return {
        success: true,
        message: 'AI服务正常',
        details: {
          serviceTest: testResult,
          tagsGeneration: tagsResult.success ? '可用' : '不可用'
        }
      }
    } catch (err) {
      console.error('AI服务测试失败:', err)
      return {
        success: false,
        message: err.message || 'AI服务失败',
        error: err
      }
    }
  },

  /**
   * 测试通知服务
   */
  async testNotificationService() {
    try {
      console.log('📬 测试通知服务...')
      
      // 测试获取通知列表
      const notificationsResult = await notificationService.getNotifications({ limit: 5 })
      
      return {
        success: true,
        message: '通知服务正常',
        details: {
          notificationsAvailable: notificationsResult.success,
          localNotifications: notificationService.getLocalNotifications().length
        }
      }
    } catch (err) {
      console.error('通知服务测试失败:', err)
      return {
        success: false,
        message: err.message || '通知服务失败',
        error: err
      }
    }
  },

  /**
   * 测试文件服务
   */
  async testFileService() {
    try {
      console.log('📁 测试文件服务...')
      
      // 测试获取文件列表
      const fileListResult = await fileService.getFileList({ limit: 5 })
      
      return {
        success: true,
        message: '文件服务正常',
        details: {
          fileListAvailable: fileListResult.success,
          supportedTypes: {
            images: fileService.supportedImageTypes,
            audio: fileService.supportedAudioTypes
          }
        }
      }
    } catch (err) {
      console.error('文件服务测试失败:', err)
      return {
        success: false,
        message: err.message || '文件服务失败',
        error: err
      }
    }
  },

  /**
   * 重新运行测试
   */
  async onRetry() {
    await this.runAllTests()
  },

  /**
   * 查看详细结果
   */
  onViewDetails(e) {
    const index = e.currentTarget.dataset.index
    const result = this.data.testResults[index]
    
    wx.showModal({
      title: result.name,
      content: JSON.stringify(result.details, null, 2),
      showCancel: false,
      confirmText: '知道了'
    })
  },

  /**
   * 复制测试结果
   */
  onCopyResults() {
    const results = this.data.testResults.map(r => ({
      name: r.name,
      success: r.success,
      message: r.message
    }))
    
    wx.setClipboardData({
      data: JSON.stringify(results, null, 2),
      success: () => {
        wx.showToast({
          title: '结果已复制',
          icon: 'success'
        })
      }
    })
  }
})
