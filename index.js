const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();
const ses = new AWS.SES({ region: "us-east-1" });
const five_mins = 60 * 1000 * 5

function generate_token(length){
    const a = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890".split("");
    const b = [];  
    for (let i=0; i<length; i++) {
        const j = (Math.random() * (a.length-1)).toFixed(0);
        b[i] = a[j];
    }
    return b.join("");
}

function insertintodynamodb({username,token,type,expirationTime}){
    const putparams = {
        Item:{
            username:username,
            token: token,
            messagetype:type,
            TimeToLive: expirationTime
        },
        TableName: "webapp_csye6225"
    }

    const getparams = {
        Key:{
            username:username
        },
        TableName: "webapp_csye6225"
    }

    return new Promise(function(resolve,reject){
        dynamodb.get(getparams,function(err,data){
            if (err){
                reject({err})
            }
            else{
                if (!data.Item){
                    console.log("Adding data")
                    dynamodb.put(putparams,function(err,data){
                        if (err){
                            reject({err})
                        }
                        else{
                            resolve({data})
                        }
                    })
                }
                else{
                    console.log("data already exists")
                    reject({err:"data already exists"})
                }
            }
        })
    })
}

function sendEmailtemplate({username,token}){

    const msg = `<a href="http://prod.yongjishen.me/v1/verifyUserEmail?email=${username}&token=${token}">Click this to activate account</a>
                <br/>
                <p>http://prod.yongjishen.me/v1/verifyUserEmail?email=${username}&token=${token}</p>`
    const params ={
        Destination:{
            ToAddresses:[
                username
            ]
        },
        Message:{
            Body:{
                Html:{
                    Charset: "UTF-8",
                    Data: msg
                },
                Text: {
                    Charset: "UTF-8",
                    Data: msg
                }
            },
            Subject: {
                Charset: 'UTF-8',
                Data: '[CSYE6225-Webapp] Please activate your account'
            }
        },
        Source: `webapp_csye6225@prod.yongjishen.me`
    }

    return ses.sendEmail(params).promise()
}

exports.handler = (event,context,callback)=>{
    const type = event.Records[0].Sns.Type
    const subject = event.Records[0].Sns.Subject
    const message =JSON.parse(event.Records[0].Sns.Message)
    const username = message.username

    const expirationTime = (new Date().getTime() + five_mins)
    console.log(new Date().getTime(), expirationTime)
    const token = generate_token(32)
    console.log({username,token,type,expirationTime})

    insertintodynamodb({username,token,type,expirationTime})
    .then(({data})=>{
        console.log(data)
        console.log("success")
        sendEmailtemplate({username,token})
        .then(()=>{
            console.log("email sent")
        })
        .catch((err)=>{
            console.log(err)
        })
    })
    .catch(({err})=>{
        console.log(err)
    })
}