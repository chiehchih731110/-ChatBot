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

var bot = new builder.UniversalBot(connector, [
    function(session){
        builder.Prompts.choice(session, "請問要您要怎麼查詢加密貨幣?", ["BTC", "ETH", "XRP","XMR","DOGE","熱門加密貨幣"], { listStyle: builder.ListStyle.button});
    },
    function (session, results){
    var id = results.response.entity
    if(id == "熱門加密貨幣"){
        var options = {
            method:"GET",
            url: "https://min-api.cryptocompare.com/data/pricemulti?fsyms=BTC,ETH,XRP,XMR,DOGE&tsyms=USD,TWD",           
            json:true
        }
    }else{
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
            json:true
        }
    }
    request(options, function (error, response, body){
        var coin = body;
        if(id == "熱門加密貨幣"){
            session.endDialog(
                `今日熱門貨幣價格如下:<br>比特幣\n:\nUSD:\n${coin.BTC.USD}\n,\nNTD:\n${coin.BTC.TWD}<br>以太幣\n:\nUSD:\n${coin.ETH.USD}\n,\nNTD:\n${coin.ETH.TWD}<br>瑞波幣\n:\nUSD:\n${coin.XRP.USD}\n,\nNTD:\n${coin.XRP.TWD}<br>門羅幣\n:\nUSD:\n${coin.XMR.USD}\n,\nNTD:\n${coin.XMR.TWD}<br>🐕狗幣:\nUSD:\n${coin.DOGE.USD}\n,\nNTD:\n${coin.DOGE.TWD}<br>
                `
            )
        }else{
            if(coin){                 
                session.endDialog(`${id}今日價格如下:<br>USD： ${coin.USD}<br>新台幣：${coin.TWD}`);
            }else{
                session.endDialog(`沒有找到這個加密貨幣!`);
            }
        }
        
    });
}]);