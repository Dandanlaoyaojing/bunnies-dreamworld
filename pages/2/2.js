// pages/2/2.js
const cloudService = require('../../utils/cloudService')
const apiService = require('../../utils/apiService')
const { getMigrationStatus, getGlobalNotesInfo, migrateGlobalNotesToAccount } = require('../../utils/migrateNotes')

Page({
  data: {
    userInfo: {
      username: '小兔用户',
      avatar: '',
      desc: '记录生活的美好瞬间',
      isLoggedIn: false,
      noteCount: 0,
      dayCount: 0,
      likeCount: 0,
      favoriteCount: 0,
      draftCount: 0,
      trashCount: 0
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
    console.log('我的页面加载')
    this.loadUserInfo()
  },

  onShow() {
    console.log('我的页面显示')
    
    // 先强制检查存储中的登录状态
    const userInfo = wx.getStorageSync('userInfo')
    if (userInfo && userInfo.username) {
      console.log('检测到用户已登录，强制更新页面状态')
      this.setData({
        'userInfo.isLoggedIn': true,
        'userInfo.username': userInfo.username
      })
    }
    
    // 然后加载用户信息和统计数据
    this.loadUserInfo()
  },

  // 加载用户信息
  loadUserInfo() {
    try {
      console.log('=== 开始加载用户信息 ===')
      const userInfo = wx.getStorageSync('userInfo')
      console.log('从存储读取的用户信息:', userInfo)
      
      if (userInfo && userInfo.username) {
        console.log('用户已登录:', userInfo.username)
        
        // 先更新用户基本信息
        this.setData({
          userInfo: {
            ...this.data.userInfo,
            username: userInfo.username,
            isLoggedIn: true
          }
        })
        
        // 然后加载真实的统计数据
        this.loadRealStatistics(userInfo.username)
      } else {
        console.log('用户未登录')
        this.setData({
          userInfo: {
            ...this.data.userInfo,
            username: '未登录',
            isLoggedIn: false,
            noteCount: 0,
            dayCount: 0,
            likeCount: 0,
            favoriteCount: 0,
            draftCount: 0,
            trashCount: 0
          }
        })
      }
    } catch (error) {
      console.error('加载用户信息失败:', error)
      console.error('错误堆栈:', error.stack)
    }
  },

  // 加载真实统计数据
  loadRealStatistics(username) {
    try {
      console.log('=== 开始加载用户统计数据 ===')
      console.log('用户名:', username)
      
      const noteManager = require('../../utils/noteManager')
      
      // 获取账户数据
      const accountResult = noteManager.getNotesFromAccount(username)
      console.log('账户数据获取结果:', accountResult)
      
      if (accountResult.success) {
        const notes = accountResult.notes || []
        console.log('账户笔记数量:', notes.length)
        console.log('笔记列表:', notes)
        
        // 计算真实统计数据
        const noteCount = notes.length
        const totalWords = notes.reduce((sum, note) => sum + (note.wordCount || 0), 0)
        
        // 计算使用天数（基于笔记创建时间）
        const createDates = new Set()
        notes.forEach(note => {
          if (note.createTime) {
            try {
              // 兼容多种日期格式
              const dateStr = note.createTime.split(' ')[0] // 取日期部分
            createDates.add(dateStr)
              console.log('添加日期:', dateStr)
            } catch (e) {
              console.error('日期解析失败:', note.createTime, e)
            }
          }
        })
        const dayCount = createDates.size
        console.log('使用天数:', dayCount, '日期列表:', Array.from(createDates))
        
        // 计算获赞数（如果有likeCount字段）
        const likeCount = notes.reduce((sum, note) => sum + (note.likeCount || 0), 0)
        
        // 计算收藏数（基于isFavorite字段）
        const favoriteCount = notes.filter(note => note.isFavorite === true && note.status !== 'deleted').length
        console.log('收藏数量:', favoriteCount)
        
        // 计算草稿数（从草稿存储中获取）
        const drafts = wx.getStorageSync('drafts') || []
        const draftCount = drafts.length
        console.log('草稿数量:', draftCount)
        
        // 计算回收站数量（基于status字段）
        const trashCount = notes.filter(note => note.status === 'deleted').length
        console.log('回收站数量:', trashCount)
        
        // 更新用户信息（确保不覆盖isLoggedIn）
        this.setData({
          'userInfo.noteCount': noteCount,
          'userInfo.dayCount': dayCount,
          'userInfo.likeCount': likeCount,
          'userInfo.favoriteCount': favoriteCount,
          'userInfo.draftCount': draftCount,
          'userInfo.trashCount': trashCount,
          'userInfo.isLoggedIn': true  // 确保登录状态不被覆盖
        })
        
        console.log('=== 统计数据更新完成 ===')
        console.log('笔记数:', noteCount)
        console.log('使用天数:', dayCount)
        console.log('总字数:', totalWords)
        console.log('获赞数:', likeCount)
        console.log('收藏数:', favoriteCount)
        console.log('草稿数:', draftCount)
        console.log('回收站:', trashCount)
        
        // 数据加载完成（不显示提示，避免频繁打扰用户）
      } else {
        console.log('没有找到账户数据，使用默认值')
        console.log('错误信息:', accountResult.error)
        
        // 重置为默认值（保持登录状态）
        this.setData({
          'userInfo.noteCount': 0,
          'userInfo.dayCount': 0,
          'userInfo.likeCount': 0,
          'userInfo.favoriteCount': 0,
          'userInfo.draftCount': 0,
          'userInfo.trashCount': 0,
          'userInfo.isLoggedIn': true  // 即使没有笔记，也保持登录状态
        })
        
        console.log('账户暂无数据，但用户仍处于登录状态')
      }
    } catch (error) {
      console.error('加载真实统计数据失败:', error)
      console.error('错误堆栈:', error.stack)
    }
  },

  // 跳转到账户管理
  goToAccount() {
    console.log('=== 点击账户管理按钮 ===')
    
    // 双重检查登录状态
    const userInfo = wx.getStorageSync('userInfo')
    const isReallyLoggedIn = !!(userInfo && userInfo.username)
    
    if (!isReallyLoggedIn) {
      console.log('未登录，跳转到登录页面')
      this.goToLogin()
      return
    }
    
    // 修复页面状态
    if (!this.data.userInfo.isLoggedIn) {
      this.setData({
        'userInfo.isLoggedIn': true,
        'userInfo.username': userInfo.username
      })
    }
    
    console.log('跳转到账户管理页面')
    wx.navigateTo({
      url: '/pages/account/account'
    })
  },

  // 跳转到登录页面
  goToLogin() {
    wx.navigateTo({
      url: '/pages/login/login'
    })
  },

  // 跳转到我的笔记
  goToMyNotes() {
    console.log('=== 点击我的笔记按钮 ===')
    console.log('当前用户信息:', this.data.userInfo)
    console.log('登录状态:', this.data.userInfo.isLoggedIn)
    console.log('用户名:', this.data.userInfo.username)
    
    // 双重检查：同时检查页面数据和存储数据
    const userInfo = wx.getStorageSync('userInfo')
    console.log('存储中的用户信息:', userInfo)
    
    // 如果存储中有用户信息，说明已登录
    const isReallyLoggedIn = !!(userInfo && userInfo.username)
    console.log('真实登录状态:', isReallyLoggedIn)
    
    if (!isReallyLoggedIn) {
      console.log('检测到未登录，跳转到登录页面')
      this.goToLogin()
      return
    }
    
    // 如果页面数据状态不正确，先修复
    if (!this.data.userInfo.isLoggedIn) {
      console.log('修复页面登录状态')
      this.setData({
        'userInfo.isLoggedIn': true,
        'userInfo.username': userInfo.username
      })
    }
    
    console.log('用户已登录，跳转到我的笔记页面')
    wx.navigateTo({
      url: '/pages/my-notes/my-notes',
      success: () => {
        console.log('✅ 成功跳转到我的笔记页面')
      },
      fail: (err) => {
        console.error('❌ 跳转失败:', err)
        wx.showToast({
          title: '跳转失败: ' + err.errMsg,
          icon: 'none'
        })
      }
    })
  },

  // 跳转到知识星图
  goToKnowledgeMap() {
    console.log('=== 点击知识星图按钮 ===')
    
    // 双重检查登录状态
    const userInfo = wx.getStorageSync('userInfo')
    const isReallyLoggedIn = !!(userInfo && userInfo.username)
    
    if (!isReallyLoggedIn) {
      console.log('未登录，跳转到登录页面')
      this.goToLogin()
      return
    }
    
    // 修复页面状态
    if (!this.data.userInfo.isLoggedIn) {
      this.setData({
        'userInfo.isLoggedIn': true,
        'userInfo.username': userInfo.username
      })
    }
    
    console.log('跳转到知识星图页面')
    wx.navigateTo({
      url: '/pages/knowledge-map/knowledge-map'
    })
  },

  // 跳转到我的收藏
  goToFavorites() {
    console.log('=== 点击我的收藏按钮 ===')
    
    // 双重检查登录状态
    const userInfo = wx.getStorageSync('userInfo')
    const isReallyLoggedIn = !!(userInfo && userInfo.username)
    
    if (!isReallyLoggedIn) {
      console.log('未登录，跳转到登录页面')
      this.goToLogin()
      return
    }
    
    // 修复页面状态
    if (!this.data.userInfo.isLoggedIn) {
      this.setData({
        'userInfo.isLoggedIn': true,
        'userInfo.username': userInfo.username
      })
    }
    
    console.log('跳转到我的收藏页面')
    wx.navigateTo({
      url: '/pages/favorites/favorites',
      success: () => {
        console.log('✅ 成功跳转到我的收藏页面')
      },
      fail: (err) => {
        console.error('❌ 跳转失败:', err)
    wx.showToast({
          title: '跳转失败',
      icon: 'none'
        })
      }
    })
  },

  // 跳转到草稿箱
  goToDrafts() {
    // 双重检查登录状态
    const userInfo = wx.getStorageSync('userInfo')
    const isReallyLoggedIn = !!(userInfo && userInfo.username)
    
    if (!isReallyLoggedIn) {
      this.goToLogin()
      return
    }
    
    wx.navigateTo({
      url: '/pages/draft-box/draft-box',
      success: (res) => {
        console.log('跳转到草稿箱成功:', res)
      },
      fail: (err) => {
        console.error('跳转到草稿箱失败:', err)
        wx.showToast({
          title: '跳转失败',
          icon: 'none'
        })
      }
    })
  },

  // 跳转到回收站
  goToTrash() {
    console.log('=== 点击回收站按钮 ===')
    
    // 双重检查登录状态
    const userInfo = wx.getStorageSync('userInfo')
    const isReallyLoggedIn = !!(userInfo && userInfo.username)
    
    if (!isReallyLoggedIn) {
      console.log('未登录，跳转到登录页面')
      this.goToLogin()
      return
    }
    
    // 修复页面状态
    if (!this.data.userInfo.isLoggedIn) {
      this.setData({
        'userInfo.isLoggedIn': true,
        'userInfo.username': userInfo.username
      })
    }
    
    console.log('跳转到回收站页面')
    wx.navigateTo({
      url: '/pages/trash/trash',
      success: () => {
        console.log('✅ 成功跳转到回收站页面')
      },
      fail: (err) => {
        console.error('❌ 跳转失败:', err)
    wx.showToast({
          title: '跳转失败',
      icon: 'none'
        })
      }
    })
  },


  // 跳转到帮助中心
  goToHelp() {
    wx.showModal({
      title: '帮助中心',
      content: '如有问题，请通过以下方式联系我们：\n\n1. 查看应用内帮助文档\n2. 发送邮件至 support@rabbitnotes.com\n3. 在应用内提交反馈',
      showCancel: false,
      confirmText: '知道了'
    })
  },


  // 关于应用
  aboutApp() {
    wx.showModal({
      title: '关于应用',
      content: `小兔的梦幻世界笔记本\n版本：${this.data.appInfo.version}\n\n一个充满想象力的笔记应用，让您的创意自由飞翔。\n\n开发者：小兔团队\n更新时间：2024年1月`,
      showCancel: false,
      confirmText: '知道了'
    })
  },

  // 云同步 - 上传到服务器
  async syncToServer() {
    console.log('=== 开始上传到服务器 ===')
    
    // 检查登录状态
    const userInfo = wx.getStorageSync('userInfo')
    if (!userInfo || !userInfo.token) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      })
      return
    }
    
    try {
      const result = await cloudService.syncToCloud()
      
      if (result.success) {
        wx.showModal({
          title: '同步成功',
          content: result.message,
          showCancel: false
        })
      } else {
        wx.showToast({
          title: result.error || '同步失败',
          icon: 'none'
        })
      }
    } catch (err) {
      console.error('同步失败:', err)
      wx.showToast({
        title: '同步失败',
        icon: 'none'
      })
    }
  },

  // 云同步 - 从服务器下载
  async syncFromServer() {
    console.log('=== 开始从服务器下载 ===')
    
    // 检查登录状态
    const userInfo = wx.getStorageSync('userInfo')
    if (!userInfo || !userInfo.token) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      })
      return
    }
    
    try {
      const result = await cloudService.syncFromCloud()
      
      if (result.success) {
        // 重新加载统计数据
        this.loadUserInfo()
        
        wx.showModal({
          title: '同步成功',
          content: result.message,
          showCancel: false
        })
      } else {
        wx.showToast({
          title: result.error || '同步失败',
          icon: 'none'
        })
      }
    } catch (err) {
      console.error('同步失败:', err)
      wx.showToast({
        title: '同步失败',
        icon: 'none'
      })
    }
  },

  // 退出登录
  async logout() {
    wx.showModal({
      title: '退出登录',
      content: '确定要退出登录吗？',
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '退出中...' })
          
          try {
            // 调用API登出
            await apiService.logout()
          } catch (err) {
            console.log('API登出失败:', err)
          }
          
          setTimeout(() => {
            wx.hideLoading()
            
            // 清除用户信息
            wx.removeStorageSync('userInfo')
            
            // 清除本地笔记缓存（可选）
            // wx.removeStorageSync('notes')
            
            // 更新页面数据
            this.setData({
              userInfo: {
                ...this.data.userInfo,
                isLoggedIn: false,
                username: '未登录',
                avatar: '',
                desc: '记录生活的美好瞬间',
                noteCount: 0,
                dayCount: 0,
                likeCount: 0,
                favoriteCount: 0,
                draftCount: 0,
                trashCount: 0
              }
            })
            
            wx.showToast({
              title: '已退出登录',
              icon: 'success'
            })
          }, 1000)
        }
      }
    })
  },

  // ==================== 订阅管理相关方法 ====================

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
  }
})