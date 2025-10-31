// pages/trash/trash.js
const noteManager = require('../../utils/noteManager')
const apiService = require('../../utils/apiService')

Page({
  data: {
    // 回收站笔记列表
    trashedNotes: [],
    
    // 搜索和筛选
    searchKeyword: '',
    selectedCategory: '',
    sortIndex: 0,
    sortOptions: ['删除时间', '创建时间', '标题', '字数'],
    
    // 视图模式
    viewMode: 'list', // list | grid
    
    // 批量操作
    isBatchMode: false,
    selectedNotes: [],
    
    // 统计信息
    totalCount: 0,
    totalWords: 0,
    
    // 自动清理天数
    autoDeleteDays: 30,
    
    // 当前用户信息
    currentUser: ''
  },

  onLoad(options) {
    console.log('回收站页面加载')
    // 初始化加载标志
    this._hasLoaded = false
    this._lastLoadTime = 0
    this._serverTrashApiUnavailable = false // 标记回收站服务器接口是否不可用
    this.loadTrashedNotes() // 首次加载
  },

  onShow() {
    console.log('回收站页面显示')
    // 如果回收站接口已确认不可用，直接跳过重新加载，避免重复的404请求
    if (this._serverTrashApiUnavailable) {
      console.log('回收站接口不可用，使用已有数据')
      return
    }
    
    // 只有在需要刷新时才重新加载（例如从其他页面返回，且距离上次加载超过5秒）
    const now = Date.now()
    const shouldReload = !this._hasLoaded || (now - this._lastLoadTime > 5000)
    
    if (shouldReload) {
      this.loadTrashedNotes(false) // 非首次加载，静默模式
    } else {
      console.log('跳过重复加载，使用已有数据')
    }
  },

  onPullDownRefresh() {
    // 下拉刷新时，即使接口不可用，也尝试重新检查（可能接口已恢复）
    // 重置标志，允许一次重新尝试
    if (this._serverTrashApiUnavailable) {
      console.log('下拉刷新：尝试重新检查回收站接口是否可用')
      this._serverTrashApiUnavailable = false
    }
    this.loadTrashedNotes()
    wx.stopPullDownRefresh()
  },

  // 加载回收站笔记（服务器优先）
  async loadTrashedNotes() {
    try {
      console.log('开始加载回收站笔记')
      
      // 获取当前用户
      const userInfo = wx.getStorageSync('userInfo')
      if (!userInfo || !userInfo.username) {
        console.log('未登录，跳转到登录页')
        wx.showModal({
          title: '提示',
          content: '请先登录',
          showCancel: false,
          success: () => {
            wx.navigateTo({
              url: '/pages/login/login'
            })
          }
        })
        return
      }
      
      // 设置当前用户信息
      this.setData({
        currentUser: userInfo.username
      })
      
      // 优先从服务器获取回收站笔记（如果接口可用）
      let notes = []
      let serverApiAvailable = false
      
      // 检查服务器接口是否可用（通过检查是否返回404）
      // 如果之前已确认所有接口方案都不可用，直接跳过服务器请求
      if (this._serverTrashApiUnavailable) {
        console.log('📝 回收站服务器接口不可用，直接使用本地存储')
      } else {
        try {
          // getTrashNotes 会自动尝试多种方案（专用接口 -> notes接口筛选）
          const resp = await apiService.getTrashNotes()
          
          if (resp && resp.success) {
            notes = (resp.data && resp.data.notes) ? resp.data.notes : (resp.data || [])
            serverApiAvailable = true
            console.log('📥 从服务器加载回收站笔记:', Array.isArray(notes) ? notes.length : 0)
          } else {
            // 所有方案都失败，标记为不可用
            console.warn('⚠️ 服务器回收站列表失败，退回本地存储')
            // 只有在确认所有备用方案都失败时才标记为不可用
            if (resp && resp.statusCode === 404 && !resp.data) {
              this._serverTrashApiUnavailable = true
            }
          }
        } catch (e) {
          // 检查是否是404错误
          const is404Error = (e && e.message && e.message.includes('404')) ||
                            (e && e.statusCode === 404) ||
                            (e && e.code && e.code.includes('404'))
          
          if (is404Error) {
            // 所有方案都失败（包括备用方案），标记为不可用
            if (!this._serverTrashApiUnavailable) {
              console.log('📝 回收站所有服务器接口方案都不可用(404)，使用本地存储')
              this._serverTrashApiUnavailable = true
            }
            // 404错误不再输出警告，避免日志噪音
          } else {
            console.warn('⚠️ 回收站服务器请求异常，使用本地存储:', e && e.message)
          }
        }
      }
      
      // 服务器失败或接口不存在时回退到本地回收站
      if (!serverApiAvailable || !Array.isArray(notes) || notes.length === 0) {
      const result = noteManager.getTrashedNotes(userInfo.username)
        if (result.success) {
          notes = result.notes || []
          console.log('📦 使用本地回收站数据:', notes.length)
        } else {
          notes = []
          console.log('📦 本地回收站数据为空')
        }
      }
      
      if (Array.isArray(notes)) {
        const totalWords = notes.reduce((sum, note) => sum + (note.wordCount || 0), 0)
        
        this.setData({
          trashedNotes: notes,
          totalCount: notes.length,
          totalWords: totalWords
        })
        
        console.log('回收站笔记加载完成:', notes.length, '条')
        
        // 应用筛选和排序
        this.applyFilters()
      } else {
        console.error('加载回收站失败: 数据格式错误')
      }
    } catch (error) {
      console.error('加载回收站异常:', error)
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    }
  },

  // 应用筛选和排序
  applyFilters() {
    let notes = [...this.data.trashedNotes]
    
    // 关键词搜索
    if (this.data.searchKeyword.trim()) {
      const keyword = this.data.searchKeyword.toLowerCase()
      notes = notes.filter(note => {
        return note.title.toLowerCase().includes(keyword) ||
               note.content.toLowerCase().includes(keyword) ||
               (note.tags && note.tags.some(tag => tag.toLowerCase().includes(keyword)))
      })
    }
    
    // 分类筛选
    if (this.data.selectedCategory) {
      notes = notes.filter(note => note.category === this.data.selectedCategory)
    }
    
    // 排序
    this.sortNotes(notes)
    
    // 添加选中状态标记
    notes = notes.map(note => ({
      ...note,
      isSelected: this.data.selectedNotes.some(n => n.id === note.id)
    }))
    
    this.setData({
      trashedNotes: notes
    })
  },

  // 排序笔记
  sortNotes(notes) {
    const sortBy = ['deleteTime', 'createTime', 'title', 'wordCount'][this.data.sortIndex]
    
    notes.sort((a, b) => {
      if (sortBy === 'deleteTime') {
        return new Date(b.deleteTime || b.createTime) - new Date(a.deleteTime || a.createTime)
      } else if (sortBy === 'createTime') {
        return new Date(b.createTime) - new Date(a.createTime)
      } else if (sortBy === 'title') {
        return a.title.localeCompare(b.title)
      } else if (sortBy === 'wordCount') {
        return (b.wordCount || 0) - (a.wordCount || 0)
      }
      return 0
    })
  },

  // 搜索输入
  onSearchInput(e) {
    this.setData({
      searchKeyword: e.detail.value
    })
    this.applyFilters()
  },

  // 分类筛选
  filterByCategory(e) {
    const category = e.currentTarget.dataset.category
    this.setData({
      selectedCategory: category === this.data.selectedCategory ? '' : category
    })
    this.applyFilters()
  },

  // 排序改变
  onSortChange(e) {
    this.setData({
      sortIndex: e.detail.value
    })
    this.applyFilters()
  },

  // 切换视图模式
  toggleViewMode() {
    this.setData({
      viewMode: this.data.viewMode === 'list' ? 'grid' : 'list'
    })
  },

  // 打开笔记详情
  openNote(e) {
    if (this.data.isBatchMode) {
      this.toggleNoteSelection(e)
      return
    }
    
    const noteId = e.currentTarget.dataset.id
    
    wx.showModal({
      title: '查看已删除笔记',
      content: '这是一条已删除的笔记，是否要恢复后查看？',
      confirmText: '恢复',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          this.restoreNote({ currentTarget: { dataset: { id: noteId } } })
        }
      }
    })
  },

  // 恢复笔记
  restoreNote(e) {
    const noteId = e.currentTarget.dataset.id
    const note = this.data.trashedNotes.find(n => n.id === noteId)
    
    if (!note) return
    
    wx.showModal({
      title: '恢复笔记',
      content: `确定要恢复"${note.title}"吗？`,
      confirmColor: '#C0D3E2',
      success: (res) => {
        if (res.confirm) {
          this.confirmRestore(noteId)
        }
      }
    })
  },

  // 确认恢复
  async confirmRestore(noteId) {
    try {
      const userInfo = wx.getStorageSync('userInfo')
      if (!userInfo || !userInfo.username) {
        wx.showToast({
          title: '请先登录',
          icon: 'none'
        })
        return
      }
      
      // 步骤1：先调用本地恢复（这会从回收站移除笔记并恢复到常规列表）
      const note = this.data.trashedNotes.find(n => n.id === noteId)
      
      if (!note) {
        console.error('找不到要恢复的笔记:', noteId)
        wx.showToast({
          title: '笔记不存在',
          icon: 'none'
        })
        return
      }
      
      // 执行本地恢复（这会自动从回收站移除笔记）
      const localRestoreResult = noteManager.restoreNote(userInfo.username, noteId)
      
      if (!localRestoreResult.success) {
        console.error('本地恢复失败:', localRestoreResult.error)
        wx.showToast({
          title: localRestoreResult.error || '恢复失败',
          icon: 'none'
        })
        return
      }
      
      console.log('✅ 笔记已从回收站移除并恢复到常规列表')
      
      // 步骤2：优先同步到云端服务器（确保使用正确的serverId）
      let serverRestoreSuccess = false
      
      // 确保使用正确的serverId进行云端恢复
      // 检查是否有有效的serverId
      // serverId应该是数字（服务器ID），如果是本地ID格式（时间戳字符串）则不使用
      const hasValidServerId = note.serverId && 
                              note.serverId !== note.id && 
                              (typeof note.serverId === 'number' || 
                               (typeof note.serverId === 'string' && !isNaN(parseInt(note.serverId)) && note.serverId !== note.id))
      
      if (userInfo.token && hasValidServerId) {
        try {
          console.log('📤 同步恢复操作到云端服务器:', {
            serverId: note.serverId,
            localId: note.id,
            noteTitle: note.title
          })
          
          const resp = await apiService.restoreNote(note.serverId)
          
          if (resp && resp.success) {
            serverRestoreSuccess = true
            console.log('✅ 云端恢复成功')
          } else {
            // 检查是否是"笔记不存在"错误（这表示笔记在服务器上已被彻底删除）
            const errorMsg = (resp && resp.error) || (resp && resp.message) || ''
            const isNotFoundError = errorMsg.includes('不存在') || 
                                   errorMsg.includes('not found') || 
                                   errorMsg.includes('找不到') ||
                                   (resp && resp.statusCode === 404)
            
            if (isNotFoundError) {
              console.log('⚠️ 笔记在服务器上不存在（可能已被彻底删除），但本地已恢复')
              // 笔记不存在是正常情况（可能已在服务器上彻底删除），本地恢复已成功
            } else {
              console.warn('⚠️ 云端恢复失败，但本地已恢复:', errorMsg)
            }
          }
        } catch (error) {
          // 检查错误类型
          const errorMsg = error.message || error.error || ''
          const is404Error = errorMsg.includes('404') || 
                           errorMsg.includes('不存在') || 
                           errorMsg.includes('not found') ||
                           (error.statusCode === 404)
          
          if (is404Error) {
            console.log('⚠️ 笔记在服务器上不存在或恢复接口不可用（可能已被彻底删除），但本地已恢复')
            // 这是正常情况，本地恢复已成功
          } else {
            console.warn('⚠️ 云端恢复异常，但本地已恢复:', errorMsg)
          }
        }
      } else if (!userInfo.token) {
        console.log('📱 无Token，仅本地恢复')
      } else if (!hasValidServerId) {
        console.log('📱 笔记无有效的serverId（可能从未同步到服务器），仅本地恢复')
        // 笔记从未同步到服务器，只需要本地恢复即可
      }
      
      // 步骤3：恢复成功后，立即从云端刷新最新数据，确保与云端一致
      // 如果有有效的serverId，尝试从云端同步，确保数据一致性
      if (hasValidServerId) {
        try {
          console.log('📥 恢复后刷新云端数据，确保一致性...')
          await noteManager.syncNotesFromCloud(userInfo.username)
          console.log('✅ 云端数据已刷新到本地，确保一致性')
        } catch (syncError) {
          console.warn('⚠️ 刷新云端数据失败（不影响恢复）:', syncError.message)
        }
      } else {
        // 即使没有有效的serverId，也验证一下本地恢复是否成功
        try {
          const verifyResult = noteManager.getNotesFromAccount(userInfo.username)
          if (verifyResult.success) {
            const restoredNote = verifyResult.notes.find(n => n.id === noteId)
            if (restoredNote) {
              console.log('✅ 本地验证：恢复的笔记已在账户列表中')
            } else {
              console.error('❌ 本地验证失败：恢复的笔记未在账户列表中找到')
            }
          }
        } catch (verifyError) {
          console.warn('验证恢复结果失败:', verifyError)
        }
      }
      
      // 步骤4：立即从本地缓存更新UI，确保恢复的笔记从回收站列表中移除
      // 先立即从当前显示列表中移除，提供快速反馈
      const updatedTrashedNotes = this.data.trashedNotes.filter(n => n.id !== noteId)
      this.setData({
        trashedNotes: updatedTrashedNotes,
        totalCount: updatedTrashedNotes.length
      })
      console.log('✅ 回收站列表已更新，笔记已从显示中移除')
      
      // 然后重新加载回收站列表（从本地和云端），确保数据完整
      await this.loadTrashedNotes()
      
      // 根据恢复结果显示不同的提示
      let successMessage = '恢复成功'
      if (serverRestoreSuccess) {
        successMessage = '恢复成功（已同步云端）'
      } else if (hasValidServerId) {
        successMessage = '恢复成功（云端不可用，已本地恢复）'
      } else {
        successMessage = '恢复成功（笔记未同步，仅本地恢复）'
      }
      
      wx.showToast({
        title: successMessage,
        icon: 'success',
        duration: 2000
      })
    } catch (error) {
      console.error('恢复失败:', error)
      wx.showToast({
        title: '恢复失败',
        icon: 'none'
      })
    }
  },

  // 彻底删除
  permanentDelete(e) {
    const noteId = e.currentTarget.dataset.id
    const note = this.data.trashedNotes.find(n => n.id === noteId)
    
    if (!note) return
    
    wx.showModal({
      title: '彻底删除',
      content: `确定要彻底删除"${note.title}"吗？此操作不可恢复！`,
      confirmColor: '#e53e3e',
      confirmText: '彻底删除',
      success: (res) => {
        if (res.confirm) {
          this.confirmPermanentDelete(noteId)
        }
      }
    })
  },

  // 确认彻底删除
  async confirmPermanentDelete(noteId) {
    try {
      // 获取当前用户
      const userInfo = wx.getStorageSync('userInfo')
      if (!userInfo || !userInfo.username) {
        wx.showToast({
          title: '请先登录',
          icon: 'none'
        })
        return
      }
      
      // 方案1：立即从本地缓存移除对应回收站项（优先使用，快速响应）
      const result = noteManager.permanentDeleteNote(userInfo.username, noteId)
      if (result.success) {
        console.log('✅ 笔记已从本地回收站缓存移除')
      }
      
      // 服务器优先彻底删除
      let serverDeleteSuccess = false
      const note = this.data.trashedNotes.find(n => n.id === noteId)
      
      // 如果有serverId，尝试从服务器删除
      if (note && (note.serverId || noteId) && userInfo.token) {
        try {
          const serverId = note.serverId || noteId
          console.log('📤 同步彻底删除操作到云端服务器:', serverId)
          const resp = await apiService.permanentDeleteNote(serverId)
          
          if (resp && resp.success) {
            serverDeleteSuccess = true
            console.log('✅ 服务器彻底删除成功')
          } else {
            // 检查是否是"笔记不存在"错误（这实际上表示删除成功）
            const errorMsg = (resp && resp.error) || (resp && resp.message) || ''
            const isNotFoundError = errorMsg.includes('不存在') || 
                                   errorMsg.includes('not found') || 
                                   errorMsg.includes('找不到') ||
                                   (resp && resp.statusCode === 404)
            
            if (isNotFoundError) {
              // 笔记不存在 = 删除成功（因为目标就是让它不存在）
              serverDeleteSuccess = true
              console.log('✅ 笔记在服务器上不存在（视为删除成功）')
            } else {
              console.warn('⚠️ 服务器删除失败，但本地已删除:', errorMsg)
            }
          }
        } catch (serverError) {
          // 检查错误类型
          const errorMsg = serverError.message || serverError.error || ''
          const isNotFoundError = errorMsg.includes('不存在') || 
                                 errorMsg.includes('not found') || 
                                 errorMsg.includes('找不到') ||
                                 (serverError.statusCode === 404)
          
          if (isNotFoundError) {
            // 笔记不存在 = 删除成功
            serverDeleteSuccess = true
            console.log('✅ 笔记在服务器上不存在（视为删除成功）')
          } else {
            console.warn('⚠️ 服务器删除异常，但本地已删除:', errorMsg)
          }
        }
      } else {
        console.log('📱 无serverId或无Token，仅本地删除')
      }
      
      // 如果服务器删除成功，尝试从服务器刷新数据（但接口可能不存在，会静默失败）
      if (serverDeleteSuccess && !this._serverTrashApiUnavailable) {
        try {
          console.log('📥 删除成功后尝试从服务器刷新回收站列表...')
          const refreshResult = await apiService.getTrashNotes()
          if (refreshResult && refreshResult.success) {
            const serverNotes = (refreshResult.data && refreshResult.data.notes) ? 
              refreshResult.data.notes : (refreshResult.data || [])
            
            // 将服务器数据同步到本地存储
            if (Array.isArray(serverNotes)) {
              const storageKey = noteManager.getTrashStorageKey(userInfo.username)
              wx.setStorageSync(storageKey, serverNotes)
              console.log('✅ 以服务器最新回收站数据覆盖本地，确保删除与服务器一致')
            }
          }
        } catch (refreshError) {
          // 静默处理，避免日志噪音
          const is404 = refreshError.message && refreshError.message.includes('404')
          if (!is404) {
            console.warn('⚠️ 刷新服务器回收站失败，使用本地删除结果')
          }
        }
      }
      
      // 重新加载回收站列表（优先从本地缓存读取，确保UI立即更新）
      await this.loadTrashedNotes()
      
      wx.showToast({
        title: serverDeleteSuccess ? '已彻底删除' : '已删除（本地）',
        icon: 'success'
      })
    } catch (error) {
      console.error('彻底删除失败:', error)
      wx.showToast({
        title: '删除失败',
        icon: 'none'
      })
    }
  },

  // 清空回收站
  emptyTrash() {
    if (this.data.trashedNotes.length === 0) {
      wx.showToast({
        title: '回收站已经是空的',
        icon: 'none'
      })
      return
    }
    
    wx.showModal({
      title: '清空回收站',
      content: `确定要清空回收站的所有 ${this.data.trashedNotes.length} 条笔记吗？此操作不可恢复！`,
      confirmColor: '#e53e3e',
      confirmText: '清空',
      success: (res) => {
        if (res.confirm) {
          this.confirmEmptyTrash()
        }
      }
    })
  },

  // 确认清空回收站
  confirmEmptyTrash() {
    try {
      const userInfo = wx.getStorageSync('userInfo')
      const result = noteManager.emptyTrash(userInfo.username)
      
      if (result.success) {
        this.loadTrashedNotes()
        
        wx.showToast({
          title: '回收站已清空',
          icon: 'success'
        })
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('清空回收站失败:', error)
      wx.showToast({
        title: '操作失败',
        icon: 'none'
      })
    }
  },

  // 切换批量模式
  toggleBatchMode() {
    this.setData({
      isBatchMode: !this.data.isBatchMode,
      selectedNotes: []
    })
  },

  // 切换笔记选择
  toggleNoteSelection(e) {
    const noteId = e.currentTarget.dataset.id
    const note = this.data.trashedNotes.find(n => n.id === noteId)
    
    if (!note) return
    
    const selectedNotes = [...this.data.selectedNotes]
    const index = selectedNotes.findIndex(n => n.id === noteId)
    
    if (index > -1) {
      selectedNotes.splice(index, 1)
    } else {
      selectedNotes.push(note)
    }
    
    this.setData({
      selectedNotes: selectedNotes
    })
    
    // 重新应用筛选以更新isSelected状态
    this.applyFilters()
  },

  // 批量恢复
  batchRestore() {
    if (this.data.selectedNotes.length === 0) {
      wx.showToast({
        title: '请先选择笔记',
        icon: 'none'
      })
      return
    }
    
    wx.showModal({
      title: '批量恢复',
      content: `确定要恢复选中的 ${this.data.selectedNotes.length} 条笔记吗？`,
      confirmColor: '#C0D3E2',
      success: (res) => {
        if (res.confirm) {
          this.confirmBatchRestore()
        }
      }
    })
  },

  // 确认批量恢复
  confirmBatchRestore() {
    try {
      const userInfo = wx.getStorageSync('userInfo')
      let successCount = 0
      
      this.data.selectedNotes.forEach(note => {
        const result = noteManager.restoreNote(userInfo.username, note.id)
        if (result.success) {
          successCount++
        }
      })
      
      // 重新加载
      this.loadTrashedNotes()
      
      // 退出批量模式
      this.setData({
        isBatchMode: false,
        selectedNotes: []
      })
      
      wx.showToast({
        title: `已恢复 ${successCount} 条笔记`,
        icon: 'success'
      })
    } catch (error) {
      console.error('批量恢复失败:', error)
      wx.showToast({
        title: '操作失败',
        icon: 'none'
      })
    }
  },

  // 批量彻底删除
  batchPermanentDelete() {
    if (this.data.selectedNotes.length === 0) {
      wx.showToast({
        title: '请先选择笔记',
        icon: 'none'
      })
      return
    }
    
    wx.showModal({
      title: '批量彻底删除',
      content: `确定要彻底删除选中的 ${this.data.selectedNotes.length} 条笔记吗？此操作不可恢复！`,
      confirmColor: '#e53e3e',
      confirmText: '彻底删除',
      success: (res) => {
        if (res.confirm) {
          this.confirmBatchPermanentDelete()
        }
      }
    })
  },

  // 确认批量彻底删除
  async confirmBatchPermanentDelete() {
    try {
      const userInfo = wx.getStorageSync('userInfo')
      if (!userInfo || !userInfo.username) {
        wx.showToast({
          title: '请先登录',
          icon: 'none'
        })
        return
      }
      
      let localDeleteCount = 0
      let serverDeleteCount = 0
      
      // 方案1：立即从本地缓存移除对应回收站项（优先使用，快速响应）
      this.data.selectedNotes.forEach(note => {
        const result = noteManager.permanentDeleteNote(userInfo.username, note.id)
        if (result.success) {
          localDeleteCount++
        }
      })
      console.log(`✅ ${localDeleteCount} 条笔记已从本地回收站缓存移除`)
      
      // 方案2：尝试从服务器彻底删除（如果有的话）
      for (const note of this.data.selectedNotes) {
        if (note.serverId || note.id) {
          try {
            const resp = await apiService.permanentDeleteNote(note.serverId || note.id)
            if (resp && resp.success) {
              serverDeleteCount++
              console.log(`✅ 服务器彻底删除成功: ${note.title}`)
            }
          } catch (error) {
            console.warn(`⚠️ 服务器删除失败: ${note.title} - ${error.message}`)
            // 继续处理其他笔记
          }
        }
      }
      
      // 如果存在服务器删除成功的笔记，尝试从服务器刷新列表（但接口可能不存在）
      if (serverDeleteCount > 0) {
        try {
          console.log('📥 批量删除后尝试从服务器刷新回收站列表...')
          const refreshResult = await apiService.getTrashNotes()
          if (refreshResult && refreshResult.success) {
            const serverNotes = (refreshResult.data && refreshResult.data.notes) ? 
              refreshResult.data.notes : (refreshResult.data || [])
            
            // 将服务器数据同步到本地存储
            if (Array.isArray(serverNotes)) {
              const storageKey = noteManager.getTrashStorageKey(userInfo.username)
              wx.setStorageSync(storageKey, serverNotes)
              console.log('✅ 以服务器最新回收站数据覆盖本地，确保删除与服务器一致')
            }
          }
        } catch (refreshError) {
          console.warn('⚠️ 刷新服务器回收站失败（接口可能不存在），使用本地删除结果:', refreshError && refreshError.message)
          // 本地删除已完成，保持当前状态
        }
      }
      
      // 重新加载回收站列表（优先从本地缓存读取，确保UI立即更新）
      await this.loadTrashedNotes()
      
      // 退出批量模式
      this.setData({
        isBatchMode: false,
        selectedNotes: []
      })
      
      // 显示删除结果
      let message = `已删除 ${localDeleteCount} 条笔记`
      if (serverDeleteCount > 0) {
        message += `（服务器 ${serverDeleteCount} 条）`
      }
      if (serverDeleteCount < localDeleteCount) {
        message += `（本地 ${localDeleteCount} 条）`
      }
      
      wx.showToast({
        title: message,
        icon: 'success',
        duration: 3000
      })
    } catch (error) {
      console.error('批量删除失败:', error)
      wx.showToast({
        title: '操作失败',
        icon: 'none'
      })
    }
  },

  // 返回上一页
  goBack() {
    wx.navigateBack()
  },

  // 获取分类名称
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
  },

  // 获取删除天数
  getDaysInTrash(deleteTime) {
    if (!deleteTime) return 0
    
    const now = new Date()
    const deleted = new Date(deleteTime)
    const diffTime = Math.abs(now - deleted)
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    return diffDays
  },

  // 获取剩余天数
  getRemainingDays(deleteTime) {
    const daysInTrash = this.getDaysInTrash(deleteTime)
    const remaining = this.data.autoDeleteDays - daysInTrash
    return remaining > 0 ? remaining : 0
  }
})

