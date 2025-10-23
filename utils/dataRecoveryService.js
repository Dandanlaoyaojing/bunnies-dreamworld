// 数据恢复服务
// 专门用于恢复到指定日期的数据

class DataRecoveryService {
  constructor() {
    this.targetDate = '2024-10-17' // 目标恢复日期
    this.backupKeys = [
      'notes',
      'notes_backup', 
      'userAccounts',
      'noteTags',
      'noteCategories',
      'temp_notes',
      'userInfo'
    ]
  }

  /**
   * 获取所有存储的数据
   */
  getAllStorageData() {
    const allData = {}
    
    this.backupKeys.forEach(key => {
      try {
        const data = wx.getStorageSync(key)
        if (data) {
          allData[key] = data
          console.log(`📦 读取存储数据: ${key}`, Array.isArray(data) ? `${data.length}条` : '已存在')
        }
      } catch (error) {
        console.error(`读取${key}失败:`, error)
      }
    })
    
    return allData
  }

  /**
   * 创建当前数据的备份
   */
  createCurrentBackup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupKey = `backup_${timestamp}`
    
    try {
      const currentData = this.getAllStorageData()
      const backupData = {
        version: '1.0',
        backupTime: new Date().toISOString(),
        targetDate: this.targetDate,
        data: currentData,
        totalKeys: Object.keys(currentData).length
      }
      
      wx.setStorageSync(backupKey, backupData)
      console.log(`✅ 创建当前数据备份: ${backupKey}`)
      return backupKey
    } catch (error) {
      console.error('创建备份失败:', error)
      return null
    }
  }

  /**
   * 查找10月17号的数据
   */
  findTargetDateData() {
    const targetDate = this.targetDate
    const foundData = []
    
    // 1. 检查所有备份数据
    try {
      const allKeys = wx.getStorageInfoSync().keys
      allKeys.forEach(key => {
        if (key.includes('backup') || key.includes('notes')) {
          try {
            const data = wx.getStorageSync(key)
            if (data && this.isDataFromTargetDate(data, targetDate)) {
              foundData.push({
                key: key,
                data: data,
                type: 'backup',
                date: this.extractDateFromData(data)
              })
            }
          } catch (error) {
            // 忽略读取错误
          }
        }
      })
    } catch (error) {
      console.error('搜索备份数据失败:', error)
    }
    
    // 2. 检查账户数据中的10月17号数据
    try {
      const userAccounts = wx.getStorageSync('userAccounts') || {}
      Object.keys(userAccounts).forEach(accountName => {
        const account = userAccounts[accountName]
        if (account.notes && this.isDataFromTargetDate(account.notes, targetDate)) {
          foundData.push({
            key: `account_${accountName}`,
            data: account.notes,
            type: 'account',
            accountName: accountName,
            date: this.extractDateFromData(account.notes)
          })
        }
      })
    } catch (error) {
      console.error('搜索账户数据失败:', error)
    }
    
    return foundData
  }

  /**
   * 判断数据是否来自目标日期
   */
  isDataFromTargetDate(data, targetDate) {
    if (!data) return false
    
    // 如果是笔记数组
    if (Array.isArray(data)) {
      return data.some(note => {
        const noteDate = this.extractDateFromNote(note)
        return noteDate && noteDate.startsWith(targetDate)
      })
    }
    
    // 如果是备份对象
    if (data.notes && Array.isArray(data.notes)) {
      return data.notes.some(note => {
        const noteDate = this.extractDateFromNote(note)
        return noteDate && noteDate.startsWith(targetDate)
      })
    }
    
    // 如果是单个笔记
    if (data.createTime || data.updateTime) {
      const noteDate = this.extractDateFromNote(data)
      return noteDate && noteDate.startsWith(targetDate)
    }
    
    return false
  }

  /**
   * 从笔记中提取日期
   */
  extractDateFromNote(note) {
    if (!note) return null
    
    const timeStr = note.createTime || note.updateTime || note.time
    if (!timeStr) return null
    
    // 处理不同的时间格式
    try {
      const date = new Date(timeStr)
      if (isNaN(date.getTime())) return null
      
      return date.toISOString().split('T')[0] // 返回 YYYY-MM-DD 格式
    } catch (error) {
      return null
    }
  }

  /**
   * 从数据中提取日期
   */
  extractDateFromData(data) {
    if (Array.isArray(data) && data.length > 0) {
      return this.extractDateFromNote(data[0])
    }
    
    if (data.notes && Array.isArray(data.notes) && data.notes.length > 0) {
      return this.extractDateFromNote(data.notes[0])
    }
    
    return this.extractDateFromNote(data)
  }

  /**
   * 执行数据恢复
   */
  async performRecovery() {
    console.log(`🔄 开始恢复到 ${this.targetDate} 的数据...`)
    
    // 1. 创建当前数据备份
    const backupKey = this.createCurrentBackup()
    if (!backupKey) {
      throw new Error('创建当前数据备份失败')
    }
    
    // 2. 查找目标日期的数据
    const targetData = this.findTargetDateData()
    if (targetData.length === 0) {
      throw new Error(`未找到 ${this.targetDate} 的数据`)
    }
    
    console.log(`📋 找到 ${targetData.length} 个数据源:`)
    targetData.forEach((item, index) => {
      console.log(`  ${index + 1}. ${item.type} - ${item.key} (${item.date})`)
    })
    
    // 3. 选择最佳数据源（最新的）
    const bestData = targetData.sort((a, b) => {
      const dateA = new Date(a.date || '1970-01-01')
      const dateB = new Date(b.date || '1970-01-01')
      return dateB - dateA
    })[0]
    
    console.log(`🎯 选择数据源: ${bestData.key} (${bestData.type})`)
    
    // 4. 执行恢复
    try {
      let notesToRestore = []
      
      if (bestData.type === 'backup') {
        notesToRestore = bestData.data.notes || bestData.data
      } else if (bestData.type === 'account') {
        notesToRestore = bestData.data
      }
      
      if (!Array.isArray(notesToRestore)) {
        throw new Error('数据格式错误')
      }
      
      // 过滤出10月17号的笔记
      const filteredNotes = notesToRestore.filter(note => {
        const noteDate = this.extractDateFromNote(note)
        return noteDate && noteDate.startsWith(this.targetDate)
      })
      
      console.log(`📝 找到 ${filteredNotes.length} 条 ${this.targetDate} 的笔记`)
      
      // 5. 恢复数据
      wx.setStorageSync('notes', filteredNotes)
      
      // 6. 更新相关数据
      this.updateRelatedData(filteredNotes)
      
      console.log(`✅ 数据恢复完成! 恢复了 ${filteredNotes.length} 条笔记`)
      
      return {
        success: true,
        restoredCount: filteredNotes.length,
        backupKey: backupKey,
        sourceData: bestData.key,
        targetDate: this.targetDate
      }
      
    } catch (error) {
      console.error('恢复数据失败:', error)
      throw error
    }
  }

  /**
   * 更新相关数据
   */
  updateRelatedData(notes) {
    try {
      // 更新标签统计
      const tagStats = {}
      notes.forEach(note => {
        if (note.tags && Array.isArray(note.tags)) {
          note.tags.forEach(tag => {
            tagStats[tag] = (tagStats[tag] || 0) + 1
          })
        }
      })
      
      if (Object.keys(tagStats).length > 0) {
        wx.setStorageSync('noteTags', tagStats)
        console.log('📊 更新标签统计:', Object.keys(tagStats).length, '个标签')
      }
      
      // 更新分类统计
      const categoryStats = {}
      notes.forEach(note => {
        if (note.category) {
          categoryStats[note.category] = (categoryStats[note.category] || 0) + 1
        }
      })
      
      if (Object.keys(categoryStats).length > 0) {
        wx.setStorageSync('noteCategories', categoryStats)
        console.log('📂 更新分类统计:', Object.keys(categoryStats).length, '个分类')
      }
      
    } catch (error) {
      console.error('更新相关数据失败:', error)
    }
  }

  /**
   * 验证恢复结果
   */
  verifyRecovery() {
    try {
      const restoredNotes = wx.getStorageSync('notes') || []
      const targetDateNotes = restoredNotes.filter(note => {
        const noteDate = this.extractDateFromNote(note)
        return noteDate && noteDate.startsWith(this.targetDate)
      })
      
      console.log(`🔍 验证结果: 总共 ${restoredNotes.length} 条笔记，其中 ${targetDateNotes.length} 条是 ${this.targetDate} 的`)
      
      return {
        totalNotes: restoredNotes.length,
        targetDateNotes: targetDateNotes.length,
        isSuccess: targetDateNotes.length > 0
      }
    } catch (error) {
      console.error('验证恢复结果失败:', error)
      return { isSuccess: false, error: error.message }
    }
  }

  /**
   * 显示恢复选项
   */
  showRecoveryOptions() {
    const targetData = this.findTargetDateData()
    
    if (targetData.length === 0) {
      wx.showModal({
        title: '未找到数据',
        content: `未找到 ${this.targetDate} 的数据备份。\n\n请检查是否有其他日期的备份数据。`,
        showCancel: false,
        confirmText: '确定'
      })
      return
    }
    
    const options = targetData.map((item, index) => 
      `${index + 1}. ${item.type} (${item.date}) - ${item.key}`
    ).join('\n')
    
    wx.showModal({
      title: '选择恢复数据源',
      content: `找到 ${targetData.length} 个数据源:\n\n${options}\n\n将自动选择最新的数据源进行恢复。`,
      confirmText: '开始恢复',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          this.performRecovery().then(result => {
            wx.showModal({
              title: '恢复成功',
              content: `已成功恢复到 ${this.targetDate} 的数据！\n\n恢复详情:\n- 笔记数量: ${result.restoredCount}\n- 数据源: ${result.sourceData}\n- 备份文件: ${result.backupKey}`,
              showCancel: false,
              confirmText: '确定'
            })
          }).catch(error => {
            wx.showModal({
              title: '恢复失败',
              content: `恢复过程中出现错误:\n\n${error.message}\n\n请检查数据完整性后重试。`,
              showCancel: false,
              confirmText: '确定'
            })
          })
        }
      }
    })
  }
}

module.exports = DataRecoveryService
