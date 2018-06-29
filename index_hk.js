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

// create your bot with a function to receive messages from user
// 歡迎訊息頁
var bot = new builder.UniversalBot(connector,
    function (session) {
        session.send('歡迎來到FinTastic');
        session.replaceDialog('mainMenu')
    });

bot.dialog('mainMenu', [
    function (session) {
        builder.Prompts.choice(session, "請問要查詢什麼?", ["美股", "匯率", "台股", "港股", "日股", "黃金"], { listStyle: builder.ListStyle.button });
    },
    function (session, results) {
        session.dialogData.ask = results.response.entity;
        if (session.dialogData.ask == "美股")
            session.replaceDialog('us');
        else if (session.dialogData.ask == "黃金")
            session.replaceDialog('gold');
        else if (session.dialogData.ask == "港股")
            session.replaceDialog('hk');
        // TODO 加入每個人寫的功能
    }
]).triggerAction({ matches: /^回首頁$/ }); //使用者任何時間打入"回首頁"都可以回到首頁

bot.dialog('hk', [
    function (session) {
        builder.Prompts.text(session, "請輸入港股Ticker:");

        //=======================回首頁按鈕===========================
        var msg = new builder.Message(session);
        msg.suggestedActions(builder.SuggestedActions.create(
            session, [
                builder.CardAction.imBack(session, "回首頁", "回首頁")
            ]
        ));
        session.send(msg);
        // ==========================================================
    },
    function (session, results) {
        var id = results.response;
        var options = {
            method: "GET",
            url: "https://www.quandl.com/api/v3/datasets/HKEX/00700.json",
            //寫在api url ?後面的參數，要放在qs(key)的Json set內
            qs: {
            //     function: "TIME_SERIES_DAILY",
            //     symbol: id,
            //     apikey: "2C8MUXABNVMED4DS"
            },
            //指定json格式的輸出
            json: true
        }
        request(options, function (error, response, body) {
            var stock = body;
            if (stock["dataset"]) {
                //用RegExpression, 找出JSON檔第一筆日期的資料，可以避免節慶日找不到資料
                var data = JSON.stringify(stock["dataset)"]).match(/\d{4}-\d{2}-\d{2}/);
                //parseFloat 將文字改成Float type, toFixed(2)將數字縮到小數點2位數
            //     var open = parseFloat(stock["dataset"][date]["1. open"]).toFixed(2)
                var high = parseFloat(stock["dataset"][data][0][7]).toFixed(2)
                var low = parseFloat(stock["dataset"][date][0][8]).toFixed(2)
                var close = parseFloat(stock["dataset"][date][0][9]).toFixed(2)
                session.send(`${id.toUpperCase()} : ${data} \nhigh $${high}\nlow $${low}\nclose $${close}`);
                session.replaceDialog('hk');
            } else {
                session.send(`沒有找到這個股票!`);
                session.replaceDialog('hk');
            }
        });
    }
])
request(options, function (error, response, body){
      var stock = body;
      //建立日期物件，放入今天的日期
      var d = new Date();
      //當日期是周末，則將日期回到上個周五
      if (d.getDay()==0)
          d.setDate(d.getDate()-1);
      if (d.getDay()==1)
          d.setDate(d.getDate()-2);
      //將日期改成ISO規則日期的第0-10個字元 YYYY-mm-dd

      //TODO: 更好的方式是用RegExpression, 找出JSON檔第一筆日期的資料，可以避免節慶日找不到資料
      
      var tradeday = d.toISOString().slice(0, 10);
      var close = stock["dataset"]["data"][0][8]
      session.endDialog(`${tradeday} close at : $${close}`);
});



