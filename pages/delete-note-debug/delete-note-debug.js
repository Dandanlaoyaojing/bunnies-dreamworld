// pages/delete-note-debug/delete-note-debug.js
const noteManager = require('../../utils/noteManager.js')
const apiService = require('../../utils/apiService.js')

Page({
  data: {
    notes: [],
    selectedNote: null,
    testResults: [],
    isLoading: false,
    currentTest: '',
    userInfo: null
  },

  onLoad() {
    console.log('删除笔记调试页面加载')
    this.loadUserInfo()
    this.loadNotes()
  },

  loadUserInfo() {
    try {
      const userInfo = wx.getStorageSync('userInfo')
      console.log('用户信息:', userInfo)
      this.setData({
        userInfo: userInfo
      })
    } catch (error) {
      console.error('加载用户信息失败:', error)
    }
  },

  loadNotes() {
    try {
      const notes = noteManager.getAllNotes()
      console.log('加载的笔记:', notes)
      this.setData({
        notes: notes
      })
    } catch (error) {
      console.error('加载笔记失败:', error)
    }
  },

  async testDeleteNote() {
    if (!this.data.selectedNote) {
      this.addTestResult('❌ 请先选择要删除的笔记')
      return
    }

    this.setData({ isLoading: true, currentTest: '测试删除笔记' })
    this.addTestResult(`开始测试删除笔记: ${this.data.selectedNote.title}`)

    try {
      // 1. 检查用户登录状态
      this.addTestResult('1. 检查用户登录状态...')
      const isLoggedIn = noteManager.isUserLoggedIn()
      this.addTestResult(`用户登录状态: ${isLoggedIn ? '已登录' : '未登录'}`)

      if (!isLoggedIn) {
        this.addTestResult('❌ 用户未登录，无法删除笔记')
        return
      }

      // 2. 检查笔记是否存在
      this.addTestResult('2. 检查笔记是否存在...')
      const noteExists = this.data.notes.find(n => n.id === this.data.selectedNote.id)
      this.addTestResult(`笔记存在: ${noteExists ? '是' : '否'}`)

      if (!noteExists) {
        this.addTestResult('❌ 笔记不存在')
        return
      }

      // 3. 测试软删除
      this.addTestResult('3. 执行软删除...')
      const userInfo = wx.getStorageSync('userInfo')
      const deleteResult = noteManager.softDeleteNote(userInfo.username, this.data.selectedNote.id)
      
      this.addTestResult(`软删除结果: ${JSON.stringify(deleteResult, null, 2)}`)

      if (deleteResult.success) {
        this.addTestResult('✅ 软删除成功')
        
        // 4. 重新加载笔记验证删除
        this.addTestResult('4. 重新加载笔记验证删除...')
        this.loadNotes()
        
        const noteStillExists = this.data.notes.find(n => n.id === this.data.selectedNote.id)
        this.addTestResult(`笔记仍存在: ${noteStillExists ? '是' : '否'}`)
        
        if (noteStillExists) {
          this.addTestResult('⚠️ 笔记仍然存在，但可能已被标记为删除状态')
          this.addTestResult(`笔记状态: ${noteStillExists.status || '正常'}`)
        } else {
          this.addTestResult('✅ 笔记已成功删除')
        }
      } else {
        this.addTestResult(`❌ 软删除失败: ${deleteResult.error}`)
      }

    } catch (error) {
      this.addTestResult(`❌ 删除测试异常: ${error.message}`)
    } finally {
      this.setData({ isLoading: false, currentTest: '' })
    }
  },

  async testAPIDelete() {
    if (!this.data.selectedNote) {
      this.addTestResult('❌ 请先选择要删除的笔记')
      return
    }

    this.setData({ isLoading: true, currentTest: '测试API删除' })
    this.addTestResult(`开始测试API删除: ${this.data.selectedNote.title}`)

    try {
      const userInfo = wx.getStorageSync('userInfo')
      if (!userInfo || !userInfo.token) {
        this.addTestResult('❌ 用户未登录或无Token')
        return
      }

      if (!this.data.selectedNote.serverId) {
        this.addTestResult('❌ 笔记没有serverId，无法从服务器删除')
        return
      }

      this.addTestResult(`尝试从服务器删除笔记: ${this.data.selectedNote.serverId}`)
      
      const result = await apiService.deleteNote(this.data.selectedNote.serverId)
      
      this.addTestResult(`API删除结果: ${JSON.stringify(result, null, 2)}`)

      if (result.success) {
        this.addTestResult('✅ API删除成功')
      } else {
        this.addTestResult(`❌ API删除失败: ${result.error}`)
      }

    } catch (error) {
      this.addTestResult(`❌ API删除异常: ${error.message}`)
    } finally {
      this.setData({ isLoading: false, currentTest: '' })
    }
  },

  selectNote(e) {
    const note = e.currentTarget.dataset.note
    this.setData({
      selectedNote: note
    })
    this.addTestResult(`已选择笔记: ${note.title}`)
  },

  addTestResult(message) {
    const timestamp = new Date().toLocaleTimeString()
    const result = {
      time: timestamp,
      message: message
    }
    
    this.setData({
      testResults: [...this.data.testResults, result]
    })
    
    console.log(`[${timestamp}] ${message}`)
  },

  clearResults() {
    this.setData({
      testResults: []
    })
  },

  copyResults() {
    const resultsText = this.data.testResults.map(r => `[${r.time}] ${r.message}`).join('\n')
    wx.setClipboardData({
      data: resultsText,
      success: () => {
        wx.showToast({
          title: '结果已复制',
          icon: 'success'
        })
      }
    })
  },

  refreshNotes() {
    this.loadNotes()
    this.addTestResult('已刷新笔记列表')
  }
})
