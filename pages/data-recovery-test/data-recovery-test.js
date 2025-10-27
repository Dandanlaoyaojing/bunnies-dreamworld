// pages/data-recovery-test/data-recovery-test.js
const DataRecoveryService = require('../../utils/dataRecoveryService')

Page({
  data: {
    testResults: [],
    isLoading: false,
    recoveryService: null
  },

  onLoad() {
    console.log('数据恢复测试页面加载')
    // 初始化恢复服务
    this.setData({
      recoveryService: new DataRecoveryService()
    })
  },

  // 测试查找10月16日的数据
  testFindData() {
    wx.showLoading({ title: '正在查找数据...' })
    
    try {
      const recoveryService = this.data.recoveryService
      const foundData = recoveryService.findTargetDateData()
      
      wx.hideLoading()
      
      const results = foundData.map((item, index) => ({
        id: index + 1,
        type: item.type,
        key: item.key,
        date: item.date,
        count: Array.isArray(item.data) ? item.data.length : 1,
        status: 'found'
      }))
      
      this.setData({
        testResults: results
      })
      
      wx.showModal({
        title: '查找结果',
        content: `找到 ${foundData.length} 个数据源\n\n${foundData.map((item, i) => `${i+1}. ${item.type} - ${item.key} (${item.date})`).join('\n')}`,
        showCancel: false,
        confirmText: '确定'
      })
      
    } catch (error) {
      wx.hideLoading()
      console.error('查找数据失败:', error)
      wx.showToast({
        title: '查找失败',
        icon: 'none'
      })
    }
  },

  // 测试数据恢复
  testRecovery() {
    wx.showModal({
      title: '确认测试恢复',
      content: '确定要测试数据恢复功能吗？\n\n注意：这将实际执行恢复操作，当前数据会被备份。',
      confirmText: '开始测试',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          this.performTestRecovery()
        }
      }
    })
  },

  // 执行测试恢复
  async performTestRecovery() {
    wx.showLoading({ title: '正在测试恢复...' })
    
    try {
      const recoveryService = this.data.recoveryService
      const result = await recoveryService.performRecovery()
      
      wx.hideLoading()
      
      // 验证恢复结果
      const verification = recoveryService.verifyRecovery()
      
      wx.showModal({
        title: '测试恢复成功',
        content: `数据恢复测试完成！\n\n恢复详情：\n• 恢复笔记：${result.restoredCount} 条\n• 数据源：${result.sourceData}\n• 备份文件：${result.backupKey}\n• 验证结果：${verification.targetDateNotes} 条10月16号笔记`,
        showCancel: false,
        confirmText: '确定'
      })
      
    } catch (error) {
      wx.hideLoading()
      console.error('测试恢复失败:', error)
      
      wx.showModal({
        title: '测试恢复失败',
        content: `测试过程中出现错误：\n\n${error.message}`,
        showCancel: false,
        confirmText: '确定'
      })
    }
  },

  // 显示恢复选项
  showRecoveryOptions() {
    const recoveryService = this.data.recoveryService
    if (!recoveryService) {
      wx.showToast({
        title: '恢复服务未初始化',
        icon: 'none'
      })
      return
    }

    // 直接显示恢复选项
    recoveryService.showRecoveryOptions()
  },

  // 返回上一页
  goBack() {
    wx.navigateBack()
  }
})
