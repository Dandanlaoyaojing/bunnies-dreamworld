// pages/knowledge/knowledge.js
Page({
  data: {
    category: 'knowledge',
    title: '知识世界',
    items: [
      { id: 1, title: '科学探索', image: '/images/menu/knowledge.png', desc: '探索科学的奥秘' },
      { id: 2, title: '历史故事', image: '/images/menu/knowledge.png', desc: '了解历史的故事' },
      { id: 3, title: '文化学习', image: '/images/menu/knowledge.png', desc: '学习各种文化' }
    ]
  },

  onLoad(options) {
    console.log('知识页面加载')
  },

  onItemTap(e) {
    const item = e.currentTarget.dataset.item
    wx.showToast({
      title: `点击了${item.title}`,
      icon: 'none'
    })
  },

  goHome() {
    wx.switchTab({
      url: '/pages/1/1'
    })
  }
})
