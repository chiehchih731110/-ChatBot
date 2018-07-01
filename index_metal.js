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
        builder.Prompts.choice(session, "請問要查詢什麼?", ["美股", "匯率", "台股", "港股", "日股", "金屬"], { listStyle: builder.ListStyle.button });
    },
    function (session, results) {
        session.dialogData.ask = results.response.entity;
        if (session.dialogData.ask == "美股")
            session.replaceDialog('us');
        else if (session.dialogData.ask == "金屬")
            session.beginDialog('metal');
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


bot.dialog('metal', [
    function (session) {
        builder.Prompts.choice(session, "請選擇您想知道的金屬？", "GC|HG|SI|PL|PA", { listStyle: builder.ListStyle.button });
        
        // TODO 提供一個trigger event, 讓使用者可以回到首頁選單
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
        var metal_name = results.response.entity;
        // 利用選擇的Name完成API
        var metal_url = "https://www.quandl.com/api/v3/datasets/CHRIS/CME_" + metal_name + "1.json";
        var options = {
        method: "GET",
        url: metal_url,
        // 寫在api url ?後面的參數，要放在qs(key)的Json set內
        qs:{
            api_key:"sae2Txxu_kQTHFHDxyjr"
        }, 
        // 指定json格式的輸出
        json: true
        }
        request(options, function (error, response, body) {
            var m_body = body;
            // TODO:用RegExpression,找出JSON檔第一筆日期的資料,可以避免節慶日找不到資料
            // var getDate = JSON.stringify(gold["dataset"]["data"][0]).match(/\d{4}-\d{2}-\d{2}/);
            var getDate = m_body["dataset"]["data"][0][0];
            var getOpen = m_body["dataset"]["data"][0][1];
            var getHigh = m_body["dataset"]["data"][0][2];
            var getLow  = m_body["dataset"]["data"][0][3];
            var getLast = m_body["dataset"]["data"][0][4];
            session.endDialog(`Name ${metal_name} \nDate ${getDate} \nopen $${getOpen} \nhigh $${getHigh} \nlow $${getLow} \nLast $${getLast}`);
            session.replaceDialog('metal');
            // TODO 讓request資料已經完成後，才執行session.replaceDialog
        });
    }
]);

//=================== 列 印 我 的 最 愛 ===================
bot.dialog('metal_favorite', [
    function (session) {
        var options = {
            method: "GET",
            // sheetdb api
            url: "https://sheetdb.io/api/v1/5b3606b4e4fa2",
            // 指定json格式的輸出
            json: true
        };
        request(options, function (error, response, body) {
            session.dialogData.fav = body;
            session.dialogData.msg = "";
            session.dialogData.count = 0;
            if (!error && response.statusCode == 200) {
                for (var i = 0; i < session.dialogData.fav.length; i++) {
                    showPrice(session.dialogData.fav[i].MetalName, session);
                }
            }
        });        
    }
]).triggerAction({ matches: /^我的最愛$/ });


//============== 印 出 我 的 最 愛 最 新 收 盤 價==================
function showPrice(MetalName, session) {
    console.log("beforeRequest: " + MetalName);
    // 各個金屬api
    var metal_url = "https://www.quandl.com/api/v3/datasets/CHRIS/CME_" + MetalName + "1.json";
    var options = {
        method: "GET",
        url: metal_url,
        qs: {
            api_key: "sae2Txxu_kQTHFHDxyjr"
        },
        json: true
    };
    request(options, function (error, response, body) {
        var m_body = body;
        console.log("=======")
        console.log(m_body)
        console.log("=======")
        // TODO:用RegExpression,找出JSON檔第一筆日期的資料,可以避免節慶日找不到資料
        // var getDate = JSON.stringify(gold["dataset"]["data"][0]).match(/\d{4}-\d{2}-\d{2}/);
        var getDate = m_body["dataset"]["data"][0][0];
        var getLast = m_body["dataset"]["data"][0][4];
        var msg = MetalName + " " + getDate + "Last $" + getLast
        // 每次request資料近來，就加到變數 session.dialogData.msg
        session.dialogData.msg += msg+"\n";
        // 每次request資料近來，就紀錄(已完成的次數+1)
        session.dialogData.count += 1;
        if(session.dialogData.count == session.dialogData.fav.length)
        {
            session.send(session.dialogData.msg);
            session.replaceDialog('metal');
        }
        // session.endDialog(`${MetalName} ${getDate} Last $${getLast}`);
        // session.replaceDialog('metal');
        // TODO 讓request資料已經完成後，才執行session.replaceDialog
    });
}

//=========== 新 增 到 我 的 最 愛 =============
bot.dialog('metal_add_favorite', [
    function (session) {
        builder.Prompts.text(session, "請輸入要新增的金屬: ");
    },
    function (session, results) {
        session.dialogData.addus = results.response;
        addToSheetDB(session.dialogData.addus, session);

    }
]).triggerAction({ matches: /^新增最愛$/ });


//========== === 刪 除 我 的 最 愛 =============
bot.dialog('us_del_favorite', [
    function (session) {
        builder.Prompts.text(session, "請輸入要刪除的金屬: ");
    },
    function (session, results) {
        session.dialogData.deleteus = results.response;
        deleteToSheetDB(session.dialogData.deleteus, session);
    }
]).triggerAction({ matches: /^刪除最愛$/ });

//=========== function 新增 sheetDB =================
function addToSheetDB(MetalName, session) {
    console.log("addToSheetDB" + MetalName);
    request({
        uri: 'https://sheetdb.io/api/v1/5b3606b4e4fa2',
        json: true,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: {
            "data": [{
                "MetalName": MetalName
            }]
        }
    }, function (error, response, body) {
        if (!error && response.statusCode == 201) {
            session.send("儲存成功");
            session.replaceDialog('metal');
        } else {
            console.log(error)
        }
    });
}

//=========== function 刪除 sheetDB =================
function deleteToSheetDB(MetalName, session) {
    console.log("addToSheetDB" + MetalName);
    request({
        uri: 'https://sheetdb.io/api/v1/5b3606b4e4fa2/MetalName/' + MetalName,
        json: true,
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
    }, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            session.send("刪除成功");
            session.replaceDialog('metal');
        } else {
            console.log(error)
        }
    });
}
//===================================================
