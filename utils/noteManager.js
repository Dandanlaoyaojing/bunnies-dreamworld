// utils/noteManager.js - 统一笔记管理服务
const TagProcessor = require('./tagProcessor')

class NoteManager {
  constructor() {
    this.storageKey = 'notes'
    this.tagStorageKey = 'noteTags'
    this.categoryStorageKey = 'noteCategories'
    this.accountsStorageKey = 'userAccounts'
    this.trashStorageKey = 'noteTrash' // 回收站存储键
  }

  /**
   * 规范化单个标签（兼容新旧格式）
   * @param {string|Object} tag - 标签（字符串或对象）
   * @returns {Object} 规范化后的标签对象 {name: string, source: string}
   */
  normalizeTag(tag) {
    if (typeof tag === 'string') {
      return {
        name: tag,
        source: 'ai' // 旧数据默认为 AI 标签
      }
    } else if (typeof tag === 'object' && tag !== null) {
      return {
        name: tag.name || tag,
        source: tag.source || 'ai' // 默认 AI
      }
    }
    return null
  }

  /**
   * 规范化标签数组（兼容新旧格式）
   * @param {Array} tags - 标签数组
   * @returns {Array} 规范化后的标签对象数组
   */
  normalizeTags(tags) {
    if (!tags || !Array.isArray(tags)) return []
    return tags.map(tag => this.normalizeTag(tag)).filter(tag => tag !== null)
  }

  /**
   * 从标签对象数组中提取标签名称数组
   * @param {Array} tags - 标签数组（可能是对象或字符串）
   * @returns {Array} 标签名称数组
   */
  extractTagNames(tags) {
    if (!tags || !Array.isArray(tags)) return []
    return tags.map(tag => {
      if (typeof tag === 'string') return tag
      if (typeof tag === 'object' && tag !== null) return tag.name || tag
      return null
    }).filter(name => name !== null)
  }

  /**
   * 检查标签是否匹配（支持新旧格式）
   * @param {string|Object} tag1 - 标签1
   * @param {string|Object} tag2 - 标签2
   * @returns {boolean} 是否匹配
   */
  isTagMatch(tag1, tag2) {
    const name1 = typeof tag1 === 'string' ? tag1 : (tag1?.name || tag1)
    const name2 = typeof tag2 === 'string' ? tag2 : (tag2?.name || tag2)
    return name1 === name2 || (name1 && name2 && name1.toLowerCase() === name2.toLowerCase())
  }

