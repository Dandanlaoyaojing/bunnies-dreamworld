// pages/1/1.js
Page({

  /**
   * 页面的初始数据
   */
  data: {

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