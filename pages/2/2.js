// pages/2/2.js
Page({
  data: {
    userInfo: {
      username: '小兔用户',
      avatar: '',
      desc: '记录生活的美好瞬间',
      isLoggedIn: false,
      noteCount: 25,
      dayCount: 15,
      likeCount: 128,
      favoriteCount: 8,
      draftCount: 3,
      trashCount: 2
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
            ...userInfo,
            isLoggedIn: true
          }
        })
      } else {
        this.setData({
          userInfo: {
            ...this.data.userInfo,
            isLoggedIn: false
          }
        })
      }
    } catch (error) {
      console.error('加载用户信息失败:', error)
    }
  },

  // 跳转到账户管理
  goToAccount() {
    if (!this.data.userInfo.isLoggedIn) {
      this.goToLogin()
      return
    }
    
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
    if (!this.data.userInfo.isLoggedIn) {
      this.goToLogin()
      return
    }
    
    wx.showToast({
      title: '功能开发中',
      icon: 'none'
    })
  },

  // 跳转到我的收藏
  goToFavorites() {
    if (!this.data.userInfo.isLoggedIn) {
      this.goToLogin()
      return
    }
    
    wx.showToast({
      title: '功能开发中',
      icon: 'none'
    })
  },

  // 跳转到草稿箱
  goToDrafts() {
    if (!this.data.userInfo.isLoggedIn) {
      this.goToLogin()
      return
    }
    
    wx.showToast({
      title: '功能开发中',
      icon: 'none'
    })
  },

  // 跳转到回收站
  goToTrash() {
    if (!this.data.userInfo.isLoggedIn) {
      this.goToLogin()
      return
    }
    
    wx.showToast({
      title: '功能开发中',
      icon: 'none'
    })
  },

  // 跳转到应用设置
  goToSettings() {
    wx.showToast({
      title: '功能开发中',
      icon: 'none'
    })
  },

  // 跳转到数据备份
  goToBackup() {
    if (!this.data.userInfo.isLoggedIn) {
      this.goToLogin()
      return
    }
    
    wx.showToast({
      title: '功能开发中',
      icon: 'none'
    })
  },

  // 跳转到主题设置
  goToTheme() {
    wx.showToast({
      title: '功能开发中',
      icon: 'none'
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

  // 跳转到意见反馈
  goToFeedback() {
    wx.showModal({
      title: '意见反馈',
      content: '我们非常重视您的意见和建议！\n\n请通过以下方式联系我们：\n\n邮箱：feedback@rabbitnotes.com\n微信：RabbitNotes2024',
      showCancel: false,
      confirmText: '知道了'
    })
  },

  // 检查更新
  checkUpdate() {
    wx.showLoading({ title: '检查中...' })
    
    setTimeout(() => {
      wx.hideLoading()
      wx.showModal({
        title: '检查更新',
        content: '当前已是最新版本',
        showCancel: false,
        confirmText: '知道了'
      })
    }, 1500)
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
            
            // 更新页面数据
            this.setData({
              userInfo: {
                ...this.data.userInfo,
                isLoggedIn: false,
                username: '未登录',
                avatar: '',
                desc: '记录生活的美好瞬间'
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
  }
})