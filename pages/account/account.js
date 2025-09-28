// pages/account/account.js
const noteManager = require('../../utils/noteManager')

Page({
  data: {
    userInfo: {
      username: '小兔用户',
      id: '123456',
      avatar: '',
      isOnline: true,
      noteCount: 25,
      followers: 128,
      following: 89
    },
    storageInfo: {
      localUsed: 45,
      localTotal: 100,
      localPercent: 45,
      cloudUsed: 120,
      cloudTotal: 500,
      cloudPercent: 24
    },
    subscriptionInfo: {
      plan: '免费版',
      description: '基础功能，适合日常使用',
      isActive: true
    },
    appInfo: {
      version: '1.0.0'
    }
  },

  onLoad(options) {
    console.log('账户管理页面加载')
    this.loadUserInfo()
    this.loadStorageInfo()
  },

  onShow() {
    console.log('账户管理页面显示')
    this.loadUserInfo()
  },

  // 加载用户信息
  loadUserInfo() {
    try {
      const userInfo = wx.getStorageSync('userInfo')
      if (userInfo) {
        this.setData({
          userInfo: {
            ...this.data.userInfo,
            ...userInfo
          }
        })
      }
    } catch (error) {
      console.error('加载用户信息失败:', error)
    }
  },

  // 加载存储信息
  loadStorageInfo() {
    try {
      // 获取系统信息
      const systemInfo = wx.getSystemInfoSync()
      console.log('系统信息:', systemInfo)
      
      // 模拟存储使用情况
      const storageInfo = {
        localUsed: Math.floor(Math.random() * 50) + 20,
        localTotal: 100,
        cloudUsed: Math.floor(Math.random() * 200) + 50,
        cloudTotal: 500
      }
      
      storageInfo.localPercent = Math.round((storageInfo.localUsed / storageInfo.localTotal) * 100)
      storageInfo.cloudPercent = Math.round((storageInfo.cloudUsed / storageInfo.cloudTotal) * 100)
      
      this.setData({ storageInfo })
    } catch (error) {
      console.error('加载存储信息失败:', error)
    }
  },

  // 返回上一页
  goBack() {
    wx.navigateBack()
  },

  // 更换头像
  changeAvatar() {
    wx.showActionSheet({
      itemList: ['拍照', '从相册选择'],
      success: (res) => {
        if (res.tapIndex === 0) {
          this.takePhoto()
        } else if (res.tapIndex === 1) {
          this.selectFromAlbum()
        }
      }
    })
  },

  // 拍照
  takePhoto() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['camera'],
      camera: 'front',
      success: (res) => {
        if (res.tempFiles && res.tempFiles.length > 0) {
          this.updateAvatar(res.tempFiles[0].tempFilePath)
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
      count: 1,
      mediaType: ['image'],
      sourceType: ['album'],
      success: (res) => {
        if (res.tempFiles && res.tempFiles.length > 0) {
          this.updateAvatar(res.tempFiles[0].tempFilePath)
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

  // 更新头像
  updateAvatar(avatarPath) {
    wx.showLoading({ title: '更新中...' })
    
    // 模拟上传头像
    setTimeout(() => {
      wx.hideLoading()
      
      const userInfo = {
        ...this.data.userInfo,
        avatar: avatarPath
      }
      
      this.setData({ userInfo })
      
      // 保存到本地存储
      wx.setStorageSync('userInfo', userInfo)
      
      wx.showToast({
        title: '头像更新成功',
        icon: 'success'
      })
    }, 1500)
  },

  // 编辑资料
  editProfile() {
    wx.showModal({
      title: '编辑资料',
      content: '此功能正在开发中，敬请期待',
      showCancel: false,
      confirmText: '知道了'
    })
  },

  // 修改密码
  changePassword() {
    wx.showModal({
      title: '修改密码',
      content: '此功能正在开发中，敬请期待',
      showCancel: false,
      confirmText: '知道了'
    })
  },

  // 隐私设置
  privacySettings() {
    wx.showModal({
      title: '隐私设置',
      content: '此功能正在开发中，敬请期待',
      showCancel: false,
      confirmText: '知道了'
    })
  },

  // 通知设置
  notificationSettings() {
    wx.showModal({
      title: '通知设置',
      content: '此功能正在开发中，敬请期待',
      showCancel: false,
      confirmText: '知道了'
    })
  },

  // 我的笔记
  myNotes() {
    wx.navigateTo({
      url: '/pages/my-notes/my-notes'
    })
  },

  // 清理缓存
  clearCache() {
    wx.showModal({
      title: '清理缓存',
      content: '确定要清理应用缓存吗？这将删除临时文件，但不会影响您的笔记数据。',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '清理中...' })
          
          setTimeout(() => {
            wx.hideLoading()
            wx.showToast({
              title: '缓存清理完成',
              icon: 'success'
            })
            
            // 更新存储信息
            this.loadStorageInfo()
          }, 2000)
        }
      }
    })
  },

  // 备份数据
  backupData() {
    wx.showModal({
      title: '备份数据',
      content: '此功能正在开发中，敬请期待',
      showCancel: false,
      confirmText: '知道了'
    })
  },

  // 升级计划
  upgradePlan() {
    wx.showModal({
      title: '升级计划',
      content: '此功能正在开发中，敬请期待',
      showCancel: false,
      confirmText: '知道了'
    })
  },

  // 查看账单
  viewBilling() {
    wx.showModal({
      title: '查看账单',
      content: '此功能正在开发中，敬请期待',
      showCancel: false,
      confirmText: '知道了'
    })
  },

  // 关于应用
  aboutApp() {
    wx.showModal({
      title: '关于应用',
      content: `小兔的梦幻世界笔记本\n版本：${this.data.appInfo.version}\n\n一个充满想象力的笔记应用，让您的创意自由飞翔。`,
      showCancel: false,
      confirmText: '知道了'
    })
  },

  // 帮助中心
  helpCenter() {
    wx.showModal({
      title: '帮助中心',
      content: '此功能正在开发中，敬请期待',
      showCancel: false,
      confirmText: '知道了'
    })
  },

  // 联系我们
  contactUs() {
    wx.showModal({
      title: '联系我们',
      content: '如有问题或建议，请通过以下方式联系我们：\n\n邮箱：support@rabbitnotes.com\n微信：RabbitNotes2024',
      showCancel: false,
      confirmText: '知道了'
    })
  },

  // 保存所有笔记到Dan账户
  saveToDanAccount() {
    wx.showModal({
      title: '保存到Dan账户',
      content: '确定要将当前所有笔记保存到Dan的账户吗？',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '保存中...' })
          
          try {
            // 获取当前所有笔记
            const allNotes = noteManager.getAllNotes()
            console.log('当前笔记数量:', allNotes.length)
            
            if (allNotes.length === 0) {
              wx.hideLoading()
              wx.showToast({
                title: '没有笔记需要保存',
                icon: 'none'
              })
              return
            }
            
            // 保存到Dan账户
            const result = noteManager.saveNotesToAccount('Dan', allNotes)
            
            wx.hideLoading()
            
            if (result.success) {
              wx.showModal({
                title: '保存成功',
                content: `已成功保存 ${allNotes.length} 条笔记到Dan的账户\n\n账户信息：\n- 笔记数量：${result.accountData.notes.length}\n- 标签数量：${result.accountData.tags.length}\n- 分类数量：${result.accountData.categories.length}\n- 创建时间：${result.accountData.createTime}`,
                showCancel: false,
                confirmText: '确定'
              })
            } else {
              wx.showToast({
                title: '保存失败：' + result.error,
                icon: 'none',
                duration: 3000
              })
            }
          } catch (error) {
            wx.hideLoading()
            console.error('保存到Dan账户失败:', error)
            wx.showToast({
              title: '保存失败',
              icon: 'none'
            })
          }
        }
      }
    })
  },

  // 查看Dan账户信息
  viewDanAccount() {
    try {
      const accountInfo = noteManager.getAccountInfo('Dan')
      
      if (accountInfo.success) {
        wx.showModal({
          title: 'Dan账户信息',
          content: `账户名称：${accountInfo.accountName}\n笔记数量：${accountInfo.noteCount}\n标签数量：${accountInfo.tagCount}\n分类数量：${accountInfo.categoryCount}\n创建时间：${accountInfo.createTime}\n更新时间：${accountInfo.updateTime}`,
          showCancel: false,
          confirmText: '确定'
        })
      } else {
        wx.showToast({
          title: 'Dan账户不存在',
          icon: 'none'
        })
      }
    } catch (error) {
      console.error('查看Dan账户信息失败:', error)
      wx.showToast({
        title: '查看失败',
        icon: 'none'
      })
    }
  },

  // 恢复笔记数据
  recoverNotes() {
    wx.showModal({
      title: '恢复笔记数据',
      content: '检测到您的笔记可能丢失，是否要尝试恢复？',
      success: (res) => {
        if (res.confirm) {
          this.performDataRecovery()
        }
      }
    })
  },

  // 执行数据恢复
  performDataRecovery() {
    wx.showLoading({ title: '正在恢复数据...' })
    
    try {
      // 1. 检查是否有备份数据
      const backupData = this.checkBackupData()
      
      // 2. 检查是否有账户数据
      const accountData = this.checkAccountData()
      
      // 3. 检查是否有临时数据
      const tempData = this.checkTempData()
      
      setTimeout(() => {
        wx.hideLoading()
        
        if (backupData.length > 0 || accountData.length > 0 || tempData.length > 0) {
          this.showRecoveryOptions(backupData, accountData, tempData)
        } else {
          wx.showModal({
            title: '未找到备份数据',
            content: '很抱歉，没有找到可恢复的笔记数据。建议您重新创建笔记。',
            showCancel: false,
            confirmText: '确定'
          })
        }
      }, 2000)
    } catch (error) {
      wx.hideLoading()
      console.error('数据恢复失败:', error)
      wx.showToast({
        title: '恢复失败',
        icon: 'none'
      })
    }
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

  // 显示恢复选项
  showRecoveryOptions(backupData, accountData, tempData) {
    const options = []
    const dataSources = []
    
    if (backupData.length > 0) {
      options.push(`备份数据 (${backupData.length}条笔记)`)
      dataSources.push({ type: 'backup', data: backupData })
    }
    
    if (accountData.length > 0) {
      accountData.forEach(account => {
        options.push(`${account.accountName}账户 (${account.count}条笔记)`)
        dataSources.push({ type: 'account', data: account })
      })
    }
    
    if (tempData.length > 0) {
      options.push(`临时数据 (${tempData.length}条笔记)`)
      dataSources.push({ type: 'temp', data: tempData })
    }
    
    wx.showActionSheet({
      itemList: options,
      success: (res) => {
        const selectedSource = dataSources[res.tapIndex]
        this.restoreFromSource(selectedSource)
      }
    })
  },

  // 从指定源恢复数据
  restoreFromSource(source) {
    wx.showLoading({ title: '正在恢复...' })
    
    try {
      let notesToRestore = []
      
      switch (source.type) {
        case 'backup':
          notesToRestore = source.data
          break
        case 'account':
          notesToRestore = source.data.notes
          break
        case 'temp':
          notesToRestore = source.data
          break
      }
      
      if (notesToRestore.length > 0) {
        // 恢复笔记到当前存储
        wx.setStorageSync('notes', notesToRestore)
        
        // 更新标签统计
        noteManager.updateAllTagStatistics()
        
        wx.hideLoading()
        
        wx.showModal({
          title: '恢复成功',
          content: `已成功恢复 ${notesToRestore.length} 条笔记！\n\n请返回笔记页面查看恢复的内容。`,
          showCancel: false,
          confirmText: '确定',
          success: () => {
            // 跳转到我的笔记页面
            wx.navigateTo({
              url: '/pages/my-notes/my-notes'
            })
          }
        })
      } else {
        wx.hideLoading()
        wx.showToast({
          title: '没有可恢复的数据',
          icon: 'none'
        })
      }
    } catch (error) {
      wx.hideLoading()
      console.error('恢复数据失败:', error)
      wx.showToast({
        title: '恢复失败',
        icon: 'none'
      })
    }
  },

  // 打开数据恢复工具
  openDataRecovery() {
    wx.navigateTo({
      url: '/pages/data-recovery/data-recovery'
    })
  },

  // 打开网络诊断工具
  openNetworkDiagnosis() {
    wx.navigateTo({
      url: '/pages/network-diagnosis/network-diagnosis'
    })
  },

  // 打开账户保存管理
  openAccountSave() {
    wx.navigateTo({
      url: '/pages/account-save/account-save'
    })
  },

  // 创建数据备份
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
        content: `已成功创建备份！\n\n备份信息：\n- 笔记数量：${allNotes.length}\n- 备份时间：${new Date().toLocaleString()}\n\n备份数据已保存到本地，可用于数据恢复。`,
        showCancel: false,
        confirmText: '确定'
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

  // 退出登录
  logout() {
    wx.showModal({
      title: '退出登录',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '退出中...' })
          
          setTimeout(() => {
            wx.hideLoading()
            
            // 清除用户信息
            wx.removeStorageSync('userInfo')
            
            wx.showToast({
              title: '已退出登录',
              icon: 'success'
            })
            
            // 跳转到登录页面
            setTimeout(() => {
              wx.redirectTo({
                url: '/pages/login/login'
              })
            }, 1500)
          }, 1000)
        }
      }
    })
  }
})
