// pages/foods/foods.js
Page({
  data: {
    category: 'foods',
    title: '美食世界',
    items: [
      { id: 1, title: '甜点时光', image: '/images/menu/foods.png', desc: '享受甜蜜的时光' },
      { id: 2, title: '家常菜谱', image: '/images/menu/foods.png', desc: '学习美味家常菜' },
      { id: 3, title: '异国料理', image: '/images/menu/foods.png', desc: '探索世界美食' }
    ]
  },

  onLoad(options) {
    console.log('美食页面加载')
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
