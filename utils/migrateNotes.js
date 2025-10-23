// utils/migrateNotes.js - 笔记数据迁移工具
const noteManager = require('./noteManager')

/**
 * 将全局笔记数据迁移到指定账户
 * @param {string} accountName - 目标账户名
 * @returns {Object} 迁移结果
 */
function migrateGlobalNotesToAccount(accountName) {
  try {
    console.log(`开始将全局笔记迁移到账户: ${accountName}`)
    
    // 获取全局笔记数据
    const globalNotes = wx.getStorageSync('notes') || []
    console.log('全局笔记数量:', globalNotes.length)
    
    if (globalNotes.length === 0) {
      console.log('没有需要迁移的全局笔记')
      return {
        success: true,
        message: '没有需要迁移的笔记',
        migratedCount: 0
      }
    }
    
    // 检查是否已经迁移过
    const migrationFlag = `notes_migrated_to_${accountName}`
    if (wx.getStorageSync(migrationFlag)) {
      console.log('笔记已经迁移过，跳过')
      return {
        success: true,
        message: '笔记已经迁移过',
        migratedCount: 0
      }
    }
    
    // 获取目标账户现有笔记
    const accountResult = noteManager.getAccountData(accountName)
    if (!accountResult.success) {
      console.error('获取账户数据失败:', accountResult.error)
      return {
        success: false,
        error: '获取账户数据失败'
      }
    }
    
    const existingNotes = accountResult.data.notes || []
    console.log('账户现有笔记数量:', existingNotes.length)
    
    // 合并笔记（避免重复）
    const mergedNotes = [...existingNotes]
    const newNotes = []
    
    globalNotes.forEach(globalNote => {
      // 检查是否已存在（基于ID或标题+内容）
      const exists = mergedNotes.some(existingNote => 
        existingNote.id === globalNote.id || 
        (existingNote.title === globalNote.title && existingNote.content === globalNote.content)
      )
      
      if (!exists) {
        // 为迁移的笔记添加迁移标记
        const migratedNote = {
          ...globalNote,
          migratedFromGlobal: true,
          migrationTime: new Date().toISOString(),
          originalId: globalNote.id
        }
        mergedNotes.unshift(migratedNote)
        newNotes.push(migratedNote)
      }
    })
    
    console.log('新增迁移笔记数量:', newNotes.length)
    
    // 保存到账户
    const saveResult = noteManager.saveNotesToAccount(accountName, mergedNotes)
    if (!saveResult.success) {
      console.error('保存到账户失败:', saveResult.error)
      return {
        success: false,
        error: '保存到账户失败'
      }
    }
    
    // 标记已迁移
    wx.setStorageSync(migrationFlag, {
      migratedAt: new Date().toISOString(),
      migratedCount: newNotes.length,
      totalGlobalNotes: globalNotes.length
    })
    
    console.log(`笔记迁移完成: ${newNotes.length} 条新笔记迁移到账户 ${accountName}`)
    
    return {
      success: true,
      message: `成功迁移 ${newNotes.length} 条笔记到账户 ${accountName}`,
      migratedCount: newNotes.length,
      totalGlobalNotes: globalNotes.length,
      existingNotes: existingNotes.length
    }
    
  } catch (error) {
    console.error('迁移笔记失败:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * 获取迁移状态
 * @param {string} accountName - 账户名
 * @returns {Object} 迁移状态
 */
function getMigrationStatus(accountName) {
  try {
    const migrationFlag = `notes_migrated_to_${accountName}`
    const migrationInfo = wx.getStorageSync(migrationFlag)
    
    if (!migrationInfo) {
      return {
        migrated: false,
        message: '尚未迁移'
      }
    }
    
    return {
      migrated: true,
      migratedAt: migrationInfo.migratedAt,
      migratedCount: migrationInfo.migratedCount,
      totalGlobalNotes: migrationInfo.totalGlobalNotes,
      message: `已于 ${migrationInfo.migratedAt} 迁移 ${migrationInfo.migratedCount} 条笔记`
    }
  } catch (error) {
    console.error('获取迁移状态失败:', error)
    return {
      migrated: false,
      error: error.message
    }
  }
}

/**
 * 重置迁移状态（用于重新迁移）
 * @param {string} accountName - 账户名
 */
function resetMigrationStatus(accountName) {
  try {
    const migrationFlag = `notes_migrated_to_${accountName}`
    wx.removeStorageSync(migrationFlag)
    console.log(`已重置账户 ${accountName} 的迁移状态`)
  } catch (error) {
    console.error('重置迁移状态失败:', error)
  }
}

/**
 * 获取全局笔记统计信息
 */
function getGlobalNotesInfo() {
  try {
    const globalNotes = wx.getStorageSync('notes') || []
    const categories = {}
    const tags = []
    
    globalNotes.forEach(note => {
      // 统计分类
      if (note.categories && note.categories.length > 0) {
        note.categories.forEach(cat => {
          categories[cat] = (categories[cat] || 0) + 1
        })
      }
      
      // 统计标签
      if (note.tags && note.tags.length > 0) {
        note.tags.forEach(tag => {
          if (!tags.includes(tag)) {
            tags.push(tag)
          }
        })
      }
    })
    
    return {
      totalNotes: globalNotes.length,
      categories: categories,
      tags: tags,
      totalWords: globalNotes.reduce((sum, note) => sum + (note.content?.length || 0), 0)
    }
  } catch (error) {
    console.error('获取全局笔记信息失败:', error)
    return {
      totalNotes: 0,
      categories: {},
      tags: [],
      totalWords: 0
    }
  }
}

module.exports = {
  migrateGlobalNotesToAccount,
  getMigrationStatus,
  resetMigrationStatus,
  getGlobalNotesInfo
}
