// pages/my-notes/my-notes.js
const noteManager = require('../../utils/noteManager')
const apiService = require('../../utils/apiService')
const TagProcessor = require('../../utils/tagProcessor')

Page({
  data: {
    // 基础数据
    allNotes: [],
    filteredNotes: [],
    statistics: {
      totalNotes: 0,
      totalWords: 0,
      totalCategories: 0,
      totalTags: 0
    },
    
    // 视图模式
    viewMode: 'list', // list | grid
    
    // 搜索和筛选
    searchKeyword: '',
    selectedCategory: '',
    selectedTags: [],
    sortIndex: 0,
    sortOptions: ['最近更新', '创建时间', '标题', '字数'],
    startDate: '',
    endDate: '',
    
    // 热门标签
    popularTags: [],
    
    // 批量操作
    isBatchMode: false,
    selectedNotes: []
  },

  onLoad(options) {
    console.log('我的笔记页面加载')
    this.loadAllData()
  },

  onShow() {
    // 每次显示页面时重新加载数据
    this.loadAllData()
  },

  onPullDownRefresh() {
    // 下拉刷新
    this.loadAllData()
    wx.stopPullDownRefresh()
  },

  onReachBottom() {
    // 上拉加载更多（如果需要分页）
    console.log('到达底部')
  },

  // 加载所有数据（从API服务器）
  async loadAllData() {
    try {
      console.log('开始加载笔记数据...')
      
      // 优先从云端同步最新数据，确保与云端服务器一致
      console.log('📥 开始从云端同步最新笔记数据...')
      const cachedNotes = await this.loadNotesFromCurrentAccount(true) // 强制从云端同步
      
      if (cachedNotes && cachedNotes.length > 0) {
        const statistics = this.calculateStatistics(cachedNotes)
        const popularTags = noteManager.getPopularTags(10)
        
        this.setData({
          allNotes: cachedNotes,
          filteredNotes: cachedNotes,
          statistics: statistics,
          popularTags: popularTags
        })
        console.log('📦 显示云端同步的数据:', cachedNotes.length, '条')
      } else {
        console.log('📝 没有笔记数据')
        this.setData({
          allNotes: [],
          filteredNotes: [],
          statistics: this.calculateStatistics([]),
          popularTags: []
        })
      }
      
      // ========== 备用方案：直接从API服务器加载（如果云端同步失败） ==========
      try {
        const userInfo = wx.getStorageSync('userInfo')
        if (userInfo && userInfo.token) {
          console.log('📥 备用：直接从API服务器加载笔记...')
          
          const result = await apiService.getNotes({ page: 1, limit: 1000 })
          
          if (result.success && result.data.notes) {
            const serverNotes = result.data.notes
            console.log(`✅ 从服务器加载了 ${serverNotes.length} 条笔记`)
            
            // 处理服务器数据，确保字段完整性
            const processedNotes = serverNotes.map(note => {
              // 处理source字段：将null转换为空字符串，trim去除空白
              const sourceValue = note.source ? String(note.source).trim() : ''
              // 计算来源标签并与常规标签去重合并
              const sourceTags = TagProcessor.processSourceTags(sourceValue)
              const mergedTags = TagProcessor.mergeTags(note.tags || [], sourceTags)
              
              console.log('处理服务器笔记数据:', {
                id: note.id,
                title: note.title,
                tags: note.tags,
                source: note.source,
                sourceProcessed: sourceValue,
                category: note.category
              })
              
              return {
                id: note.id, // 服务器ID作为本地ID
                serverId: note.id, // 服务器ID
                title: note.title || '',
                content: note.content || '',
                category: note.category || 'knowledge',
                tags: mergedTags, // 使用合并去重后的标签
                sourceTags: sourceTags, // 单独保存来源标签用于渲染着色
                source: sourceValue, // 处理后的source（去除了null和空白）
                url: note.url || '',
                images: note.images || [],
                voices: note.voices || [],
                categoryTag: note.categoryTag || note.category_tag || '',
                createTime: note.createTime || note.created_at || '',
                updateTime: note.updateTime || note.updated_at || '',
                wordCount: note.wordCount || note.word_count || 0,
                isFavorite: note.isFavorite || false,
                favoriteTime: note.favoriteTime || null,
                status: note.status || 'active'
              }
            })
            
            // 检查哪些笔记有source
            const notesWithSource = processedNotes.filter(n => n.source && n.source.trim())
            console.log(`📌 有来源的笔记数量: ${notesWithSource.length} / ${processedNotes.length}`)
            if (notesWithSource.length > 0) {
              console.log('有来源的笔记:', notesWithSource.map(n => ({ id: n.id, title: n.title, source: n.source })))
            }
            
            console.log('处理后的笔记数据示例:', processedNotes[0])
            
            // 保存到本地缓存
            wx.setStorageSync('notes', processedNotes)
            
            // 保存到账户存储
            if (userInfo.username) {
              noteManager.saveNotesToAccount(userInfo.username, processedNotes)
            }
            
            // 更新显示
            const statistics = this.calculateStatistics(processedNotes)
            const popularTags = noteManager.getPopularTags(10)
            
            this.setData({
              allNotes: processedNotes,
              filteredNotes: processedNotes,
              statistics: statistics,
              popularTags: popularTags
            })
            
            console.log('服务器数据已更新到页面')
          }
        } else {
          console.log('未登录或无Token，使用本地数据')
        }
      } catch (apiError) {
        console.error('❌ 从服务器加载失败:', apiError)
        // API加载失败，继续使用本地缓存数据
        wx.showToast({
          title: '使用缓存数据',
          icon: 'none',
          duration: 1000
        })
      }
      // ========== API加载结束 ==========
      
    } catch (error) {
      console.error('加载数据失败:', error)
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    }
  },

  // 从当前登录账户加载笔记（优先从云端同步）
  async loadNotesFromCurrentAccount(forceSyncFromCloud = true) {
    try {
      // 获取当前用户信息
      const userInfo = wx.getStorageSync('userInfo')
      if (!userInfo || !userInfo.username) {
        console.log('未找到用户信息，使用全局存储')
        return noteManager.getAllNotes()
      }
      
      const accountName = userInfo.username
      console.log('从账户加载笔记（优先从云端同步）:', accountName)
      
      // 优先从云端同步最新数据，确保与云端服务器一致
      const accountResult = await noteManager.getNotesFromAccountWithSync(accountName, forceSyncFromCloud)
      
      if (accountResult.success && accountResult.notes.length > 0) {
        console.log(`从账户 ${accountName} 加载了 ${accountResult.notes.length} 条笔记`)
        
        // 过滤掉已删除的笔记（只显示正常笔记）
        const activeNotes = accountResult.notes.filter(note => note.status !== 'deleted')
        console.log(`过滤后的笔记数量: ${activeNotes.length}`)
        
        // 将账户数据同步到全局存储，确保其他页面也能访问
        wx.setStorageSync('notes', activeNotes)
        
        // 更新标签统计
        noteManager.updateAllTagStatistics()
        
        return activeNotes
      } else {
        console.log('账户中没有笔记数据，返回空数组')
        
        // 账户中没有数据，清空全局存储，返回空数组
        wx.setStorageSync('notes', [])
        wx.setStorageSync('noteTags', [])
        
        console.log('已清空全局存储')
        
        return []
      }
    } catch (error) {
      console.error('从账户加载笔记失败:', error)
      // 出错时尝试从本地加载（降级方案）
      try {
        const userInfo = wx.getStorageSync('userInfo')
        if (userInfo && userInfo.username) {
          const accountResult = noteManager.getNotesFromAccount(userInfo.username)
          if (accountResult.success) {
            return accountResult.notes.filter(note => note.status !== 'deleted')
          }
        }
      } catch (fallbackError) {
        console.error('本地加载也失败:', fallbackError)
      }
      return []
    }
  },

  // 基于实际笔记数据计算统计信息
  calculateStatistics(notes) {
    const totalNotes = notes.length
    const totalWords = notes.reduce((sum, note) => sum + (note.wordCount || 0), 0)
    
    // 计算分类数量
    const categories = new Set()
    notes.forEach(note => {
      if (note.category) {
        categories.add(note.category)
      }
    })
    
    // 计算标签数量
    const tags = new Set()
    notes.forEach(note => {
      if (note.tags && Array.isArray(note.tags)) {
        note.tags.forEach(tag => tags.add(tag))
      }
    })
    
    return {
      totalNotes: totalNotes,
      totalWords: totalWords,
      totalCategories: categories.size,
      totalTags: tags.size
    }
  },

  // 返回上一页
  goBack() {
    console.log('=== 我的笔记页面返回按钮被点击 ===')
    
    // 检查页面栈
    const pages = getCurrentPages()
    console.log('当前页面栈长度:', pages.length)
    
    if (pages.length > 1) {
      // 有上一页，可以返回
      wx.navigateBack({
        success: () => {
          console.log('返回成功')
        },
        fail: (error) => {
          console.error('返回失败:', error)
          // 如果返回失败，跳转到"我的"页面
          this.goToMyPage()
        }
      })
    } else {
      // 没有上一页，跳转到"我的"页面
      console.log('没有上一页，跳转到我的页面')
      this.goToMyPage()
    }
  },

  // 跳转到"我的"页面
  goToMyPage() {
    try {
      // 跳转到"我的"页面（tabBar页面）
      wx.switchTab({
        url: '/pages/2/2',
        success: () => {
          console.log('成功跳转到我的页面')
        },
        fail: (error) => {
          console.error('跳转到我的页面失败:', error)
          wx.showToast({
            title: '跳转失败',
            icon: 'none'
          })
        }
      })
    } catch (error) {
      console.error('跳转我的页面失败:', error)
      wx.showToast({
        title: '返回失败',
        icon: 'none'
      })
    }
  },

  // 切换视图模式
  toggleViewMode() {
    const newMode = this.data.viewMode === 'list' ? 'grid' : 'list'
    this.setData({
      viewMode: newMode
    })
    
    // 保存用户偏好
    wx.setStorageSync('noteViewMode', newMode)
  },

  // 搜索输入
  onSearchInput(e) {
    const keyword = e.detail.value
    console.log('搜索关键词:', keyword)
    this.setData({
      searchKeyword: keyword
    })
    
    // 实时搜索
    this.filterNotes()
  },

  // 执行搜索
  performSearch() {
    console.log('手动触发搜索')
    this.filterNotes()
    
    // 显示搜索结果提示
    const resultCount = this.data.filteredNotes.length
    if (this.data.searchKeyword.trim()) {
      wx.showToast({
        title: `找到 ${resultCount} 条结果`,
        icon: resultCount > 0 ? 'success' : 'none',
        duration: 1500
      })
    }
  },

  // 按分类筛选
  filterByCategory(e) {
    const category = e.currentTarget.dataset.category
    this.setData({
      selectedCategory: category
    })
    
    this.filterNotes()
  },

  // 切换标签筛选
  toggleTagFilter(e) {
    const tag = e.currentTarget.dataset.tag
    const selectedTags = [...this.data.selectedTags]
    const index = selectedTags.indexOf(tag)
    
    if (index > -1) {
      selectedTags.splice(index, 1)
    } else {
      selectedTags.push(tag)
    }
    
    this.setData({
      selectedTags: selectedTags
    })
    
    this.filterNotes()
  },

  // 排序方式改变
  onSortChange(e) {
    const index = e.detail.value
    this.setData({
      sortIndex: index
    })
    
    this.filterNotes()
  },

  // 开始日期改变
  onStartDateChange(e) {
    const date = e.detail.value
    this.setData({
      startDate: date
    })
    
    this.filterNotes()
  },

  // 结束日期改变
  onEndDateChange(e) {
    const date = e.detail.value
    this.setData({
      endDate: date
    })
    
    this.filterNotes()
  },

  // 筛选笔记
  filterNotes() {
    const {
      searchKeyword,
      selectedCategory,
      selectedTags,
      sortIndex,
      startDate,
      endDate,
      allNotes
    } = this.data

    console.log('开始筛选:', {
      searchKeyword,
      selectedCategory,
      selectedTags,
      startDate,
      endDate,
      allNotesCount: allNotes.length
    })

    // 构建搜索选项
    const searchOptions = {
      category: selectedCategory || null,
      tags: selectedTags.length > 0 ? selectedTags : null,
      sortBy: this.getSortBy(sortIndex),
      sortOrder: 'desc'
    }

    // 添加日期范围
    if (startDate || endDate) {
      const dateRange = {}
      
      if (startDate) {
        dateRange.start = new Date(startDate)
      }
      
      if (endDate) {
        dateRange.end = new Date(endDate)
        // 设置结束时间为当天的23:59:59
        dateRange.end.setHours(23, 59, 59, 999)
      }
      
      searchOptions.dateRange = dateRange
    }

    console.log('搜索选项:', searchOptions)

    // 执行搜索
    const filteredNotes = noteManager.searchNotes(searchKeyword, searchOptions)
    
    console.log('搜索结果:', {
      keyword: searchKeyword,
      category: selectedCategory,
      tags: selectedTags,
      resultCount: filteredNotes.length,
      results: filteredNotes.map(note => ({ id: note.id, title: note.title }))
    })
    
    // 更新筛选后的笔记，但保持原始统计数据
    this.setData({
      filteredNotes: filteredNotes
    })
    
    // 如果需要显示筛选后的统计，可以取消注释下面的代码
    // const filteredStatistics = this.calculateStatistics(filteredNotes)
    // this.setData({
    //   statistics: filteredStatistics
    // })
  },

  // 获取排序字段
  getSortBy(index) {
    const sortMap = ['updateTime', 'createTime', 'title', 'wordCount']
    return sortMap[index] || 'updateTime'
  },

  // 获取分类名称
  getCategoryName(category) {
    return noteManager.getCategoryName(category)
  },

  // 获取空状态文本
  getEmptyStateText() {
    const { searchKeyword, selectedCategory, selectedTags } = this.data
    
    if (searchKeyword) {
      return `没有找到包含"${searchKeyword}"的笔记`
    }
    
    if (selectedCategory) {
      return `没有${this.getCategoryName(selectedCategory)}分类的笔记`
    }
    
    if (selectedTags.length > 0) {
      return `没有包含标签"${selectedTags.join('、')}"的笔记`
    }
    
    return '还没有笔记，去创建第一条吧！'
  },

  // 打开笔记详情
  openNote(e) {
    if (this.data.isBatchMode) {
      // 批量模式：选择/取消选择笔记
      this.toggleNoteSelection(e.currentTarget.dataset.note)
      return
    }
    
    const note = e.currentTarget.dataset.note
    wx.navigateTo({
      url: `/pages/note-detail/note-detail?id=${note.id}`
    })
  },

  // 切换笔记选择状态
  toggleNoteSelection(note) {
    const selectedNotes = [...this.data.selectedNotes]
    const index = selectedNotes.findIndex(n => n.id === note.id)
    
    if (index > -1) {
      selectedNotes.splice(index, 1)
    } else {
      selectedNotes.push(note)
    }
    
    this.setData({
      selectedNotes: selectedNotes
    })
  },

  // 编辑笔记
  editNote(e) {
    console.log('=== 编辑按钮被点击 ===')
    console.log('事件对象:', e)
    
    const note = e.currentTarget.dataset.note
    console.log('要编辑的笔记:', note)
    
    if (!note) {
      console.error('笔记数据为空')
      wx.showToast({
        title: '笔记数据无效',
        icon: 'none'
      })
      return
    }
    
    // 将选中的常规笔记复制为一条草稿，进入草稿编辑流程
    try {
      // 读取当前账户草稿列表
      const userInfo = wx.getStorageSync('userInfo') || {}
      const accountName = userInfo.username || 'default'
      let drafts = require('../../utils/noteManager').getAccountStorage('drafts', []) || []

      // 查找是否已有该笔记对应的草稿（通过 originalNoteId 关联）
      let existingDraft = drafts.find(d => d.originalNoteId === note.id)

      const nowIso = new Date().toISOString()
      let draftId

      if (existingDraft) {
        // 更新已有草稿内容
        draftId = existingDraft.id
        existingDraft.title = note.title
        existingDraft.content = note.content
        existingDraft.category = note.category
        existingDraft.tags = note.tags || []
        existingDraft.source = note.source || ''
        existingDraft.url = note.url || ''
        existingDraft.images = note.images || []
        existingDraft.voices = note.voices || []
        existingDraft.updateTime = nowIso
      } else {
        // 创建新草稿
        draftId = `d_${note.id}_${Date.now()}`
        const newDraft = {
          id: draftId,
          originalNoteId: note.id,
          title: note.title,
          content: note.content,
          category: note.category,
          tags: note.tags || [],
          source: note.source || '',
          url: note.url || '',
          images: note.images || [],
          voices: note.voices || [],
          isDraft: true,
          status: 'draft',
          createTime: nowIso,
          updateTime: nowIso,
          account: accountName
        }
        drafts.unshift(newDraft)
      }

      // 保存草稿列表到账户存储
      require('../../utils/noteManager').setAccountStorage('drafts', drafts)

      // 在本地存储标记本次编辑为草稿编辑模式
      wx.setStorageSync('editDraftData', { mode: 'draft', draftId })

      console.log('准备跳转到编辑器（草稿编辑模式）:', { draftId, originalNoteId: note.id })
    } catch (err) {
      console.error('创建草稿失败:', err)
      wx.showToast({ title: '创建草稿失败', icon: 'none' })
      return
    }

    // 使用switchTab跳转到编辑器页面（编辑器会在 onShow 中读取 editDraftData 并加载草稿）
    wx.switchTab({
      url: '/pages/note-editor/note-editor',
      success: (res) => {
        console.log('跳转到编辑器成功:', res)
      },
      fail: (error) => {
        console.error('跳转到编辑器失败:', error)
        wx.showToast({
          title: '跳转失败: ' + (error.errMsg || '未知错误'),
          icon: 'none',
          duration: 3000
        })
      }
    })
  },

  // 分享笔记
  shareNote(e) {
    const note = e.currentTarget.dataset.note
    
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline']
    })
    
    // 可以在这里设置分享内容
    wx.setNavigationBarTitle({
      title: `分享笔记：${note.title}`
    })
  },

  // 删除笔记
  deleteNote(e) {
    console.log('=== 删除按钮被点击 ===')
    console.log('事件对象:', e)
    
    const noteId = e.currentTarget.dataset.id
    console.log('笔记ID:', noteId)
    
    if (!noteId) {
      console.error('笔记ID为空')
      wx.showToast({
        title: '笔记ID无效',
        icon: 'none'
      })
      return
    }
    
    const note = this.data.filteredNotes.find(n => n.id === noteId)
    console.log('找到的笔记:', note)
    
    if (!note) {
      console.error('笔记不存在')
      wx.showToast({
        title: '笔记不存在',
        icon: 'none'
      })
      return
    }
    
    console.log('准备显示删除确认对话框')
    wx.showModal({
      title: '删除笔记',
      content: `确定要删除"${note.title}"吗？\n\n笔记将移到回收站，30天后将自动清理。`,
      confirmColor: '#C0D3E2',
      confirmText: '删除', // 改为4个字符以内
      cancelText: '取消',
      success: (res) => {
        console.log('删除确认对话框结果:', res)
        if (res.confirm) {
          console.log('用户确认删除，调用confirmDeleteNote')
          this.confirmDeleteNote(noteId)
        } else {
          console.log('用户取消删除')
        }
      },
      fail: (error) => {
        console.error('显示删除确认对话框失败:', error)
        wx.showToast({
          title: '显示对话框失败',
          icon: 'none'
        })
      }
    })
  },

  // 确认删除笔记（真删除：从笔记簿完全移除，移到回收站）
  async confirmDeleteNote(noteId) {
    try {
      console.log('开始删除笔记（真删除）:', noteId)
      
      // 获取当前用户
      const userInfo = wx.getStorageSync('userInfo')
      console.log('用户信息:', userInfo)
      
      if (!userInfo || !userInfo.username) {
        console.error('用户未登录')
        wx.showToast({
          title: '请先登录',
          icon: 'none'
        })
        return
      }
      
      // 检查笔记是否存在
      const note = this.data.filteredNotes.find(n => n.id === noteId)
      if (!note) {
        console.error('笔记不存在:', noteId)
        wx.showToast({
          title: '笔记不存在',
          icon: 'none'
        })
        return
      }
      
      console.log('找到要删除的笔记:', note.title)
      
      // ========== 步骤1：先将笔记保存到回收站 ==========
      console.log('📦 先将笔记保存到本地回收站...')
      const saveToTrashResult = noteManager.softDeleteNote(userInfo.username, noteId)
      
      if (!saveToTrashResult.success) {
        console.error('❌ 保存到回收站失败:', saveToTrashResult.error)
        wx.showToast({
          title: '保存到回收站失败',
          icon: 'none'
        })
        return
      }
      console.log('✅ 笔记已保存到本地回收站')
      
      // ========== 步骤2：调用后端API进行硬删除 ==========
      let serverDeleteSuccess = false
      if (userInfo.token && note.serverId) {
        console.log('📤 调用后端API硬删除笔记:', note.serverId)
        const response = await apiService.deleteNote(note.serverId)
        console.log('后端硬删除结果:', response)
        
        if (response.success) {
          serverDeleteSuccess = true
          console.log('✅ 后端硬删除成功')
        } else {
          // 检查是否是404错误（笔记不存在）
          if (response.statusCode === 404) {
            console.log('⚠️ 笔记在服务器上不存在，但已保存到本地回收站')
          } else {
            console.warn('⚠️ 后端硬删除失败，但已保存到本地回收站:', response.error)
          }
        }
      } else {
        console.log('⚠️ 无Token或无serverId，仅保存到本地回收站')
      }
      
      // ========== 步骤3：从笔记列表中移除 ==========
      console.log('立即更新本地显示...')
      this.removeNoteFromLocalDisplay(noteId)
      
      // ========== 步骤4：删除成功后，立即从云端刷新最新数据，确保与云端一致 ==========
      if (serverDeleteSuccess) {
        try {
          console.log('📥 删除成功后刷新云端数据...')
          await noteManager.syncNotesFromCloud(userInfo.username)
          console.log('✅ 云端数据已刷新到本地，确保一致性')
          // 重新加载笔记列表
          await this.loadAllData()
        } catch (syncError) {
          console.warn('⚠️ 刷新云端数据失败（不影响删除）:', syncError.message)
        }
      }
      
      wx.showToast({
        title: '笔记已移至回收站，30天后将自动清理',
        icon: 'success',
        duration: 3000
      })
    } catch (error) {
      console.error('删除笔记失败:', error)
      wx.showToast({
        title: `删除失败: ${error.message}`,
        icon: 'none',
        duration: 3000
      })
    }
  },

  // 从本地显示中立即移除笔记（不等待API）
  removeNoteFromLocalDisplay(noteId) {
    try {
      console.log('开始从本地显示移除笔记:', noteId)
      
      // 获取当前用户信息
      const userInfo = wx.getStorageSync('userInfo')
      if (!userInfo || !userInfo.username) {
        console.error('用户未登录，无法更新本地存储')
        return
      }
      
      // 1. 从页面数据中移除
      const allNotes = this.data.allNotes.filter(n => n.id !== noteId)
      const filteredNotes = this.data.filteredNotes.filter(n => n.id !== noteId)
      
      // 2. 从本地存储中移除
      // 更新全局存储
      wx.setStorageSync('notes', allNotes)
      
      // 更新账户存储
      const accountResult = noteManager.getNotesFromAccount(userInfo.username)
      if (accountResult.success) {
        const updatedAccountNotes = accountResult.notes.filter(n => n.id !== noteId)
        noteManager.saveNotesToAccount(userInfo.username, updatedAccountNotes)
        console.log('✅ 已从账户存储中移除笔记')
      }
      
      // 3. 重新计算统计信息
      const statistics = this.calculateStatistics(allNotes)
      const popularTags = noteManager.getPopularTags(10)
      
      // 4. 更新页面显示
      this.setData({
        allNotes: allNotes,
        filteredNotes: filteredNotes,
        statistics: statistics,
        popularTags: popularTags
      })
      
      console.log('✅ 笔记已从本地显示和存储中移除:', noteId)
      console.log('剩余笔记数量:', allNotes.length)
    } catch (error) {
      console.error('移除笔记显示失败:', error)
      // 如果立即移除失败，回退到重新加载
      this.updateLocalDisplay()
    }
  },

  // 从本地显示中移除选中的笔记（批量删除）
  removeSelectedNotesFromLocalDisplay() {
    try {
      console.log('开始从本地显示移除选中的笔记')
      
      // 获取当前用户信息
      const userInfo = wx.getStorageSync('userInfo')
      if (!userInfo || !userInfo.username) {
        console.error('用户未登录，无法更新本地存储')
        return
      }
      
      // 获取要删除的笔记ID列表
      const selectedNoteIds = this.data.selectedNotes.map(note => note.id)
      console.log('要删除的笔记ID列表:', selectedNoteIds)
      
      // 1. 从页面数据中移除
      const allNotes = this.data.allNotes.filter(n => !selectedNoteIds.includes(n.id))
      const filteredNotes = this.data.filteredNotes.filter(n => !selectedNoteIds.includes(n.id))
      
      // 2. 从本地存储中移除
      // 更新全局存储
      wx.setStorageSync('notes', allNotes)
      
      // 更新账户存储
      const accountResult = noteManager.getNotesFromAccount(userInfo.username)
      if (accountResult.success) {
        const updatedAccountNotes = accountResult.notes.filter(n => !selectedNoteIds.includes(n.id))
        noteManager.saveNotesToAccount(userInfo.username, updatedAccountNotes)
        console.log('✅ 已从账户存储中移除选中的笔记')
      }
      
      // 3. 重新计算统计信息
      const statistics = this.calculateStatistics(allNotes)
      const popularTags = noteManager.getPopularTags(10)
      
      // 4. 更新页面显示
      this.setData({
        allNotes: allNotes,
        filteredNotes: filteredNotes,
        statistics: statistics,
        popularTags: popularTags
      })
      
      console.log('✅ 选中的笔记已从本地显示和存储中移除')
      console.log('剩余笔记数量:', allNotes.length)
    } catch (error) {
      console.error('移除选中笔记显示失败:', error)
      // 如果立即移除失败，回退到重新加载
      this.updateLocalDisplay()
    }
  },

  // 更新本地显示（删除后立即更新，尝试从API重新加载以获取完整数据）
  async updateLocalDisplay() {
    try {
      console.log('更新本地显示...')
      
      // 先尝试从API重新加载最新数据，确保包含所有新字段
      try {
        const userInfo = wx.getStorageSync('userInfo')
        if (userInfo && userInfo.token) {
          console.log('📥 从API重新加载最新数据...')
          
          const result = await apiService.getNotes({ page: 1, limit: 1000 })
          
          if (result.success && result.data.notes) {
            console.log(`✅ 从API加载了 ${result.data.notes.length} 条笔记`)
            
            // 处理服务器数据
            const processedNotes = result.data.notes.map(note => {
              // 处理source字段：将null转换为空字符串，trim去除空白
              const sourceValue = note.source ? String(note.source).trim() : ''
              // 计算来源标签并与常规标签去重合并
              const sourceTags = TagProcessor.processSourceTags(sourceValue)
              const mergedTags = TagProcessor.mergeTags(note.tags || [], sourceTags)
              
              return {
                id: note.id, // 服务器ID作为本地ID
                serverId: note.id, // 服务器ID
                title: note.title || '',
                content: note.content || '',
                category: note.category || 'knowledge',
                tags: mergedTags,
                sourceTags: sourceTags,
                source: sourceValue, // 处理后的source（去除了null和空白）
                url: note.url || '',
                images: note.images || [],
                voices: note.voices || [],
                categoryTag: note.categoryTag || note.category_tag || '',
                createTime: note.createTime || note.created_at || '',
                updateTime: note.updateTime || note.updated_at || '',
                wordCount: note.wordCount || note.word_count || 0,
                isFavorite: note.isFavorite || false,
                favoriteTime: note.favoriteTime || null,
                status: note.status || 'active'
              }
            })
            
            // 保存到本地缓存
            wx.setStorageSync('notes', processedNotes)
            
            // 保存到账户存储
            if (userInfo.username) {
              noteManager.saveNotesToAccount(userInfo.username, processedNotes)
            }
            
            const statistics = this.calculateStatistics(processedNotes)
            const popularTags = noteManager.getPopularTags(10)
            
            this.setData({
              allNotes: processedNotes,
              filteredNotes: processedNotes,
              statistics: statistics,
              popularTags: popularTags
            })
            
            console.log('✅ 已更新到最新数据')
            return
          }
        }
      } catch (apiError) {
        console.log('API加载失败，使用本地缓存:', apiError)
      }
      
      // 如果API加载失败，使用本地缓存
      const cachedNotes = this.loadNotesFromCurrentAccount()
      
      if (cachedNotes.length > 0) {
        const statistics = this.calculateStatistics(cachedNotes)
        const popularTags = noteManager.getPopularTags(10)
        
        this.setData({
          allNotes: cachedNotes,
          filteredNotes: cachedNotes,
          statistics: statistics,
          popularTags: popularTags
        })
        
        console.log('✅ 本地显示更新成功:', cachedNotes.length, '条笔记')
      } else {
        // 如果没有笔记了，清空显示
        this.setData({
          allNotes: [],
          filteredNotes: [],
          statistics: {
            totalNotes: 0,
            totalWords: 0,
            totalCategories: 0,
            totalTags: 0
          },
          popularTags: []
        })
        
        console.log('✅ 本地显示已清空')
      }
    } catch (error) {
      console.error('更新本地显示失败:', error)
    }
  },

  // 跳转到编辑器
  goToEditor(e) {
    console.log('点击创建笔记按钮，准备跳转到编辑器', e)
    
    // 先显示一个简单的提示，确认点击事件被触发
    wx.showToast({
      title: '准备跳转到编辑器',
      icon: 'none',
      duration: 1000
    })
    
    // 延迟跳转，确保用户看到反馈
    setTimeout(() => {
      // 使用 switchTab 跳转到 tabBar 页面
      wx.switchTab({
        url: '/pages/note-editor/note-editor',
        success: (res) => {
          console.log('跳转成功:', res)
        },
        fail: (err) => {
          console.error('跳转失败:', err)
          wx.showToast({
            title: '跳转失败: ' + (err.errMsg || '未知错误'),
            icon: 'none',
            duration: 3000
          })
        }
      })
    }, 1000)
  },

  // 跳转到知识星图
  goToKnowledgeMap() {
    console.log('跳转到知识星图页面')
    
    wx.navigateTo({
      url: '/pages/knowledge-map/knowledge-map',
      success: (res) => {
        console.log('跳转到知识星图成功:', res)
      },
      fail: (err) => {
        console.error('跳转到知识星图失败:', err)
        wx.showToast({
          title: '跳转失败: ' + (err.errMsg || '未知错误'),
          icon: 'none',
          duration: 3000
        })
      }
    })
  },

  // 显示高级搜索
  showAdvancedSearch() {
    wx.showActionSheet({
      itemList: ['按分类筛选', '按标签筛选', '按时间筛选', '清除所有筛选'],
      success: (res) => {
        switch (res.tapIndex) {
          case 0:
            this.showCategoryFilter()
            break
          case 1:
            this.showTagFilter()
            break
          case 2:
            this.showDateFilter()
            break
          case 3:
            this.clearAllFilters()
            break
        }
      }
    })
  },

  // 显示分类筛选
  showCategoryFilter() {
    const categories = [
      { key: '', name: '全部' },
      { key: 'art', name: '艺术' },
      { key: 'cute', name: '萌物' },
      { key: 'dreams', name: '梦游' },
      { key: 'foods', name: '美食' },
      { key: 'happiness', name: '趣事' },
      { key: 'knowledge', name: '知识' },
      { key: 'sights', name: '风景' },
      { key: 'thinking', name: '思考' }
    ]
    
    const itemList = categories.map(cat => cat.name)
    const currentIndex = categories.findIndex(cat => cat.key === this.data.selectedCategory)
    
    wx.showActionSheet({
      itemList: itemList,
      success: (res) => {
        const selectedCategory = categories[res.tapIndex].key
        this.setData({
          selectedCategory: selectedCategory
        })
        this.filterNotes()
      }
    })
  },

  // 显示标签筛选
  showTagFilter() {
    if (this.data.popularTags.length === 0) {
      wx.showToast({
        title: '暂无标签',
        icon: 'none'
      })
      return
    }
    
    const itemList = this.data.popularTags.map(tag => `#${tag.name} (${tag.count})`)
    
    wx.showActionSheet({
      itemList: itemList,
      success: (res) => {
        const selectedTag = this.data.popularTags[res.tapIndex].name
        const selectedTags = [...this.data.selectedTags]
        
        if (!selectedTags.includes(selectedTag)) {
          selectedTags.push(selectedTag)
          this.setData({
            selectedTags: selectedTags
          })
          this.filterNotes()
        }
      }
    })
  },

  // 显示日期筛选
  showDateFilter() {
    wx.showActionSheet({
      itemList: ['今天', '昨天', '本周', '本月', '最近7天', '最近30天', '清除日期筛选'],
      success: (res) => {
        let startDate = ''
        let endDate = ''
        const today = new Date()
        
        switch (res.tapIndex) {
          case 0: // 今天
            startDate = this.formatDate(today)
            endDate = this.formatDate(today)
            break
          case 1: // 昨天
            const yesterday = new Date()
            yesterday.setDate(yesterday.getDate() - 1)
            startDate = this.formatDate(yesterday)
            endDate = this.formatDate(yesterday)
            break
          case 2: // 本周
            const weekStart = new Date()
            weekStart.setDate(weekStart.getDate() - weekStart.getDay())
            startDate = this.formatDate(weekStart)
            endDate = this.formatDate(today)
            break
          case 3: // 本月
            const monthStart = new Date()
            monthStart.setDate(1)
            startDate = this.formatDate(monthStart)
            endDate = this.formatDate(today)
            break
          case 4: // 最近7天
            const weekAgo = new Date()
            weekAgo.setDate(weekAgo.getDate() - 7)
            startDate = this.formatDate(weekAgo)
            endDate = this.formatDate(today)
            break
          case 5: // 最近30天
            const monthAgo = new Date()
            monthAgo.setDate(monthAgo.getDate() - 30)
            startDate = this.formatDate(monthAgo)
            endDate = this.formatDate(today)
            break
          case 6: // 清除日期筛选
            startDate = ''
            endDate = ''
            break
        }
        
        this.setData({
          startDate: startDate,
          endDate: endDate
        })
        this.filterNotes()
      }
    })
  },

  // 清除所有筛选
  clearAllFilters() {
    this.setData({
      searchKeyword: '',
      selectedCategory: '',
      selectedTags: [],
      startDate: '',
      endDate: ''
    })
    
    this.filterNotes()
    
    wx.showToast({
      title: '已清除所有筛选',
      icon: 'success'
    })
  },

  // 格式化日期
  formatDate(date) {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  },

  // 切换批量模式
  toggleBatchMode() {
    const isBatchMode = !this.data.isBatchMode
    this.setData({
      isBatchMode: isBatchMode,
      selectedNotes: isBatchMode ? [] : this.data.selectedNotes
    })
  },

  // 批量删除
  batchDelete() {
    const selectedNotes = this.data.selectedNotes
    
    if (selectedNotes.length === 0) {
      wx.showToast({
        title: '请先选择笔记',
        icon: 'none'
      })
      return
    }
    
    wx.showModal({
      title: '批量删除',
      content: `确定要删除选中的 ${selectedNotes.length} 条笔记吗？\n\n笔记将移到回收站，30天后将自动清理。`,
      confirmColor: '#C0D3E2',
      confirmText: '删除',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          this.confirmBatchDelete()
        }
      }
    })
  },

  // 确认批量删除
  async confirmBatchDelete() {
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
      
      // ========== 调用后端API进行批量硬删除 ==========
      if (userInfo.token) {
        const serverIds = this.data.selectedNotes
          .filter(note => note.serverId)
          .map(note => note.serverId)
        
        if (serverIds.length > 0) {
          console.log('📤 调用后端API批量硬删除:', serverIds.length, '条')
          const response = await apiService.batchDeleteNotes(serverIds)
          console.log('后端批量硬删除结果:', response)
          
          if (response.success) {
            console.log('✅ 后端批量硬删除成功')
            
            // 后端硬删除成功后，更新本地显示
            console.log('立即更新本地显示...')
            this.removeSelectedNotesFromLocalDisplay()
            
            // 退出批量模式
            this.setData({
              isBatchMode: false,
              selectedNotes: []
            })
            
            wx.showToast({
              title: `已移动 ${serverIds.length} 条到回收站，30天后将自动清理`,
              icon: 'success',
              duration: 3000
            })
          } else {
            console.error('❌ 后端批量硬删除失败:', response.error)
            wx.showToast({
              title: response.error || '批量删除失败',
              icon: 'none'
            })
          }
        } else {
          console.log('❌ 无法批量删除: 没有serverId')
          wx.showToast({
            title: '无法删除：选中的笔记未同步到服务器',
            icon: 'none'
          })
        }
      } else {
        console.log('❌ 无法批量删除: 无Token')
        wx.showToast({
          title: '无法删除：请先登录',
          icon: 'none'
        })
      }
    } catch (error) {
      console.error('批量删除失败:', error)
      wx.showToast({
        title: '删除失败',
        icon: 'none'
      })
    }
  },

  // 批量导出
  batchExport() {
    const selectedNotes = this.data.selectedNotes
    
    if (selectedNotes.length === 0) {
      wx.showToast({
        title: '请先选择笔记',
        icon: 'none'
      })
      return
    }
    
    // 这里可以实现批量导出功能
    wx.showToast({
      title: '导出功能开发中',
      icon: 'none'
    })
  },

  // 批量标签
  batchTag() {
    const selectedNotes = this.data.selectedNotes
    
    if (selectedNotes.length === 0) {
      wx.showToast({
        title: '请先选择笔记',
        icon: 'none'
      })
      return
    }
    
    // 这里可以实现批量添加标签功能
    wx.showToast({
      title: '批量标签功能开发中',
      icon: 'none'
    })
  },

  // 页面分享
  onShareAppMessage() {
    return {
      title: '我的笔记',
      path: '/pages/my-notes/my-notes',
      imageUrl: '/images/share-notes.png'
    }
  },

  onShareTimeline() {
    return {
      title: '我的笔记',
      imageUrl: '/images/share-notes.png'
    }
  }
})
