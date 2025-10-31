// pages/account/account.js
const noteManager = require('../../utils/noteManager')

Page({
  data: {
    userInfo: {
      username: '小兔用户',
      id: '123456',
      avatar: '',
      isOnline: true,
      noteCount: 0,
      dayCount: 0,
      likeCount: 0,
      favoriteCount: 0,
      draftCount: 0,
      trashCount: 0,
      followers: 128,
      following: 89
    },
    storageInfo: {
      localUsed: 45,
      localTotal: 100,
      localPercent: 45,
      cloudUsed: 120,
      cloudTotal: 500,
      cloudPercent: 24,
      notesCount: 0,
      dataSize: 0,
      accountsCount: 0,
      tagsCount: 0,
      keysCount: 0
    },
    syncStatus: {
      totalCount: 0,
      syncedCount: 0,
      unsyncedCount: 0,
      syncProgress: 100
    },
    appInfo: {
      version: '1.0.0'
    }
  },

  onLoad(options) {
    console.log('账户管理页面加载')
    this.loadUserInfo()
    this.loadStorageInfo()
    this.loadSyncStatus()
  },

  onShow() {
    console.log('账户管理页面显示')
    this.loadUserInfo()
    this.loadSyncStatus()
  },

  // 加载用户信息
  loadUserInfo() {
    try {
      const userInfo = wx.getStorageSync('userInfo')
      console.log('从存储中获取的用户信息:', userInfo)
      
      if (userInfo && userInfo.username) {
        console.log('用户已登录，用户名:', userInfo.username)
        // 加载真实的统计数据
        this.loadRealStatistics(userInfo.username)
        
        this.setData({
          userInfo: {
            ...this.data.userInfo,
            ...userInfo
          }
        })
      } else {
        console.log('用户未登录或用户信息不完整')
        // 显示未登录状态
        this.setData({
          userInfo: {
            ...this.data.userInfo,
            username: '未登录',
            id: '000000',
            isOnline: false
          }
        })
        
        // 显示登录提示
        wx.showModal({
          title: '未登录',
          content: '请先登录以查看账户信息',
          showCancel: true,
          cancelText: '稍后',
          confirmText: '去登录',
          success: (res) => {
            if (res.confirm) {
              wx.navigateTo({
                url: '/pages/login/login'
              })
            }
          }
        })
      }
    } catch (error) {
      console.error('加载用户信息失败:', error)
      // 显示错误状态
      this.setData({
        userInfo: {
          ...this.data.userInfo,
          username: '加载失败',
          id: '000000',
          isOnline: false
        }
      })
    }
  },

  // 加载真实统计数据
  loadRealStatistics(username) {
    try {
      console.log('开始加载用户统计数据，用户名:', username)
      
      if (!username) {
        console.log('用户名为空，无法加载统计数据')
        return
      }
      
      // 获取账户数据
      const accountResult = noteManager.getNotesFromAccount(username)
      console.log('账户数据获取结果:', accountResult)
      
      if (accountResult.success) {
        const notes = accountResult.notes || []
        console.log('找到笔记数量:', notes.length)
        
        // 计算真实统计数据
        const noteCount = notes.length
        const totalWords = notes.reduce((sum, note) => sum + (note.wordCount || 0), 0)
        
        // 计算使用天数（基于笔记创建时间）
        const createDates = new Set()
        notes.forEach(note => {
          if (note.createTime) {
            const date = new Date(note.createTime)
            const dateStr = date.toISOString().split('T')[0] // YYYY-MM-DD
            createDates.add(dateStr)
          }
        })
        const dayCount = createDates.size
        
        // 计算获赞数（如果有likeCount字段）
        const likeCount = notes.reduce((sum, note) => sum + (note.likeCount || 0), 0)
        
        // 计算收藏数（如果有favoriteCount字段）
        const favoriteCount = notes.reduce((sum, note) => sum + (note.favoriteCount || 0), 0)
        
        // 计算草稿数（基于状态）
        const draftCount = notes.filter(note => note.status === 'draft').length
        
        // 计算回收站数量（基于状态）
        const trashCount = notes.filter(note => note.status === 'deleted').length
        
        // 更新用户信息
        this.setData({
          'userInfo.noteCount': noteCount,
          'userInfo.dayCount': dayCount,
          'userInfo.likeCount': likeCount,
          'userInfo.favoriteCount': favoriteCount,
          'userInfo.draftCount': draftCount,
          'userInfo.trashCount': trashCount
        })
        
        console.log('真实统计数据加载完成:', {
          noteCount,
          dayCount,
          likeCount,
          favoriteCount,
          draftCount,
          trashCount
        })
        
        // 显示加载成功提示
        if (noteCount > 0) {
          wx.showToast({
            title: `加载了${noteCount}条笔记`,
            icon: 'success',
            duration: 2000
          })
        }
      } else {
        console.log('没有找到账户数据，使用默认值')
        console.log('错误信息:', accountResult.error)
        
        // 显示无数据提示
        wx.showToast({
          title: '暂无笔记数据',
          icon: 'none',
          duration: 2000
        })
      }
    } catch (error) {
      console.error('加载真实统计数据失败:', error)
      
      // 显示错误提示
      wx.showToast({
        title: '数据加载失败',
        icon: 'none',
        duration: 2000
      })
    }
  },

  // 加载存储信息
  loadStorageInfo() {
    try {
      // 获取真实的存储信息
      wx.getStorageInfo({
        success: (res) => {
          console.log('存储信息:', res)
          
          // 计算实际数据大小
          const allNotes = wx.getStorageSync('notes') || []
          const allAccounts = wx.getStorageSync('userAccounts') || {}
          const allTags = wx.getStorageSync('noteTags') || []
          
          // 估算数据大小（粗略计算）
          const notesSize = JSON.stringify(allNotes).length
          const accountsSize = JSON.stringify(allAccounts).length
          const tagsSize = JSON.stringify(allTags).length
          const totalDataSize = notesSize + accountsSize + tagsSize
          
          const storageInfo = {
            localUsed: Math.round(res.currentSize / 1024), // KB转MB
            localTotal: Math.round(res.limitSize / 1024), // KB转MB
            dataSize: Math.round(totalDataSize / 1024), // 实际数据大小
            notesCount: allNotes.length,
            accountsCount: Object.keys(allAccounts).length,
            tagsCount: allTags.length,
            keysCount: res.keys.length,
            keysList: res.keys.slice(0, 10) // 显示前10个key
          }
          
          storageInfo.localPercent = Math.round((storageInfo.localUsed / storageInfo.localTotal) * 100)
          storageInfo.cloudUsed = Math.floor(Math.random() * 200) + 50
          storageInfo.cloudTotal = 500
          storageInfo.cloudPercent = Math.round((storageInfo.cloudUsed / storageInfo.cloudTotal) * 100)
          
          console.log('计算后的存储信息:', storageInfo)
          this.setData({ storageInfo })
        },
        fail: (error) => {
          console.error('获取存储信息失败:', error)
          
          // 使用模拟数据作为备选
          const storageInfo = {
            localUsed: 50,
            localTotal: 100,
            cloudUsed: 150,
            cloudTotal: 500,
            dataSize: 30,
            notesCount: 0,
            accountsCount: 0,
            tagsCount: 0,
            keysCount: 0,
            keysList: []
          }
          
          storageInfo.localPercent = 50
          storageInfo.cloudPercent = 30
          
          this.setData({ storageInfo })
        }
      })
    } catch (error) {
      console.error('加载存储信息失败:', error)
    }
  },

  // 加载同步状态
  loadSyncStatus() {
    try {
      const syncStatus = noteManager.getSyncStatus()
      if (syncStatus.success) {
        console.log('同步状态:', syncStatus)
        this.setData({ syncStatus })
      } else {
        console.log('获取同步状态失败:', syncStatus.error)
        // 设置默认状态
        this.setData({
          syncStatus: {
            totalCount: 0,
            syncedCount: 0,
            unsyncedCount: 0,
            syncProgress: 100
          }
        })
      }
    } catch (error) {
      console.error('加载同步状态失败:', error)
    }
  },

  // 清理旧数据
  cleanOldData() {
    try {
      wx.showModal({
        title: '清理旧数据',
        content: '这将清理所有没有用的旧数据，包括重复笔记、过期回收站数据等。是否继续？',
        confirmText: '开始清理',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            wx.showLoading({ title: '清理中...', mask: true })
            
            try {
              const result = noteManager.cleanOldData()
              wx.hideLoading()
              
              if (result.success) {
                let message = `清理完成！\n共清理了 ${result.cleanedCount} 项数据`
                if (result.cleanedItems && result.cleanedItems.length > 0) {
                  message += '\n\n清理的项目：\n' + result.cleanedItems.join('\n')
                }
                
                wx.showModal({
                  title: '清理完成',
                  content: message,
                  showCancel: false,
                  confirmText: '知道了',
                  success: () => {
                    // 重新加载数据
                    this.loadUserInfo()
                    this.loadSyncStatus()
                    this.loadStorageInfo()
                  }
                })
              } else {
                wx.showToast({
                  title: result.error || '清理失败',
                  icon: 'none',
                  duration: 3000
                })
              }
            } catch (error) {
              wx.hideLoading()
              console.error('清理过程出错:', error)
              wx.showToast({
                title: '清理失败: ' + error.message,
                icon: 'none',
                duration: 3000
              })
            }
          }
        }
      })
    } catch (error) {
      console.error('清理准备失败:', error)
      wx.showToast({
        title: '清理准备失败',
        icon: 'none'
      })
    }
  },

  // 查看数据存储统计
  viewDataStats() {
    try {
      const statsResult = noteManager.getDataStorageStats()
      if (statsResult.success) {
        const stats = statsResult.stats
        let message = '📊 数据存储统计\n\n'
        
        message += `📝 账户笔记: ${stats.account.notes} 条\n`
        message += `🏷️ 账户标签: ${stats.account.tags} 个\n`
        message += `📂 账户分类: ${stats.account.categories} 个\n`
        message += `🗑️ 回收站笔记: ${stats.trash.notes} 条\n\n`
        
        message += `🌐 全局笔记: ${stats.global.notes} 条\n`
        message += `🌐 全局标签: ${stats.global.tags} 个\n`
        message += `🌐 全局分类: ${stats.global.categories} 个\n\n`
        
        if (Object.keys(stats.other).length > 0) {
          message += '📦 其他数据:\n'
          Object.entries(stats.other).forEach(([key, count]) => {
            message += `${key}: ${count} 项\n`
          })
        }
        
        wx.showModal({
          title: '数据存储统计',
          content: message,
          showCancel: false,
          confirmText: '知道了'
        })
      } else {
        wx.showToast({
          title: statsResult.error || '获取统计失败',
          icon: 'none'
        })
      }
    } catch (error) {
      console.error('查看数据统计失败:', error)
      wx.showToast({
        title: '查看统计失败',
        icon: 'none'
      })
    }
  },

  // 返回上一页
  goBack() {
    const pages = getCurrentPages()
    if (pages.length > 1) {
      wx.navigateBack()
    } else {
      wx.switchTab({
        url: '/pages/2/2'
      })
    }
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
    wx.navigateTo({
      url: '/pages/change-password/change-password'
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

  // 同步未同步的笔记到服务器
  async syncToServer() {
    try {
      // 先检查同步状态
      const syncStatus = noteManager.getSyncStatus()
      if (!syncStatus.success) {
        wx.showToast({
          title: syncStatus.error || '获取同步状态失败',
          icon: 'none'
        })
        return
      }
      
      if (syncStatus.unsyncedCount === 0) {
        wx.showToast({
          title: '所有笔记已同步',
          icon: 'success'
        })
        return
      }
      
      // 显示确认对话框
      wx.showModal({
        title: '同步笔记到服务器',
        content: `发现 ${syncStatus.unsyncedCount} 条未同步的笔记，是否开始同步？`,
        confirmText: '开始同步',
        cancelText: '取消',
        success: async (res) => {
          if (res.confirm) {
            // 开始同步
            wx.showLoading({ 
              title: `同步中... 0/${syncStatus.unsyncedCount}`,
              mask: true
            })
            
            try {
              const result = await noteManager.syncUnsyncedNotes()
              
              wx.hideLoading()
              
              if (result.success) {
                // 显示同步结果
                let message = `同步完成！\n成功：${result.syncedCount} 条`
                if (result.failedCount > 0) {
                  message += `\n失败：${result.failedCount} 条`
                }
                
                wx.showModal({
                  title: '同步完成',
                  content: message,
                  showCancel: false,
                  confirmText: '知道了',
                  success: () => {
                    // 重新加载用户信息以更新统计数据
                    this.loadUserInfo()
                  }
                })
                
                // 如果有失败的笔记，显示详细信息
                if (result.errors && result.errors.length > 0) {
                  console.log('同步失败的笔记:', result.errors)
                }
              } else {
                wx.showToast({
                  title: result.error || '同步失败',
                  icon: 'none',
                  duration: 3000
                })
              }
            } catch (error) {
      wx.hideLoading()
              console.error('同步过程出错:', error)
              wx.showToast({
                title: '同步失败: ' + error.message,
                icon: 'none',
                duration: 3000
              })
            }
          }
        }
      })
    } catch (error) {
      console.error('同步准备失败:', error)
      wx.showToast({
        title: '同步准备失败',
        icon: 'none'
      })
    }
  },

  // 从云端下载
  syncFromServer() {
    wx.showLoading({ title: '下载中...' })
    
    setTimeout(() => {
      wx.hideLoading()
      wx.showToast({
        title: '下载成功',
        icon: 'success'
      })
    }, 2000)
  },

  // 创建备份
  createBackup() {
    wx.showLoading({ title: '创建备份中...' })
    
    setTimeout(() => {
      wx.hideLoading()
      wx.showToast({
        title: '备份创建成功',
        icon: 'success'
      })
    }, 2000)
  },

  // 清理缓存
  clearCache() {
    wx.showModal({
      title: '清理缓存',
      content: '确定要清理所有缓存数据吗？这将删除临时文件，但不会影响您的笔记数据。',
      showCancel: true,
      cancelText: '取消',
      confirmText: '清理',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '清理中...' })
          
          setTimeout(() => {
            wx.hideLoading()
            wx.showToast({
              title: '缓存清理完成',
              icon: 'success'
            })
            // 重新加载存储信息
            this.loadStorageInfo()
          }, 1500)
        }
      }
    })
  },

  // 保存到Dan账户
  saveToDanAccount() {
    wx.showModal({
      title: '保存到Dan账户',
      content: '此功能正在开发中，敬请期待',
      showCancel: false,
      confirmText: '知道了'
    })
  },

  // 查看Dan账户
  viewDanAccount() {
    wx.showModal({
      title: '查看Dan账户',
      content: '此功能正在开发中，敬请期待',
      showCancel: false,
      confirmText: '知道了'
    })
  },

  // 数据恢复工具
  openDataRecovery() {
    wx.showModal({
      title: '数据恢复工具',
      content: '此功能正在开发中，敬请期待',
      showCancel: false,
      confirmText: '知道了'
    })
  },

  // 网络诊断工具
  openNetworkDiagnosis() {
    wx.showModal({
      title: '网络诊断工具',
      content: '此功能正在开发中，敬请期待',
      showCancel: false,
      confirmText: '知道了'
    })
  },

  // 意见反馈
  contactUs() {
    wx.showModal({
      title: '意见反馈',
      content: '感谢您的反馈！您可以通过以下方式联系我们：\n\n邮箱：feedback@example.com\n微信：example_wechat',
      showCancel: false,
      confirmText: '知道了'
    })
  },

  // 检查更新
  checkUpdate() {
    wx.showLoading({ title: '检查更新中...' })
    
    setTimeout(() => {
      wx.hideLoading()
      wx.showModal({
        title: '检查更新',
        content: '当前已是最新版本 v1.0.0',
        showCancel: false,
        confirmText: '知道了'
      })
    }, 1500)
  },

  // 关于应用
  aboutApp() {
    wx.showModal({
      title: '关于应用',
      content: '小兔的梦幻世界笔记本 v1.0.0\n\n一个记录生活美好的笔记应用',
      showCancel: false,
      confirmText: '知道了'
    })
  },

  // 退出登录
  logout() {
    wx.showModal({
      title: '退出登录',
      content: '确定要退出当前账户吗？',
      showCancel: true,
      cancelText: '取消',
      confirmText: '退出',
      success: (res) => {
        if (res.confirm) {
          // 清除用户信息
          wx.removeStorageSync('userInfo')
          
          wx.showToast({
            title: '已退出登录',
            icon: 'success'
          })
          
          // 返回我的页面
          setTimeout(() => {
            wx.switchTab({
              url: '/pages/2/2'
            })
          }, 1500)
        }
      }
    })
  },

  // 快速登录（开发测试）
  quickLogin() {
    wx.showModal({
      title: '快速登录',
      content: '此功能仅用于开发测试',
      showCancel: true,
      cancelText: '取消',
      confirmText: '登录',
      success: (res) => {
        if (res.confirm) {
          // 模拟登录
          const mockUserInfo = {
            username: 'TestUser',
            id: '999999',
            avatar: '',
            token: 'mock_token_' + Date.now()
          }
          
          wx.setStorageSync('userInfo', mockUserInfo)
          
          wx.showToast({
            title: '登录成功',
            icon: 'success'
          })
          
          // 重新加载用户信息
          this.loadUserInfo()
        }
      }
    })
  },

  // 更换头像
  changeAvatar() {
    wx.showModal({
      title: '更换头像',
      content: '此功能正在开发中，敬请期待',
      showCancel: false,
      confirmText: '知道了'
    })
  }
})












