var db = require('../config/connection')

var collection = require('../config/collections')
const { response } = require('express')

var objectId = require('mongodb').ObjectId

module.exports ={

    addProduct:(product,callback)=>{
        db.get().collection('product').insertOne(product).then((data)=>{
            callback(data.insertedId.toString())
        })
    },

    getAllProducts:()=>{
        return new Promise(async(resolve,reject)=>{
            let products = await db.get().collection(collection.PRODUCT_COLLECTION).find().toArray()
            resolve(products)
        })
    },

    deleteProduct : (productId) =>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.PRODUCT_COLLECTION).deleteOne({_id: new objectId(productId)}).then((response)=>{
                //console.log(response);
                resolve(response)
            })
        })
    },

    getProductDetails : (productId)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.PRODUCT_COLLECTION).findOne({_id: new objectId(productId)}).then((product)=>{
                resolve(product)
            })
        })
    },

    updateProduct : (productId,productDetails)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.PRODUCT_COLLECTION).updateOne({_id: new objectId(productId)},{
                $set :{
                    Name        :   productDetails.Name,
                    Category    :   productDetails.Category,
                    Price       :   productDetails.Price,
                    Description :   productDetails.Description
                }
            }).then((response)=>{
                resolve()
            })
        })
    }
}