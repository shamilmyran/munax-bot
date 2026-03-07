const db=require("../database"),
fs=require("fs")

module.exports={
 addNewVip:async(data)=>{
   try{
   if(data.created_at*1000-(Date.now())>86400000) throw "The Payment Id Was Expired"
   var already=await db.get().collection("vip").findOne({user:String(data.notes.id)})
   var already2 =await db.get().collection("vip").findOne({payment_id:data.id})
   if(already2) throw "This Payment Id Was Already In Use,Please Check If You are Already A plan holder"
   let plan=await db.get().collection("plans").findOne({plan:data.notes.plan})
   if(already&&already.normal&&plan.type==="normal") throw "This User Already In Vip List"
   //var ind=plan.findIndex(x=>x.plan===data.notes.plan)
  // plan=plan[ind]
  console.log(plan);
   var vipData={
     user:data.notes.id,
     payment_id:data.id,
     amount:data.amount/100,
     currency:data.currency,
   }
   if(already){
     if(plan.type=="addon"){
       await db.get().collection("vip").updateOne({user:String(data.notes.id)},{$set:{
         addon:true,
         addon_limit:(already.addon_limit)?parseInt(already.addon_limit)+parseInt(plan.limit):parseInt(plan.limit),
         addon_valid:parseInt(plan.valid)*86400000,
         addon_plan:plan.plan,
         addon_date:Date.now()
       }})
       return vipData
     }else if(!already.normal&&plan.type==="normal"){
       await db.get().collection("vip").updateOne({user:String(data.notes.id)},{$set:{
         normal:true,
         normal_limit:plan.limit,
         normal_valid:Number(plan.valid)*86400000,
         normal_plan:plan.plan,
         normal_date:Date.now()
       }})
       return vipData
     }else throw "This user already have an valid translation pack"
   }else{
     if(plan.type==="addon"){
       vipData.addon=true,vipData.addon_limit=parseInt(plan.limit),vipData.addon_valid=Number(plan.valid)*86400000,vipData.addon_plan=plan.plan,
       vipData.addon_date=Date.now()
     }else{
       vipData.normal=true,vipData.normal_limit=plan.limit,vipData.normal_valid=Number(plan.valid)*86400000,vipData.normal_plan=plan.plan,vipData.normal_date=Date.now()
     }
     await db.get().collection("vip").insertOne(vipData)
     return vipData
   }
   return vipData
   }catch(e){
     var err=new Error()
     err.error=e
     console.log(e);
     return err
   }
 },
 get:async(collection,checkData,findOne)=>{
   if(findOne){
     var findedData=await db.get().collection(collection).findOne(checkData)
     return findedData
   }else{
   var findedData=await db.get().collection(collection).find(checkData).toArray()
   return findedData
   }
 },
 delete:async(col,match)=>{
   await db.get().collection(col).deleteOne(match)
 },
 set:async(col,data)=>{
   await db.get().collection(col).insertOne(data)
   return
 },
 update:async(col,exp,data)=>{
   await db.get().collection(col).updateOne(exp,{$set:data})
   return
 },
 getPlans:async()=>{
   try{
     var plans=await db.get().collection("plans").find().toArray()
     return plans
   }catch(e){
     console.log(e);
     return null
   }
 },
 changePlan:async(condition,value)=>{
   try{
     await db.get().collection("plans").deleteOne(condition)
     await db.get().collection("plans").insertOne(value)
     return
   }catch(e){
     console.log(e);
     return 
   }
 },
 addPlan:async(plan)=>{
   try{
   await db.get().collection("plans").insertOne(plan)
   }catch(e){
     console.log(e)
     return ;
   }
 },
 updateUsage:async(id)=>{
   var usage=await db.get().collection("usage").findOne({user:Number(id)})
   var isVip=await db.get().collection("vip").findOne({user:String(id)})
   console.log(isVip,usage,"vip and usage");
   if(isVip&&isVip.addon&&(!isVip.normal||isVip.normal_limit<usage.used)&&(usage&&usage.used>=20)){
     await db.get().collection("vip").updateOne({user:String(id)},{$set:{addon_limit:isVip.addon_limit-1}})
     return;
   }else{
     var used=1
     if(usage){
       used+=usage.used
       await db.get().collection("usage").updateOne({user:id},{$set:{used:used}})
      return;
    }else{
      await db.get().collection("usage").insertOne({user:id,used:1})
      return
    }
  }
 },
 addAd:async(data)=>{
   try{
   let d=await db.get().collection("ads").findOne({adName:data.adName,adsUrl:data.adsUrl})
   console.log(d,"from add ad");
   if(d){
     await db.get().collection("ads").updateOne({adName:data.adName,adsUrl:data.adsUrl},{"$set":{adsScript:data.adsScript}})
     console.log("after updation");
     return {sts:true}
   }
   await db.get().collection('ads').insertOne(data)
   return {sts:true}
   }catch(e){
     console.log(e);
     return {sts:false,err:e}
   }
 },
 getAds:async()=>{
   try{
     var ads=await db.get().collection("ads").find().toArray()
     return {sts:true,ads}
   }catch{
     return {sts:false}
   }
 },
 reset_translation:async()=>{
   try{
    await db.get().collection("usage").drop()
    let vip=await db.get().collection("vip").find().toArray()
    while(vip.length){
      var v=vip.splice(0,1)[0],
      e;
      if(v.normal){
        e=v.normal_valid-(Date.now()-v.normal_date)
        if(e<=0){
          if(v.addon&&v.addon_limit>0){
            await db.get().collection("vip").updateOne({user:v.user},{
              $set:{
                normal:false,normal_valid:null,normal_plan:null,normal_limit:null,normal_date:null
              }
            })
          }else{
            await db.get().collection("vip").deleteOne({user:v.user})
          }
        }
      }
      if(v.addon){
        e=v.addon_valid-(Date.now()-v.addon_date)
        if(e<=0){
          if(v.normal){
            await db.get().collection("vip").updateOne({user:v.user},{
              $set:{
                addon:false,addon_valid:null,addon_plan:null,addon_limit:null,addon_date:null
              }
            })
          }else{
            await db.get().collection("vip").deleteOne({user:v.user})
          }
        }
      }
      
    }
    return true
   }catch(e){
     console.log(e);
     return false
   }
 },
 addVipAdmin:async(data)=>{
   try{
     if(!data.id||!data.planName||!data.planType)throw "required data not found"
     //checking that is the user is already a vip holder
      let already=await db.get().collection("vip").findOne({user:String(data.id)}),
      plan=await db.get().collection("plans").findOne({plan:data.planName}); //getting plan detials
      console.log(plan);
      if(already&&already.normal&&data.planType=="normal") throw "This User Already a Normal Plan Holder"
      if(already){
        if(data.planType==="normal"){
          await db.get().collection("vip").updateOne({user:String(data.id)},{
            $set:{
              normal:true,
              normal_limit:plan.limit,
              normal_valid:Number(plan.valid)*86400000,
              normal_plan:plan.plan,
              normal_date:Date.now()
            }
          })
          return data
        }else if(data.planType=="addon"){
          await db.get().collection("vip").updateOne({user:String(data.id)},{
            $set:{
              addon:true,
              addon_limit:((already.addon)?(Number(already.addon_limit)+Number(plan.limit)):Number(plan.limit)),
              addon_valid:Number(plan.valid)*86400000,
              addon_plan:plan.plan,
              addon_date:Date.now()
            }
          })
          return data
        }else throw "Unexpected Error Occurred"
      }else{
        let vip;
        if(plan.type==="normal"){
          vip={
            user:String(data.id),
            normal:true,
            normal_limit:plan.limit,
            normal_valid:Number(plan.valid)*86400000,
            normal_plan:plan.plan,
            normal_date:Date.now()
          }
        }else if(plan.type==="addon"){
          vip={
            user:String(data.id),
            addon:true,
            addon_limit:plan.limit,
            addon_valid:Number(plan.valid)*86400000,
            addon_plan:plan.plan,
            addon_date:Date.now()
          }
        }else throw "Unexpected Error"
        await db.get().collection("vip").insertOne(vip)
        return vip
      }
   }catch(e){
     console.log(e);
     if(e instanceof Error)return e
     let err;
     if(typeof e ==="string"){
       err=new Error()
       err.message=e
     }
     return err||e
   }
 },
 removeVipAdmin:async(data)=>{
   try{
     console.log(data);
     if(!data.id||!data.plans)throw "required data not found"
     let vip=await db.get().collection("vip").findOne({user:String(data.id)})
     if(!vip)throw "This User Is Not In Vip List"
     if(data.plans.length===2||(vip.addon&&!vip.normal)||(vip.normal&&!vip.addon)){
       await db.get().collection("vip").deleteOne({user:String(data.id)})
       return null
     }else if(data.plans==="addon"){
       await db.get().collection("vip").updateOne({user:String(data.id)},{
         $set:{
           addon:false,addon_date:null,addon_plan:null,addon_valid:null,addon_limit:null
         }
       })
       return null
     }else if(data.plans==="normal"){
       await db.get().collection("vip").updateOne({user:String(data.id)},{
         $set:{
           normal:false,normal_date:null,normal_plan:null,normal_valid:null,normal_limit:null
         }
       })
       return null
     }else throw "Not Acceptable Plan Type"
   }catch(e){
     if(e instanceof Error)return e
     let err;
     if(typeof e ==="string"){
       err=new Error()
       err.message=e
     }
     return err||e
   }
 },
 count:async(col,exp)=>{
   try {
     let c=await db.get().collection(col).count(exp)
     return c
   } catch (e) {
     console.log(e);
     return null
   }
 },
 db:db
};

/*(()=>{
setTimeout(async function() {

console.log("successfully deleted",await db.get().collection("vip").find().toArray());
await db.get().collection("vip").deleteOne({user:"1504314507"})
await db.get().collection("usage").deleteOne({user:1504314507})
console.log("successfully deleted",await db.get().collection("vip").find().toArray());
}, 10000);
})();*/