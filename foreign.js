//import module
var restify = require("restify");
var builder = require("botbuilder");
var request = require("request");

//Setup Web Server
var server = restify.createServer();

server.listen(process.env.port || process.env.PORT || "3978", function () {
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

var bot = new builder.UniversalBot(connector,[
    function (session){
    session.send("歡迎來到外匯報價所")    
    builder.Prompts.choice(session,"請問手上有什麼貨幣?","TWD|USD|JPY|EUR|CNY|AUD",
    {listStyle:builder.ListStyle.button});
    },
    function(session,results){
        // 取得要輸入from_currency的資料
        session.dialogData.fid = results.response.entity;
        builder.Prompts.choice(session,"請問要換成哪國貨幣?","TWD|USD|JPY|EUR|CNY|AUD",
        {listStyle:builder.ListStyle.button});
    },
    function(session,results){
        // 取得要輸入to_currency的資料
        session.dialogData.tid = results.response.entity;
        var options = {
            method: "GET",
            url: "https://www.alphavantage.co/query",
            //寫在api url 後面的參數，要放在qs(key)的Json set內
            qs: {
                function: "CURRENCY_EXCHANGE_RATE",
                from_currency: session.dialogData.fid,
                to_currency: session.dialogData.tid,
                apikey: "80WQWZNQQ53A0MLK"
            },
            //指定json格式的輸出
            json: true
        }
        request(options, function (error, response, body) {
            var currency = body;
            var ExchangeRate = currency["Realtime Currency Exchange Rate"]["5. Exchange Rate"]
            session.endDialog(`$1 ${session.dialogData.fid}可兌換$${ExchangeRate} ${session.dialogData.tid}`);
        });
    }

])