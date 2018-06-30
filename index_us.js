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
        // TODO 加入每個人寫的功能
    }
]).triggerAction({ matches: /^回首頁$/ }); //使用者任何時間打入"回首頁"都可以回到首頁

bot.dialog('us', [
    function (session) {
        builder.Prompts.text(session, "請輸入美股Ticker:");

        //=======================回首頁按鈕===========================
        var msg = new builder.Message(session);
        msg.suggestedActions(builder.SuggestedActions.create(
            session, [
                builder.CardAction.imBack(session, "回首頁", "回首頁"),
                builder.CardAction.imBack(session, "我的最愛", "我的最愛"),
                builder.CardAction.imBack(session, "新增最愛", "新增最愛"),
                builder.CardAction.imBack(session, "刪除最愛", "刪除最愛")
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
        };
        request(options, function (error, response, body) {
            var stock = body;
            if (stock["Time Series (Daily)"]) {
                //用RegExpression, 找出JSON檔第一筆日期的資料，可以避免節慶日找不到資料
                var date = JSON.stringify(stock["Time Series (Daily)"]).match(/\d{4}-\d{2}-\d{2}/);
                //parseFloat 將文字改成Float type, toFixed(2)將數字縮到小數點2位數
                var open = parseFloat(stock["Time Series (Daily)"][date]["1. open"]).toFixed(2)
                var high = parseFloat(stock["Time Series (Daily)"][date]["2. high"]).toFixed(2)
                var low = parseFloat(stock["Time Series (Daily)"][date]["3. low"]).toFixed(2)
                var close = parseFloat(stock["Time Series (Daily)"][date]["4. close"]).toFixed(2)
                session.send(`${id.toUpperCase()} : ${date} \nopen $${open}\nhigh $${high}\nlow $${low}\nclose $${close}`);
                session.replaceDialog('us');
            } else {
                session.send(`沒有找到這個股票!`);
                session.replaceDialog('us');
            }
        });
    }
])

//=================== 列 印 我 的 最 愛 ===================
bot.dialog('us_favorite', [
    function (session) {
        var options = {
            method: "GET",
            url: "https://sheetdb.io/api/v1/5b35ec114e823",
            //指定json格式的輸出
            json: true
        };
        request(options, function (error, response, body) {
            session.dialogData.fav = body;
            session.dialogData.msg = "";
            session.dialogData.count = 0;
            if (!error && response.statusCode == 200) {
                for (var i = 0; i < session.dialogData.fav.length; i++) {
                    showPrice(session.dialogData.fav[i].usticker, session);                    
                }
            }
        });        
    }
]).triggerAction({ matches: /^我的最愛$/ });


//============== 印 出 我 的 最 愛 ==================
async function showPrice(usticker, session) {
    console.log("beforeRequest: " + usticker);
    var options = {
        method: "GET",
        url: "https://www.alphavantage.co/query",
        qs: {
            function: "TIME_SERIES_DAILY",
            symbol: usticker,
            apikey: "2C8MUXABNVMED4DS"
        },
        json: true
    };
    request(options, function (error, response, body) {
        var stock = body;
        if (stock["Time Series (Daily)"]) {
            var date = JSON.stringify(stock["Time Series (Daily)"]).match(/\d{4}-\d{2}-\d{2}/);
            var close = parseFloat(stock["Time Series (Daily)"][date]["4. close"]).toFixed(2);
            var msg = usticker.toUpperCase() + " " + date + " close $" + close;       
            console.log("after request: " + msg);
            // session.send(msg);
            session.dialogData.msg += msg+"\n";
            session.dialogData.count += 1;
            //TODO 當msg已經與 session.dialogData.fav.length 相同，則執行下面兩個
            if (session.dialogData.count == session.dialogData.fav.length) {
            session.send(session.dialogData.msg)
            session.replaceDialog('us');
            }
            // return msg
        } else {
            session.send(`沒有找到這個股票!`);
        }
    });
}

//=========== 新 增 股 票 到 我 的 最 愛 =============
bot.dialog('us_add_favorite', [
    function (session) {
        builder.Prompts.text(session, "請輸入要新增的美股: ");
    },
    function (session, results) {
        session.dialogData.addus = results.response;
        addToSheetDB(session.dialogData.addus, session);

    }
]).triggerAction({ matches: /^新增最愛$/ });


//========== === 刪 除 我 的 最 愛 股 票 =============
bot.dialog('us_del_favorite', [
    function (session) {
        builder.Prompts.text(session, "請輸入要刪除的美股: ");
    },
    function (session, results) {
        session.dialogData.deleteus = results.response;
        deleteToSheetDB(session.dialogData.deleteus, session);
    }
]).triggerAction({ matches: /^刪除最愛$/ });

//=========== function 新增 sheetDB =================
function addToSheetDB(usticker, session) {
    console.log("addToSheetDB" + usticker);
    request({
        uri: 'https://sheetdb.io/api/v1/5b35ec114e823',
        json: true,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: {
            "data": [{
                "usticker": usticker
            }]
        }
    }, function (error, response, body) {
        if (!error && response.statusCode == 201) {
            session.send("儲存成功");
            session.replaceDialog('us');
        } else {
            console.log(error)
        }
    });
}

//=========== function 刪除 sheetDB =================
function deleteToSheetDB(usticker, session) {
    console.log("addToSheetDB" + usticker);
    request({
        uri: 'https://sheetdb.io/api/v1/5b35ec114e823/usticker/' + usticker,
        json: true,
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
    }, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            session.send("刪除成功");
            session.replaceDialog('us');
        } else {
            console.log(error)
        }
    });
}
//===================================================

bot.dialog('gold', [
    function (session) {
        builder.Prompts.text(session, "請輸入gold:");
    },
    function (session, results) {

        var options = {
            method: "GET",
            url: "https://www.quandl.com/api/v3/datasets/CME/GCZ2018.json?",
            // 寫在api url ?後面的參數，要放在qs(key)的Json set內
            // qs:{
            //     api_key="sae2Txxu_kQTHFHDxyjr"
            // }, 
            // 指定json格式的輸出
            json: true
        }
        request(options, function (error, response, body) {
            var gold = body;
            // 建立日期物件，放入今天的日期
            var d = new Date();
            // 當日期是周末，則將日期回到上個周五
            if (d.getDay() == 0)
                d.setDate(d.getDate() - 1);
            if (d.getDay() == 1)
                d.setDate(d.getDate() - 2);
            // 將日期改成ISO規則日期的第0-10個字元 YYYY-mm-dd

            // TODO:更好的方式是用RegExpression,找出JSON檔第一筆日期的資料,可以避免節慶日找不到資料

            var tradeday = d.toISOString().slice(0, 10);
            var getgold = gold["dataset"]["data"][0][4]
            session.endDialog(`${tradeday} close at : $${getgold}`);
        });
        // TODO 讓request資料已經完成後，才執行session.replaceDialog
        session.endConversation();
        session.replaceDialog('gold');
    }
]);
// TODO 提供一個trigger event, 讓使用者可以回到首頁選單
