var express = require('express');
const app = require('../app');
var router = express.Router();

const productHelpers = require('../helpers/product-helpers');

/* GET users listing. */
router.get('/', function (req, res, next) {

  productHelpers.getAllProducts().then((products)=>{

    res.render('admin/view-products', { admin: true, products })
  })

  
})

router.get('/add-product', function (req, res) {
  res.render('admin/add-product')
})

router.post('/add-product', (req, res) => {

  productHelpers.addProduct(req.body, (id) => {
    let image = req.files.Image
    console.log(id)
    image.mv('./public/product-images/' + id + '.jpg', (err) => {
      if (!err) {
        res.render('admin/add-product')
      } else {
        console.log(err)
      }
    })
  })
})

router.get('/delete-product/:id',(req,res)=>{
  let productId = req.params.id
  console.log(productId)
  productHelpers.deleteProduct(productId).then((response)=>{
    res.redirect('/admin/')
  })
})

router.get('/edit-product/:id',async(req,res)=>{

  let product = await productHelpers.getProductDetails(req.params.id)
  console.log(product);
  res.render('admin/edit-product',{product})
})

router.post('/edit-product/:id',(req,res)=>{
  let id = req.params.id
  productHelpers.updateProduct(id,req.body).then(()=>{
    res.redirect('/admin/')
    if(req.files.Image){
      let image = req.files.Image
      image.mv('./public/product-images/' + id + '.jpg')
    }
  })
})
module.exports = router;
