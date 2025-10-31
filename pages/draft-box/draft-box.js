// pages/draft-box/draft-box.js - 草稿箱页面
const noteManager = require('../../utils/noteManager.js')
const draftCloudService = require('../../utils/draftCloudService.js')

Page({
  data: {
    // 草稿列表
    drafts: [],
    
    // 筛选和排序
    sortBy: 'updateTime', // updateTime, createTime, title, category
    sortOrder: 'desc', // asc, desc
    filterCategory: 'all', // all, art, cute, dreams, foods, happiness, knowledge, sights, thinking
    searchKeyword: '',
    
    // 界面状态
    isLoading: false,
    isEmpty: false,
    selectedDrafts: [], // 批量操作选中的草稿
    
    // 统计信息
    stats: {
      totalCount: 0,
      categoryCount: {},
      oldestDraft: null,
      newestDraft: null
    },
    
    // 操作模式
    isBatchMode: false,
    isEditing: false,
    needRefresh: false,
    
    // 分类选项
    categories: [
      { name: '全部', key: 'all', icon: '📝' },
      { name: '艺术', key: 'art', icon: '🎨' },
      { name: '萌物', key: 'cute', icon: '🐰' },
      { name: '梦游', key: 'dreams', icon: '🌙' },
      { name: '美食', key: 'foods', icon: '🍰' },
      { name: '趣事', key: 'happiness', icon: '😊' },
      { name: '知识', key: 'knowledge', icon: '📚' },
      { name: '风景', key: 'sights', icon: '🌅' },
      { name: '思考', key: 'thinking', icon: '🤔' }
    ]
  },

  onLoad() {
    console.log('草稿箱页面加载')
    // 检查是否有本地草稿，如果有则不执行云端同步
    const localDrafts = noteManager.getAccountStorage('drafts', [])
    console.log('本地草稿数量:', localDrafts.length)
    
    if (localDrafts.length > 0) {
      console.log('本地有草稿，不执行云端同步')
      this.loadDrafts(false) // 不执行云端同步
    } else {
      console.log('本地无草稿，执行云端同步')
      this.loadDrafts(true) // 首次加载时强制同步
    }
  },

  onShow() {
    // 只有在需要时才重新加载草稿
    if (this.data.needRefresh) {
      this.loadDrafts(false) // 不执行云端同步
      this.setData({ needRefresh: false })
    }
  },

  // 下拉刷新
  onPullDownRefresh() {
    console.log('草稿箱下拉刷新')
    this.loadDrafts(true) // 下拉刷新时强制同步
    
    // 延迟停止下拉刷新动画
    setTimeout(() => {
      wx.stopPullDownRefresh()
    }, 1000)
  },

  // 加载草稿列表
  async loadDrafts(forceSync = false) {
    this.setData({ isLoading: true })
    
    try {
      // 只有在强制同步或首次加载时才从云端同步
      if (forceSync) {
        const syncResult = await draftCloudService.syncDraftsFromCloud()
        if (syncResult.success) {
          console.log('✅ 从云端同步草稿成功:', syncResult.message)
        } else {
          console.log('⚠️ 云端同步失败，使用本地草稿:', syncResult.error)
        }
      }
      
      // 从账户专属存储获取草稿（可能包含云端同步的数据）
      const drafts = noteManager.getAccountStorage('drafts', [])
      
      console.log('加载草稿:', drafts.length, '(当前账户)')
      console.log('草稿详情:', drafts)
      
      // 处理草稿数据
      const processedDrafts = drafts.map(draft => ({
        ...draft,
        // 确保有必要的字段
        id: draft.id || Date.now().toString(),
        title: draft.title || '无标题',
        content: draft.content || '',
        category: draft.category || 'thinking',
        createTime: draft.createTime || new Date().toISOString(),
        updateTime: draft.updateTime || new Date().toISOString(),
        wordCount: draft.wordCount || (draft.content ? draft.content.length : 0),
        // 计算预览内容
        preview: this.generatePreview(draft.content || ''),
        // 格式化时间
        createTimeFormatted: this.formatTime(draft.createTime),
        updateTimeFormatted: this.formatTime(draft.updateTime)
      }))
      
      // 应用筛选和排序
      const filteredDrafts = this.applyFiltersAndSort(processedDrafts)
      
      // 计算统计信息
      const stats = this.calculateStats(processedDrafts)
      
      this.setData({
        drafts: filteredDrafts,
        stats,
        isEmpty: filteredDrafts.length === 0,
        isLoading: false
      })
      
    } catch (error) {
      console.error('加载草稿失败:', error)
      this.setData({ isLoading: false })
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    }
  },

  // 生成预览内容
  generatePreview(content) {
    if (!content) return '暂无内容'
    
    // 移除HTML标签和特殊字符
    const cleanContent = content.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ')
    
    // 截取前100个字符
    return cleanContent.length > 100 ? cleanContent.substring(0, 100) + '...' : cleanContent
  },

  // 应用筛选和排序
  applyFiltersAndSort(drafts) {
    let filteredDrafts = [...drafts]
    
    // 分类筛选
    if (this.data.filterCategory !== 'all') {
      filteredDrafts = filteredDrafts.filter(draft => draft.category === this.data.filterCategory)
    }
    
    // 关键词搜索
    if (this.data.searchKeyword.trim()) {
      const keyword = this.data.searchKeyword.toLowerCase()
      filteredDrafts = filteredDrafts.filter(draft => 
        draft.title.toLowerCase().includes(keyword) ||
        draft.content.toLowerCase().includes(keyword)
      )
    }
    
    // 排序
    filteredDrafts.sort((a, b) => {
      let aValue, bValue
      
      switch (this.data.sortBy) {
        case 'title':
          aValue = a.title.toLowerCase()
          bValue = b.title.toLowerCase()
          break
        case 'category':
          aValue = a.category
          bValue = b.category
          break
        case 'createTime':
          aValue = new Date(a.createTime)
          bValue = new Date(b.createTime)
          break
        case 'updateTime':
        default:
          aValue = new Date(a.updateTime)
          bValue = new Date(b.updateTime)
          break
      }
      
      if (this.data.sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })
    
    return filteredDrafts
  },

  // 计算统计信息
  calculateStats(drafts) {
    const stats = {
      totalCount: drafts.length,
      categoryCount: {},
      oldestDraft: null,
      newestDraft: null
    }
    
    if (drafts.length === 0) return stats
    
    // 统计各分类数量
    drafts.forEach(draft => {
      const category = draft.category || 'thinking'
      stats.categoryCount[category] = (stats.categoryCount[category] || 0) + 1
    })
    
    // 找到最早和最晚的草稿
    const sortedByTime = drafts.sort((a, b) => new Date(a.createTime) - new Date(b.createTime))
    stats.oldestDraft = sortedByTime[0]
    stats.newestDraft = sortedByTime[sortedByTime.length - 1]
    
    return stats
  },

  // 格式化时间
  formatTime(timeString) {
    if (!timeString) return ''
    
    const date = new Date(timeString)
    const now = new Date()
    const diff = now - date
    
    // 小于1分钟
    if (diff < 60000) {
      return '刚刚'
    }
    
    // 小于1小时
    if (diff < 3600000) {
      return Math.floor(diff / 60000) + '分钟前'
    }
    
    // 小于1天
    if (diff < 86400000) {
      return Math.floor(diff / 3600000) + '小时前'
    }
    
    // 小于7天
    if (diff < 604800000) {
      return Math.floor(diff / 86400000) + '天前'
    }
    
    // 超过7天显示具体日期
    return date.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  },

  // 搜索输入
  onSearchInput(e) {
    this.setData({ searchKeyword: e.detail.value })
    // 防抖处理
    clearTimeout(this.searchTimer)
    this.searchTimer = setTimeout(() => {
      this.loadDrafts(false)
    }, 300)
  },

  // 分类筛选
  selectCategory(e) {
    const category = e.currentTarget.dataset.category
    this.setData({ filterCategory: category })
    this.loadDrafts(false)
  },

  // 排序方式选择
  selectSortBy(e) {
    const sortBy = e.currentTarget.dataset.sort
    this.setData({ sortBy })
    this.loadDrafts(false)
  },

  // 切换排序顺序
  toggleSortOrder() {
    this.setData({ 
      sortOrder: this.data.sortOrder === 'asc' ? 'desc' : 'asc' 
    })
    this.loadDrafts(false)
  },

  // 点击草稿项
  onDraftTap(e) {
    const draftId = e.currentTarget.dataset.id
    
    if (this.data.isBatchMode) {
      // 批量选择模式
      this.toggleDraftSelection(draftId)
    } else {
      // 编辑模式
      this.editDraft(draftId)
    }
  },

  // 长按草稿项
  onDraftLongPress(e) {
    const draftId = e.currentTarget.dataset.id
    
    if (!this.data.isBatchMode) {
      // 进入批量选择模式
      this.setData({ 
        isBatchMode: true,
        selectedDrafts: [draftId]
      })
    }
  },

  // 切换草稿选择状态
  toggleDraftSelection(draftId) {
    const selectedDrafts = [...this.data.selectedDrafts]
    const index = selectedDrafts.indexOf(draftId)
    
    if (index > -1) {
      selectedDrafts.splice(index, 1)
    } else {
      selectedDrafts.push(draftId)
    }
    
    this.setData({ selectedDrafts })
  },

  // 编辑草稿
  editDraft(draftId) {
    console.log('编辑草稿，ID:', draftId)
    const draft = this.data.drafts.find(d => d.id === draftId)
    console.log('找到的草稿:', draft)
    
    if (!draft) {
      console.error('草稿不存在:', draftId)
      wx.showToast({
        title: '草稿不存在',
        icon: 'none'
      })
      return
    }
    
    // 由于note-editor是tabBar页面，需要先保存草稿数据到本地存储，然后跳转
    try {
      // 将草稿数据保存到本地存储，供note-editor页面读取
      wx.setStorageSync('editDraftData', {
        draftId: draftId,
        mode: 'draft',
        timestamp: Date.now()
      })
      
      console.log('草稿数据已保存到本地存储，准备跳转到tabBar页面')
      
      // 使用switchTab跳转到tabBar页面
      wx.switchTab({
        url: '/pages/note-editor/note-editor',
        success: () => {
          console.log('跳转到笔记编辑器成功')
        },
        fail: (err) => {
          console.error('跳转失败:', err)
          wx.showToast({
            title: '跳转失败',
            icon: 'none'
          })
        }
      })
    } catch (error) {
      console.error('保存草稿数据失败:', error)
      wx.showToast({
        title: '跳转失败',
        icon: 'none'
      })
    }
  },

  // 删除草稿
  deleteDraft(draftId) {
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个草稿吗？删除后无法恢复。',
      showCancel: true,
      cancelText: '取消',
      confirmText: '删除',
      confirmColor: '#e53e3e',
      success: (res) => {
        if (res.confirm) {
          this.performDeleteDraft(draftId)
        }
      }
    })
  },

  // 执行删除草稿
  async performDeleteDraft(draftId) {
    try {
      const drafts = noteManager.getAccountStorage('drafts', [])
      const draft = drafts.find(d => d.id === draftId)
      
      if (!draft) {
        wx.showToast({
          title: '草稿不存在',
          icon: 'none'
        })
        return
      }
      
      // 仅当存在 cloudId 时才尝试云端删除；无 cloudId 视为只存在本地
      const serverId = draft.cloudId || null
      let cloudDeleteSuccess = false
      
      if (serverId) {
        try {
          const deleteResult = await draftCloudService.deleteDraft(serverId)
          if (deleteResult.success) {
            cloudDeleteSuccess = true
            console.log('✅ 草稿已从云端删除')
            
            // 删除成功后，强制从云端拉取最新数据覆盖本地缓存
            try {
              console.log('📥 删除后刷新云端草稿列表以验证删除...')
              const refreshResult = await draftCloudService.downloadDrafts()
              if (refreshResult && refreshResult.success) {
                const cloudDrafts = (refreshResult.drafts || []).map(d => ({
                  ...d,
                  cloudId: d.cloudId || d.id,
                  isDraft: true,
                  status: 'draft'
                }))
                console.log('云端当前草稿数:', cloudDrafts.length)
                noteManager.setAccountStorage('drafts', cloudDrafts)
                console.log('✅ 以云端最新草稿覆盖本地，确保删除与云端一致')
                
                wx.showToast({
                  title: '删除成功',
                  icon: 'success'
                })
                
                this.loadDrafts(false)
                return
              }
            } catch (refreshError) {
              console.warn('⚠️ 刷新云端草稿失败，回退为本地删除方案:', refreshError)
            }
          }
        } catch (error) {
          console.error('从云端删除草稿失败:', error)
          // 继续删除本地草稿
        }
      } else {
        console.log('📱 仅本地草稿（无云端ID）')
      }
      
      // 从本地草稿箱移除草稿（删除操作：从源库删除）
      console.log(`📤 从草稿箱移除草稿: ${draft.title || draftId}`)
      const draftsCountBefore = drafts.length
      const updatedDrafts = drafts.filter(d => d.id !== draftId)
      const draftsCountAfter = updatedDrafts.length
      
      if (draftsCountBefore === draftsCountAfter) {
        console.error(`❌ 警告：草稿未从草稿箱中移除（可能不存在）: ${draftId}`)
        wx.showToast({
          title: '草稿不存在',
          icon: 'none'
        })
        return
      } else {
        console.log(`✅ 草稿已从草稿箱移除（从 ${draftsCountBefore} 条减少到 ${draftsCountAfter} 条）`)
      }
      
      noteManager.setAccountStorage('drafts', updatedDrafts)
      
      // 验证删除结果：确保草稿不再存在于草稿箱中
      const verifyDrafts = noteManager.getAccountStorage('drafts', [])
      const stillExists = verifyDrafts.find(d => d.id === draftId)
      if (stillExists) {
        console.error(`❌ 验证失败：草稿仍在草稿箱中: ${draftId}`)
      } else {
        console.log(`✅ 验证成功：草稿已从草稿箱完全移除: ${draftId}`)
      }
      
      wx.showToast({
        title: '删除成功',
        icon: 'success'
      })
      
      // 重新加载草稿列表（从本地缓存读取，确保UI更新）
      this.loadDrafts(false)
    } catch (error) {
      console.error('删除草稿失败:', error)
      wx.showToast({
        title: '删除失败',
        icon: 'none'
      })
    }
  },

  // 发布草稿
  publishDraft(draftId) {
    const draft = this.data.drafts.find(d => d.id === draftId)
    if (!draft) return
    
    wx.showModal({
      title: '发布草稿',
      content: '确定要将这个草稿发布为正式笔记吗？',
      showCancel: true,
      cancelText: '取消',
      confirmText: '发布',
      success: (res) => {
        if (res.confirm) {
          this.performPublishDraft(draft)
        }
      }
    })
  },

  // 执行发布草稿
  performPublishDraft(draft) {
    try {
      // 创建正式笔记
      const note = {
        id: Date.now().toString(),
        title: draft.title,
        content: draft.content,
        category: draft.category,
        tags: draft.tags || [],
        createTime: new Date().toISOString(),
        updateTime: new Date().toISOString(),
        wordCount: draft.content ? draft.content.length : 0,
        isDraft: false
      }
      
      // 步骤1：保存到笔记存储（移动操作的第二步：添加到目标库）
      console.log(`📥 将草稿移动到常规笔记库: ${draft.title || draft.id}`)
      const result = noteManager.saveNote(note)
      
      if (!result.success) {
        console.error('❌ 保存到常规笔记库失败:', result.error)
        throw new Error(result.error || '保存失败')
      }
      
      // 步骤2：从草稿箱移除（移动操作的第一步：从源库删除）
      console.log(`📤 从草稿箱移除草稿: ${draft.title || draft.id}`)
      const drafts = noteManager.getAccountStorage('drafts', [])
      const draftsCountBefore = drafts.length
      const updatedDrafts = drafts.filter(d => d.id !== draft.id)
      const draftsCountAfter = updatedDrafts.length
      
      if (draftsCountBefore === draftsCountAfter) {
        console.error('❌ 警告：草稿未从草稿箱中移除（可能不存在）')
        // 如果草稿不存在，回滚操作：从常规笔记库删除刚添加的笔记
        const userInfo = wx.getStorageSync('userInfo')
        if (userInfo && userInfo.username && note.id) {
          console.log('🔄 回滚操作：从常规笔记库移除刚添加的笔记')
          const accountResult = noteManager.getNotesFromAccount(userInfo.username)
          if (accountResult.success) {
            const rolledBackNotes = accountResult.notes.filter(n => n.id !== note.id)
            noteManager.saveNotesToAccount(userInfo.username, rolledBackNotes)
          }
        }
        throw new Error('草稿不存在或已删除')
      } else {
        console.log(`✅ 草稿已从草稿箱移除（从 ${draftsCountBefore} 条减少到 ${draftsCountAfter} 条）`)
      }
      
      noteManager.setAccountStorage('drafts', updatedDrafts)
      
      // 步骤3：验证移动操作
      const verifyDrafts = noteManager.getAccountStorage('drafts', [])
      const stillInDrafts = verifyDrafts.find(d => d.id === draft.id)
      if (stillInDrafts) {
        console.error(`❌ 验证失败：草稿仍在草稿箱中: ${draft.id}`)
      } else {
        console.log(`✅ 验证成功：草稿已从草稿箱移除: ${draft.id}`)
      }
      
      // 验证笔记是否在常规笔记库中
      const userInfo = wx.getStorageSync('userInfo')
      if (userInfo && userInfo.username) {
        const verifyNotesResult = noteManager.getNotesFromAccount(userInfo.username)
        if (verifyNotesResult.success) {
          const savedNote = verifyNotesResult.notes.find(n => n.id === note.id)
          if (savedNote) {
            console.log('✅ 验证成功：发布的笔记已在常规笔记库中')
            
            // 验证笔记不是草稿
            if (savedNote.isDraft === true || savedNote.status === 'draft') {
              console.error('❌ 警告：发布的笔记仍带有草稿标记', {
                isDraft: savedNote.isDraft,
                status: savedNote.status
              })
            } else {
              console.log('✅ 验证成功：发布的笔记没有草稿标记')
            }
          } else {
            console.error('❌ 验证失败：发布的笔记未在常规笔记库中找到')
          }
        }
      }
      
      wx.showToast({
        title: '发布成功',
        icon: 'success'
      })
      
      this.loadDrafts(false)
    } catch (error) {
      console.error('发布草稿失败:', error)
      wx.showToast({
        title: '发布失败',
        icon: 'none'
      })
    }
  },

  // 批量操作
  toggleBatchMode() {
    this.setData({
      isBatchMode: !this.data.isBatchMode,
      selectedDrafts: []
    })
  },

  // 全选/全不选
  toggleSelectAll() {
    console.log('=== 全选/全不选操作 ===')
    console.log('当前选中草稿数量:', this.data.selectedDrafts.length)
    console.log('总草稿数量:', this.data.drafts.length)
    
    if (this.data.selectedDrafts.length === this.data.drafts.length) {
      console.log('执行全不选操作')
      this.setData({ selectedDrafts: [] })
    } else {
      console.log('执行全选操作')
      const allIds = this.data.drafts.map(draft => draft.id)
      console.log('全选草稿ID:', allIds)
      this.setData({ 
        selectedDrafts: allIds 
      })
    }
    
    console.log('操作后选中草稿数量:', this.data.selectedDrafts.length)
  },

  // 批量删除
  batchDelete() {
    console.log('=== 批量删除开始 ===')
    console.log('当前选中草稿:', this.data.selectedDrafts)
    console.log('选中草稿数量:', this.data.selectedDrafts.length)
    
    if (this.data.selectedDrafts.length === 0) {
      console.log('没有选中任何草稿')
      wx.showToast({
        title: '请选择要删除的草稿',
        icon: 'none'
      })
      return
    }
    
    console.log('显示确认对话框')
    wx.showModal({
      title: '批量删除',
      content: `确定要删除选中的 ${this.data.selectedDrafts.length} 个草稿吗？删除后无法恢复。`,
      showCancel: true,
      cancelText: '取消',
      confirmText: '删除',
      confirmColor: '#e53e3e',
      success: (res) => {
        console.log('用户选择:', res.confirm ? '确认' : '取消')
        if (res.confirm) {
          console.log('用户确认删除，开始执行删除')
          this.performBatchDelete()
        } else {
          console.log('用户取消删除')
        }
      },
      fail: (err) => {
        console.error('显示确认对话框失败:', err)
      }
    })
  },

  // 执行批量删除
  async performBatchDelete() {
    try {
      console.log('=== 执行批量删除开始 ===')
      console.log('要删除的草稿ID:', this.data.selectedDrafts)
      
      const drafts = noteManager.getAccountStorage('drafts', [])
      console.log('当前所有草稿:', drafts.length, '个')
      console.log('草稿详情:', drafts)
      
      const selectedDrafts = drafts.filter(draft => 
        this.data.selectedDrafts.includes(draft.id)
      )
      
      console.log('找到要删除的草稿:', selectedDrafts.length, '个')
      console.log('要删除的草稿详情:', selectedDrafts)
      
      if (selectedDrafts.length === 0) {
        console.log('❌ 没有找到要删除的草稿')
        wx.showToast({
          title: '没有找到要删除的草稿',
          icon: 'none'
        })
        return
      }
      
      // 先尝试从云端删除有云端ID的草稿
      let cloudDeleteCount = 0
      let cloudDeleteErrors = []
      let localOnlyCount = 0
      
      console.log('开始云端删除...')
      for (const draft of selectedDrafts) {
        const serverId = draft.cloudId
        if (serverId) {
          try {
            console.log(`从云端删除草稿: ${draft.title} (服务器ID: ${serverId})`)
            const deleteResult = await draftCloudService.deleteDraft(serverId)
            
            if (deleteResult.success) {
              cloudDeleteCount++
              console.log(`✅ 云端删除成功: ${draft.title} (${serverId})`)
            } else {
              console.error(`❌ 云端删除失败: ${draft.title} (${serverId}) - ${deleteResult.error}`)
              cloudDeleteErrors.push({ 
                title: draft.title, 
                cloudId: serverId, 
                error: deleteResult.error 
              })
            }
          } catch (error) {
            console.error(`❌ 云端删除异常: ${draft.title} (${serverId}) - ${error.message}`)
            cloudDeleteErrors.push({ 
              title: draft.title, 
              cloudId: serverId, 
              error: error.message 
            })
          }
        } else {
          localOnlyCount++
          console.log(`📱 仅本地草稿: ${draft.title} (无云端ID)`) 
        }
      }
      
      console.log(`云端删除结果: 成功 ${cloudDeleteCount} 个, 失败 ${cloudDeleteErrors.length} 个, 仅本地 ${localOnlyCount} 个`)

      // 从本地草稿箱移除选中的草稿（删除操作：从源库删除）
      const draftsCountBefore = drafts.length
      const updatedDrafts = drafts.filter(draft => !this.data.selectedDrafts.includes(draft.id))
      const draftsCountAfter = updatedDrafts.length
      const deletedCount = draftsCountBefore - draftsCountAfter
      
      console.log(`📤 从草稿箱移除 ${deletedCount} 条草稿（从 ${draftsCountBefore} 条减少到 ${draftsCountAfter} 条）`)
      
      if (deletedCount !== this.data.selectedDrafts.length) {
        console.warn(`⚠️ 警告：删除数量不匹配（期望 ${this.data.selectedDrafts.length} 条，实际 ${deletedCount} 条）`)
      }
      
      noteManager.setAccountStorage('drafts', updatedDrafts)
      
      // 验证删除结果：确保选中的草稿不再存在于草稿箱中
      const verifyDrafts = noteManager.getAccountStorage('drafts', [])
      const stillExistsCount = this.data.selectedDrafts.filter(id => {
        return verifyDrafts.find(d => d.id === id)
      }).length
      
      if (stillExistsCount > 0) {
        console.error(`❌ 验证失败：仍有 ${stillExistsCount} 条草稿在草稿箱中`)
      } else {
        console.log(`✅ 验证成功：所有选中草稿已从草稿箱完全移除`)
      }

      // 方案2：如果存在云端删除成功的草稿，强制从云端拉取最新数据覆盖本地缓存（确保数据一致性）
      if (cloudDeleteCount > 0) {
        try {
          console.log('📥 删除后刷新云端草稿列表以验证删除...')
          const refresh = await draftCloudService.downloadDrafts()
          if (refresh && refresh.success) {
            const cloudDrafts = (refresh.drafts || []).map(d => ({
              ...d,
              cloudId: d.cloudId || d.id,
              isDraft: true,
              status: 'draft'
            }))
            console.log('云端当前草稿数:', cloudDrafts.length)
            noteManager.setAccountStorage('drafts', cloudDrafts)
            console.log('✅ 以云端最新草稿覆盖本地，确保删除与云端一致')
          } else {
            console.warn('⚠️ 刷新云端草稿失败，使用本地删除结果:', refresh && refresh.error)
            // 本地删除已完成，保持当前状态
          }
        } catch (e) {
          console.error('刷新云端草稿异常，使用本地删除结果:', e)
          // 本地删除已完成，保持当前状态
        }
      }
      
      // 验证保存是否成功
      const savedDrafts = noteManager.getAccountStorage('drafts', [])
      console.log('验证保存结果:', savedDrafts.length, '个草稿')
      
      // 显示删除结果
      let message = `已删除 ${this.data.selectedDrafts.length} 个草稿`
      if (cloudDeleteCount > 0) {
        message += `（云端删除 ${cloudDeleteCount} 个）`
      }
      if (cloudDeleteErrors.length > 0) {
        message += `（云端删除失败 ${cloudDeleteErrors.length} 个）`
      }
      if (localOnlyCount > 0) {
        message += `（仅本地 ${localOnlyCount} 个）`
      }
      
      wx.showToast({
        title: message,
        icon: 'success',
        duration: 3000
      })
      
      // 如果有云端删除失败，显示详细信息
      if (cloudDeleteErrors.length > 0) {
        console.log('云端删除失败的草稿详情:', cloudDeleteErrors)
        setTimeout(() => {
          wx.showModal({
            title: '云端删除失败',
            content: `${cloudDeleteErrors.length} 个草稿云端删除失败，但本地已删除。\n失败原因：${cloudDeleteErrors[0].error}`,
            showCancel: false,
            confirmText: '知道了'
          })
        }, 1000)
      }
      
      this.setData({
        isBatchMode: false,
        selectedDrafts: []
      })
      
      console.log('重新加载草稿列表（先从云端拉取确认）...')
      try {
        await draftCloudService.syncDraftsFromCloud()
      } catch (e) {
        console.warn('从云端刷新失败，使用本地列表:', e && e.message)
      }
      this.loadDrafts(false)
      console.log('=== 批量删除完成 ===')
      
    } catch (error) {
      console.error('❌ 批量删除失败:', error)
      wx.showToast({
        title: '删除失败',
        icon: 'none'
      })
    }
  },

  // 批量发布
  batchPublish() {
    if (this.data.selectedDrafts.length === 0) {
      wx.showToast({
        title: '请选择要发布的草稿',
        icon: 'none'
      })
      return
    }
    
    wx.showModal({
      title: '批量发布',
      content: `确定要将选中的 ${this.data.selectedDrafts.length} 个草稿发布为正式笔记吗？`,
      showCancel: true,
      cancelText: '取消',
      confirmText: '发布',
      success: (res) => {
        if (res.confirm) {
          this.performBatchPublish()
        }
      }
    })
  },

  // 执行批量发布
  performBatchPublish() {
    try {
      const selectedDrafts = this.data.drafts.filter(draft => 
        this.data.selectedDrafts.includes(draft.id)
      )
      
      let successCount = 0
      let failCount = 0
      
      selectedDrafts.forEach(draft => {
        try {
          const note = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            title: draft.title,
            content: draft.content,
            category: draft.category,
            tags: draft.tags || [],
            createTime: new Date().toISOString(),
            updateTime: new Date().toISOString(),
            wordCount: draft.content ? draft.content.length : 0,
            isDraft: false
          }
          
          const result = noteManager.saveNote(note)
          if (result.success) {
            successCount++
          } else {
            failCount++
          }
        } catch (error) {
          failCount++
        }
      })
      
      // 删除已发布的草稿
      const drafts = noteManager.getAccountStorage('drafts', [])
      const updatedDrafts = drafts.filter(draft => 
        !this.data.selectedDrafts.includes(draft.id)
      )
      noteManager.setAccountStorage('drafts', updatedDrafts)
      
      wx.showToast({
        title: `发布完成：成功 ${successCount} 个，失败 ${failCount} 个`,
        icon: successCount > 0 ? 'success' : 'none'
      })
      
      this.setData({
        isBatchMode: false,
        selectedDrafts: []
      })
      
      this.loadDrafts(false)
    } catch (error) {
      console.error('批量发布失败:', error)
      wx.showToast({
        title: '发布失败',
        icon: 'none'
      })
    }
  },

  // 清空草稿箱
  clearAllDrafts() {
    if (this.data.drafts.length === 0) {
      wx.showToast({
        title: '草稿箱已为空',
        icon: 'none'
      })
      return
    }
    
    wx.showModal({
      title: '清空草稿箱',
      content: `确定要清空所有 ${this.data.drafts.length} 个草稿吗？此操作无法撤销。`,
      showCancel: true,
      cancelText: '取消',
      confirmText: '清空',
      confirmColor: '#e53e3e',
      success: (res) => {
        if (res.confirm) {
          this.performClearAll()
        }
      }
    })
  },

  // 执行清空所有草稿
  performClearAll() {
    try {
      noteManager.setAccountStorage('drafts', [])
      
      wx.showToast({
        title: '草稿箱已清空',
        icon: 'success'
      })
      
      this.loadDrafts(false)
    } catch (error) {
      console.error('清空草稿箱失败:', error)
      wx.showToast({
        title: '清空失败',
        icon: 'none'
      })
    }
  },

  // 创建新草稿
  createNewDraft() {
    try {
      // 将新草稿数据保存到本地存储
      wx.setStorageSync('editDraftData', {
        mode: 'draft',
        timestamp: Date.now()
      })
      
      console.log('新草稿数据已保存到本地存储，准备跳转到tabBar页面')
      
      // 使用switchTab跳转到tabBar页面
      wx.switchTab({
        url: '/pages/note-editor/note-editor',
        success: () => {
          console.log('跳转到笔记编辑器成功')
        },
        fail: (err) => {
          console.error('跳转失败:', err)
          wx.showToast({
            title: '跳转失败',
            icon: 'none'
          })
        }
      })
    } catch (error) {
      console.error('保存新草稿数据失败:', error)
      wx.showToast({
        title: '跳转失败',
        icon: 'none'
      })
    }
  },

  // 保存单个草稿到云端
  async saveDraftToCloud(e) {
    const draftId = e.currentTarget.dataset.id
    const draft = this.data.drafts.find(d => d.id === draftId)
    
    if (!draft) {
      wx.showToast({
        title: '草稿不存在',
        icon: 'none'
      })
      return
    }
    
    try {
      wx.showLoading({ title: '保存到云端...' })
      
      // 调用云端服务上传草稿
      const result = await draftCloudService.uploadDraft(draft)
      
      wx.hideLoading()
      
      if (result.success) {
        // 更新本地草稿的云端ID
        const drafts = noteManager.getAccountStorage('drafts', [])
        const draftIndex = drafts.findIndex(d => d.id === draftId)
        if (draftIndex > -1) {
          drafts[draftIndex].cloudId = result.cloudId
          drafts[draftIndex].cloudSyncTime = new Date().toISOString()
          noteManager.setAccountStorage('drafts', drafts)
        }
        
        wx.showToast({
          title: '已保存到云端',
          icon: 'success'
        })
        
        // 重新加载草稿列表
        this.loadDrafts(false)
      } else {
        wx.showToast({
          title: result.error || '保存失败',
          icon: 'none'
        })
      }
    } catch (error) {
      wx.hideLoading()
      console.error('保存草稿到云端失败:', error)
      wx.showToast({
        title: '保存失败',
        icon: 'none'
      })
    }
  },

  // 批量保存草稿到云端
  async batchSaveToCloud() {
    const selectedDrafts = this.data.selectedDrafts
    
    if (selectedDrafts.length === 0) {
      wx.showToast({
        title: '请先选择草稿',
        icon: 'none'
      })
      return
    }
    
    try {
      wx.showLoading({ title: `正在保存 ${selectedDrafts.length} 个草稿到云端...` })
      
      let successCount = 0
      let failCount = 0
      
      for (const draftId of selectedDrafts) {
        const draft = this.data.drafts.find(d => d.id === draftId)
        if (draft) {
          try {
            const result = await draftCloudService.uploadDraft(draft)
            if (result.success) {
              // 更新本地草稿的云端ID
              const drafts = noteManager.getAccountStorage('drafts', [])
              const draftIndex = drafts.findIndex(d => d.id === draftId)
              if (draftIndex > -1) {
                drafts[draftIndex].cloudId = result.cloudId
                drafts[draftIndex].cloudSyncTime = new Date().toISOString()
                noteManager.setAccountStorage('drafts', drafts)
              }
              successCount++
            } else {
              failCount++
            }
          } catch (error) {
            console.error(`保存草稿 ${draftId} 失败:`, error)
            failCount++
          }
        }
      }
      
      wx.hideLoading()
      
      if (successCount > 0) {
        wx.showToast({
          title: `成功保存 ${successCount} 个草稿到云端`,
          icon: 'success'
        })
        
        // 重新加载草稿列表
        this.loadDrafts(false)
        
        // 退出批量模式
        this.setData({
          isBatchMode: false,
          selectedDrafts: []
        })
      } else {
        wx.showToast({
          title: '保存失败',
          icon: 'none'
        })
      }
      
      if (failCount > 0) {
        wx.showToast({
          title: `${failCount} 个草稿保存失败`,
          icon: 'none'
        })
      }
    } catch (error) {
      wx.hideLoading()
      console.error('批量保存草稿到云端失败:', error)
      wx.showToast({
        title: '批量保存失败',
        icon: 'none'
      })
    }
  },

  // 手动同步草稿到云端
  async syncDraftsToCloud() {
    try {
      wx.showLoading({ title: '正在同步草稿...' })
      
      const result = await draftCloudService.syncDraftsToCloud()
      
      wx.hideLoading()
      
      if (result.success) {
        wx.showToast({
          title: result.message,
          icon: 'success'
        })
        // 重新加载草稿列表
        this.loadDrafts(false)
      } else {
        wx.showToast({
          title: result.error || '同步失败',
          icon: 'none'
        })
      }
    } catch (error) {
      wx.hideLoading()
      console.error('同步草稿失败:', error)
      wx.showToast({
        title: '同步失败',
        icon: 'none'
      })
    }
  },

  // 手动从云端同步草稿
  async syncDraftsFromCloud() {
    try {
      wx.showLoading({ title: '正在从云端同步...' })
      
      const result = await draftCloudService.syncDraftsFromCloud()
      
      wx.hideLoading()
      
      if (result.success) {
        wx.showToast({
          title: result.message,
          icon: 'success'
        })
        // 重新加载草稿列表
        this.loadDrafts(false)
      } else {
        wx.showToast({
          title: result.error || '同步失败',
          icon: 'none'
        })
      }
    } catch (error) {
      wx.hideLoading()
      console.error('从云端同步草稿失败:', error)
      wx.showToast({
        title: '同步失败',
        icon: 'none'
      })
    }
  },

  // 返回上一页
  goBack() {
    wx.navigateBack()
  },

  // 阻止事件冒泡
  stopPropagation() {
    // 空方法，用于阻止事件冒泡
  },

  // 清除搜索
  clearSearch() {
    this.setData({
      searchKeyword: ''
    })
    this.loadDrafts(false)
  },

  // 显示排序选项
  showSortOptions() {
    const sortOptions = [
      { name: '更新时间', value: 'updateTime' },
      { name: '创建时间', value: 'createTime' },
      { name: '标题', value: 'title' },
      { name: '分类', value: 'category' }
    ]
    
    const itemList = sortOptions.map(option => option.name)
    const currentIndex = sortOptions.findIndex(option => option.value === this.data.sortBy)
    
    wx.showActionSheet({
      itemList: itemList,
      success: (res) => {
        const selectedOption = sortOptions[res.tapIndex]
        this.setData({
          sortBy: selectedOption.value
        })
        this.loadDrafts(false)
      }
    })
  }
})
