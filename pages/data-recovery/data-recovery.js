// pages/data-recovery/data-recovery.js
const noteManager = require('../../utils/noteManager')

Page({
  data: {
    recoverySources: [],
    currentNotes: [],
    isLoading: false
  },

  onLoad() {
    console.log('数据恢复页面加载')
    this.loadRecoverySources()
    this.loadCurrentNotes()
  },

  // 加载可恢复的数据源
  loadRecoverySources() {
    const sources = []
    
    // 1. 检查备份数据
    const backupData = this.checkBackupData()
    if (backupData.length > 0) {
      sources.push({
        type: 'backup',
        name: '本地备份',
        count: backupData.length,
        description: '自动创建的备份数据',
        data: backupData,
        icon: '💾'
      })
    }
    
    // 2. 检查账户数据
    const accountData = this.checkAccountData()
    accountData.forEach(account => {
      sources.push({
        type: 'account',
        name: `${account.accountName}账户`,
        count: account.count,
        description: `账户创建时间：${account.createTime}`,
        data: account.notes,
        icon: '👤'
      })
    })
    
    // 3. 检查临时数据
    const tempData = this.checkTempData()
    if (tempData.length > 0) {
      sources.push({
        type: 'temp',
        name: '临时数据',
        count: tempData.length,
        description: '应用临时保存的数据',
        data: tempData,
        icon: '📝'
      })
    }
    
    this.setData({
      recoverySources: sources
    })
  },

  // 加载当前笔记
  loadCurrentNotes() {
    const currentNotes = noteManager.getAllNotes()
    this.setData({
      currentNotes: currentNotes
    })
  },

  // 检查备份数据
  checkBackupData() {
    try {
      const backup = wx.getStorageSync('notes_backup')
      return backup ? backup.notes || [] : []
    } catch (error) {
      console.error('检查备份数据失败:', error)
      return []
    }
  },

  // 检查账户数据
  checkAccountData() {
    try {
      const accounts = noteManager.getAllAccounts()
      const allAccountNotes = []
      
      Object.keys(accounts).forEach(accountName => {
        const account = accounts[accountName]
        if (account.notes && account.notes.length > 0) {
          allAccountNotes.push({
            accountName: accountName,
            notes: account.notes,
            count: account.notes.length,
            createTime: account.createTime,
            updateTime: account.updateTime
          })
        }
      })
      
      return allAccountNotes
    } catch (error) {
      console.error('检查账户数据失败:', error)
      return []
    }
  },

  // 检查临时数据
  checkTempData() {
    try {
      const tempNotes = wx.getStorageSync('temp_notes')
      return tempNotes || []
    } catch (error) {
      console.error('检查临时数据失败:', error)
      return []
    }
  },

  // 恢复数据
  recoverData(e) {
    const index = e.currentTarget.dataset.index
    const source = this.data.recoverySources[index]
    
    wx.showModal({
      title: '确认恢复',
      content: `确定要从"${source.name}"恢复 ${source.count} 条笔记吗？\n\n注意：这将覆盖当前的笔记数据。`,
      success: (res) => {
        if (res.confirm) {
          this.performRecovery(source)
        }
      }
    })
  },

  // 执行恢复
  performRecovery(source) {
    wx.showLoading({ title: '正在恢复...' })
    
    try {
      // 恢复笔记到当前存储
      wx.setStorageSync('notes', source.data)
      
      // 更新标签统计
      noteManager.updateAllTagStatistics()
      
      wx.hideLoading()
      
      wx.showModal({
        title: '恢复成功',
        content: `已成功从"${source.name}"恢复 ${source.count} 条笔记！\n\n请返回笔记页面查看恢复的内容。`,
        showCancel: false,
        confirmText: '确定',
        success: () => {
          // 跳转到我的笔记页面
          wx.navigateTo({
            url: '/pages/my-notes/my-notes'
          })
        }
      })
    } catch (error) {
      wx.hideLoading()
      console.error('恢复数据失败:', error)
      wx.showToast({
        title: '恢复失败',
        icon: 'none'
      })
    }
  },

  // 预览数据
  previewData(e) {
    const index = e.currentTarget.dataset.index
    const source = this.data.recoverySources[index]
    
    // 显示数据预览
    const previewText = source.data.slice(0, 3).map(note => 
      `• ${note.title || '无标题'} (${note.createTime})`
    ).join('\n')
    
    const moreText = source.data.length > 3 ? `\n... 还有 ${source.data.length - 3} 条笔记` : ''
    
    wx.showModal({
      title: `${source.name} 预览`,
      content: `${source.description}\n\n笔记列表：\n${previewText}${moreText}`,
      showCancel: true,
      cancelText: '取消',
      confirmText: '恢复数据',
      success: (res) => {
        if (res.confirm) {
          this.performRecovery(source)
        }
      }
    })
  },

  // 创建新备份
  createBackup() {
    wx.showLoading({ title: '创建备份中...' })
    
    try {
      const allNotes = noteManager.getAllNotes()
      
      if (allNotes.length === 0) {
        wx.hideLoading()
        wx.showToast({
          title: '没有笔记需要备份',
          icon: 'none'
        })
        return
      }
      
      const backupData = {
        version: '1.0',
        backupTime: new Date().toISOString(),
        notes: allNotes,
        totalCount: allNotes.length
      }
      
      // 保存备份
      wx.setStorageSync('notes_backup', backupData)
      
      wx.hideLoading()
      
      wx.showModal({
        title: '备份成功',
        content: `已成功创建备份！\n\n备份信息：\n- 笔记数量：${allNotes.length}\n- 备份时间：${new Date().toLocaleString()}`,
        showCancel: false,
        confirmText: '确定',
        success: () => {
          // 重新加载数据源
          this.loadRecoverySources()
        }
      })
    } catch (error) {
      wx.hideLoading()
      console.error('创建备份失败:', error)
      wx.showToast({
        title: '备份失败',
        icon: 'none'
      })
    }
  },

  // 返回上一页
  goBack() {
    wx.navigateBack()
  }
})
