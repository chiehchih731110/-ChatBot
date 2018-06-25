//import module
var restify = require("restify");
var builder = require("botbuilder");
var request = require("request");

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
        url: "https://www.alphavantage.co/query", 
        //寫在api url ?後面的參數，要放在qs(key)的Json set內
        qs:{
        function: "TIME_SERIES_DAILY",
        symbol: id,
        apikey:"2C8MUXABNVMED4DS"
        }, 
        //指定json格式的輸出
        json:true
    }
    request(options, function (error, response, body){
        var stock = body;

        //用RegExpression, 找出JSON檔第一筆日期的資料，可以避免節慶日找不到資料
        var res = JSON.stringify(stock["Time Series (Daily)"]).match(/\d{4}-\d{2}-\d{2}/);
        
        // var tradeday = d.toISOString().slice(0, 10);
        var open = stock["Time Series (Daily)"][res]["1. open"]
        var high = stock["Time Series (Daily)"][res]["2. high"]
        var low = stock["Time Series (Daily)"][res]["3. low"]
        var close = stock["Time Series (Daily)"][res]["4. close"]
        session.endDialog(`${res} \nopen $${open}\nhigh $${high}\nlow $${low}\nclose $${close}`);
    });
});