let express = require('express');
let app = express();
let path = require('path');
let bodyParser = require('body-parser');
let request = require("request");
let formidable = require('formidable');

//app.use(bodyParser.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.use(express.static('public'));

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))
 
// parse application/json
//app.use(bodyParser.json())


app.get("/", (req, res) => {
    var token;
    //Get access token
    var pToken = new Promise((resolve, reject) => {
        var clientId = "b59a65c860a90e2ca5eb8efe63b84bd5";
        var clientSecret = "20d75e0559566990e6d61e0dc23c9689dbb9a297";
        var requestURL = 'https://v2.api.uberflip.com/authorize?grant_type=client_credentials&client_id=' + clientId + '&client_secret=' + clientSecret;
        request.post({url: requestURL}, function callback(err, httpResponse, body) {
            resolve(JSON.parse(body).access_token);
        });
    });

    pToken.then((value) => {
        token = value;
        
        var authors = apiRequest('https://v2.api.uberflip.com/users', ["limit=100", "sort=last_name"], "GET", token);
        var tags = apiRequest('https://v2.api.uberflip.com/tags', ["limit=100"], "GET", token);
        var streams = apiRequest('https://v2.api.uberflip.com/streams', ["limit=100", "type=custom"], "GET", token);

        Promise.all([authors, tags, streams]).then( values => {
            app.locals.contentTags = values[1].data.map(function (tag) {
                return tag.name;
            });
            res.render("index", {authors: values[0].data, streams: values[2].data});
        });
    });
});

app.post("/form-submit", (req, res) => {
    var attempts = 0;
    //console.log(req.body);
    new formidable.IncomingForm().parse(req, (err, fields, files) => {
        if (err) {
            console.error('Error', err);
            throw err;
        }
        console.log("Fields", fields);
        console.log("Files", files);
        console.log(files["upload-thumb"]);
    });
});

app.listen(3000, () => { console.log("I am listening") });

function apiRequest(endpoint, params, method, token, callback) {
    return new Promise((resolve, reject) => {
        var pms = "?";
        params.forEach( param => {
            pms = pms + param + "&";
        });
        var requestURL = endpoint + pms;
        var options = {
            'method': method,
            'url': requestURL,
            'headers': {
                Authorization: 'Bearer ' + token
            },
            'contentType': 'application/json'
        }
        request(options, function callback(err, httpResponse, body) {
            resolve(JSON.parse(body));
        });
    })
}