// pages/1/1.js
Page({

  /**
   * 页面的初始数据
   */
  data: {

  },

  /**
   * 跳转到API测试页面
   */
  goToAPITest() {
    wx.navigateTo({
      url: '/pages/api-test/api-test'
    })
  },

  /**
   * 跳转到笔记编辑器
   */
  goToNoteEditor() {
    wx.navigateTo({
      url: '/pages/note-editor/note-editor'
    })
  },

  /**
   * 跳转到知识星图
   */
  goToKnowledgeMap() {
    console.log('从首页跳转到知识星图页面')
    
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

  /**
   * 跳转到草稿箱
   */
  goToDraftBox() {
    console.log('从首页跳转到草稿箱页面')
    
    wx.navigateTo({
      url: '/pages/draft-box/draft-box',
      success: (res) => {
        console.log('跳转到草稿箱成功:', res)
      },
      fail: (err) => {
        console.error('跳转到草稿箱失败:', err)
        wx.showToast({
          title: '跳转失败: ' + (err.errMsg || '未知错误'),
          icon: 'none',
          duration: 3000
        })
      }
    })
  },

  /**
   * 跳转到我的笔记
   */
  goToMyNotes() {
    console.log('从首页跳转到我的笔记页面')
    
    wx.navigateTo({
      url: '/pages/my-notes/my-notes',
      success: (res) => {
        console.log('跳转到我的笔记成功:', res)
      },
      fail: (err) => {
        console.error('跳转到我的笔记失败:', err)
        wx.showToast({
          title: '跳转失败: ' + (err.errMsg || '未知错误'),
          icon: 'none',
          duration: 3000
        })
      }
    })
  },

  /**
   * 处理菜单点击事件 - 现在跳转到文件簿
   */
  onMenuTap(e) {
    const page = e.currentTarget.dataset.page
    const categoryMap = {
      'art': '艺术',
      'cute': '萌物', 
      'dreams': '梦游',
      'foods': '美食',
      'happiness': '趣事',
      'knowledge': '知识',
      'sights': '风景',
      'thinking': '思考'
    }
    
    if (categoryMap[page]) {
      wx.navigateTo({
        url: `/pages/notebook/notebook?category=${page}&title=${categoryMap[page]}`
      })
    } else {
      wx.showToast({
        title: '分类不存在',
        icon: 'none'
      })
    }
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {

  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady() {

  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {

  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide() {

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {

  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {

  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {

  }
})