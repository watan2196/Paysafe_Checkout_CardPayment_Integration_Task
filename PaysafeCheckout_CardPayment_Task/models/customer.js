const mongoose = require('mongoose');
const schema = mongoose.Schema;

const CustomerSchema = new schema({   
    customer_Id:String,
    email: String
});

module.exports = mongoose.model('Customer', CustomerSchema);