// pages/compatibility-test/compatibility-test.js
const compatibilityChecker = require('../../utils/compatibilityChecker')
const draftCloudService = require('../../utils/draftCloudService')

Page({
  data: {
    checkResults: null,
    isLoading: false,
    errorMessage: ''
  },

  onLoad() {
    console.log('🔧 兼容性测试页面加载')
    this.runCompatibilityTest()
  },

  /**
   * 运行兼容性测试
   */
  async runCompatibilityTest() {
    this.setData({ isLoading: true, errorMessage: '' })

    try {
      console.log('🚀 开始兼容性测试...')
      
      // 运行完整检查
      const results = await compatibilityChecker.runFullCheck()
      
      // 测试draftCloudService初始化
      const serviceStatus = draftCloudService.getSyncStatus()
      
      this.setData({
        checkResults: {
          ...results,
          serviceStatus: serviceStatus
        },
        isLoading: false
      })

      console.log('✅ 兼容性测试完成:', results)

    } catch (error) {
      console.error('❌ 兼容性测试失败:', error)
      this.setData({
        errorMessage: error.message,
        isLoading: false
      })
    }
  },

  /**
   * 重新测试
   */
  onRetest() {
    this.runCompatibilityTest()
  },

  /**
   * 查看详细报告
   */
  onViewReport() {
    const report = compatibilityChecker.generateReport()
    
    wx.showModal({
      title: '兼容性报告',
      content: JSON.stringify(report, null, 2),
      showCancel: false,
      confirmText: '确定'
    })
  },

  /**
   * 复制错误信息
   */
  onCopyError() {
    if (this.data.errorMessage) {
      wx.setClipboardData({
        data: this.data.errorMessage,
        success: () => {
          wx.showToast({
            title: '已复制到剪贴板',
            icon: 'success'
          })
        }
      })
    }
  }
})
