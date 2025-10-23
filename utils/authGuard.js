// utils/authGuard.js - 登录状态守卫工具
const noteManager = require('./noteManager')

/**
 * 登录状态守卫
 * 在需要登录的操作前调用此方法
 */
function requireLogin(callback, errorCallback) {
  if (!noteManager.isUserLoggedIn()) {
    wx.showModal({
      title: '请先登录',
      content: '您需要先登录账户才能进行此操作。是否前往登录页面？',
      confirmText: '去登录',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          wx.navigateTo({
            url: '/pages/login/login'
          })
        } else if (errorCallback) {
          errorCallback()
        }
      }
    })
    return false
  }
  
  if (callback) {
    callback()
  }
  return true
}

/**
 * 检查登录状态并执行操作
 * @param {Function} action - 需要登录才能执行的操作
 * @param {Function} fallback - 未登录时的备用操作（可选）
 */
function withAuth(action, fallback) {
  if (noteManager.isUserLoggedIn()) {
    return action()
  } else {
    if (fallback) {
      return fallback()
    } else {
      wx.showModal({
        title: '请先登录',
        content: '您需要先登录账户才能进行此操作。是否前往登录页面？',
        confirmText: '去登录',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({
              url: '/pages/login/login'
            })
          }
        }
      })
      return false
    }
  }
}

/**
 * 获取当前登录用户信息
 */
function getCurrentUser() {
  try {
    const userInfo = wx.getStorageSync('userInfo')
    if (userInfo && userInfo.username && userInfo.isLoggedIn) {
      return {
        username: userInfo.username,
        userId: userInfo.userId,
        nickname: userInfo.nickname,
        avatar: userInfo.avatar,
        isLoggedIn: true
      }
    }
    return null
  } catch (error) {
    console.error('获取用户信息失败:', error)
    return null
  }
}

/**
 * 检查是否为特定用户
 */
function isCurrentUser(username) {
  const currentUser = getCurrentUser()
  return currentUser && currentUser.username === username
}

/**
 * 显示登录提示
 */
function showLoginPrompt(title = '请先登录', content = '您需要先登录账户才能进行此操作。') {
  wx.showModal({
    title: title,
    content: content,
    confirmText: '去登录',
    cancelText: '取消',
    success: (res) => {
      if (res.confirm) {
        wx.navigateTo({
          url: '/pages/login/login'
        })
      }
    }
  })
}

/**
 * 页面级别的登录检查
 * 在页面的onShow方法中调用
 */
function checkPageAuth(pageName) {
  if (!noteManager.isUserLoggedIn()) {
    console.log(`页面 ${pageName} 需要登录，但用户未登录`)
    // 可以在这里添加页面特定的处理逻辑
    return false
  }
  return true
}

module.exports = {
  requireLogin,
  withAuth,
  getCurrentUser,
  isCurrentUser,
  showLoginPrompt,
  checkPageAuth
}
