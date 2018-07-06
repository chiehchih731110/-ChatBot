//import module
var restify = require("restify");
var builder = require("botbuilder");
var request = require("request");
var date = require("date");

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
        else if (session.dialogData.ask == "匯率")
            session.replaceDialog('foreign');
        // TODO 加入每個人寫的功能
    }
]).triggerAction({ matches: /^回首頁$/ });

bot.dialog('us', [
    function (session) {
        builder.Prompts.text(session, "請輸入美股Ticker:");
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
            url: "https://www.alphavantage.co/query",
            //寫在api url ?後面的參數，要放在qs(key)的Json set內
            qs: {
                function: "TIME_SERIES_DAILY",
                symbol: id,
                apikey: "2C8MUXABNVMED4DS"
            },
            //指定json格式的輸出
            json: true
        }
        request(options, function (error, response, body) {
            var stock = body;
            if (stock["ime Series (Daily)"]) {
                //用RegExpression, 找出JSON檔第一筆日期的資料，可以避免節慶日找不到資料
                var date = JSON.stringify(stock["Time Series (Daily)"]).match(/\d{4}-\d{2}-\d{2}/);
                //parseFloat 將文字改成Float type, toFixed(2)將數字縮到小數點2位數
                var open = parseFloat(stock["Time Series (Daily)"][date]["1. open"]).toFixed(2)
                var high = parseFloat(stock["Time Series (Daily)"][date]["2. high"]).toFixed(2)
                var low = parseFloat(stock["Time Series (Daily)"][date]["3. low"]).toFixed(2)
                var close = parseFloat(stock["Time Series (Daily)"][date]["4. close"]).toFixed(2)
                session.send(`${id.toUpperCase()} : ${date} \nopen $${open}\nhigh $${high}\nlow $${low}\nclose $${close}`);
            } else {
                session.send(`沒有找到這個股票!`);
            }
        });

        // TODO 讓request資料已經完成後，才執行session.replaceDialog
        session.replaceDialog('us');
    }
])
// TODO 提供一個trigger event, 讓使用者可以回到首頁選單

bot.dialog('foreign', [
    function (session) {
        // session.send("歡迎來到外匯報價所")
        session.send("歡迎來到外匯報價所");

        builder.Prompts.choice(session, "請問手上有什麼貨幣?", "TWD|USD|JPY|EUR|CNY|AUD",
            { listStyle: builder.ListStyle.button })
        //=======================回首頁按鈕===========================
        var msg = new builder.Message(session);
        msg.suggestedActions(builder.SuggestedActions.create(
            session, [
                builder.CardAction.imBack(session, "回首頁", "回首頁"),
                builder.CardAction.imBack(session, "顯示多國貨幣", "💱顯示"+FROMCURRENCY+"兌換多國貨幣"),
                builder.CardAction.imBack(session, "修改預設貨幣", "💱修改預設貨幣"),
            ]
        ));
        session.send(msg);
        // ==========================================================
    },
    function (session, results) {
        // 取得要輸入from_currency的資料
        session.dialogData.tid = results.response.entity;
        builder.Prompts.choice(session, "請問要換成哪國貨幣?", "TWD|USD|JPY|EUR|CNY|AUD",
            { listStyle: builder.ListStyle.button });

    },
    function (session, results) {

        // 取得要輸入to_currency的資料
        session.dialogData.fid = results.response.entity;

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
            session.endDialog(`1元${session.dialogData.tid}可兌換成$${ExchangeRate}元的${session.dialogData.fid}`);
            session.replaceDialog('foreign');
        });

    }

])
//=================== 列 印 我 的 最 愛 ===================

bot.dialog('foreign_default', [
    function (session) {
        session.send(`![search](http://lincoln.edu.my/design_css/images/ProgressImage.gif)`)
        //設定要查詢sheetDB的資料
        var options = {
            method: "GET",
            url: "https://sheetdb.io/api/v1/5b39f01b5114f?=foreign",
            json: true
        };
        request(options, function (error, response, body) {
            // session.dialogData.fav[i].fromCurrency=
            session.dialogData.fav = body;
            console.log(body)
            FROMCURRENCY=body[0].fromCurrency
            session.dialogData.msg = "";
            session.dialogData.count = 0;
            if (!error && response.statusCode == 200) {
                for (var i = 0; i < session.dialogData.fav.length; i++) {
                    // showPrice(session.dialogData.fav[i].fromCurrency,session);
                    showPrice(session.dialogData.fav[i].toCurrency, session);

                }
            }
        });
    },


]).triggerAction({ matches: /^顯示多國貨幣$/ });

//============== 印 出 我 的 最 愛 的 Function ==================
// function(session,results){builder.Prompts.choice(session,"請問預設貨幣要換成哪國貨幣?","TWD|USD|JPY|EUR|CNY|AUD",
//     {listStyle:builder.ListStyle.button})
//      },



function showPrice(toCurrency, session) {
    // var options = {
    //     method: "GET",
    //     url: "https://sheetdb.io/api/v1/5b39f01b5114f?=foreign",
        
    //     from_currency: fromCurrency,
        
    //     json: true
    // };
        var options = {
            method: "GET",
            url: "https://www.alphavantage.co/query",
            qs: {
                function: "CURRENCY_EXCHANGE_RATE",
                from_currency: toCurrency,
                to_currency: FROMCURRENCY,
                apikey: "80WQWZNQQ53A0MLK"
            },
            json: true
        };


        request(options, function (error, response, body) {
            // console.log("456123"+toCurrency)
            var currency = body;

            var ExchangeRate = currency["Realtime Currency Exchange Rate"]["5. Exchange Rate"]
            var msg = "1元"+FROMCURRENCY+"可換成" + ExchangeRate + "的"+ toCurrency ;
            // 每次request資料近來，就加到變數 session.dialogData.msg
            session.dialogData.msg += msg + "\r\n";
            // 每次request資料近來，就紀錄(已完成的次數+1)
            session.dialogData.count += 1;
            // session.send(msg)
            if (session.dialogData.count == session.dialogData.fav.length &&FROMCURRENCY!=toCurrency) {
                session.send(session.dialogData.msg)
                session.replaceDialog('foreign');

            } else {
                
            }
        });
    // })
}

// TODO 提供一個trigger event, 讓使用者可以回到首頁選單
// ==================修改我的最愛====================
bot.dialog('foreign_update', [
    function(session){
        builder.Prompts.choice(session, "請問要換成哪國貨幣?", "TWD|USD|JPY|EUR|CNY|AUD",
    { listStyle: builder.ListStyle.button });
    },
    function(session,results){
        session.dialogData.update = results.response.entity;
        console.log(FROMCURRENCY)
        var options = {
        uri: 'https://sheetdb.io/api/v1/5b39f01b5114f/fromCurrency/'+FROMCURRENCY,
        json: true,
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: {"data":{"fromCurrency":session.dialogData.update}}
        };
        request(options)
        session.replaceDialog('foreign');
    }
    
    // https://sheetdb.io/api/v1/58f61be4dda40/{column}/{value}
]).triggerAction({ matches: /^修改預設貨幣$/ });

var options = {
    method: "GET",
    url: "https://sheetdb.io/api/v1/5b39f01b5114f?=foreign",
    json: true
};
request(options, function (error, response, body) {
    console.log(body)
    FROMCURRENCY=body[0].fromCurrency
    
});