const express=require('express');
const bodyParser=require('body-parser');
const config = require('./config');
const fetch = require('node-fetch');
const mongoose = require("mongoose");
const axios = require('axios');
const cors=require('cors');
var path=require('path');
const Customer = require('./models/customer');
const app=express();

//mongodb database setup
mongoose.connect(config.db,{
	useNewUrlParser:true,
	useCreateIndex:true,
	useUnifiedTopology:true
}).then(() => {
	console.log("Connected to DB!");
}).catch(err => {
	console.log("error!",err.message);
});


//express setups
app.use(cors());
app.use(express.urlencoded({
  extended: true
}))
app.use (bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.set("view engine","ejs");

//function to generate the 
function uuidv4() {
					  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
					    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
					    return v.toString(16);
					  });}


//check if customer already exits in DB or comes for the first time for the payment checkout by asking for
// the email and the amount to pay
app.get("/",function(req,res){

	res.sendFile(path.join(__dirname+"/index.html"));
});

app.post("/makepayment",function(req,res){
	
	const Email=req.body.email;
	const Amount=req.body.amount;
	console.log(Email);
	console.log(Amount);
	// app.get("/customerinfo",function(req,res){
	// 				console.log("we are in customerinfo");
	// 				res.render("userinfo");
	// 			});
	Customer.findOne({email:Email}).exec((err,customer) =>{ // changed findOne
		// console.log(err);
		// console.log(customer);

		if(!customer)
		{
			
			console.log("new customer");	

			// app.post("/createCustomer",function (req,res) {
				
				const customerId = req.body.email;
				const firstName = req.body.firstname;
				const lastName = req.body.lastName;
				const phone = req.body.phone;
				const email = req.body.email;
				
				const body = JSON.stringify( {
					merchantCustomerId : customerId+firstName+phone+"479877865",
					// locale : 'en_US',
					firstName : firstName,
					email : email,
					phone : phone
				})
				
				var SUToken; 
				var customer_id;
				var mref; 

				//API call to create new customer, thus to generate the customer_Id
				 fetch('https://api.test.paysafe.com/paymenthub/v1/customers',{
				 	method : 'post',
				 	body : body,
				 	headers: {
			    		'Content-Type': 'application/json',
			    		'Authorization': config.ps_key,
			    		'Simulator': '\'EXTERNAL\''
			  		}	
				 }).then(res => res.json())
				 .then(data => {

						 		customer_id=data.id;
						 		var newCustomer = {customer_Id : customer_id , email:email};
								 Customer.create(newCustomer,function(err,newlyCreated){
								 		if(err)
								 			console.log(err);
								 		else
								 			console.log("new user successfully created");
								 });
						 		
				 				//create SingleUseCustomerToken using the above generated Customer_id
						 		mref: uuidv4(); //Generating unique merchantReferenceNumber
						 		// console.log(mref);

						 		//body of the object to be passed in the SingleUseCustomer token API call
						 		const body = JSON.stringify({
						 			"merchantRefNum" : "Ref123",
						 			"paymentTypes" : ["CARD"]
						 		}) // body of the request 	

						 		//API call to generate the one SingleUSeCustomer token using the customer_id 	
						 		fetch('https://api.test.paysafe.com/paymenthub/v1/customers/'+customer_id+'/singleusecustomertokens',{
						 			method : 'post',
						 			body : body,
						 			headers : {
						 				'Content-Type': 'application/json',
					    				'Authorization': config.ps_key,
					    				'Simulator': '\'EXTERNAL\''
						 			}	
						 		}).then(res => res.json())
						 		.then(data => {
						 			// console.log(data);
						 			SUToken = data.singleUseCustomerToken;
						 			//var token={ SUT:SUToken,email:email,merchantRefNum:"Ref123",amount:Amount};
						 			res.send({token:SUToken});
						 		})	
				 	})
				 
			// });
		}
		else
		{
			var mref;
			var SUToken;
			var customer_id;
			//Case when the customer already exits in the DB,hence already holds a paysafe account 
			// console.log("customer already exits");
			Customer.findOne({email:Email}).exec((err,customer) =>{
					if(err)
						console.log(err);
					else
					{
						customer_id=customer.customer_Id;
						console.log(customer_id);
						mref: uuidv4(); //Generating unique merchantReferenceNumber
						 		// console.log(mref);
						 		const body = JSON.stringify({
						 			merchantRefNum : mref,
						 			paymentTypes : ["CARD"]
						 		}) // body of the request 

						 		fetch('https://api.test.paysafe.com/paymenthub/v1/customers/'+customer_id+'/singleusecustomertokens',{
						 			method : 'post',
						 			body : body,
						 			headers : {
						 				'Content-Type': 'application/json',
					    				'Authorization': config.ps_key,
					    				'Simulator': '\'EXTERNAL\''
						 			}	
						 		}).then(res => res.json())
						 		.then(data => {
						 			// console.log(data);
						 			SUToken = data.singleUseCustomerToken;
						 			//mref: Math.floor(100000000 + Math.random() * 90000000000);
						 			//var email=req.body.email;
						 			//var token={ SUT:SUToken,email:email,merchantRefNum:mref,amount:Amount};

				 					res.send({token:SUToken});
						 		});	
					}
				});
		}
	});

});



//Payment Processing Route 
app.post('/processPayment', function (req, res) { 

			
			// console.log("process payment");
			// console.log(req.body);
				
				// const mref=uuidv4();
			// console.log(mref);

		    var values ={
		    	"merchantRefNum": uuidv4(),
		    	"amount": req.body.amount,
		    	"currencyCode": "USD",
		        "paymentHandleToken": req.body.token,
		        "description": "Assignment check"
		        
		    };
		    
		    // console.log(values.merchantRefNum);

		    fetch('https://api.test.paysafe.com/paymenthub/v1/payments',{
					method : 'post',
					body : JSON.stringify(values),
					headers: {
					    'Content-Type': 'application/json',
					    'Authorization': config.ps_key,
					    'Simulator': '\'EXTERNAL\''
					  		}	
						 }).then(res => res.json())
						 .then(data => {
						 	// console.log(data);
						 	res.send({data:data.status});
						 });
});	




const PORT=process.env.PORT || 3000
app.listen(PORT,function () {
	console.log("server started at PORT "+PORT);
});
