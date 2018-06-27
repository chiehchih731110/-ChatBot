// import module
var restify = require("restify");
var builder = require("botbuilder");
var request = require("request");
var date = require("date");

// Setup Web Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || "3978", function(){
    console.log('%s listening to %s', server.name, server.url);
});

// create chat connector for communicating with the bot framework service
var connector = new builder.ChatConnector({
    appId: process.env.MicrosoftAppId,
    appPassword: process.env.MicrosoftAppPassword,
});

// Listen for messages from users
server.post('/api/messages', connector.listen());

// create your bot with a function to receive messages from user

var bot = new builder.UniversalBot(connector, function(session){
    var id = session.message.text;
    var options = {
        method:"GET",
        url: "https://www.quandl.com/api/v3/datasets/CME/GCZ2018.json?", 
        // 寫在api url ?後面的參數，要放在qs(key)的Json set內
        // qs:{
        //     api_key="sae2Txxu_kQTHFHDxyjr"
        // }, 
        // 指定json格式的輸出
        json:true
    }
    request(options, function (error, response, body){
        var gold = body;
        // 建立日期物件，放入今天的日期
        var d = new Date();
        // 當日期是周末，則將日期回到上個周五
        if (d.getDay()==0)
            d.setDate(d.getDate()-1);
        if (d.getDay()==1)
            d.setDate(d.getDate()-2);
        // 將日期改成ISO規則日期的第0-10個字元 YYYY-mm-dd

        // TODO:更好的方式是用RegExpression,找出JSON檔第一筆日期的資料,可以避免節慶日找不到資料
        
        var tradeday = d.toISOString().slice(0, 10);
        var getgold = gold["dataset"]["data"][0][4]
        session.endDialog(`${tradeday} close at : $${getgold}`);
    });
});