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
app.use('/birthdays/public', express.static('public'))

app.get('/birthdays/', (req, res) => {
  //Serves the body of the page aka "main.handlebars" to the container //aka "index.handlebars"
  res.render('main', {layout : 'index'});
});

app.post('/birthdays/', (req, res) => {
  results = {};
  
  results.name = req.body.name;
  setUpResults(req.body.name).then(() => {
    console.log("ready to render");
    //console.log(results);
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
    console.log(result);
    return getArtist(result)
  })
  .then(function(result) {
    console.log("getting spotify");
    return getSpotify(result)
  })
  .then(function(result) {
    console.log("we're done");
    //console.log(results);
    return Promise.resolve(true);
  })
  .catch((error) => {
    console.log(error);
  });
  
  return generateResults;
}

function formatName(name) {
  return new Promise((resolve, reject)=>{
    var formattedName = name.split(' ').join('+');
    if (formattedName !== '') {
      resolve(formattedName);
    } else {
      results.empty = true;
      resolve(false);
    }
  });
}

function getArtistId(formattedName) {
  return new Promise((resolve, reject)=>{
    if (formattedName !== false) {
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
    } else {
      results.error = true;
      resolve(false);
    }
  });
}

//Borrowed from https://stackoverflow.com/questions/13627308/add-st-nd-rd-and-th-ordinal-suffix-to-a-number
function getOrdinalSuffix(i) {
  var j = i % 10,
      k = i % 100;
  if (j == 1 && k != 11) {
      return "st";
  }
  if (j == 2 && k != 12) {
      return "nd";
  }
  if (j == 3 && k != 13) {
      return "rd";
  }
  return "th";
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
              month = (birthday.getMonth() + 1).toString();
              switch (month) {
                case "1":
                  monthName = "January";
                  break;
                case "2":
                  monthName = "February";
                  break;
                case "3":
                  monthName = "March";
                  break;
                case "4":
                  monthName = "April";
                  break;
                case "5":
                  monthName = "May";
                  break;
                case "6":
                  monthName = "June";
                  break;
                case "7":
                  monthName = "July";
                  break;
                case "8":
                  monthName = "August";
                  break;
                case "9":
                  monthName = "September";
                  break;
                case "10":
                  monthName = "October";
                  break;
                case "11":
                  monthName = "November";
                  break;
                case "12":
                  monthName = "December";
                  break;
                default:
                  monthName = "Unknown";
              }
              results.month = monthName;
              results.day = birthday.getDate().toString();
              results.suffix = getOrdinalSuffix(birthday.getDate().toString());
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
          results.genre = body["genres"][0];
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