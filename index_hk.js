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
            session.replaceDialog('hkstock');
        // TODO 加入每個人寫的功能
    }
]).triggerAction({ matches: /^回首頁$/ }); //使用者任何時間打入"回首頁"都可以回到首頁

bot.dialog('hkstock', [
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
    function(session, results){ 
        session.dialogData.num=results.response;
        var id2 = session.dialogData.num;
        var str1 = "https://www.quandl.com/api/v3/datasets/HKEX/"+id2+".json"
        var options ={
              method: "GET",
              url:str1,
              qs:{                        
                    api_key:"FGaaWn-aS7oW9ZRYxrZj"
              },
              json:true
        }
  request(options, function (error, response, body){  
        var stock = body; 
        if(stock["dataset"]["data"][0][0]){
              //用RegExpression, 找出JSON檔第一筆日期的資料，可以避免節慶日找不到資料
              var date = JSON.stringify(stock["dataset"]["data"][0][0]).match(/\d{4}-\d{2}-\d{2}/);        
        //TODO: 更好的方式是用RegExpression, 找出JSON檔第一筆日期的資料，可以避免節慶日找不到資料
        var close = stock["dataset"]["data"][0][9]
        session.send("請等一下")
        session.endDialog(`您查詢的結果為${date} 收盤價 at : $${close}`);
  }else{
        session.endDialog(`沒有找到這個股票!`);
    }
  });
    }
]);

// TODO 提供一個trigger event, 讓使用者可以回到首頁選單
