let express = require('express');
let app = express();
let path = require('path');
let bodyParser = require('body-parser');
let request = require("request");
let formidable = require('formidable');
let fs = require('fs');
let url = require('url');
let keys = require('./keys.js');

//app.use(bodyParser.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.use(express.static('public'));

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))
 
// parse application/json
//app.use(bodyParser.json())

app.get("/", (req, res) => {

    //Functions to grab the API Credentials/create promise that requests a token for the new API
    var legacyApiKey, legacySig;
    [legacyApiKey, legacySig] = getLegacyCreds();
    var pToken = getTokenPromise();

    pToken.then((token) => {
        //Gets information to use for rendering the template
        var hubs = apiRequest('https://v2.api.uberflip.com/hubs', [], "GET", token, 'application/json');
        var authors = apiRequest('https://v2.api.uberflip.com/users', ["limit=100", "sort=last_name"], "GET", token, 'application/json');
        var tags = apiRequest('https://v2.api.uberflip.com/tags', ["limit=100"], "GET", token, 'application/json');
        var docStreams = apiRequest('https://v2.api.uberflip.com/streams', ["limit=100", "type=docs"], "GET", token, 'application/json');
        var marketingStreams = apiRequest('https://v2.api.uberflip.com/streams', ["limit=100", "type=custom"], "GET", token, 'application/json');
        var folders = apiRequest('https://api.uberflip.com/', ["Version=0.1", "Method=GetTitles", "APIKey=" + legacyApiKey, "Signature=" + legacySig, "SortBy=-title"], "GET", "", 'application/json');

        //Once all calls complete, render the form page
        Promise.all([hubs, authors, tags, docStreams, marketingStreams, folders]).then( values => {
            app.locals.contentTags = values[2].data.map(function (tag) {
                return tag.name;
            });
            values[5].pop(); //Get rid of the extra metadata in the Folders data
            res.render("index", {hubs: values[0].data, authors: values[1].data, docStreams: values[3].data, marketingStreams: values[4].data, categories: values[5]});
        });
    });
});

//When form is submitted by the user.
app.post("/form-submit", (req, res) => {
    var legacyApiKey, legacySig;
    var pathPdf, pathThumb, params;
    var formFields;
    var fileUpload; 
    [legacyApiKey, legacySig] = getLegacyCreds();

    var form = new formidable.IncomingForm();
    form.parse(req, (err, fields, files) => {
        if (err) {
            console.error('Error', err);
            throw err;
        }
        console.log("Fields", fields);
        //console.log("PDF", files["upload-pdf"]);
        formFields = fields;
        let {hubId, title, slug, author, category, docStream, copy, metaDes, tags} = formFields;
        //console.log(title, slug, author, category, docStream, copy, metaDes, tags);
        pathPdf = files["upload-pdf"].path;
        pathThumb = files["upload-thumb"].path; //Haven't yet implemented a way to get the thumbnail image into Uberflip
        params = ["Version=0.1", "Method=UploadFile", "APIKey=" + legacyApiKey, "Signature=" + legacySig, "TitleId=" + category, "IssueName=" + title, "ResponseType=JSON", "File=" + pathPdf];

        //Request that uploads the file through the legacy api
        fileUpload = apiRequest('https://api.uberflip.com/', params, "POST", "", "multipart/form-data", {}, pathPdf);

         fileUpload.then(value => {
            if (value["Error"]) {
                res.send(value["Error"].Description);
            } else {
                console.log("Upload response \n",value);
                res.redirect(url.format({
                    pathname:"/waiting",
                    query: formFields
                }));
            }
        });
    });
});

//Calls a new user interface where users check to see if the file has successfully uploaded (since the APIs don't communicate with each other so well)
app.get("/waiting", (req, res) => {
    app.locals.query = req.query;
    res.render("waiting", {data: req.query});
});

//The final action to update the asset within its stream.
app.post("/update", (req, res) => {
    var pToken = getTokenPromise();
    var token;
    var {hub, title, slug, author, category, docStream, copy, metaDes, tags} = req.body;

    var payload = {
        title: null,
        description: metaDes,
        seo_title: null,
        seo_description: null,
        thumbnail_url: null,
        canonical_url: null,
        published_at: null,
        hidden: false,
        type: null,
        content: {
            draft: copy
        },
        author: {
            id: parseInt(author)
        },
        custom_code: {
            html: null,
            css: null,
            js: null,
            active: null
        }
    };

    /* UNABLE TO SUCCESSFULLY PATCH IN THE UPDATED VALUES TO THE ASSET. RECEIVING AN "INVALID JSON INPUT ERROR. SEE LINE 133*/
    pToken.then(value => {
        token = value;
        //Get most recent asset (and its id) from the doc stream
        return apiRequest(`https://v2.api.uberflip.com/streams/${docStream}/items`, ['sort=-created_at', 'limit=1'], 'GET', token, 'application/json');
    }).then( value => {
        console.log(value);
        var id = value.data[0].id;
        //console.log(payload);
        return apiRequest(`https://v2.api.uberflip.com/items/${id}`, [], 'PATCH', token, 'application/json', JSON.stringify(payload));
    }).then( value => {
        console.log(value);
        res.send("Updated");
    });

    //Update Slug
    //Update tags
    //Include in other marketing streams
    //Add gate
    //Add thumbnail
    
});

app.listen(3000, () => { console.log("I am listening") });

//---------------------------------------------------------

function apiRequest(endpoint, params, method, token, type, formData, filePath, callback) {
    return new Promise((resolve, reject) => {
        if (filePath) {
            formData['File'] = fs.createReadStream(filePath);
        }
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
            'contentType': type,
            'formData': formData
        }
        //console.log(requestURL);
        //console.log(formData);
        request(options, function callback(err, httpResponse, body) {
           //console.log(body);
            resolve(JSON.parse(body));
        });
    })
}

//---------------------------------------------------------

function getTokenPromise() {
    var clientId = keys.CLIENT_ID;
    var clientSecret = keys.CLIENT_SECRET;
    return new Promise((resolve, reject) => {
        var requestURL = 'https://v2.api.uberflip.com/authorize?grant_type=client_credentials&client_id=' + clientId + '&client_secret=' + clientSecret;
        request.post({url: requestURL}, function callback(err, httpResponse, body) {
            resolve(JSON.parse(body).access_token);
        });
    });
}

//---------------------------------------------------------

function getLegacyCreds() {
    var legacyApiKey = keys.LEGACY_KEY;
    var legacySig = keys.LEGACY_SIG;
    return [legacyApiKey, legacySig];
}
