//import module
var restify = require("restify");
var builder = require("botbuilder");
var request = require("request");
// var toFixed = require('tofixed');

//Setup Web Server
var server = restify.createServer();

server.listen(process.env.port || process.env.PORT || "3978", function(){
    console.log('%s listening to %s', server.name, server.url);
});

//create chat connector for communicating with the bot framework service
var connector = new builder.ChatConnector({
    appId: process.env.MicrosoftAppId,
    appPassword: process.env.MicrosoftAppPassword,
});

//Listen for messages from users
server.post('/api/messages', connector.listen());

//create your bot with a function to receive messages from user

var bot = new builder.UniversalBot(connector, function(session){
    var id = session.message.text;
    var options = {
        method:"GET",
        url: "https://min-api.cryptocompare.com/data/price", 
        //寫在api url ?後面的參數，要放在qs(key)的Json set內
        qs:{
        fsym: id,
        // symbol: id,
        tsyms:"USD,TWD",
        // apikey:"2C8MUXABNVMED4DS"
        }, 
        //指定json格式的輸出
        // json:true
    }
    request(options, function (error, response, body){
        var stock = body;
        if(stock["Time Series (Daily)"]){
            //用RegExpression, 找出JSON檔第一筆日期的資料，可以避免節慶日找不到資料
            // var date = JSON.stringify(stock["Time Series (Daily)"]).match(/\d{4}-\d{2}-\d{2}/);
            //parseFloat 將文字改成Float type, toFixed(2)將數字縮到小數點2位數
            // var open = parseFloat(stock["Time Series (Daily)"][date]["1. open"]).toFixed(2)         
            session.endDialog(`${id.toUpperCase()}今日價格如下:\nUSD： ${USD} \n新台幣：${TWD}`);
            // session.endDialog(`${id.toUpperCase()} : ${date} \n open $${open}\n high $${high}\n low $${low}\n close $${close}`);
        }else{
            session.endDialog(`沒有找到這個加密貨幣!`);
        }
    });
});