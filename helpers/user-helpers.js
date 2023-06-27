var db = require('../config/connection')

var collection = require('../config/collections')

var objectId = require('mongodb').ObjectId

const bcrypt = require('bcrypt')
const { response } = require('express')
const { ObjectId } = require('mongodb')

const Razorpay = require('razorpay');
const e = require('express')
const { resolve } = require('node:path')

var instance = new Razorpay({ 
    key_id: 'rzp_test_UKgu9AEqAlRAsk',
    key_secret: 'kAOEKm5YLyEd5ZA9m3VJJ6oD'
})


module.exports = {

    doSignup: (userData) => {

        return new Promise(async (resolve, reject) => {

            userData.Password = await bcrypt.hash(userData.Password, 10)
            console.log(userData.Password);
            db.get().collection(collection.USER_COLLECTION).insertOne(userData).then((data) => {
                userData._id = data.insertedId
                console.log(userData);
                resolve(userData)
            })
        })

    },

    doLogin: (userData) => {

        return new Promise(async (resolve, reject) => {

            let loginStatus = false
            let response = {}

            let user = await db.get().collection(collection.USER_COLLECTION).findOne({ Email: userData.Email })

            if (user) {
                bcrypt.compare(userData.Password, user.Password).then((status) => {
                    if (status) {
                        console.log("Login Success")
                        response.user = user
                        response.status = true
                        resolve(response)
                    } else {
                        console.log("Login Unsuccessfull")
                        resolve({ status: false })
                    }
                })
            } else {
                console.log("No Account Like This");
                resolve({ status: false })
            }
        })
    },

    addToCart: (porductId, userId) => {
        let productObject = {
            item: new objectId(porductId),
            quantity: 1
        }
        return new Promise(async (resolve, reject) => {
            let userCart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: new objectId(userId) })
            if (userCart) {
                let productExist = userCart.products.findIndex(product => product.item == porductId)
                console.log(productExist);
                if (productExist != -1) {
                    db.get().collection(collection.CART_COLLECTION)
                        .updateOne({ user: new objectId(userId), 'products.item': new objectId(porductId) },
                            {
                                $inc: { 'products.$.quantity': 1 }
                            }).then(() => {
                                resolve()
                            })
                } else {
                    db.get().collection(collection.CART_COLLECTION)
                        .updateOne({ user: new objectId(userId) },
                            {
                                $push: { products: productObject }
                            }).then((response) => {
                                resolve()
                            })
                }
            } else {
                let cartObject = {
                    user: new objectId(userId),
                    products: [productObject]
                }
                db.get().collection(collection.CART_COLLECTION).insertOne(cartObject).then((response) => {
                    resolve()
                })
            }
        })
    },

    getCartProducts: (userId) => {
        return new Promise(async (resolve, reject) => {
            let cartItems = await db.get().collection(collection.CART_COLLECTION).aggregate([
                {
                    $match: { user: new ObjectId(userId) }
                },
                {
                    $unwind: '$products'
                },
                {
                    $project: {
                        item: '$products.item',
                        quantity: '$products.quantity'
                    }
                },
                {
                    $lookup: {
                        from: collection.PRODUCT_COLLECTION,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                {
                    $project: {
                        item: 1,
                        quantity: 1,
                        product: { $arrayElemAt: ['$product', 0] }
                    }
                }
            ]).toArray()
            resolve(cartItems)
        })
    },

    getCartCount: (userId) => {

        return new Promise(async (resolve, reject) => {

            let cart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: new objectId(userId) })

            let count = 0;

            if (cart) {
                count = cart.products.length
            }
            resolve(count)
        })
    },

    changeProductQuantity: (details) => {
        count = parseInt(details.count)
        quantity = parseInt(details.quantity)
        return new Promise((resolve, reject) => {
            if (count == -1 && quantity == 1) {
                db.get().collection(collection.CART_COLLECTION)
                    .updateOne({ _id: new objectId(details.cart) },
                        {
                            $pull: { products: { item: new objectId(details.product) } }
                        }).then((response) => {
                            resolve({ removeProduct: true })
                        })
            } else {
                db.get().collection(collection.CART_COLLECTION)
                    .updateOne({ _id: new objectId(details.cart), 'products.item': new objectId(details.product) },
                        {
                            $inc: { 'products.$.quantity': count }
                        }).then((response) => {
                            resolve({ status: true })
                        })
            }
        })
    },

    getTotalAmount: (userId) => {

        return new Promise(async (resolve, reject) => {
            let total = await db.get().collection(collection.CART_COLLECTION).aggregate([
                {
                    $match: { user: new ObjectId(userId) }
                },
                {
                    $unwind: '$products'
                },
                {
                    $project: {
                        item: '$products.item',
                        quantity: '$products.quantity'
                    }
                },
                {
                    $lookup: {
                        from: collection.PRODUCT_COLLECTION,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                {
                    $project: {
                        item: 1,
                        quantity: 1,
                        product: { $arrayElemAt: ['$product', 0] }
                    }
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: { $multiply: ['$quantity', { $toInt: '$product.Price' }] } }
                    }
                }
            ]).toArray()
            resolve(total[0].total)
        })

    },

    placeOrder: (order, products, total) => {
        return new Promise(async (resolve, reject) => {
            console.log(order, products, total)
            let status = order['payment-method'] === 'COD' ? 'placed' : 'pending'
            let orderObj = {
                deliveryDetails: {
                    mobile: order.Mobile,
                    adress: order.Adress,
                    pincode: order.Pincode
                },
                userId: new objectId(order.UserId),
                paymentMethod: order['payment-method'],
                products: products,
                totalAmount: total,
                status: status,
                date: new Date()
            }

            db.get().collection(collection.ORDER_COLLECTION).insertOne(orderObj).then((response) => {
                db.get().collection(collection.CART_COLLECTION).deleteOne({ user: new objectId(order.UserId) })
                resolve(response.insertedId)
            })
        })
    },

    getCartProductList: (userId) => {
        return new Promise(async (resolve, reject) => {
            let cart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: new objectId(userId) })
            console.log(cart);
            resolve(cart.products)
        })
    },

    getUserOrders: (userId) => {
        return new Promise(async (resolve, reject) => {
            let orders = await db.get().collection(collection.ORDER_COLLECTION)
                .find({ userId: new objectId(userId) }).toArray()
            resolve(orders)
        })
    },

    getOrderProducts: (orderId) => {
        return new Promise(async (resolve, reject) => {
            let orderItems = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $match: { _id: new ObjectId(orderId) }
                },
                {
                    $unwind: '$products'
                },
                {
                    $project: {
                        item: '$products.item',
                        quantity: '$products.quantity'
                    }
                },
                {
                    $lookup: {
                        from: collection.PRODUCT_COLLECTION,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                {
                    $project: {
                        item: 1,
                        quantity: 1,
                        product: { $arrayElemAt: ['$product', 0] }
                    }
                }
            ]).toArray()
            resolve(orderItems)

        })
    },

    generateRazorpay: (orderId,total) => {
        return new Promise((resolve, reject) => {
            var options = {
                amount: total*100,  // amount in the smallest currency unit
                currency: "INR",
                receipt: ""+orderId
            };
            instance.orders.create(options, function (err, order) {
                if(err){
                    console.log(err);
                }else{
                    console.log('New Order : ',order);
                    resolve(order)
                }
            });
        })
    },

    verifyPayment : (details)=>{
        return new Promise(async(resolve, reject) => {
            const {
                createHash,
              } = await import('node:crypto');

              let hash = createHash('sha256' , 'kAOEKm5YLyEd5ZA9m3VJJ6oD' );

              hash.update(details['payment[razorpay_order_id]']+details['payment[razorpay_payment_id]']);

              hash = hash.digest('hex')

              if(hash === details['payment[razorpay_signature]']){
                resolve()
              }else{
                reject()
              }
        })
    },

    changePaymentStatus : (orderId) =>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.ORDER_COLLECTION)
            .updateOne({_id: new objectId(orderId)},
            {
                $set :{
                    status : 'placed'
                }
            }).then(()=>{
                resolve()
            })
        })
    }
}