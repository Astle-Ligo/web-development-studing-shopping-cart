const {MongoClient} = require('mongodb')

const state = {
    db:null
}

const url = 'mongodb://127.0.0.1:27017'
const dbName = 'shopping'

const client = new MongoClient(url);
const connectDb = async (done) =>{
    try{
        await client.connect();
        const db = client.db(dbName)
        state.db = db
        return done()
    }catch(err){
        return done(err)
    }
}

const get = ()=> state.db

module.exports = {
    connectDb,
    get
}