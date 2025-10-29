// utils/noteManager.js - 统一笔记管理服务
class NoteManager {
  constructor() {
    this.storageKey = 'notes'
    this.tagStorageKey = 'noteTags'
    this.categoryStorageKey = 'noteCategories'
    this.accountsStorageKey = 'userAccounts'
    this.trashStorageKey = 'noteTrash' // 回收站存储键
  }

  /**
   * 获取当前登录账户名
   */
  getCurrentAccountName() {
    try {
      const userInfo = wx.getStorageSync('userInfo')
      return userInfo && userInfo.username ? userInfo.username : null
    } catch (error) {
      console.error('获取当前账户失败:', error)
      return null
    }
  }

  /**
   * 检查用户是否已登录
   */
  isUserLoggedIn() {
    try {
      const userInfo = wx.getStorageSync('userInfo')
      return !!(userInfo && userInfo.username && userInfo.isLoggedIn)
    } catch (error) {
      console.error('检查登录状态失败:', error)
      return false
    }
  }

  /**
   * 检查登录状态，未登录时显示提醒
   */
  checkLoginStatus() {
    if (!this.isUserLoggedIn()) {
      wx.showModal({
        title: '请先登录',
        content: '您需要先登录账户才能保存笔记。是否前往登录页面？',
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
    return true
  }

  /**
   * 获取账户专属存储键
   * 将全局键转换为账户专属键
   */
  getAccountStorageKey(baseKey) {
    const accountName = this.getCurrentAccountName()
    if (!accountName) {
      // 未登录时使用全局键
      return baseKey
    }
    return `${baseKey}_${accountName}`
  }

  /**
   * 保存账户专属数据
   */
  setAccountStorage(baseKey, data) {
    const storageKey = this.getAccountStorageKey(baseKey)
    console.log(`保存账户数据: ${storageKey}`)
    wx.setStorageSync(storageKey, data)
  }

  /**
   * 获取账户专属数据
   */
  getAccountStorage(baseKey, defaultValue = null) {
    const storageKey = this.getAccountStorageKey(baseKey)
    const data = wx.getStorageSync(storageKey) || defaultValue
    console.log(`读取账户数据: ${storageKey}`, data ? `(有${Array.isArray(data) ? data.length : ''}条数据)` : '(空)')
    return data
  }

  /**
   * 删除账户专属数据
   */
  removeAccountStorage(baseKey) {
    const storageKey = this.getAccountStorageKey(baseKey)
    console.log(`删除账户数据: ${storageKey}`)
    wx.removeStorageSync(storageKey)
  }

  /**
   * 获取所有笔记（已废弃 - 可能包含草稿，请使用 getActiveNotesFromAccount 或 getRegularNotes）
   * @deprecated 使用 getRegularNotes() 或 getActiveNotesFromAccount() 替代
   */
  getAllNotes() {
    try {
      const notes = wx.getStorageSync(this.storageKey) || []
      // 过滤掉已删除的笔记（实现数据隔离）
      return notes.filter(note => 
        note.status !== 'deleted' && !note.isDeleted
      )
    } catch (error) {
      console.error('获取笔记失败:', error)
      return []
    }
  }

  /**
   * 获取常规笔记（仅从账户存储获取，排除草稿和回收站，用于知识星图和梦之国度）
   * 这是唯一应该用于知识星图和梦之国度等应用的数据源
   */
  getRegularNotes() {
    try {
      const userInfo = wx.getStorageSync('userInfo')
      if (!userInfo || !userInfo.username) {
        console.log('未登录，返回空数组')
        return []
      }
      
      const accountName = userInfo.username
      const accountResult = this.getNotesFromAccount(accountName)
      
      if (!accountResult.success) {
        console.error('获取账户笔记失败:', accountResult.error)
        return []
      }
      
      // 确保不包含草稿（通过isDraft标记过滤）
      const regularNotes = accountResult.notes.filter(note => 
        !note.isDraft && note.status !== 'draft'
      )
      
      console.log(`获取常规笔记: ${regularNotes.length} 条 (总账户笔记: ${accountResult.notes.length} 条)`)
      return regularNotes
    } catch (error) {
      console.error('获取常规笔记失败:', error)
      return []
    }
  }

  /**
   * 从账户获取活跃笔记（推荐使用，用于常规操作）
   * 返回的是常规笔记列表，不包含草稿和回收站
   */
  getActiveNotesFromAccount(accountName) {
    try {
      const accountResult = this.getNotesFromAccount(accountName)
      
      if (!accountResult.success) {
        return []
      }
      
      // 确保不包含草稿
      const activeNotes = accountResult.notes.filter(note => 
        !note.isDraft && note.status !== 'draft'
      )
      
      return activeNotes
    } catch (error) {
      console.error('获取活跃笔记失败:', error)
      return []
    }
  }

  /**
   * 根据分类获取笔记
   */
  getNotesByCategory(category) {
    const allNotes = this.getAllNotes()
    // 过滤掉已删除的笔记
    return allNotes.filter(note => 
      note.category === category && 
      note.status !== 'deleted' &&
      !note.isDeleted
    )
  }

  /**
   * 根据ID获取单个笔记
   */
  getNoteById(id) {
    const allNotes = this.getAllNotes()
    return allNotes.find(note => note.id === id)
  }

  /**
   * 保存笔记（新增或更新）
   * 自动保存到当前登录账户
   */
  saveNote(note) {
    try {
      // 检查登录状态
      if (!this.checkLoginStatus()) {
        return {
          success: false,
          error: '请先登录账户',
          needLogin: true
        }
      }
      
      // 获取当前登录用户
      const userInfo = wx.getStorageSync('userInfo')
      const currentAccount = userInfo && userInfo.username ? userInfo.username : null
      
      console.log('=== 保存笔记 ===')
      console.log('当前登录账户:', currentAccount)
      console.log('笔记ID:', note.id)
      
      // 准备完整的笔记对象
      const existingNote = note.id ? this.getNoteById(note.id) : null
      let finalNote
      
      if (existingNote) {
        // 更新现有笔记
        finalNote = {
          ...existingNote,
          ...note,
          updateTime: this.formatTime(new Date())
        }
        console.log('更新现有笔记')
      } else {
        // 新增笔记
        finalNote = {
          ...note,
          id: note.id || this.generateId(),
          createTime: note.createTime || this.formatTime(new Date()),
          updateTime: this.formatTime(new Date())
        }
        console.log('创建新笔记')
      }
      
      // 如果用户已登录，保存到账户存储
      if (currentAccount) {
        console.log('用户已登录，保存到账户:', currentAccount)
        const accountResult = this.getNotesFromAccount(currentAccount)
        
        if (accountResult.success) {
          const accountNotes = accountResult.notes
          const existingIndex = accountNotes.findIndex(n => n.id === finalNote.id)
          
          if (existingIndex !== -1) {
            accountNotes[existingIndex] = finalNote
            console.log('账户中更新笔记，位置:', existingIndex)
          } else {
            accountNotes.push(finalNote)
            console.log('账户中添加新笔记，总数:', accountNotes.length)
          }
          
          // 保存到账户
          const saveResult = this.saveNotesToAccount(currentAccount, accountNotes)
          if (!saveResult.success) {
            console.error('保存到账户失败:', saveResult.error)
            return saveResult
          }
          
          console.log('✅ 笔记已保存到账户:', currentAccount)
        } else {
          console.error('获取账户数据失败:', accountResult.error)
          return accountResult
        }
      } else {
        console.warn('⚠️ 用户未登录，笔记将只保存到全局存储')
      }
      
      // 同时保存到全局存储（兼容旧逻辑，用于当前会话）
      const allNotes = this.getAllNotes()
      const globalIndex = allNotes.findIndex(n => n.id === finalNote.id)
      
      if (globalIndex !== -1) {
        allNotes[globalIndex] = finalNote
      } else {
        allNotes.push(finalNote)
      }
      
      wx.setStorageSync(this.storageKey, allNotes)
      console.log('笔记已同步到全局存储')
      
      // 更新标签统计
      this.updateTagStatistics(finalNote.tags || [])
      
      console.log('✅ 笔记保存成功:', finalNote.id)
      console.log('账户:', currentAccount || '未登录')
      
      return { success: true, note: finalNote, account: currentAccount }
    } catch (error) {
      console.error('❌ 保存笔记失败:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * 删除笔记
   * 自动从当前登录账户中删除
   */
  deleteNote(id) {
    try {
      // 检查登录状态
      if (!this.checkLoginStatus()) {
        return {
          success: false,
          error: '请先登录账户',
          needLogin: true
        }
      }
      
      // 获取当前登录用户
      const userInfo = wx.getStorageSync('userInfo')
      const currentAccount = userInfo && userInfo.username ? userInfo.username : null
      
      console.log('=== 删除笔记 ===')
      console.log('当前登录账户:', currentAccount)
      console.log('笔记ID:', id)
      
      // 如果用户已登录，从账户存储中删除
      if (currentAccount) {
        const accountResult = this.getNotesFromAccount(currentAccount)
        
        if (accountResult.success) {
          const accountNotes = accountResult.notes.filter(note => note.id !== id)
          const saveResult = this.saveNotesToAccount(currentAccount, accountNotes)
          
          if (!saveResult.success) {
            console.error('从账户删除失败:', saveResult.error)
            return saveResult
          }
          
          console.log('✅ 笔记已从账户删除:', currentAccount)
        }
      }
      
      // 同时从全局存储删除（兼容性）
      const allNotes = this.getAllNotes()
      const updatedNotes = allNotes.filter(note => note.id !== id)
      wx.setStorageSync(this.storageKey, updatedNotes)
      
      // 更新标签统计
      this.updateAllTagStatistics()
      
      console.log('✅ 笔记删除成功:', id)
      return { success: true, account: currentAccount }
    } catch (error) {
      console.error('❌ 删除笔记失败:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * 批量删除笔记
   * 自动从当前登录账户中删除
   */
  deleteNotes(ids) {
    try {
      // 检查登录状态
      if (!this.checkLoginStatus()) {
        return {
          success: false,
          error: '请先登录账户',
          needLogin: true
        }
      }
      
      // 获取当前登录用户
      const userInfo = wx.getStorageSync('userInfo')
      const currentAccount = userInfo && userInfo.username ? userInfo.username : null
      
      console.log('=== 批量删除笔记 ===')
      console.log('当前登录账户:', currentAccount)
      console.log('删除数量:', ids.length)
      
      // 如果用户已登录，从账户存储中删除
      if (currentAccount) {
        const accountResult = this.getNotesFromAccount(currentAccount)
        
        if (accountResult.success) {
          const accountNotes = accountResult.notes.filter(note => !ids.includes(note.id))
          const saveResult = this.saveNotesToAccount(currentAccount, accountNotes)
          
          if (!saveResult.success) {
            console.error('从账户批量删除失败:', saveResult.error)
            return saveResult
          }
          
          console.log('✅ 笔记已从账户批量删除:', currentAccount)
        }
      }
      
      // 同时从全局存储删除（兼容性）
      const allNotes = this.getAllNotes()
      const updatedNotes = allNotes.filter(note => !ids.includes(note.id))
      wx.setStorageSync(this.storageKey, updatedNotes)
      
      // 更新标签统计
      this.updateAllTagStatistics()
      
      console.log('✅ 批量删除笔记成功:', ids.length)
      return { success: true, deletedCount: ids.length, account: currentAccount }
    } catch (error) {
      console.error('❌ 批量删除笔记失败:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * 搜索笔记
   */
  searchNotes(keyword, options = {}) {
    const {
      category = null,
      tags = [],
      dateRange = null,
      sortBy = 'updateTime', // createTime, updateTime, title, wordCount
      sortOrder = 'desc' // asc, desc
    } = options

    let filteredNotes = this.getAllNotes()

    // 关键词搜索
    if (keyword && keyword.trim()) {
      const searchTerm = keyword.toLowerCase()
      filteredNotes = filteredNotes.filter(note => {
        return note.title.toLowerCase().includes(searchTerm) ||
               note.content.toLowerCase().includes(searchTerm) ||
               (note.tags && note.tags.some(tag => tag.toLowerCase().includes(searchTerm)))
      })
    }

    // 分类筛选
    if (category) {
      filteredNotes = filteredNotes.filter(note => note.category === category)
    }

    // 标签筛选
    if (tags && tags.length > 0) {
      filteredNotes = filteredNotes.filter(note => {
        return note.tags && tags.some(tag => note.tags.includes(tag))
      })
    }

    // 日期范围筛选
    if (dateRange && dateRange.start && dateRange.end) {
      filteredNotes = filteredNotes.filter(note => {
        const noteDate = this.parseDate(note.createTime)
        return noteDate >= dateRange.start && noteDate <= dateRange.end
      })
    }

    // 排序
    filteredNotes.sort((a, b) => {
      let aValue, bValue
      
      switch (sortBy) {
        case 'createTime':
          aValue = this.parseDate(a.createTime)
          bValue = this.parseDate(b.createTime)
          break
        case 'updateTime':
          aValue = this.parseDate(a.updateTime || a.createTime)
          bValue = this.parseDate(b.updateTime || b.createTime)
          break
        case 'title':
          aValue = a.title.toLowerCase()
          bValue = b.title.toLowerCase()
          break
        case 'wordCount':
          aValue = a.wordCount || 0
          bValue = b.wordCount || 0
          break
        default:
          aValue = new Date(a.updateTime || a.createTime)
          bValue = new Date(b.updateTime || b.createTime)
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })

    return filteredNotes
  }

  /**
   * 获取所有标签
   * 使用账户专属存储
   */
  getAllTags() {
    try {
      return this.getAccountStorage(this.tagStorageKey, [])
    } catch (error) {
      console.error('获取标签失败:', error)
      return []
    }
  }

  /**
   * 更新标签统计
   * 使用账户专属存储
   */
  updateTagStatistics(newTags) {
    try {
      const allNotes = this.getAllNotes()
      const tagStats = {}
      
      // 统计所有标签的使用次数
      allNotes.forEach(note => {
        if (note.tags) {
          note.tags.forEach(tag => {
            tagStats[tag] = (tagStats[tag] || 0) + 1
          })
        }
      })
      
      // 转换为数组并排序
      const sortedTags = Object.entries(tagStats)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
      
      this.setAccountStorage(this.tagStorageKey, sortedTags)
      console.log('标签统计已更新并保存到当前账户')
    } catch (error) {
      console.error('更新标签统计失败:', error)
    }
  }

  /**
   * 更新所有标签统计
   */
  updateAllTagStatistics() {
    this.updateTagStatistics([])
  }

  /**
   * 获取热门标签
   */
  getPopularTags(limit = 20) {
    const allTags = this.getAllTags()
    return allTags.slice(0, limit)
  }

  /**
   * 根据标签获取笔记
   */
  getNotesByTag(tag) {
    const allNotes = this.getAllNotes()
    return allNotes.filter(note => note.tags && note.tags.includes(tag))
  }

  /**
   * 获取分类统计
   */
  getCategoryStatistics() {
    const allNotes = this.getAllNotes()
    const categoryStats = {}
    
    allNotes.forEach(note => {
      const category = note.category || '未分类'
      categoryStats[category] = (categoryStats[category] || 0) + 1
    })
    
    return Object.entries(categoryStats)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
  }

  /**
   * 获取笔记统计信息
   */
  getStatistics() {
    const allNotes = this.getAllNotes()
    const totalNotes = allNotes.length
    const totalWords = allNotes.reduce((sum, note) => sum + (note.wordCount || 0), 0)
    const categories = this.getCategoryStatistics()
    const tags = this.getAllTags()
    
    // 最近活动
    const recentNotes = allNotes
      .sort((a, b) => this.parseDate(b.updateTime || b.createTime) - this.parseDate(a.updateTime || a.createTime))
      .slice(0, 5)
    
    return {
      totalNotes,
      totalWords,
      totalCategories: categories.length,
      totalTags: tags.length,
      categories,
      recentNotes,
      lastUpdate: allNotes.length > 0 ? 
        Math.max(...allNotes.map(note => this.parseDate(note.updateTime || note.createTime).getTime())) : null
    }
  }

  /**
   * 导出所有数据
   */
  exportData() {
    try {
      const allNotes = this.getAllNotes()
      const allTags = this.getAllTags()
      const statistics = this.getStatistics()
      
      const exportData = {
        version: '1.0',
        exportTime: this.formatTime(new Date()),
        notes: allNotes,
        tags: allTags,
        statistics: statistics
      }
      
      return { success: true, data: exportData }
    } catch (error) {
      console.error('导出数据失败:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * 导入数据
   */
  importData(data) {
    try {
      if (!data || !data.notes) {
        throw new Error('数据格式无效')
      }
      
      // 备份现有数据
      const backup = this.exportData()
      wx.setStorageSync('notes_backup', backup.data)
      
      // 导入新数据
      wx.setStorageSync(this.storageKey, data.notes)
      if (data.tags) {
        wx.setStorageSync(this.tagStorageKey, data.tags)
      }
      
      // 更新标签统计
      this.updateAllTagStatistics()
      
      console.log('数据导入成功')
      return { success: true, importedNotes: data.notes.length }
    } catch (error) {
      console.error('导入数据失败:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * 清空所有数据
   */
  clearAllData() {
    try {
      wx.removeStorageSync(this.storageKey)
      wx.removeStorageSync(this.tagStorageKey)
      wx.removeStorageSync(this.categoryStorageKey)
      console.log('所有数据已清空')
      return { success: true }
    } catch (error) {
      console.error('清空数据失败:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * 生成唯一ID
   */
  generateId() {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9)
  }

  /**
   * 格式化时间 - iOS兼容格式
   */
  formatTime(date) {
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    const day = date.getDate()
    const hour = date.getHours()
    const minute = date.getMinutes()
    const second = date.getSeconds()
    
    // 使用iOS兼容的格式: "yyyy-MM-dd HH:mm:ss"
    return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')} ${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:${second.toString().padStart(2, '0')}`
  }

  /**
   * 安全解析日期 - iOS兼容
   */
  parseDate(dateString) {
    if (!dateString) return new Date()
    
    // 如果已经是Date对象，直接返回
    if (dateString instanceof Date) return dateString
    
    // 处理不同的日期格式，确保iOS兼容
    let dateStr = dateString.toString().trim()
    
    // 如果格式是 "yyyy-MM-dd HH:mm" 或 "yyyy-MM-dd HH:mm:ss"，直接使用
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/.test(dateStr)) {
      return new Date(dateStr)
    }
    
    // 如果格式是 "yyyy-MM-dd"，添加默认时间
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      dateStr += ' 00:00:00'
      return new Date(dateStr)
    }
    
    // 其他格式尝试直接解析
    const date = new Date(dateStr)
    
    // 检查日期是否有效
    if (isNaN(date.getTime())) {
      console.warn('无法解析日期:', dateString, '使用当前时间')
      return new Date()
    }
    
    return date
  }

  /**
   * 获取分类名称
   */
  getCategoryName(category) {
    const categoryNames = {
      'art': '艺术',
      'cute': '萌物',
      'dreams': '梦游',
      'foods': '美食',
      'happiness': '趣事',
      'knowledge': '知识',
      'sights': '风景',
      'thinking': '思考'
    }
    return categoryNames[category] || '未知'
  }

  /**
   * 获取分类颜色
   */
  getCategoryColor(category) {
    const categoryColors = {
      'art': '#667eea',
      'cute': '#ff9a9e',
      'dreams': '#a8edea',
      'foods': '#ffecd2',
      'happiness': '#ffd89b',
      'knowledge': '#89f7fe',
      'sights': '#667eea',
      'thinking': '#f093fb'
    }
    return categoryColors[category] || '#667eea'
  }

  /**
   * 账户管理功能
   */
  
  /**
   * 获取所有账户
   */
  getAllAccounts() {
    try {
      return wx.getStorageSync(this.accountsStorageKey) || {}
    } catch (error) {
      console.error('获取账户列表失败:', error)
      return {}
    }
  }

  /**
   * 初始化账户数据存储空间
   */
  initializeAccount(accountName) {
    try {
      console.log('初始化账户数据存储空间:', accountName)
      
      const accounts = this.getAllAccounts()
      
      // 检查账户是否已存在
      if (accounts[accountName]) {
        console.log('账户数据存储空间已存在')
        return {
          success: true,
          message: '账户数据存储空间已存在'
        }
      }
      
      // 创建新的账户数据结构
      accounts[accountName] = {
        notes: [],
        tags: [],
        categories: [],
        createTime: this.formatTime(new Date()),
        updateTime: this.formatTime(new Date())
      }
      
      // 保存到本地存储
      wx.setStorageSync(this.accountsStorageKey, accounts)
      
      console.log('账户数据存储空间创建成功:', accountName)
      
      return {
        success: true,
        message: '账户数据存储空间创建成功',
        accountData: accounts[accountName]
      }
    } catch (error) {
      console.error('初始化账户数据存储空间失败:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * 保存笔记到指定账户（真删除：完全过滤已删除和草稿的笔记，实现数据隔离）
   * 
   * 注意：此函数会自动过滤掉：
   * 1. status === 'deleted' 的笔记
   * 2. isDeleted === true 的笔记
   * 3. isDraft === true 的笔记
   * 4. status === 'draft' 的笔记
   * 
   * 确保笔记簿中只包含活跃的常规笔记，已删除的笔记会完全移除，只在回收站中保留
   */
  saveNotesToAccount(accountName, notes) {
    try {
      const accounts = this.getAllAccounts()
      
      // 为账户创建数据结构
      if (!accounts[accountName]) {
        accounts[accountName] = {
          notes: [],
          tags: [],
          categories: [],
          createTime: this.formatTime(new Date()),
          updateTime: this.formatTime(new Date())
        }
      }
      
      // 确保不包含软删除的笔记和草稿（实现完整数据隔离）
      const activeNotes = notes.filter(note => 
        note.status !== 'deleted' && 
        !note.isDeleted &&
        !note.isDraft && 
        note.status !== 'draft'
      )
      
      // 保存笔记到账户
      accounts[accountName].notes = activeNotes
      accounts[accountName].updateTime = this.formatTime(new Date())
      
      // 提取标签和分类
      const allTags = new Set()
      const allCategories = new Set()
      
      activeNotes.forEach(note => {
        if (note.tags && note.tags.length > 0) {
          note.tags.forEach(tag => allTags.add(tag))
        }
        if (note.category) {
          allCategories.add(note.category)
        }
      })
      
      accounts[accountName].tags = Array.from(allTags)
      accounts[accountName].categories = Array.from(allCategories)
      
      // 保存到本地存储
      wx.setStorageSync(this.accountsStorageKey, accounts)
      
      console.log(`成功保存 ${activeNotes.length} 条活跃笔记到账户 "${accountName}" (过滤了 ${notes.length - activeNotes.length} 条已删除笔记)`)
      
      return {
        success: true,
        message: `成功保存 ${activeNotes.length} 条笔记到账户 "${accountName}"`,
        accountData: accounts[accountName]
      }
    } catch (error) {
      console.error('保存笔记到账户失败:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * 从指定账户获取笔记（只返回非删除的笔记，实现数据隔离）
   */
  getNotesFromAccount(accountName) {
    try {
      const accounts = this.getAllAccounts()
      let account = accounts[accountName]
      
      // 如果账户不存在，自动初始化
      if (!account) {
        console.log(`账户 "${accountName}" 不存在，自动初始化`)
        const initResult = this.initializeAccount(accountName)
        
        if (initResult.success) {
          account = initResult.accountData
        } else {
          return {
            success: false,
            error: `账户 "${accountName}" 不存在且初始化失败`
          }
        }
      }
      
      // 只返回非删除且非草稿的笔记（实现完整数据隔离）
      const activeNotes = (account.notes || []).filter(note => 
        note.status !== 'deleted' && 
        !note.isDeleted &&
        !note.isDraft && 
        note.status !== 'draft'
      )
      
      return {
        success: true,
        notes: activeNotes, // 只返回活跃笔记
        tags: account.tags || [],
        categories: account.categories || [],
        createTime: account.createTime,
        updateTime: account.updateTime
      }
    } catch (error) {
      console.error('从账户获取笔记失败:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * 获取账户信息
   */
  getAccountInfo(accountName) {
    try {
      const accounts = this.getAllAccounts()
      const account = accounts[accountName]
      
      if (!account) {
        return {
          success: false,
          error: `账户 "${accountName}" 不存在`
        }
      }
      
      return {
        success: true,
        accountName: accountName,
        noteCount: account.notes ? account.notes.length : 0,
        tagCount: account.tags ? account.tags.length : 0,
        categoryCount: account.categories ? account.categories.length : 0,
        createTime: account.createTime,
        updateTime: account.updateTime
      }
    } catch (error) {
      console.error('获取账户信息失败:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * 删除账户
   */
  deleteAccount(accountName) {
    try {
      const accounts = this.getAllAccounts()
      
      if (!accounts[accountName]) {
        return {
          success: false,
          error: `账户 "${accountName}" 不存在`
        }
      }
      
      delete accounts[accountName]
      wx.setStorageSync(this.accountsStorageKey, accounts)
      
      return {
        success: true,
        message: `账户 "${accountName}" 已删除`
      }
    } catch (error) {
      console.error('删除账户失败:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * 获取所有账户列表
   */
  getAllAccountList() {
    try {
      const accounts = this.getAllAccounts()
      return Object.keys(accounts).map(accountName => {
        const account = accounts[accountName]
        return {
          name: accountName,
          noteCount: account.notes ? account.notes.length : 0,
          tagCount: account.tags ? account.tags.length : 0,
          categoryCount: account.categories ? account.categories.length : 0,
          createTime: account.createTime,
          updateTime: account.updateTime
        }
      }).sort((a, b) => new Date(b.updateTime) - new Date(a.updateTime))
    } catch (error) {
      console.error('获取账户列表失败:', error)
      return []
    }
  }

  /**
   * 合并账户数据
   */
  mergeAccountData(targetAccount, sourceAccount) {
    try {
      const accounts = this.getAllAccounts()
      
      if (!accounts[targetAccount]) {
        return {
          success: false,
          error: `目标账户 "${targetAccount}" 不存在`
        }
      }
      
      if (!accounts[sourceAccount]) {
        return {
          success: false,
          error: `源账户 "${sourceAccount}" 不存在`
        }
      }
      
      const targetData = accounts[targetAccount]
      const sourceData = accounts[sourceAccount]
      
      // 合并笔记（去重）
      const existingIds = new Set(targetData.notes.map(note => note.id))
      const newNotes = sourceData.notes.filter(note => !existingIds.has(note.id))
      targetData.notes = [...targetData.notes, ...newNotes]
      
      // 合并标签
      const allTags = new Set([...(targetData.tags || []), ...(sourceData.tags || [])])
      targetData.tags = Array.from(allTags)
      
      // 合并分类
      const allCategories = new Set([...(targetData.categories || []), ...(sourceData.categories || [])])
      targetData.categories = Array.from(allCategories)
      
      targetData.updateTime = this.formatTime(new Date())
      
      wx.setStorageSync(this.accountsStorageKey, accounts)
      
      return {
        success: true,
        message: `成功合并账户数据，新增 ${newNotes.length} 条笔记`,
        mergedNotes: newNotes.length
      }
    } catch (error) {
      console.error('合并账户数据失败:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * 导出账户数据
   */
  exportAccountData(accountName) {
    try {
      const accountData = this.getNotesFromAccount(accountName)
      
      if (!accountData.success) {
        return accountData
      }
      
      const exportData = {
        version: '1.0',
        exportTime: this.formatTime(new Date()),
        accountName: accountName,
        notes: accountData.notes,
        tags: accountData.tags,
        categories: accountData.categories,
        statistics: {
          noteCount: accountData.notes.length,
          tagCount: accountData.tags.length,
          categoryCount: accountData.categories.length
        }
      }
      
      return {
        success: true,
        data: exportData
      }
    } catch (error) {
      console.error('导出账户数据失败:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * 导入账户数据
   */
  importAccountData(accountName, importData) {
    try {
      if (!importData || !importData.notes) {
        return {
          success: false,
          error: '导入数据格式无效'
        }
      }
      
      const accounts = this.getAllAccounts()
      
      // 创建或更新账户
      accounts[accountName] = {
        notes: importData.notes,
        tags: importData.tags || [],
        categories: importData.categories || [],
        createTime: accounts[accountName] ? accounts[accountName].createTime : this.formatTime(new Date()),
        updateTime: this.formatTime(new Date())
      }
      
      wx.setStorageSync(this.accountsStorageKey, accounts)
      
      return {
        success: true,
        message: `成功导入账户数据，共 ${importData.notes.length} 条笔记`,
        importedNotes: importData.notes.length
      }
    } catch (error) {
      console.error('导入账户数据失败:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * 搜索账户中的笔记
   */
  searchAccountNotes(accountName, keyword, options = {}) {
    try {
      const accountData = this.getNotesFromAccount(accountName)
      
      if (!accountData.success) {
        return accountData
      }
      
      let filteredNotes = accountData.notes
      
      // 关键词搜索
      if (keyword && keyword.trim()) {
        const searchTerm = keyword.toLowerCase()
        filteredNotes = filteredNotes.filter(note => {
          return note.title.toLowerCase().includes(searchTerm) ||
                 note.content.toLowerCase().includes(searchTerm) ||
                 (note.tags && note.tags.some(tag => tag.toLowerCase().includes(searchTerm)))
        })
      }
      
      // 分类筛选
      if (options.category) {
        filteredNotes = filteredNotes.filter(note => note.category === options.category)
      }
      
      // 标签筛选
      if (options.tags && options.tags.length > 0) {
        filteredNotes = filteredNotes.filter(note => {
          return note.tags && options.tags.some(tag => note.tags.includes(tag))
        })
      }
      
      return {
        success: true,
        notes: filteredNotes,
        totalCount: filteredNotes.length
      }
    } catch (error) {
      console.error('搜索账户笔记失败:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * 切换收藏状态
   */
  toggleFavorite(accountName, noteId, isFavorite) {
    try {
      // 检查登录状态
      if (!this.checkLoginStatus()) {
        return {
          success: false,
          error: '请先登录账户',
          needLogin: true
        }
      }
      
      console.log('切换收藏状态:', accountName, noteId, isFavorite)
      
      const accountResult = this.getNotesFromAccount(accountName)
      if (!accountResult.success) {
        return accountResult
      }
      
      const notes = accountResult.notes
      const noteIndex = notes.findIndex(n => n.id === noteId)
      
      if (noteIndex === -1) {
        return {
          success: false,
          error: '笔记不存在'
        }
      }
      
      // 更新收藏状态
      notes[noteIndex].isFavorite = isFavorite
      notes[noteIndex].favoriteTime = isFavorite ? this.formatTime(new Date()) : null
      
      // 保存回账户
      const saveResult = this.saveNotesToAccount(accountName, notes)
      
      if (saveResult.success) {
        console.log('收藏状态更新成功')
        return {
          success: true,
          message: isFavorite ? '已添加到收藏' : '已取消收藏'
        }
      } else {
        return saveResult
      }
    } catch (error) {
      console.error('切换收藏状态失败:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * 获取收藏笔记
   */
  getFavoriteNotes(accountName) {
    try {
      const accountResult = this.getNotesFromAccount(accountName)
      
      if (!accountResult.success) {
        return accountResult
      }
      
      const favoriteNotes = accountResult.notes.filter(note => note.isFavorite === true && note.status !== 'deleted')
      
      return {
        success: true,
        notes: favoriteNotes
      }
    } catch (error) {
      console.error('获取收藏笔记失败:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * 获取账户专属回收站存储键
   */
  getTrashStorageKey(accountName) {
    return `${this.trashStorageKey}_${accountName}`
  }

  /**
   * 获取回收站笔记（从独立的回收站存储空间）
   */
  getTrashNotes(accountName) {
    try {
      const storageKey = this.getTrashStorageKey(accountName)
      const trashNotes = wx.getStorageSync(storageKey) || []
      console.log(`从回收站读取 ${trashNotes.length} 条笔记`)
      return trashNotes
    } catch (error) {
      console.error('获取回收站笔记失败:', error)
      return []
    }
  }

  /**
   * 保存笔记到回收站（独立存储空间）
   */
  saveNoteToTrash(accountName, note) {
    try {
      const storageKey = this.getTrashStorageKey(accountName)
      const trashNotes = this.getTrashNotes(accountName)
      
      // 检查是否已存在（避免重复）
      const existingIndex = trashNotes.findIndex(n => n.id === note.id)
      if (existingIndex === -1) {
        trashNotes.push({
          ...note,
          status: 'deleted',
          deleteTime: this.formatTime(new Date())
        })
      } else {
        // 更新删除时间
        trashNotes[existingIndex].deleteTime = this.formatTime(new Date())
      }
      
      wx.setStorageSync(storageKey, trashNotes)
      console.log(`笔记已保存到回收站: ${storageKey}`)
      return true
    } catch (error) {
      console.error('保存笔记到回收站失败:', error)
      return false
    }
  }

  /**
   * 从回收站移除笔记
   */
  removeNoteFromTrash(accountName, noteId) {
    try {
      const storageKey = this.getTrashStorageKey(accountName)
      const trashNotes = this.getTrashNotes(accountName)
      const filteredNotes = trashNotes.filter(n => n.id !== noteId)
      
      wx.setStorageSync(storageKey, filteredNotes)
      console.log(`笔记已从回收站移除: ${noteId}`)
      return true
    } catch (error) {
      console.error('从回收站移除笔记失败:', error)
      return false
    }
  }

  /**
   * 真删除笔记（移到回收站）
   * 从笔记簿中完全移除笔记，不保留任何软删除标记
   * 将笔记存储到独立的回收站空间，实现数据隔离
   * 
   * 注意：这是真删除操作，笔记将从笔记簿中彻底移除，只在回收站中保留
   */
  softDeleteNote(accountName, noteId) {
    try {
      // 检查登录状态
      if (!this.checkLoginStatus()) {
        return {
          success: false,
          error: '请先登录账户',
          needLogin: true
        }
      }
      
      console.log('软删除笔记（数据隔离）:', accountName, noteId)
      
      const accountResult = this.getNotesFromAccount(accountName)
      if (!accountResult.success) {
        return accountResult
      }
      
      // 从常规笔记列表中查找要删除的笔记
      const activeNotes = accountResult.notes
      const noteIndex = activeNotes.findIndex(n => n.id === noteId)
      
      if (noteIndex === -1) {
        // 笔记可能已经在回收站了，检查回收站
        const trashNotes = this.getTrashNotes(accountName)
        const trashNote = trashNotes.find(n => n.id === noteId)
        
        if (trashNote) {
          return {
            success: true,
            message: '笔记已在回收站中',
            alreadyTrashed: true
          }
        }
        
        return {
          success: false,
          error: '笔记不存在'
        }
      }
      
      // 获取要删除的笔记
      const noteToDelete = activeNotes[noteIndex]
      
      // 1. 从常规笔记列表中移除（实现数据隔离）
      const remainingNotes = activeNotes.filter(n => n.id !== noteId)
      
      // 2. 保存更新后的常规笔记列表
      const saveResult = this.saveNotesToAccount(accountName, remainingNotes)
      if (!saveResult.success) {
        return saveResult
      }
      
      // 3. 将笔记移到独立的回收站存储空间
      const trashSaved = this.saveNoteToTrash(accountName, noteToDelete)
      
      if (!trashSaved) {
        console.error('保存到回收站失败，尝试恢复常规列表')
        // 如果保存到回收站失败，恢复常规列表
        this.saveNotesToAccount(accountName, activeNotes)
        return {
          success: false,
          error: '保存到回收站失败'
        }
      }
      
      console.log('✅ 笔记已从常规列表移除并移到回收站')
      return {
        success: true,
        message: '已移到回收站'
      }
    } catch (error) {
      console.error('软删除笔记失败:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * 获取回收站笔记（从独立的回收站存储空间）
   */
  getTrashedNotes(accountName) {
    try {
      const trashNotes = this.getTrashNotes(accountName)
      
      return {
        success: true,
        notes: trashNotes
      }
    } catch (error) {
      console.error('获取回收站笔记失败:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * 恢复笔记（从回收站恢复到常规列表）
   */
  restoreNote(accountName, noteId) {
    try {
      console.log('恢复笔记（从回收站）:', accountName, noteId)
      
      // 1. 从回收站获取笔记
      const trashNotes = this.getTrashNotes(accountName)
      const noteIndex = trashNotes.findIndex(n => n.id === noteId)
      
      if (noteIndex === -1) {
        return {
          success: false,
          error: '笔记不在回收站中'
        }
      }
      
      // 获取要恢复的笔记
      const noteToRestore = trashNotes[noteIndex]
      
      // 2. 从回收站移除
      this.removeNoteFromTrash(accountName, noteId)
      
      // 3. 清理删除标记
      delete noteToRestore.status
      delete noteToRestore.deleteTime
      noteToRestore.updateTime = this.formatTime(new Date())
      
      // 4. 添加回常规笔记列表
      const accountResult = this.getNotesFromAccount(accountName)
      if (!accountResult.success) {
        // 如果账户不存在，先初始化
        this.initializeAccount(accountName)
      }
      
      const currentNotes = accountResult.success ? accountResult.notes : []
      
      // 检查是否已存在（避免重复）
      const existingIndex = currentNotes.findIndex(n => n.id === noteId)
      if (existingIndex === -1) {
        currentNotes.push(noteToRestore)
      } else {
        // 如果已存在，更新它
        currentNotes[existingIndex] = noteToRestore
      }
      
      // 5. 保存回常规列表
      const saveResult = this.saveNotesToAccount(accountName, currentNotes)
      
      if (saveResult.success) {
        console.log('✅ 笔记已从回收站恢复')
        return {
          success: true,
          message: '笔记已恢复'
        }
      } else {
        return saveResult
      }
    } catch (error) {
      console.error('恢复笔记失败:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * 彻底删除笔记（从回收站彻底删除）
   */
  permanentDeleteNote(accountName, noteId) {
    try {
      console.log('彻底删除笔记（从回收站）:', accountName, noteId)
      
      // 从回收站移除
      const removed = this.removeNoteFromTrash(accountName, noteId)
      
      if (removed) {
        console.log('✅ 笔记已从回收站彻底删除')
        return {
          success: true,
          message: '笔记已彻底删除'
        }
      } else {
        return {
          success: false,
          error: '笔记不在回收站中或删除失败'
        }
      }
    } catch (error) {
      console.error('彻底删除笔记失败:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * 清空回收站（清空独立的回收站存储空间）
   */
  emptyTrash(accountName) {
    try {
      console.log('清空回收站（数据隔离）:', accountName)
      
      const storageKey = this.getTrashStorageKey(accountName)
      const trashNotes = this.getTrashNotes(accountName)
      const deletedCount = trashNotes.length
      
      // 清空回收站存储空间
      wx.setStorageSync(storageKey, [])
      
      console.log(`✅ 回收站已清空，删除了 ${deletedCount} 条笔记`)
      return {
        success: true,
        message: '回收站已清空',
        deletedCount: deletedCount
      }
    } catch (error) {
      console.error('清空回收站失败:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * 获取账户统计信息
   */
  getAccountStatistics(accountName) {
    try {
      const accountData = this.getNotesFromAccount(accountName)
      
      if (!accountData.success) {
        return accountData
      }
      
      const notes = accountData.notes
      const totalWords = notes.reduce((sum, note) => sum + (note.wordCount || 0), 0)
      
      // 分类统计
      const categoryStats = {}
      notes.forEach(note => {
        const category = note.category || '未分类'
        categoryStats[category] = (categoryStats[category] || 0) + 1
      })
      
      // 标签统计
      const tagStats = {}
      notes.forEach(note => {
        if (note.tags) {
          note.tags.forEach(tag => {
            tagStats[tag] = (tagStats[tag] || 0) + 1
          })
        }
      })
      
      // 最近活动
      const recentNotes = notes
        .sort((a, b) => this.parseDate(b.updateTime || b.createTime) - this.parseDate(a.updateTime || a.createTime))
        .slice(0, 5)
      
      return {
        success: true,
        statistics: {
          totalNotes: notes.length,
          totalWords: totalWords,
          totalCategories: Object.keys(categoryStats).length,
          totalTags: Object.keys(tagStats).length,
          categoryStats: Object.entries(categoryStats).map(([name, count]) => ({ name, count })),
          tagStats: Object.entries(tagStats).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
          recentNotes: recentNotes,
          lastUpdate: accountData.updateTime
        }
      }
    } catch (error) {
      console.error('获取账户统计失败:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * 获取来源历史记录
   */
  getSourceHistory() {
    const storageKey = this.getAccountStorageKey('sourceHistory')
    return wx.getStorageSync(storageKey) || []
  }

  /**
   * 保存来源历史记录
   */
  saveSourceHistory(source) {
    const storageKey = this.getAccountStorageKey('sourceHistory')
    let history = this.getSourceHistory()
    
    // 移除重复项
    history = history.filter(item => item !== source)
    
    // 添加到开头
    history.unshift(source)
    
    // 限制历史记录数量
    if (history.length > 10) {
      history = history.slice(0, 10)
    }
    
    wx.setStorageSync(storageKey, history)
    console.log('来源历史记录保存完成:', history)
    return history
  }

  /**
   * 清除来源历史记录
   */
  clearSourceHistory() {
    const storageKey = this.getAccountStorageKey('sourceHistory')
    wx.removeStorageSync(storageKey)
    console.log('来源历史记录已清除')
  }
}

// 创建单例实例
const noteManager = new NoteManager()

module.exports = noteManager
