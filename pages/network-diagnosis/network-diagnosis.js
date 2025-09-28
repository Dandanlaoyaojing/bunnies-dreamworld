// pages/network-diagnosis/network-diagnosis.js
const aiService = require('../../utils/aiService')

Page({
  data: {
    networkInfo: {},
    apiStatus: {},
    diagnosisResults: [],
    isDiagnosing: false,
    diagnosisComplete: false
  },

  onLoad() {
    console.log('网络诊断页面加载')
    this.startDiagnosis()
  },

  // 开始诊断
  async startDiagnosis() {
    this.setData({
      isDiagnosing: true,
      diagnosisComplete: false,
      diagnosisResults: []
    })

    const results = []

    // 1. 检查网络状态
    results.push({
      step: 1,
      title: '检查网络连接',
      status: 'checking',
      message: '正在检查网络连接状态...'
    })
    this.setData({ diagnosisResults: [...results] })

    const networkInfo = await aiService.getNetworkInfo()
    this.setData({ networkInfo })

    if (networkInfo.isConnected) {
      results[0] = {
        step: 1,
        title: '检查网络连接',
        status: 'success',
        message: `网络连接正常 (${networkInfo.networkType})`,
        details: `网络类型: ${networkInfo.networkType}`
      }
    } else {
      results[0] = {
        step: 1,
        title: '检查网络连接',
        status: 'error',
        message: '网络连接不可用',
        details: '请检查网络设置或WiFi连接'
      }
    }
    this.setData({ diagnosisResults: [...results] })

    // 2. 检查API连接
    results.push({
      step: 2,
      title: '检查AI服务连接',
      status: 'checking',
      message: '正在测试AI服务连接...'
    })
    this.setData({ diagnosisResults: [...results] })

    const apiStatus = await aiService.checkAPIStatus()
    this.setData({ apiStatus })

    if (apiStatus.success) {
      results[1] = {
        step: 2,
        title: '检查AI服务连接',
        status: 'success',
        message: 'AI服务连接正常',
        details: 'API响应正常'
      }
    } else {
      results[1] = {
        step: 2,
        title: '检查AI服务连接',
        status: 'error',
        message: 'AI服务连接失败',
        details: apiStatus.error || '未知错误'
      }
    }
    this.setData({ diagnosisResults: [...results] })

    // 3. 测试API功能
    results.push({
      step: 3,
      title: '测试AI功能',
      status: 'checking',
      message: '正在测试AI标签生成功能...'
    })
    this.setData({ diagnosisResults: [...results] })

    const testResult = await aiService.generateSmartTags('这是一个测试笔记，用于验证AI功能是否正常工作。', 'knowledge')
    
    if (testResult.success) {
      results[2] = {
        step: 3,
        title: '测试AI功能',
        status: 'success',
        message: 'AI功能测试通过',
        details: `生成的标签: ${testResult.tags.join(', ')}`
      }
    } else {
      results[2] = {
        step: 3,
        title: '测试AI功能',
        status: 'error',
        message: 'AI功能测试失败',
        details: testResult.error || '未知错误'
      }
    }
    this.setData({ diagnosisResults: [...results] })

    // 诊断完成
    this.setData({
      isDiagnosing: false,
      diagnosisComplete: true
    })

    // 显示诊断结果
    this.showDiagnosisSummary()
  },

  // 显示诊断结果摘要
  showDiagnosisSummary() {
    const results = this.data.diagnosisResults
    const successCount = results.filter(r => r.status === 'success').length
    const errorCount = results.filter(r => r.status === 'error').length

    let summary = ''
    if (errorCount === 0) {
      summary = '🎉 诊断完成！所有功能正常，AI服务可以正常使用。'
    } else if (successCount > 0) {
      summary = `⚠️ 诊断完成！发现 ${errorCount} 个问题，部分功能可能受影响。`
    } else {
      summary = '❌ 诊断完成！发现严重问题，AI功能无法使用。'
    }

    wx.showModal({
      title: '诊断结果',
      content: summary,
      showCancel: false,
      confirmText: '确定'
    })
  },

  // 重新诊断
  retryDiagnosis() {
    this.startDiagnosis()
  },

  // 查看详细结果
  viewDetails(e) {
    const index = e.currentTarget.dataset.index
    const result = this.data.diagnosisResults[index]
    
    wx.showModal({
      title: result.title,
      content: result.details || result.message,
      showCancel: false,
      confirmText: '确定'
    })
  },

  // 获取解决方案
  getSolutions() {
    const results = this.data.diagnosisResults
    const errorResults = results.filter(r => r.status === 'error')
    
    if (errorResults.length === 0) {
      wx.showToast({
        title: '没有发现问题',
        icon: 'success'
      })
      return
    }

    let solutions = '解决方案：\n\n'
    
    errorResults.forEach((result, index) => {
      solutions += `${index + 1}. ${result.title}\n`
      
      if (result.title.includes('网络连接')) {
        solutions += '   - 检查WiFi或移动网络连接\n'
        solutions += '   - 尝试切换网络\n'
        solutions += '   - 重启网络设置\n\n'
      } else if (result.title.includes('AI服务')) {
        solutions += '   - 检查网络连接是否稳定\n'
        solutions += '   - 稍后重试\n'
        solutions += '   - 检查API密钥配置\n\n'
      } else if (result.title.includes('AI功能')) {
        solutions += '   - 使用本地标签生成功能\n'
        solutions += '   - 检查网络连接\n'
        solutions += '   - 联系技术支持\n\n'
      }
    })

    wx.showModal({
      title: '问题解决方案',
      content: solutions,
      showCancel: false,
      confirmText: '确定'
    })
  },

  // 返回上一页
  goBack() {
    wx.navigateBack()
  },

  // 打开网络设置
  openNetworkSettings() {
    wx.showModal({
      title: '网络设置',
      content: '请手动检查以下设置：\n\n1. WiFi连接是否正常\n2. 移动网络是否开启\n3. 网络权限是否允许\n4. 防火墙设置',
      showCancel: true,
      cancelText: '取消',
      confirmText: '重新诊断',
      success: (res) => {
        if (res.confirm) {
          this.retryDiagnosis()
        }
      }
    })
  }
})
