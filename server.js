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
  formatName(req.body.name).then(() => {
    res.render('results', {layout : 'index', results: results});
  })
  .catch(function (e) {
    res.status(500, {
          error: e
    });
  });
  return setUpResults;
    
});

function setUpResults(name) {
  const formattedName = formatName(name);
  console.log(formattedName);
  //const artistId = getArtistId(formattedName);
  //console.log(artistId);
  //getArtist(artistId);
  /* if (artistId !== false) {
    let body = getArtist(artistId);
    //console.log(body);
    //body = JSON.parse(body);
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
      return false;
    } */
    /* Spotify ID (P1902) */
    /* if (body.entities[id].claims.P1902 === undefined) {

      console.log("no spotify");
      render.spotify = false;
      return false;
    } else {
    var spotify = body.entities[id].claims.P1902[0].mainsnak.datavalue.value;

      //getSpotify(spotify);
    } 
  } else {
    //can't find person
  }*/
  return Promise.resolve();
}

function formatName(name) {
  var formattedName = name.split(' ').join('+');
  getArtistId(formattedName);
  //return formattedName;
  //getArtistId(formattedName);
}

function getArtistId(formattedName) {
  var requestURL = 'https://www.wikidata.org/w/api.php?action=wbsearchentities&search=' + formattedName + '&language=en&format=json&limit=1';
  
  https.get(requestURL, res => {
    res.setEncoding("utf8");
    let body = "";
    res.on("data", data => {
      body += data;
    });
    res.on("end", () => {
      body = JSON.parse(body);
      if (body.search[0] !== undefined) {
        var id = body.search[0].id;
        //return id;
        //console.log(id);
        getArtist(id);
        } else {
          results.error = true;
          return false;
        }
    });
  });
}

  /* Use Wikidata to get that artist's data using their ID */
	
	function getArtist(id) {
    var requestURL = 'https://www.wikidata.org/wiki/Special:EntityData/' + id + '.json';
    
    https.get(requestURL, res => {
      res.setEncoding("utf8");
      let body = "";
      res.on("data", data => {
        body += data;
      });
      res.on("end", () => {
        body = JSON.parse(body);
        console.log(body.entities[id].claims.P569);
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
          return Promise.resolve();
        } else {
          results.error = true;
          return false;
        }
        
      });
    });
		
	}
 

function getSpotify(id) {
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
        console.log(results);
        spotify = true;
        return;
      });
    }
  });
  
}

console.debug('Server listening on port ' + port);