  /**
   * 检查标签数组是否包含指定标签（支持新旧格式）
   * @param {Array} tags - 标签数组
   * @param {string|Object} targetTag - 目标标签
   * @returns {boolean} 是否包含
   */
  tagsIncludes(tags, targetTag) {
    if (!tags || !Array.isArray(tags)) return false
    return tags.some(tag => this.isTagMatch(tag, targetTag))
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
    try {
      // 获取当前登录用户
      const userInfo = wx.getStorageSync('userInfo')
      if (!userInfo || !userInfo.username) {
        console.log('未登录，返回空数组')
        return []
      }
      
      // 从账户存储获取笔记
      const accountResult = this.getNotesFromAccount(userInfo.username)
      if (!accountResult.success) {
        console.error('获取账户笔记失败:', accountResult.error)
        return []
      }
      
      // 根据分类过滤笔记
      const categoryNotes = accountResult.notes.filter(note => 
        note.category === category && 
        note.status !== 'deleted' &&
        !note.isDeleted
      )
      
      console.log(`获取分类"${category}"的笔记: ${categoryNotes.length} 条`)
      return categoryNotes
    } catch (error) {
      console.error('根据分类获取笔记失败:', error)
      return []
    }
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
   * 自动保存到当前登录账户，并同步到后端服务器
   */
  async saveNote(note) {
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
      
      console.log('=== 保存笔记（含后端同步） ===')
      console.log('当前登录账户:', currentAccount)
      console.log('笔记ID:', note.id)
      
      // 规范化标签格式（兼容新旧格式）
      let processedTags = this.normalizeTags(note.tags || [])
      
      // 处理来源标签（如果存在 source 字段）
      if (note.source && note.source.trim()) {
        // 注意：来源智能标签应该通过后端API生成（包含 source: 'origin'）
        // 这里不再处理来源标签，因为来源标签应由后端AI生成
        console.log('笔记来源字段:', note.source)
      }
      
      // 准备完整的笔记对象
      const existingNote = note.id ? this.getNoteById(note.id) : null
      let finalNote
      
      if (existingNote) {
        // 更新现有笔记
        finalNote = {
          ...existingNote,
          ...note,
          tags: processedTags, // 使用规范化后的标签
          updateTime: this.formatTime(new Date())
        }
        console.log('更新现有笔记')
      } else {
        // 新增笔记
        finalNote = {
          ...note,
          id: note.id || this.generateId(),
          tags: processedTags, // 使用规范化后的标签
          createTime: note.createTime || this.formatTime(new Date()),
          updateTime: this.formatTime(new Date())
        }
        console.log('创建新笔记')
      }
      
      // 1. 优先同步到后端服务器（确保云端数据第一时间更新）
      if (currentAccount && userInfo.token) {
        console.log('📤 优先同步笔记到后端服务器...')
        
        try {
          const apiService = require('./apiService')
          let serverResponse
          
          if (existingNote && finalNote.serverId) {
            // 更新现有笔记
            console.log('更新后端笔记:', finalNote.serverId)
            serverResponse = await apiService.updateNote(finalNote.serverId, {
              title: finalNote.title,
              content: finalNote.content,
              category: finalNote.category,
              tags: finalNote.tags || [],
              url: finalNote.url || '',
              source: finalNote.source || '',
              images: finalNote.images || [],
              voices: finalNote.voices || [],
              wordCount: finalNote.wordCount || 0
            })
          } else {
            // 创建新笔记
            console.log('创建后端笔记')
            serverResponse = await apiService.createNote({
              title: finalNote.title,
              content: finalNote.content,
              category: finalNote.category,
              tags: finalNote.tags || [],
              url: finalNote.url || '',
              source: finalNote.source || '',
              images: finalNote.images || [],
              voices: finalNote.voices || [],
              wordCount: finalNote.wordCount || 0
            })
          }
          
          if (serverResponse.success && serverResponse.data) {
            // 保存服务器返回的ID和最新数据
            finalNote.serverId = serverResponse.data.id || serverResponse.data.noteId
            // 如果服务器返回了完整数据，使用服务器数据确保一致性
            if (serverResponse.data) {
              finalNote.updateTime = serverResponse.data.updated_at || serverResponse.data.updateTime || finalNote.updateTime
            }
            console.log('✅ 后端同步成功，ServerID:', finalNote.serverId)
            
            // 同步成功后，立即从云端刷新本地缓存，确保数据完全一致
            try {
              await this.syncNotesFromCloud(currentAccount)
              console.log('✅ 云端数据已刷新到本地，确保一致性')
            } catch (syncError) {
              console.warn('⚠️ 刷新本地缓存失败（不影响保存）:', syncError.message)
            }
          } else {
            console.warn('⚠️ 后端同步失败，但继续本地保存:', serverResponse.error)
          }
        } catch (error) {
          console.warn('⚠️ 后端同步出错，但继续本地保存:', error.message)
        }
      } else {
        console.log('📝 用户未登录或无Token，仅本地保存')
      }
      
      // 2. 保存到本地账户存储
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
      
      // 3. 同时保存到全局存储（兼容旧逻辑，用于当前会话）
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
      console.log('ServerID:', finalNote.serverId || '未同步')
      console.log('账户:', currentAccount || '未登录')
      
      return { success: true, note: finalNote, account: currentAccount }
    } catch (error) {
      console.error('❌ 保存笔记失败:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * 删除笔记（硬删除+移到回收站）
   * 从笔记簿中真正删除，但数据保存到回收站
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
      
      console.log('=== 硬删除笔记（移到回收站） ===')
      console.log('当前登录账户:', currentAccount)
      console.log('笔记ID:', id)
      
      // 先获取要删除的笔记
      let noteToDelete = null
      
      // 如果用户已登录，从账户存储中获取笔记
      if (currentAccount) {
        const accountResult = this.getNotesFromAccount(currentAccount)
        if (accountResult.success) {
          noteToDelete = accountResult.notes.find(note => note.id === id)
        }
      }
      
      // 如果没找到，从全局存储中获取
      if (!noteToDelete) {
        const allNotes = this.getAllNotes()
        noteToDelete = allNotes.find(note => note.id === id)
      }
      
      if (!noteToDelete) {
        return {
          success: false,
          error: '笔记不存在'
        }
      }
      
      // 1. 从笔记簿中硬删除（真正移除）
      if (currentAccount) {
        const accountResult = this.getNotesFromAccount(currentAccount)
        
        if (accountResult.success) {
          const accountNotes = accountResult.notes.filter(note => note.id !== id)
          const saveResult = this.saveNotesToAccount(currentAccount, accountNotes)
          
          if (!saveResult.success) {
            console.error('从账户删除失败:', saveResult.error)
            return saveResult
          }
          
          console.log('✅ 笔记已从账户硬删除:', currentAccount)
        }
      }
      
      // 同时从全局存储删除（兼容性）
      const allNotes = this.getAllNotes()
      const updatedNotes = allNotes.filter(note => note.id !== id)
      wx.setStorageSync(this.storageKey, updatedNotes)
      
      // 2. 将笔记数据保存到回收站
      if (currentAccount) {
        const trashSaved = this.saveNoteToTrash(currentAccount, noteToDelete)
        if (trashSaved) {
          console.log('✅ 笔记已保存到回收站')
        } else {
          console.warn('⚠️ 保存到回收站失败，但笔记已从笔记簿删除')
        }
      }
      
      // 更新标签统计
      this.updateAllTagStatistics()
      
      console.log('✅ 笔记硬删除成功，数据已移到回收站:', id)
      return { 
        success: true, 
        account: currentAccount,
        message: '笔记已删除，数据已移到回收站'
      }
    } catch (error) {
      console.error('❌ 删除笔记失败:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * 批量删除笔记（硬删除+移到回收站）
   * 从笔记簿中真正删除，但数据保存到回收站
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
      
      console.log('=== 批量硬删除笔记（移到回收站） ===')
      console.log('当前登录账户:', currentAccount)
      console.log('删除数量:', ids.length)
      
      // 先获取要删除的笔记
      let notesToDelete = []
      
      // 如果用户已登录，从账户存储中获取笔记
      if (currentAccount) {
        const accountResult = this.getNotesFromAccount(currentAccount)
        if (accountResult.success) {
          notesToDelete = accountResult.notes.filter(note => ids.includes(note.id))
        }
      }
      
      // 如果没找到，从全局存储中获取
      if (notesToDelete.length === 0) {
        const allNotes = this.getAllNotes()
        notesToDelete = allNotes.filter(note => ids.includes(note.id))
      }
      
      // 1. 从笔记簿中硬删除（真正移除）
      if (currentAccount) {
        const accountResult = this.getNotesFromAccount(currentAccount)
        
        if (accountResult.success) {
          const accountNotes = accountResult.notes.filter(note => !ids.includes(note.id))
          const saveResult = this.saveNotesToAccount(currentAccount, accountNotes)
          
          if (!saveResult.success) {
            console.error('从账户批量删除失败:', saveResult.error)
            return saveResult
          }
          
          console.log('✅ 笔记已从账户批量硬删除:', currentAccount)
        }
      }
      
      // 同时从全局存储删除（兼容性）
      const allNotes = this.getAllNotes()
      const updatedNotes = allNotes.filter(note => !ids.includes(note.id))
      wx.setStorageSync(this.storageKey, updatedNotes)
      
      // 2. 将笔记数据保存到回收站
      if (currentAccount && notesToDelete.length > 0) {
        notesToDelete.forEach(note => {
          this.saveNoteToTrash(currentAccount, note)
        })
        console.log(`✅ ${notesToDelete.length} 条笔记已保存到回收站`)
      }
      
      // 更新标签统计
      this.updateAllTagStatistics()
      
      console.log('✅ 批量硬删除成功，数据已移到回收站:', ids.length)
      return { 
        success: true, 
        deletedCount: ids.length, 
        account: currentAccount,
        message: '笔记已删除，数据已移到回收站'
      }
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
               (note.tags && note.tags.some(tag => {
                 const tagName = typeof tag === 'string' ? tag : (tag?.name || tag)
                 return tagName && tagName.toLowerCase().includes(searchTerm)
               }))
      })
    }

    // 分类筛选
    if (category) {
      filteredNotes = filteredNotes.filter(note => note.category === category)
    }

    // 标签筛选
    if (tags && tags.length > 0) {
      filteredNotes = filteredNotes.filter(note => {
        if (!note.tags || !Array.isArray(note.tags)) return false
        return tags.some(targetTag => this.tagsIncludes(note.tags, targetTag))
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
      
      // 统计所有标签的使用次数（支持新旧格式）
      allNotes.forEach(note => {
        if (note.tags) {
          const normalizedTags = this.normalizeTags(note.tags)
          normalizedTags.forEach(tag => {
            const tagName = tag.name
            tagStats[tagName] = (tagStats[tagName] || 0) + 1
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
    return allNotes.filter(note => this.tagsIncludes(note.tags, tag))
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
  /**
   * 保存笔记到账户（实现完整数据隔离）
   * 
   * **重要：数据隔离原则**
   * 本系统使用三个完全独立的存储空间：
   * 
   * 1. **常规笔记（笔记簿）**：存储在 `userAccounts[accountName].notes` 中
   *    - 只包含活跃的常规笔记
   *    - 不包含草稿（草稿存储在独立的草稿箱）
   *    - 不包含已删除笔记（已删除笔记存储在独立的回收站）
   *    - 这是笔记簿、知识星图、梦之国度等应用使用的唯一数据源
   * 
   * 2. **草稿箱**：存储在 `drafts_${accountName}` 存储键中
   *    - 使用 `getAccountStorage('drafts')` 访问
   *    - 完全独立于常规笔记存储
   * 
   * 3. **回收站**：存储在 `noteTrash_${accountName}` 存储键中
   *    - 使用 `getTrashNotes(accountName)` 访问
   *    - 完全独立于常规笔记存储
   * 
   * **严格的过滤规则**（确保存储本身隔离，不需要后续过滤）：
   * - 自动过滤 `status === 'deleted'` 或 `isDeleted === true` 的笔记（应该在回收站）
   * - 自动过滤 `isDraft === true` 或 `status === 'draft'` 的笔记（应该在草稿箱）
   * 
   * **使用场景**：
   * - 笔记簿应该只显示常规笔记，直接读取 `userAccounts[accountName].notes`，不需要额外过滤
   * - 知识星图、梦之国度等应用应该只使用常规笔记数据
   * 
   * @param {string} accountName - 账户名称
   * @param {Array} notes - 笔记数组（会自动过滤草稿和已删除笔记）
   * @returns {Object} 保存结果
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
      
      // 严格过滤：确保常规笔记存储中只包含活跃的常规笔记
      // 这是数据隔离的关键：存储本身就应该隔离，不需要后续过滤
      const activeNotes = notes.filter(note => {
        // 排除回收站笔记（这些应该存储在 noteTrash_${accountName} 中）
        if (note.status === 'deleted' || note.isDeleted === true) {
          console.warn(`⚠️ 检测到已删除笔记 "${note.title || note.id}"，应该存储在回收站，不应在常规笔记列表中`)
          return false
        }
        // 排除草稿（这些应该存储在 drafts_${accountName} 中）
        if (note.isDraft === true || note.status === 'draft') {
          console.warn(`⚠️ 检测到草稿 "${note.title || note.id}"，应该存储在草稿箱，不应在常规笔记列表中`)
          return false
        }
        return true
      })
      
      // 保存笔记到账户（只包含活跃的常规笔记）
      accounts[accountName].notes = activeNotes
      accounts[accountName].updateTime = this.formatTime(new Date())
      
      // 提取标签和分类
      const allTags = new Set()
      const allCategories = new Set()
      
      activeNotes.forEach(note => {
        if (note.tags && note.tags.length > 0) {
          // 支持新旧格式：提取标签名称
          const tagNames = this.extractTagNames(note.tags)
          tagNames.forEach(tagName => allTags.add(tagName))
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
   * 从云端同步笔记到本地（优先使用）
   * 确保本地数据与云端服务器保持一致
   */
  async syncNotesFromCloud(accountName) {
    try {
      const userInfo = wx.getStorageSync('userInfo')
      if (!userInfo || !userInfo.token) {
        console.log('📝 用户未登录或无Token，跳过云端同步')
        return { success: false, error: '用户未登录或无Token' }
      }
      
      const apiService = require('./apiService')
      console.log('📥 开始从云端同步笔记...')
      
      // 从服务器获取最新笔记
      const result = await apiService.getNotes({ page: 1, limit: 10000 })
      
      if (result.success && result.data && result.data.notes) {
        const cloudNotes = result.data.notes || []
        console.log(`📥 从云端获取 ${cloudNotes.length} 条笔记`)
        
        // 将云端数据转换为本地格式并保存
        const localNotes = cloudNotes.map(note => ({
          ...note,
          id: note.id || note.noteId,
          serverId: note.id || note.noteId,
          createTime: note.created_at || note.createTime,
          updateTime: note.updated_at || note.updateTime,
          category: note.category || (Array.isArray(note.category) ? note.category[0] : 'thinking'),
          tags: Array.isArray(note.tags) ? note.tags : (typeof note.tags === 'string' ? JSON.parse(note.tags || '[]') : []),
          wordCount: note.word_count || note.wordCount || 0
        }))
        
        // 保存到账户存储（覆盖本地数据，确保与云端一致）
        const saveResult = this.saveNotesToAccount(accountName, localNotes)
        
        if (saveResult.success) {
          console.log('✅ 云端数据已同步到本地，共', localNotes.length, '条笔记')
          return {
            success: true,
            notes: localNotes,
            count: localNotes.length
          }
        } else {
          return saveResult
        }
      } else {
        console.warn('⚠️ 云端同步失败，使用本地数据:', result.error)
        return { success: false, error: result.error || '云端同步失败' }
      }
    } catch (error) {
      console.error('❌ 云端同步异常:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * 从指定账户获取笔记（只返回活跃的常规笔记，实现完整数据隔离）
   * 
   * **数据隔离保证**：
   * - 只从 `userAccounts[accountName].notes` 读取数据（常规笔记存储）
   * - 不会从草稿箱（`drafts_${accountName}`）读取数据
   * - 不会从回收站（`noteTrash_${accountName}`）读取数据
   * - 返回的数据中不会包含草稿或已删除笔记（即使存储中有异常数据也会被过滤）
   * 
   * **这是笔记簿、知识星图、梦之国度等应用的唯一数据源**
   * 
   * 注意：此方法为同步方法，不会从云端同步，如需云端同步请使用 `getNotesFromAccountWithSync`
   * 
   * @param {string} accountName - 账户名称
   * @returns {Object} {success: boolean, notes: Array, tags: Array, categories: Array}
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
      
      // 双重保险：虽然 saveNotesToAccount 已经过滤，但这里再次验证
      // 确保即使存储中有异常数据，也不会被返回
      // 常规笔记存储（userAccounts[accountName].notes）应该只包含活跃的常规笔记
      const storedNotes = account.notes || []
      const activeNotes = storedNotes.filter(note => {
        // 如果存储中有已删除的笔记（不应该出现），排除它们
        if (note.status === 'deleted' || note.isDeleted === true) {
          console.error(`❌ 数据隔离错误：常规笔记存储中发现已删除笔记 "${note.title || note.id}"，应该存储在回收站`)
          return false
        }
        // 如果存储中有草稿（不应该出现），排除它们
        if (note.isDraft === true || note.status === 'draft') {
          console.error(`❌ 数据隔离错误：常规笔记存储中发现草稿 "${note.title || note.id}"，应该存储在草稿箱`)
          return false
        }
        return true
      })
      
      if (storedNotes.length !== activeNotes.length) {
        console.error(`❌ 数据隔离错误：常规笔记存储中发现 ${storedNotes.length - activeNotes.length} 条不应该存在的数据（草稿或已删除笔记）`)
      }
      
      return {
        success: true,
        notes: activeNotes, // 只返回活跃的常规笔记
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
   * 从指定账户获取笔记（优先从云端同步，确保与云端一致）
   * 此方法会先从云端同步最新数据，然后再返回本地数据
   */
  async getNotesFromAccountWithSync(accountName, forceSync = true) {
    try {
      // 如果强制同步，先从云端同步最新数据
      if (forceSync) {
        const syncResult = await this.syncNotesFromCloud(accountName)
        if (syncResult.success) {
          console.log('✅ 云端同步成功，使用云端最新数据')
        } else {
          console.warn('⚠️ 云端同步失败，使用本地缓存数据')
        }
      }
      
      // 同步后从本地读取（此时本地数据已经是最新的云端数据）
      return this.getNotesFromAccount(accountName)
    } catch (error) {
      console.error('从账户获取笔记（带同步）失败:', error)
      // 同步失败时，返回本地数据作为降级方案
      return this.getNotesFromAccount(accountName)
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
                 (note.tags && note.tags.some(tag => {
                   const tagName = typeof tag === 'string' ? tag : (tag?.name || tag)
                   return tagName && tagName.toLowerCase().includes(searchTerm)
                 }))
        })
      }
      
      // 分类筛选
      if (options.category) {
        filteredNotes = filteredNotes.filter(note => note.category === options.category)
      }
      
      // 标签筛选
      if (options.tags && options.tags.length > 0) {
        filteredNotes = filteredNotes.filter(note => {
          if (!note.tags || !Array.isArray(note.tags)) return false
          return options.tags.some(targetTag => this.tagsIncludes(note.tags, targetTag))
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
      console.log(`📤 从常规笔记库移除笔记: ${noteToDelete.title || noteId}，剩余 ${remainingNotes.length} 条`)
      
      // 2. 保存更新后的常规笔记列表（确保原库中没有该笔记）
      const saveResult = this.saveNotesToAccount(accountName, remainingNotes)
      if (!saveResult.success) {
        console.error('❌ 保存常规笔记列表失败，终止删除操作')
        return saveResult
      }
      
      // 3. 将笔记移到独立的回收站存储空间（移动操作：从原库移除，添加到新库）
      console.log(`📥 将笔记移动到回收站: ${noteToDelete.title || noteId}`)
      const trashSaved = this.saveNoteToTrash(accountName, noteToDelete)
      
      if (!trashSaved) {
        console.error('❌ 保存到回收站失败，尝试恢复常规列表（回滚操作）')
        // 如果保存到回收站失败，回滚操作：恢复常规列表
        this.saveNotesToAccount(accountName, activeNotes)
        return {
          success: false,
          error: '保存到回收站失败，操作已回滚'
        }
      }
      
      // 4. 验证移动操作：确保笔记不再存在于常规笔记库中
      const verifyNotesResult = this.getNotesFromAccount(accountName)
      if (verifyNotesResult.success) {
        const stillExists = verifyNotesResult.notes.find(n => n.id === noteId)
        if (stillExists) {
          console.error(`❌ 验证失败：笔记仍在常规笔记库中: ${noteId}`)
        } else {
          console.log(`✅ 验证成功：笔记已从常规笔记库移除: ${noteId}`)
        }
      }
      
      // 5. 验证移动操作：确保笔记存在于回收站中
      const verifyTrashNotes = this.getTrashNotes(accountName)
      const existsInTrash = verifyTrashNotes.find(n => n.id === noteId)
      if (existsInTrash) {
        console.log(`✅ 验证成功：笔记已在回收站中: ${noteId}`)
      } else {
        console.error(`❌ 验证失败：笔记未在回收站中找到: ${noteId}`)
      }
      
      console.log('✅ 移动操作完成：笔记已从常规列表移除并移到回收站')
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
      
      // 2. 从回收站移除（移动操作的第一步：从源库删除）
      console.log(`📤 从回收站移除笔记: ${noteToRestore.title || noteId}`)
      const removedFromTrash = this.removeNoteFromTrash(accountName, noteId)
      if (!removedFromTrash) {
        console.error('❌ 从回收站移除笔记失败')
      }
      
      // 3. 完全清理所有删除相关的标记，确保笔记能被正确识别为活跃笔记
      // 创建一个新的笔记对象，避免引用问题，并清理所有删除标记
      const restoredNote = {
        ...noteToRestore,
        // 明确移除所有删除相关的字段
        status: undefined,
        deleteTime: undefined,
        deleted: undefined,
        isDeleted: undefined,
        // 更新时间为当前时间
        updateTime: this.formatTime(new Date())
      }
      
      // 删除这些字段，确保它们不会出现在保存的对象中
      delete restoredNote.status
      delete restoredNote.deleteTime
      delete restoredNote.deleted
      delete restoredNote.isDeleted
      
      console.log('恢复的笔记数据:', {
        id: restoredNote.id,
        title: restoredNote.title,
        status: restoredNote.status,
        isDeleted: restoredNote.isDeleted,
        deleted: restoredNote.deleted
      })
      
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
        currentNotes.push(restoredNote)
      } else {
        // 如果已存在，更新它（确保使用清理后的笔记对象）
        currentNotes[existingIndex] = restoredNote
      }
      
      // 5. 保存回常规列表（移动操作的第二步：添加到目标库）
      console.log(`📥 将恢复的笔记添加到常规笔记库: ${restoredNote.title || noteId}`)
      console.log('准备保存恢复的笔记，当前笔记列表长度:', currentNotes.length)
      const saveResult = this.saveNotesToAccount(accountName, currentNotes)
      
      if (!saveResult.success) {
        console.error('❌ 保存到常规笔记库失败，尝试恢复回收站（回滚操作）')
        // 如果保存失败，回滚操作：恢复回收站
        this.saveNoteToTrash(accountName, noteToRestore)
        return saveResult
      }
      
      // 6. 验证移动操作：确保笔记不再存在于回收站中
      const verifyTrashNotes = this.getTrashNotes(accountName)
      const stillInTrash = verifyTrashNotes.find(n => n.id === noteId)
      if (stillInTrash) {
        console.error(`❌ 验证失败：笔记仍在回收站中: ${noteId}`)
      } else {
        console.log(`✅ 验证成功：笔记已从回收站移除: ${noteId}`)
      }
      
      // 7. 验证移动操作：确保笔记存在于常规笔记库中
      const verifyNotesResult = this.getNotesFromAccount(accountName)
      if (verifyNotesResult.success) {
        const savedNote = verifyNotesResult.notes.find(n => n.id === noteId)
        if (savedNote) {
          console.log('✅ 验证成功：恢复的笔记已在常规笔记库中')
          
          // 验证笔记没有删除标记
          if (savedNote.status === 'deleted' || savedNote.isDeleted === true) {
            console.error('❌ 警告：恢复的笔记仍带有删除标记', {
              status: savedNote.status,
              isDeleted: savedNote.isDeleted
            })
          } else {
            console.log('✅ 验证成功：恢复的笔记没有删除标记')
          }
        } else {
          console.error('❌ 验证失败：恢复的笔记未在常规笔记库中找到')
          console.log('当前账户笔记列表:', verifyNotesResult.notes.map(n => ({ id: n.id, title: n.title, status: n.status, isDeleted: n.isDeleted })))
        }
      }
      
      if (saveResult.success) {
        console.log('✅ 移动操作完成：笔记已从回收站恢复')
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
      console.log(`🗑️ 彻底删除笔记（从回收站移除，不再保留）: ${accountName}, ${noteId}`)
      
      // 验证笔记是否在回收站中
      const trashNotes = this.getTrashNotes(accountName)
      const noteInTrash = trashNotes.find(n => n.id === noteId)
      
      if (!noteInTrash) {
        console.error(`❌ 笔记不在回收站中，无法彻底删除: ${noteId}`)
        return {
          success: false,
          error: '笔记不在回收站中'
        }
      }
      
      // 从回收站移除（这是真正的删除操作，不是移动）
      const removed = this.removeNoteFromTrash(accountName, noteId)
      
      if (!removed) {
        console.error(`❌ 从回收站移除笔记失败: ${noteId}`)
        return {
          success: false,
          error: '删除失败'
        }
      }
      
      console.log(`✅ 笔记已从回收站彻底删除: ${noteId}`)
      
      // 验证删除结果：确保笔记不再存在于回收站中
      const verifyTrashNotes = this.getTrashNotes(accountName)
      const stillExists = verifyTrashNotes.find(n => n.id === noteId)
      if (stillExists) {
        console.error(`❌ 验证失败：笔记仍在回收站中: ${noteId}`)
        return {
          success: false,
          error: '删除验证失败，笔记可能仍存在'
        }
      } else {
        console.log(`✅ 验证成功：笔记已从回收站完全移除: ${noteId}`)
      }
      
      // 额外验证：确保笔记不在常规笔记库中（应该不在）
      const verifyNotesResult = this.getNotesFromAccount(accountName)
      if (verifyNotesResult.success) {
        const existsInNotes = verifyNotesResult.notes.find(n => n.id === noteId)
        if (existsInNotes) {
          console.warn(`⚠️ 警告：已删除的笔记仍在常规笔记库中（不应该出现）: ${noteId}`)
        }
      }
      
      return {
        success: true,
        message: '笔记已彻底删除'
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
   * 自动清理回收站中超过30天的笔记
   * 在应用启动时调用，确保回收站不会无限增长
   */
  autoCleanTrash(accountName) {
    try {
      console.log('开始自动清理回收站（30天）:', accountName)
      
      const trashNotes = this.getTrashNotes(accountName)
      if (trashNotes.length === 0) {
        console.log('回收站为空，无需清理')
        return {
          success: true,
          message: '回收站为空',
          cleanedCount: 0
        }
      }
      
      const now = new Date()
      const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000))
      
      // 过滤出需要保留的笔记（30天内的）
      const notesToKeep = []
      const notesToDelete = []
      
      trashNotes.forEach(note => {
        const deleteTime = this.parseDate(note.deleteTime)
        if (deleteTime > thirtyDaysAgo) {
          notesToKeep.push(note)
        } else {
          notesToDelete.push(note)
        }
      })
      
      if (notesToDelete.length === 0) {
        console.log('没有超过30天的笔记需要清理')
        return {
          success: true,
          message: '没有需要清理的笔记',
          cleanedCount: 0
        }
      }
      
      // 保存清理后的回收站
      const storageKey = this.getTrashStorageKey(accountName)
      wx.setStorageSync(storageKey, notesToKeep)
      
      console.log(`✅ 回收站自动清理完成，删除了 ${notesToDelete.length} 条超过30天的笔记`)
      console.log(`回收站剩余 ${notesToKeep.length} 条笔记`)
      
      return {
        success: true,
        message: `已清理 ${notesToDelete.length} 条超过30天的笔记`,
        cleanedCount: notesToDelete.length,
        remainingCount: notesToKeep.length
      }
    } catch (error) {
      console.error('自动清理回收站失败:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * 获取回收站统计信息（包括即将过期的笔记）
   */
  getTrashStatistics(accountName) {
    try {
      const trashNotes = this.getTrashNotes(accountName)
      
      if (trashNotes.length === 0) {
        return {
          success: true,
          totalCount: 0,
          expiringSoon: 0,
          expired: 0
        }
      }
      
      const now = new Date()
      const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000))
      const twentyFiveDaysAgo = new Date(now.getTime() - (25 * 24 * 60 * 60 * 1000))
      
      let expiringSoon = 0  // 5天内即将过期
      let expired = 0       // 已过期
      
      trashNotes.forEach(note => {
        const deleteTime = this.parseDate(note.deleteTime)
        if (deleteTime <= thirtyDaysAgo) {
          expired++
        } else if (deleteTime <= twentyFiveDaysAgo) {
          expiringSoon++
        }
      })
      
      return {
        success: true,
        totalCount: trashNotes.length,
        expiringSoon: expiringSoon,
        expired: expired
      }
    } catch (error) {
      console.error('获取回收站统计失败:', error)
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
      
      // 标签统计（支持新旧格式）
      const tagStats = {}
      notes.forEach(note => {
        if (note.tags) {
          const normalizedTags = this.normalizeTags(note.tags)
          normalizedTags.forEach(tag => {
            const tagName = tag.name
            tagStats[tagName] = (tagStats[tagName] || 0) + 1
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

  /**
   * 同步未同步的笔记到服务器
   * 检查本地笔记中哪些没有serverId，然后批量同步到服务器
   */
  async syncUnsyncedNotes() {
    try {
      console.log('=== 开始同步未同步的笔记 ===')
      
      // 检查登录状态
      if (!this.checkLoginStatus()) {
        return {
          success: false,
          error: '请先登录账户',
          needLogin: true
        }
      }
      
      const userInfo = wx.getStorageSync('userInfo')
      if (!userInfo || !userInfo.username || !userInfo.token) {
        return {
          success: false,
          error: '用户未登录或无Token'
        }
      }
      
      // 获取当前账户的所有笔记
      const accountResult = this.getNotesFromAccount(userInfo.username)
      if (!accountResult.success) {
        return {
          success: false,
          error: '获取账户笔记失败'
        }
      }
      
      const allNotes = accountResult.notes
      console.log(`账户中共有 ${allNotes.length} 条笔记`)
      
      // 找出未同步的笔记（没有serverId的）
      const unsyncedNotes = allNotes.filter(note => !note.serverId)
      console.log(`发现 ${unsyncedNotes.length} 条未同步的笔记`)
      
      if (unsyncedNotes.length === 0) {
        return {
          success: true,
          message: '所有笔记已同步',
          syncedCount: 0,
          totalCount: allNotes.length
        }
      }
      
      // 批量同步到服务器
      const apiService = require('./apiService')
      let syncedCount = 0
      let failedCount = 0
      const errors = []
      
      console.log('开始批量同步到服务器...')
      
      for (let i = 0; i < unsyncedNotes.length; i++) {
        const note = unsyncedNotes[i]
        console.log(`同步第 ${i + 1}/${unsyncedNotes.length} 条笔记: ${note.title}`)
        
        try {
          // 调用创建笔记API
          const response = await apiService.createNote({
            title: note.title,
            content: note.content,
            category: note.category,
            tags: note.tags || [],
            url: note.url || '',
            source: note.source || '',
            images: note.images || [],
            voices: note.voices || [],
            wordCount: note.wordCount || 0
          })
          
          if (response.success && response.data) {
            // 更新本地笔记的serverId
            note.serverId = response.data.id || response.data.noteId
            syncedCount++
            console.log(`✅ 同步成功: ${note.title} (ServerID: ${note.serverId})`)
          } else {
            failedCount++
            const error = response.error || '未知错误'
            errors.push(`${note.title}: ${error}`)
            console.error(`❌ 同步失败: ${note.title} - ${error}`)
          }
        } catch (error) {
          failedCount++
          const errorMsg = error.message || '网络错误'
          errors.push(`${note.title}: ${errorMsg}`)
          console.error(`❌ 同步异常: ${note.title} - ${errorMsg}`)
        }
        
        // 添加小延迟，避免请求过于频繁
        if (i < unsyncedNotes.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }
      
      // 保存更新后的笔记（包含serverId）
      if (syncedCount > 0) {
        const saveResult = this.saveNotesToAccount(userInfo.username, allNotes)
        if (!saveResult.success) {
          console.error('保存更新后的笔记失败:', saveResult.error)
        }
      }
      
      console.log(`=== 同步完成 ===`)
      console.log(`成功同步: ${syncedCount} 条`)
      console.log(`同步失败: ${failedCount} 条`)
      
      return {
        success: true,
        message: `同步完成：成功 ${syncedCount} 条，失败 ${failedCount} 条`,
        syncedCount: syncedCount,
        failedCount: failedCount,
        totalCount: allNotes.length,
        errors: errors
      }
    } catch (error) {
      console.error('❌ 同步笔记失败:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * 获取同步状态统计
   */
  getSyncStatus() {
    try {
      const userInfo = wx.getStorageSync('userInfo')
      if (!userInfo || !userInfo.username) {
        return {
          success: false,
          error: '用户未登录'
        }
      }
      
      const accountResult = this.getNotesFromAccount(userInfo.username)
      if (!accountResult.success) {
        return {
          success: false,
          error: '获取账户笔记失败'
        }
      }
      
      const allNotes = accountResult.notes
      const syncedNotes = allNotes.filter(note => note.serverId)
      const unsyncedNotes = allNotes.filter(note => !note.serverId)
      
      return {
        success: true,
        totalCount: allNotes.length,
        syncedCount: syncedNotes.length,
        unsyncedCount: unsyncedNotes.length,
        syncProgress: allNotes.length > 0 ? Math.round((syncedNotes.length / allNotes.length) * 100) : 100,
        unsyncedNotes: unsyncedNotes.map(note => ({
          id: note.id,
          title: note.title,
          createTime: note.createTime
        }))
      }
    } catch (error) {
      console.error('获取同步状态失败:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * 清理旧数据 - 删除没有用的旧数据
   */
  cleanOldData() {
    try {
      console.log('=== 开始清理旧数据 ===')
      
      // 检查登录状态
      if (!this.checkLoginStatus()) {
        return {
          success: false,
          error: '请先登录账户',
          needLogin: true
        }
      }
      
      const userInfo = wx.getStorageSync('userInfo')
      if (!userInfo || !userInfo.username) {
        return {
          success: false,
          error: '用户未登录'
        }
      }
      
      const accountName = userInfo.username
      let cleanedCount = 0
      const cleanedItems = []
      
      // 1. 清理全局存储中的旧数据
      console.log('清理全局存储...')
      const globalNotes = wx.getStorageSync(this.storageKey) || []
      const globalTags = wx.getStorageSync(this.tagStorageKey) || []
      const globalCategories = wx.getStorageSync(this.categoryStorageKey) || []
      
      if (globalNotes.length > 0) {
        wx.removeStorageSync(this.storageKey)
        cleanedItems.push(`全局笔记: ${globalNotes.length} 条`)
        cleanedCount += globalNotes.length
      }
      
      if (globalTags.length > 0) {
        wx.removeStorageSync(this.tagStorageKey)
        cleanedItems.push(`全局标签: ${globalTags.length} 个`)
        cleanedCount += globalTags.length
      }
      
      if (globalCategories.length > 0) {
        wx.removeStorageSync(this.categoryStorageKey)
        cleanedItems.push(`全局分类: ${globalCategories.length} 个`)
        cleanedCount += globalCategories.length
      }
      
      // 2. 清理账户数据中的重复和无效数据
      console.log('清理账户数据...')
      const accountResult = this.getNotesFromAccount(accountName)
      if (accountResult.success) {
        const originalNotes = accountResult.notes
        const cleanedNotes = []
        const seenIds = new Set()
        
        // 去重和清理无效数据
        originalNotes.forEach(note => {
          // 检查笔记是否有效
          if (!note.id || !note.title) {
            console.log('发现无效笔记，跳过:', note)
            return
          }
          
          // 检查是否重复
          if (seenIds.has(note.id)) {
            console.log('发现重复笔记，跳过:', note.title)
            return
          }
          
          seenIds.add(note.id)
          cleanedNotes.push(note)
        })
        
        // 如果有清理，保存清理后的数据
        if (cleanedNotes.length !== originalNotes.length) {
          const saveResult = this.saveNotesToAccount(accountName, cleanedNotes)
          if (saveResult.success) {
            const removedCount = originalNotes.length - cleanedNotes.length
            cleanedItems.push(`账户重复笔记: ${removedCount} 条`)
            cleanedCount += removedCount
          }
        }
      }
      
      // 3. 清理回收站中的过期数据（超过30天）
      console.log('清理回收站过期数据...')
      const trashResult = this.autoCleanTrash(accountName)
      if (trashResult.success && trashResult.cleanedCount > 0) {
        cleanedItems.push(`回收站过期笔记: ${trashResult.cleanedCount} 条`)
        cleanedCount += trashResult.cleanedCount
      }
      
      // 4. 清理其他可能的旧数据
      console.log('清理其他旧数据...')
      const oldKeys = [
        'notes_backup',
        'editNoteData',
        'tempNoteData',
        'draftData',
        'searchHistory',
        'lastSyncTime'
      ]
      
      oldKeys.forEach(key => {
        try {
          const data = wx.getStorageSync(key)
          if (data !== null && data !== undefined) {
            wx.removeStorageSync(key)
            cleanedItems.push(`旧数据: ${key}`)
          }
        } catch (error) {
          // 忽略清理错误
        }
      })
      
      // 5. 重新生成标签统计
      console.log('重新生成标签统计...')
      this.updateAllTagStatistics()
      
      console.log('=== 数据清理完成 ===')
      console.log(`总共清理了 ${cleanedCount} 项数据`)
      console.log('清理的项目:', cleanedItems)
      
      return {
        success: true,
        message: `数据清理完成，共清理 ${cleanedCount} 项数据`,
        cleanedCount: cleanedCount,
        cleanedItems: cleanedItems
      }
    } catch (error) {
      console.error('❌ 清理旧数据失败:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * 获取数据存储统计信息
   */
  getDataStorageStats() {
    try {
      const userInfo = wx.getStorageSync('userInfo')
      if (!userInfo || !userInfo.username) {
        return {
          success: false,
          error: '用户未登录'
        }
      }
      
      const accountName = userInfo.username
      const stats = {
        global: {
          notes: (wx.getStorageSync(this.storageKey) || []).length,
          tags: (wx.getStorageSync(this.tagStorageKey) || []).length,
          categories: (wx.getStorageSync(this.categoryStorageKey) || []).length
        },
        account: {
          notes: 0,
          tags: 0,
          categories: 0
        },
        trash: {
          notes: 0
        },
        other: {}
      }
      
      // 账户数据统计
      const accountResult = this.getNotesFromAccount(accountName)
      if (accountResult.success) {
        stats.account.notes = accountResult.notes.length
        stats.account.tags = accountResult.tags.length
        stats.account.categories = accountResult.categories.length
      }
      
      // 回收站统计
      const trashNotes = this.getTrashNotes(accountName)
      stats.trash.notes = trashNotes.length
      
      // 其他数据统计
      const otherKeys = [
        'notes_backup',
        'editNoteData',
        'tempNoteData',
        'draftData',
        'searchHistory',
        'lastSyncTime'
      ]
      
      otherKeys.forEach(key => {
        try {
          const data = wx.getStorageSync(key)
          if (data !== null && data !== undefined) {
            stats.other[key] = Array.isArray(data) ? data.length : 1
          }
        } catch (error) {
          // 忽略统计错误
        }
      })
      
      return {
        success: true,
        stats: stats
      }
    } catch (error) {
      console.error('获取数据存储统计失败:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }
}

// 创建单例实例
const noteManager = new NoteManager()

module.exports = noteManager
