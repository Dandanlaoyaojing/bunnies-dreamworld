// pages/login/login.js
Page({

  /**
   * 页面的初始数据
   */
  data:{
name:"dan",
age:15,
hobby:"阅读",
userinfo:{name:"danny",hobby:"篮球"},
names:["aa","bb","cc","dd"],
goodslist:[{id:1001,name:"钢笔",price:"10"},{id:1002,name:"橡皮",price:"12"},{id:1003,name:"墨水",price:"15"}],
score:65,
ShowPhoto:true,
user:{},
  },
  handeleShowPhoto(){
this.setData({
  ShowPhoto:!this.data.ShowPhoto
})

  },
handleAddAge(){
let a=this.data.age+1
this.setData({
age:a
})
},
handleChangehobby(){
const user={...this.data.userinfo,age:19}
  this.setData({
    userinfo:user
    /**
     const userinfo={...this.data.userinfo,age:19}
     this.setData({userinfo})
     */
    /**只改爱好
     * this.setData({
     * "userinfo.hobby":"足球"
     * })
     */
  })
},
handleAddnames(){
  this.data.names.push("ee")
  this.setData({
    names:this.data.names
/**const newnames:[...this.data.names,"ee"]
 * this setData({
 * names:newnames
 * })
 */

  })
},
handleAdjustnames(){
  this.setData({
    "names[0]":"aaa"
  })
},
handleCutnames(){
  this.setData({
    names:this.data.names.slice(1)
  })
},

handleDownloadUserinfo(){
wx.request({
url:"https://h0fw57p730a0-deploy.space.z.ai/",
method:"GET",
data:{},
header:{},
success:(res)=>{
console.log(res.data)
this.setData({
  user:res.data
})
},
fail:(error)=>{
console.log(error)
},
})
}


})