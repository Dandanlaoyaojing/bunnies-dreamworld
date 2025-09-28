// pages/account-save/account-save.js
const noteManager = require('../../utils/noteManager')

Page({
  data: {
    currentAccount: '',
    availableAccounts: [],
    allNotes: [],
    selectedNotes: [],
    accountInfo: null,
    saveMode: 'all', // 'all', 'selected', 'category'
    selectedCategory: '',
    categories: [],
    isLoading: false,
    saveProgress: 0
  },

  onLoad(options) {
    console.log('账户保存页面加载')
    this.loadData()
  },

  onShow() {
    this.loadData()
  },

  // 加载数据
  loadData() {
    this.loadAllNotes()
    this.loadAvailableAccounts()
    this.loadCategories()
  },

  // 加载所有笔记
  loadAllNotes() {
    try {
      const allNotes = noteManager.getAllNotes()
      this.setData({
        allNotes: allNotes,
        selectedNotes: allNotes.map(note => note.id) // 默认全选
      })
      console.log('加载笔记数量:', allNotes.length)
    } catch (error) {
      console.error('加载笔记失败:', error)
      wx.showToast({
        title: '加载笔记失败',
        icon: 'none'
      })
    }
  },

  // 加载可用账户
  loadAvailableAccounts() {
    try {
      const accounts = noteManager.getAllAccounts()
      const accountList = Object.keys(accounts).map(accountName => ({
        name: accountName,
        noteCount: accounts[accountName].notes ? accounts[accountName].notes.length : 0,
        updateTime: accounts[accountName].updateTime
      }))
      
      this.setData({
        availableAccounts: accountList
      })
      console.log('可用账户:', accountList)
    } catch (error) {
      console.error('加载账户失败:', error)
    }
  },

  // 加载分类
  loadCategories() {
    try {
      const categoryStats = noteManager.getCategoryStatistics()
      this.setData({
        categories: categoryStats
      })
    } catch (error) {
      console.error('加载分类失败:', error)
    }
  },

  // 选择账户
  selectAccount(e) {
    const accountName = e.currentTarget.dataset.account
    this.setData({
      currentAccount: accountName
    })
    this.loadAccountInfo(accountName)
  },

  // 加载账户信息
  loadAccountInfo(accountName) {
    try {
      const accountInfo = noteManager.getAccountInfo(accountName)
      if (accountInfo.success) {
        this.setData({
          accountInfo: accountInfo
        })
      }
    } catch (error) {
      console.error('加载账户信息失败:', error)
    }
  },

  // 创建新账户
  createNewAccount() {
    wx.showModal({
      title: '创建新账户',
      editable: true,
      placeholderText: '请输入账户名称',
      success: (res) => {
        if (res.confirm && res.content.trim()) {
          const accountName = res.content.trim()
          this.setData({
            currentAccount: accountName
          })
          this.loadAccountInfo(accountName)
          this.loadAvailableAccounts()
        }
      }
    })
  },

  // 切换保存模式
  switchSaveMode(e) {
    const mode = e.currentTarget.dataset.mode
    this.setData({
      saveMode: mode,
      selectedNotes: mode === 'all' ? this.data.allNotes.map(note => note.id) : []
    })
  },

  // 选择分类
  selectCategory(e) {
    const category = e.currentTarget.dataset.category
    this.setData({
      selectedCategory: category,
      saveMode: 'category'
    })
    
    // 根据分类筛选笔记
    const categoryNotes = noteManager.getNotesByCategory(category)
    this.setData({
      selectedNotes: categoryNotes.map(note => note.id)
    })
  },

  // 切换笔记选择
  toggleNoteSelection(e) {
    const noteId = e.currentTarget.dataset.id
    const selectedNotes = [...this.data.selectedNotes]
    const index = selectedNotes.indexOf(noteId)
    
    if (index > -1) {
      selectedNotes.splice(index, 1)
    } else {
      selectedNotes.push(noteId)
    }
    
    this.setData({
      selectedNotes: selectedNotes
    })
  },

  // 全选/取消全选
  toggleSelectAll() {
    if (this.data.selectedNotes.length === this.data.allNotes.length) {
      this.setData({
        selectedNotes: []
      })
    } else {
      this.setData({
        selectedNotes: this.data.allNotes.map(note => note.id)
      })
    }
  },

  // 保存笔记到账户
  saveToAccount() {
    if (!this.data.currentAccount) {
      wx.showToast({
        title: '请选择账户',
        icon: 'none'
      })
      return
    }

    if (this.data.selectedNotes.length === 0) {
      wx.showToast({
        title: '请选择要保存的笔记',
        icon: 'none'
      })
      return
    }

    wx.showModal({
      title: '确认保存',
      content: `确定要将 ${this.data.selectedNotes.length} 条笔记保存到账户 "${this.data.currentAccount}" 吗？`,
      success: (res) => {
        if (res.confirm) {
          this.performSave()
        }
      }
    })
  },

  // 执行保存
  performSave() {
    this.setData({ isLoading: true, saveProgress: 0 })
    
    try {
      // 获取选中的笔记
      const notesToSave = this.data.allNotes.filter(note => 
        this.data.selectedNotes.includes(note.id)
      )
      
      console.log('准备保存的笔记数量:', notesToSave.length)
      
      // 模拟保存进度
      const progressInterval = setInterval(() => {
        if (this.data.saveProgress < 90) {
          this.setData({
            saveProgress: this.data.saveProgress + 10
          })
        }
      }, 200)
      
      // 执行保存
      const result = noteManager.saveNotesToAccount(this.data.currentAccount, notesToSave)
      
      clearInterval(progressInterval)
      this.setData({ 
        isLoading: false, 
        saveProgress: 100 
      })
      
      if (result.success) {
        wx.showModal({
          title: '保存成功',
          content: `已成功保存 ${notesToSave.length} 条笔记到账户 "${this.data.currentAccount}"\n\n账户信息：\n- 笔记数量：${result.accountData.notes.length}\n- 标签数量：${result.accountData.tags.length}\n- 分类数量：${result.accountData.categories.length}`,
          showCancel: false,
          confirmText: '确定',
          success: () => {
            this.loadAvailableAccounts()
            this.loadAccountInfo(this.data.currentAccount)
          }
        })
      } else {
        wx.showToast({
          title: '保存失败：' + result.error,
          icon: 'none',
          duration: 3000
        })
      }
    } catch (error) {
      this.setData({ isLoading: false, saveProgress: 0 })
      console.error('保存失败:', error)
      wx.showToast({
        title: '保存失败',
        icon: 'none'
      })
    }
  },

  // 从账户加载笔记
  loadFromAccount() {
    if (!this.data.currentAccount) {
      wx.showToast({
        title: '请选择账户',
        icon: 'none'
      })
      return
    }

    wx.showModal({
      title: '加载账户笔记',
      content: `确定要从账户 "${this.data.currentAccount}" 加载笔记吗？这将覆盖当前笔记。`,
      success: (res) => {
        if (res.confirm) {
          this.performLoad()
        }
      }
    })
  },

  // 执行加载
  performLoad() {
    this.setData({ isLoading: true })
    
    try {
      const result = noteManager.getNotesFromAccount(this.data.currentAccount)
      
      if (result.success) {
        // 保存到当前笔记存储
        wx.setStorageSync('notes', result.notes)
        
        // 更新标签统计
        noteManager.updateAllTagStatistics()
        
        this.setData({ isLoading: false })
        
        wx.showModal({
          title: '加载成功',
          content: `已成功从账户 "${this.data.currentAccount}" 加载 ${result.notes.length} 条笔记！`,
          showCancel: false,
          confirmText: '确定',
          success: () => {
            // 跳转到我的笔记页面
            wx.navigateTo({
              url: '/pages/my-notes/my-notes'
            })
          }
        })
      } else {
        this.setData({ isLoading: false })
        wx.showToast({
          title: '加载失败：' + result.error,
          icon: 'none',
          duration: 3000
        })
      }
    } catch (error) {
      this.setData({ isLoading: false })
      console.error('加载失败:', error)
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    }
  },

  // 删除账户
  deleteAccount() {
    if (!this.data.currentAccount) {
      wx.showToast({
        title: '请选择账户',
        icon: 'none'
      })
      return
    }

    wx.showModal({
      title: '删除账户',
      content: `确定要删除账户 "${this.data.currentAccount}" 吗？此操作不可恢复。`,
      success: (res) => {
        if (res.confirm) {
          try {
            const result = noteManager.deleteAccount(this.data.currentAccount)
            
            if (result.success) {
              wx.showToast({
                title: '删除成功',
                icon: 'success'
              })
              
              this.setData({
                currentAccount: '',
                accountInfo: null
              })
              
              this.loadAvailableAccounts()
            } else {
              wx.showToast({
                title: '删除失败：' + result.error,
                icon: 'none',
                duration: 3000
              })
            }
          } catch (error) {
            console.error('删除账户失败:', error)
            wx.showToast({
              title: '删除失败',
              icon: 'none'
            })
          }
        }
      }
    })
  },

  // 返回上一页
  goBack() {
    wx.navigateBack()
  },

  // 查看笔记详情
  viewNoteDetail(e) {
    const noteId = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/note-detail/note-detail?id=${noteId}`
    })
  }
})
