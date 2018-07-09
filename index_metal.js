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
                builder.CardAction.imBack(session, "回首頁", "🏦回首頁"),
                builder.CardAction.imBack(session, "我的最愛金屬", "💗我的最愛金屬"),
                builder.CardAction.imBack(session, "新增最愛金屬", "💘新增最愛金屬"),
                builder.CardAction.imBack(session, "刪除最愛金屬", "💔刪除最愛金屬"),
                builder.CardAction.imBack(session, "投顧老師", "🤞投顧老師")
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
            // session.replaceDialog('metal');
            session.replaceDialog('recommend');
            // session.replaceDialog('metal_qna');
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
                    showMetalPrice(session.dialogData.fav[i].MetalName, session);
                }
            }
        });        
    }
]).triggerAction({ matches: /^我的最愛金屬$/ });


//============== 印 出 我 的 最 愛 最 新 收 盤 價==================
function showMetalPrice(MetalName, session) {
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
        builder.Prompts.choice(session, "請選擇您想加入最愛的金屬？", "GC|HG|SI|PL|PA", { listStyle: builder.ListStyle.button });
    },
    function (session, results) {
        session.dialogData.addus = results.response.entity;
        addToMetalSheetDB(session.dialogData.addus, session);

    }
]).triggerAction({ matches: /^新增最愛金屬$/ });


//========== === 刪 除 我 的 最 愛 =============
bot.dialog('metal_del_favorite', [
    function (session) {
        builder.Prompts.text(session, "請輸入要刪除的金屬: ");
    },
    function (session, results) {
        session.dialogData.deleteus = results.response;
        deleteToMetalSheetDB(session.dialogData.deleteus, session);
    }
]).triggerAction({ matches: /^刪除最愛金屬$/ });

//=========== function 新增 sheetDB =================
function addToMetalSheetDB(MetalName, session) {
    console.log("addToMetalSheetDB" + MetalName);
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
function deleteToMetalSheetDB(MetalName, session) {
    console.log("addToMetalSheetDB" + MetalName);
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

bot.dialog('metal_care', [
    function(session) {
        session.dialogData.cares = {};        
        session.send('請先回答以下問題好為您推薦符合您需求的投顧老師');
        builder.Prompts.choice(session, "請問您希望的老師性別?", "男|女|皆可", { listStyle: builder.ListStyle.button });
    },
    function( session, results) {
        session.dialogData.cares.gender = results.response.entity;
        builder.Prompts.choice(session, "請問您希望的老師特征?", "情緒型|理智型|意志型", { listStyle: builder.ListStyle.button });
    },
    function( session, results) {
        session.dialogData.cares.feature = results.response.entity;
        builder.Prompts.choice(session, "請問您能接受的投資風險?", "高|中|低", { listStyle: builder.ListStyle.button });
    },
    function(session, results) {
        session.send('請稍等，馬上為您配對');
        session.dialogData.cares.risk = results.response.entity;        
        session.endDialogWithResult({
            response:session.dialogData.cares
        });
    }
])


bot.dialog('recommend', [
    function(session) {
        session.send('需要為您推薦投顧老師嗎?');
        session.beginDialog('metal_care');
    },
    function(session, results) {
        cares = results.response;
        // 把cares 設定為全域變數ai
        session.userData.ai = cares;
        var msg = new  builder.Message(session);
        var attachmant = new builder.ReceiptCard(session)
        .title("您的選擇條件")
        .facts([
            builder.Fact.create(session, cares.gender, "老師性別"),
            builder.Fact.create(session, cares.feature, "老師特征"),
            builder.Fact.create(session, cares.risk, "投資風險")
        ])
        msg.addAttachment(attachmant);        
        session.endConversation(msg);
        session.replaceDialog("fraction", {reprompt:false});
    }    
]).triggerAction({ matches: /^投顧老師$/ });


bot.dialog('fraction', [
    function(session, results) {
        console.log(session.userData.ai)
        if(session.userData.ai.gender == '男') {            
            var msg = new builder.Message(session);
            var heroCard = new builder.HeroCard(session)
                .title("唐納·川普")
                .subtitle("整個FinTastic都是我的嘴砲天堂！")
                .text("只有戰爭才可以凸顯金屬的價值")
                .images([builder.CardImage.create(session, "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSAe5Upa0wWAamXePPlfW0VXofOr86AIjIoWpSl0UVNIWFKgcx3PA")])
                .buttons([
                    builder.CardAction.openUrl(session, "https://clickme.net/39108","超狂名言")
                ]);
            msg.addAttachment(heroCard);
            session.endDialog(msg);
            session.replaceDialog('metal');
        } else if(session.userData.ai.gender == '女') {
            var msg = new builder.Message(session);
            var heroCard = new builder.HeroCard(session)
                .title("宋智孝")
                .subtitle("整個Running Man都是我的黃金(手)！")
                .text("只有勝利才有金屬")
                .images([builder.CardImage.create(session, "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS8glXbGlvwr5Vobct2MUIEJYacoz6WMATNobsoU5YLCWILmP69")])
                .buttons([
                    builder.CardAction.openUrl(session, "https://www.youtube.com/watch?v=4TnkMfAQmP0","黃金獎勵")
                ]);
            msg.addAttachment(heroCard);
            session.endDialog(msg);
            session.replaceDialog('metal');
        } else {
            var msg = new builder.Message(session);
            var heroCard = new builder.HeroCard(session)
                .title("娜美")
                .subtitle("整個One Piece都是我的黃金之旅！")
                .text("我只喜歡黃金跟橘子")
                .images([builder.CardImage.create(session, "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRCZOaXpm8UnMtknPk39HASYBFWz2-mO_3aqa2B-cnMv0VadGMd")])
                .buttons([
                    builder.CardAction.openUrl(session, "https://www.youtube.com/watch?v=pATTYJ10Q9M","為黃金瘋狂")
                ]);
            msg.addAttachment(heroCard);
            session.endDialog(msg);
            session.replaceDialog('metal');
        }
    }
])