// 增强版API测试页面
const apiService = require('../../utils/apiService.js')
const syncService = require('../../utils/syncService.js')
const aiService = require('../../utils/aiService.js')
const fileService = require('../../utils/fileService.js')
const notificationService = require('../../utils/notificationService.js')
const statsService = require('../../utils/statsService.js')

Page({
  data: {
    testResults: [],
    loading: false,
    currentTest: null,
    successCount: 0,
    failCount: 0
  },

  onLoad() {
    console.log('🧪 增强版API测试页面加载')
  },

  /**
   * 运行所有测试
   */
  async runAllTests() {
    this.setData({ 
      loading: true, 
      testResults: [],
      currentTest: '正在运行所有测试...'
    })

    const tests = [
      { name: '系统版本', method: this.testSystemVersion },
      { name: '健康检查', method: this.testHealthCheck },
      { name: '云同步状态', method: this.testSyncStatus },
      { name: '本地统计', method: this.testLocalStats },
      { name: 'AI分类建议', method: this.testAICategory },
      { name: 'AI标签生成', method: this.testAITags },
      { name: '文件服务', method: this.testFileService },
      { name: '通知服务', method: this.testNotificationService }
    ]

    for (const test of tests) {
      this.setData({ currentTest: `正在测试: ${test.name}` })
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

    this.setData({ 
      loading: false, 
      currentTest: null 
    })
  },

  /**
   * 测试系统版本
   */
  async testSystemVersion() {
    try {
      const result = await apiService.getSystemVersion()
      return {
        success: true,
        message: '系统版本获取成功',
        data: result.data
      }
    } catch (err) {
      return {
        success: false,
        message: err.message || '系统版本获取失败',
        error: err
      }
    }
  },

  /**
   * 测试健康检查
   */
  async testHealthCheck() {
    try {
      const result = await apiService.healthCheck()
      return {
        success: true,
        message: '健康检查成功',
        data: result.data
      }
    } catch (err) {
      return {
        success: false,
        message: err.message || '健康检查失败',
        error: err
      }
    }
  },

  /**
   * 测试云同步状态
   */
  async testSyncStatus() {
    try {
      const result = await syncService.getSyncStatus()
      return {
        success: true,
        message: '同步状态获取成功',
        data: result.data
      }
    } catch (err) {
      return {
        success: false,
        message: err.message || '同步状态获取失败',
        error: err
      }
    }
  },

  /**
   * 测试本地统计
   */
  async testLocalStats() {
    try {
      const result = statsService.getLocalStats()
      return {
        success: true,
        message: '本地统计获取成功',
        data: result.data
      }
    } catch (err) {
      return {
        success: false,
        message: err.message || '本地统计获取失败',
        error: err
      }
    }
  },

  /**
   * 测试AI分类建议
   */
  async testAICategory() {
    try {
      const result = await aiService.suggestCategory('测试笔记', '这是一篇测试笔记的内容')
      return {
        success: true,
        message: 'AI分类建议获取成功',
        data: result.data
      }
    } catch (err) {
      return {
        success: false,
        message: err.message || 'AI分类建议获取失败',
        error: err
      }
    }
  },

  /**
   * 测试AI标签生成
   */
  async testAITags() {
    try {
      const result = await aiService.generateTags('测试笔记', '这是一篇关于编程和技术的测试笔记')
      return {
        success: true,
        message: 'AI标签生成成功',
        data: result.data
      }
    } catch (err) {
      return {
        success: false,
        message: err.message || 'AI标签生成失败',
        error: err
      }
    }
  },

  /**
   * 测试文件服务
   */
  async testFileService() {
    try {
      const result = await fileService.getFileList({ page: 1, limit: 5 })
      return {
        success: true,
        message: '文件服务测试成功',
        data: result.data
      }
    } catch (err) {
      return {
        success: false,
        message: err.message || '文件服务测试失败',
        error: err
      }
    }
  },

  /**
   * 测试通知服务
   */
  async testNotificationService() {
    try {
      const result = await notificationService.getNotifications({ page: 1, limit: 5 })
      return {
        success: true,
        message: '通知服务测试成功',
        data: result.data
      }
    } catch (err) {
      return {
        success: false,
        message: err.message || '通知服务测试失败',
        error: err
      }
    }
  },

  /**
   * 测试网络连接
   */
  async testNetworkConnection() {
    try {
      this.setData({ 
        loading: true, 
        currentTest: '正在测试网络连接...' 
      })
      
      const result = await apiService.diagnoseConnection()
      
      this.setData({
        testResults: [...this.data.testResults, {
          name: '网络连接诊断',
          success: true,
          message: '网络连接诊断完成',
          data: result
        }],
        loading: false,
        currentTest: null
      })
    } catch (err) {
      this.setData({
        testResults: [...this.data.testResults, {
          name: '网络连接诊断',
          success: false,
          message: err.message || '网络连接诊断失败',
          error: err
        }],
        loading: false,
        currentTest: null
      })
    }
  },

  /**
   * 清除测试结果
   */
  clearResults() {
    this.setData({ 
      testResults: [],
      successCount: 0,
      failCount: 0
    })
  },

  /**
   * 查看详细结果
   */
  viewDetail(e) {
    const index = e.currentTarget.dataset.index
    const result = this.data.testResults[index]
    
    wx.showModal({
      title: result.name,
      content: JSON.stringify(result, null, 2),
      showCancel: false,
      confirmText: '知道了'
    })
  },

  /**
   * 跳转到统计页面
   */
  goToStats() {
    wx.navigateTo({
      url: '/pages/stats/stats'
    })
  }
})


