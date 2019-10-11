const fs = require('fs');
const path = require('path');
const Guid = require('guid');
const express = require('express');
const bodyParser = require("body-parser");
const Mustache  = require('mustache');
const Request  = require('request');
const Querystring  = require('querystring');

require('dotenv').config();

const app = express();

app.use(express.static(path.join(__dirname, 'public')));

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');
app.set('views', path.join(__dirname, 'views'));

var csrf_guid = Guid.raw();
const account_kit_api_version = process.env.ACCOUNTKIT_VERSION;
const app_id = process.env.ACCOUNTKIT_APP_ID;
const app_secret = process.env.ACCOUNTKIT_SECRET;
const me_endpoint_base_url = `https://graph.accountkit.com/${account_kit_api_version}/me`;
const token_exchange_base_url = `https://graph.accountkit.com/${account_kit_api_version}/access_token`;


var data = {
  appId: app_id,
  csrf: csrf_guid,
  version: account_kit_api_version
};

app.get("/email", (req,res) => {
  res.render("email", data);
});

app.get("/phone", (req,res) => {
  res.render("phone", data);
});

app.get("/verified", (req,res) => {
  res.render("verified", data);
});


app.get("/policy", (req,res) => {
  res.render("policy");
});

app.post("/verify", function(request, response) {

  console.log(request.body);
  // CSRF check
  if (request.body.csrf === csrf_guid) {
    var app_access_token = ["AA", app_id, app_secret].join("|");
    var params = {
      grant_type: "authorization_code",
      code: request.body.code,
      access_token: app_access_token
    };

    // exchange tokens
    var token_exchange_url =
      token_exchange_base_url + "?" + Querystring.stringify(params);
    Request.get({ url: token_exchange_url, json: true }, function(
      err,
      resp,
      respBody
    ) {
      var view = {
        user_access_token: respBody.access_token,
        expires_at: respBody.expires_at,
        user_id: respBody.id
      };

      var me_endpoint_url = me_endpoint_base_url + "?access_token=" + respBody.access_token;
      Request.get({ url: me_endpoint_url, json: true }, function(
        err,
        resp,
        respBody
      ) {
        if (respBody.phone) {
          view.phone = respBody;
        } else if (respBody.email) {
          view.email = respBody.email.address;
        }
        response.status(200).json(view)
      });
    });
  } else {
    // login failed
    response.writeHead(200, { "Content-Type": "text/html" });
    response.end("Something went wrong. :( ");
  }
});

app.listen(3000, "0.0.0.0");