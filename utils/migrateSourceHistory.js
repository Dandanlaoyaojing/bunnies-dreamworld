// utils/migrateSourceHistory.js - 来源历史记录迁移工具
const noteManager = require('./noteManager')

/**
 * 迁移来源历史记录到当前账户（仅在用户主动登录时调用）
 * 注意：此方法不会自动执行，需要用户明确登录后才调用
 */
function migrateSourceHistoryToCurrentAccount() {
  try {
    console.log('开始迁移来源历史记录到当前账户...')
    
    // 获取全局来源历史记录
    const globalHistory = wx.getStorageSync('sourceHistory') || []
    console.log('全局来源历史记录:', globalHistory)
    
    if (globalHistory.length === 0) {
      console.log('没有需要迁移的来源历史记录')
      return
    }
    
    // 获取当前账户名
    const accountName = noteManager.getCurrentAccountName()
    if (!accountName) {
      console.log('当前未登录，无法迁移到账户')
      return
    }
    
    // 检查是否已经迁移过（避免重复迁移）
    const migrationFlag = `sourceHistory_migrated_${accountName}`
    if (wx.getStorageSync(migrationFlag)) {
      console.log('来源历史记录已经迁移过，跳过')
      return
    }
    
    // 获取当前账户的来源历史记录
    const currentAccountHistory = noteManager.getSourceHistory()
    console.log('当前账户来源历史记录:', currentAccountHistory)
    
    // 合并历史记录（去重）
    const mergedHistory = [...currentAccountHistory]
    globalHistory.forEach(item => {
      if (!mergedHistory.includes(item)) {
        mergedHistory.unshift(item)
      }
    })
    
    // 限制数量
    const finalHistory = mergedHistory.slice(0, 10)
    
    // 保存到当前账户
    const storageKey = noteManager.getAccountStorageKey('sourceHistory')
    wx.setStorageSync(storageKey, finalHistory)
    
    // 标记已迁移
    wx.setStorageSync(migrationFlag, true)
    
    console.log('来源历史记录迁移完成:', finalHistory)
    
    return finalHistory
  } catch (error) {
    console.error('迁移来源历史记录失败:', error)
    return null
  }
}

/**
 * 用户登录时调用的迁移方法
 * 这个方法应该在用户成功登录后调用
 */
function migrateOnLogin(accountName) {
  try {
    console.log(`用户 ${accountName} 登录，开始迁移来源历史记录...`)
    
    // 获取全局来源历史记录
    const globalHistory = wx.getStorageSync('sourceHistory') || []
    if (globalHistory.length === 0) {
      console.log('没有需要迁移的全局来源历史记录')
      return
    }
    
    // 检查是否已经迁移过
    const migrationFlag = `sourceHistory_migrated_${accountName}`
    if (wx.getStorageSync(migrationFlag)) {
      console.log('来源历史记录已经迁移过，跳过')
      return
    }
    
    // 获取账户现有历史记录
    const storageKey = `sourceHistory_${accountName}`
    const existingHistory = wx.getStorageSync(storageKey) || []
    
    // 合并历史记录（去重）
    const mergedHistory = [...existingHistory]
    globalHistory.forEach(item => {
      if (!mergedHistory.includes(item)) {
        mergedHistory.unshift(item)
      }
    })
    
    // 限制数量并保存
    const finalHistory = mergedHistory.slice(0, 10)
    wx.setStorageSync(storageKey, finalHistory)
    
    // 标记已迁移
    wx.setStorageSync(migrationFlag, true)
    
    console.log(`账户 ${accountName} 来源历史记录迁移完成:`, finalHistory)
    return finalHistory
  } catch (error) {
    console.error('登录时迁移来源历史记录失败:', error)
    return null
  }
}

/**
 * 迁移所有账户的来源历史记录
 */
function migrateAllAccountsSourceHistory() {
  try {
    console.log('开始迁移所有账户的来源历史记录...')
    
    // 获取全局来源历史记录
    const globalHistory = wx.getStorageSync('sourceHistory') || []
    if (globalHistory.length === 0) {
      console.log('没有需要迁移的全局来源历史记录')
      return
    }
    
    // 获取所有账户
    const accounts = wx.getStorageSync('userAccounts') || []
    console.log('所有账户:', accounts)
    
    // 为每个账户迁移历史记录
    accounts.forEach(account => {
      const accountName = account.username
      const storageKey = `sourceHistory_${accountName}`
      
      // 获取账户现有历史记录
      const existingHistory = wx.getStorageSync(storageKey) || []
      
      // 合并历史记录
      const mergedHistory = [...existingHistory]
      globalHistory.forEach(item => {
        if (!mergedHistory.includes(item)) {
          mergedHistory.unshift(item)
        }
      })
      
      // 限制数量并保存
      const finalHistory = mergedHistory.slice(0, 10)
      wx.setStorageSync(storageKey, finalHistory)
      
      console.log(`账户 ${accountName} 来源历史记录迁移完成:`, finalHistory)
    })
    
    console.log('所有账户来源历史记录迁移完成')
    
    // 可选：清除全局历史记录
    // wx.removeStorageSync('sourceHistory')
    
  } catch (error) {
    console.error('迁移所有账户来源历史记录失败:', error)
  }
}

module.exports = {
  migrateSourceHistoryToCurrentAccount,
  migrateOnLogin,
  migrateAllAccountsSourceHistory
}
