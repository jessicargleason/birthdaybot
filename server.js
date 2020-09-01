require('dotenv').config();

const http = require('http');
const https = require('https');
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const app = express();
const handlebars = require('express-handlebars');
const request = require('request');
const helmet = require('helmet');
const { resolve } = require('path');
const client_id = process.env.CLIENT_ID;
const client_secret = process.env.CLIENT_SECRET;

app.set('view engine', 'html');
app.set('views', __dirname + '/views');
app.use(express.json());
app.use(helmet());
app.use(express.static("express"));
app.use(bodyParser.urlencoded({ extended: true })); 

const server = http.createServer(app);
const port = 3000;
server.listen(port);

let results = {
  error: false
}

//Sets our app to use the handlebars engine
app.set('view engine', 'handlebars');
app.engine('handlebars', handlebars({
layoutsDir: __dirname + '/views/layouts',
}));

//Serves static files (we need it to import a css file)
app.use(express.static('public'));

app.get('/birthdays/', (req, res) => {
  //Serves the body of the page aka "main.handlebars" to the container //aka "index.handlebars"
  res.render('main', {layout : 'index'});
});

app.post('/birthdays/', (req, res) => {
  results = {};
  
  results.name = req.body.name;
  setUpResults(req.body.name).then(() => {
    console.log("ready to render");
    console.log(results);
    res.render('results', {layout : 'index', results: results});
  })
  .catch(function (e) {
    res.status(500, {
          error: e
    });
  });
    
});

function setUpResults(name) {
  const generateResults = formatName(name)
  .then(function(result) {
    console.log("getting ID");
    return getArtistId(result)
  })
   .then(function(result) {
    console.log("getting artist");
    return getArtist(result)
  })
  .then(function(result) {
    console.log("getting spotify");
    return getSpotify(result)
  })
  .then(function(result) {
    console.log("we're done");
    console.log(results);
    return Promise.resolve(true);
  })
  .catch((error) => {
    console.log(error);
  });
  
  return generateResults;
}

function formatName(name) {
  return new Promise((resolve, reject)=>{
    var formattedName = name.split(' ').join('+');;
    resolve(formattedName);
  });
}

function getArtistId(formattedName) {
  return new Promise((resolve, reject)=>{
    var requestURL = 'https://www.wikidata.org/w/api.php?action=wbsearchentities&search=' + formattedName + '&language=en&format=json&limit=1';
    
    https.get(requestURL, res => {
      res.setEncoding("utf8");
      let body = "";
      res.on("data", data => {
        body += data;
      });
      res.on('error', (e) => {
        console.error(e);
        reject();
      });
      res.on("end", () => {
        body = JSON.parse(body);
        if (body.search[0] !== undefined) {
          var id = body.search[0].id;
          resolve(id);
          } else {
            results.error = true;
            resolve(false);
          }
      });
    });
  });
}

  /* Use Wikidata to get that artist's data using their ID */
	
	function getArtist(id) {
    return new Promise((resolve, reject)=>{
      if (id !== false) {
        var requestURL = 'https://www.wikidata.org/wiki/Special:EntityData/' + id + '.json';
        
        https.get(requestURL, res => {
          res.setEncoding("utf8");
          let body = "";
          res.on("data", data => {
            body += data;
          });
          res.on('error', (e) => {
            console.error(e);
            reject();
          });
          res.on("end", () => {
            body = JSON.parse(body);
            //console.log(body.entities[id].claims.P569);
            console.log("Success!");
            
            // Go through the data and find the birth date (P569)
            if (body.entities[id].claims.P569 !== undefined) {
              let birthday = body.entities[id].claims.P569[0].mainsnak.datavalue.value.time;
              //Stop JS from trying to do time zone conversion
              birthday = birthday.split('T')[0];
              birthday = birthday.replace('+','');
              birthday = birthday.replace(/\-/g,'/');
              results.birthday = birthday;
              birthday = new Date(birthday);
              results.month = (birthday.getMonth() + 1).toString();
              results.day = birthday.getDate().toString();
            } else {
              results.error = true;
            }

            // Go through the data and find Spotify ID (P1902)
            if (body.entities[id].claims.P1902 !== undefined) {
              resolve(body.entities[id].claims.P1902[0].mainsnak.datavalue.value);
            } else {
              resolve(false);
            }
            
          });
        });

      } else {
        results.error = true;
        resolve(false)
      }

    });
		
	}
 

function getSpotify(id) {
  return new Promise((resolve, reject)=>{
    if (id !== false) {
    var requestURL = "https://api.spotify.com/v1/artists/" + id;
    
    var authOptions = {
      url: 'https://accounts.spotify.com/api/token',
      headers: {
        'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64'))
      },
      form: {
        grant_type: 'client_credentials'
      },
      json: true
    };
    
    request.post(authOptions, function(error, response, body) {
      if (!error && response.statusCode === 200) {
    
        // use the access token to access the Spotify Web API
        var token = body.access_token;
        var options = {
          url: requestURL,
          headers: {
            'Authorization': 'Bearer ' + token
          },
          json: true
        };
        request.get(options, function(error, response, body) {
          results.spotifyLink = body["external_urls"]["spotify"];
          results.genres = body["genres"];
          results.followers = body["followers"]["total"].toString();
          results.spotifyName = body["name"];
          //console.log(results);
          results.spotify = true;
          resolve(true);
        });
      }
    });
  } else {
    resolve(true);
  }

  });
  
}

console.debug('Server listening on port ' + port);