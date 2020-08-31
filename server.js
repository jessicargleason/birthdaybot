require('dotenv').config();

const http = require('http');
const https = require('https');
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const app = express();
const handlebars = require('express-handlebars');
const request = require('request');
const client_id = process.env.CLIENT_ID;
const client_secret = process.env.CLIENT_SECRET;

app.set('view engine', 'html');
app.set('views', __dirname + '/views');
app.use(express.json());
app.use(express.static("express"));
app.use(bodyParser.urlencoded({ extended: true })); 

const server = http.createServer(app);
const port = 3000;
server.listen(port);

const results = () => {
  return "Test";
}

//Sets our app to use the handlebars engine
app.set('view engine', 'handlebars');
app.engine('handlebars', handlebars({
layoutsDir: __dirname + '/views/layouts',
}));

//Serves static files (we need it to import a css file)
app.use(express.static('public'))

app.get('/', (req, res) => {
  //Serves the body of the page aka "main.handlebars" to the container //aka "index.handlebars"
  res.render('main', {layout : 'index'});
});

app.post('/', function(req, res) {
  formatName(req.body.name);
  console.log('You sent the name "' + req.body.name + '".');
  res.render('results', {layout : 'index', results: results()});
});

function formatName(name) {
  var formattedName = name.split(' ').join('+');
  getArtistId(formattedName);
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
        console.log(id);
        getArtist(id);
        }
    });
  });

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
        console.log(body);
        console.log("Success!");
        /* Go through the data and find the birth date (P569) */
        if (body.entities[id].claims.P569 !== undefined) {
        var birthday = body.entities[id].claims.P569[0].mainsnak.datavalue.value.time;
          console.log(birthday);
        } else {
          /* var text = document.getElementById("birthday");
      
          text.textContent = "Birthday Unknown"; */
        }
        /* Spotify ID (P1902) */
        if (body.entities[id].claims.P1902 === undefined) {
          console.log("no spotify");
          /* var nameText = document.getElementById("artist").textContent = "Spotify Unknown";
          var genresText = document.getElementById("genres").textContent = "";
          var linkText = document.getElementById("link").textContent = ""; */
        } else {
        var spotify = body.entities[id].claims.P1902[0].mainsnak.datavalue.value;
  
          console.log(spotify);
  
          getSpotify(spotify);
        }
      });
    });
		
	}
 
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
        console.log(body["name"]);
      });
    }
  });

/*   
  $.ajax({
    method: "GET",
    url: requestURL,
    success: function(data) {
    var name = data["name"];
    console.log(name);
    var genres = data["genres"];
    var link = data["external_urls"]["spotify"];
    var nameText = document.getElementById("artist").textContent = name;
    var genresText = document.getElementById("genres").textContent = genres;
    var linkText = document.getElementById("link").textContent = link;
    }
  }); */
  
}

console.debug('Server listening on port ' + port);

  /* Load the HTTP library */
/* var http = require("http");
var request = require('request');
var client_id = process.env.CLIENT_ID;
var client_secret = process.env.CLIENT_SECRET;

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
      url: 'https://api.spotify.com/v1/artists/7crPfGd2k81ekOoSqQKWWz',
      headers: {
        'Authorization': 'Bearer ' + token
      },
      json: true
    };
    request.get(options, function(error, response, body) {
      console.log(body["name"]);
    });
  }
});

  http.createServer(function(request, response) {
    response.writeHead(200, {"Content-Type": "text/plain"});
    response.write("Hello World");
    response.write("Client ID: " + process.env.CLIENT_ID);
    response.end();
  }).listen(8888); */