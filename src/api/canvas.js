'use strict';

const LinkHeader = require('http-link-header');
const NodeCache = require('node-cache');
const axios = require('axios');
const oauth = require('../auth/oauth2');

const API_PER_PAGE = 25;

async function getCourseGroups(courseId, request) {
    let thisApiPath = "https://chalmers.instructure.com/api/v1" + "/courses/" + courseId + "/groups?per_page=" + API_PER_PAGE;
    let apiData = [];
    let returnedApiData = [];
    let errorCount = 0;

    while (errorCount < 4 && thisApiPath && request.session.accessToken.access_token) {
        console.log("[API] GET " + thisApiPath);
    
        try {
          const response = await axios.get(thisApiPath, {
            headers: {
              "User-Agent": "Chalmers/Azure/Request",
              "Authorization": request.session.accessToken.token_type + " " + request.session.accessToken.access_token
            }
          });
          
          const data = response.data;

          console.log(data);

          apiData.push(data);
    
          if (response.headers["link"]) {
            var link = LinkHeader.parse(response.headers["link"]);
    
            if (link.has("rel", "next")) {
              thisApiPath = link.get("rel", "next")[0].uri;
            }
            else {
              thisApiPath = false;
            }
          }
          else {
            thisApiPath = false;
          }  
        }
        catch (error) {
          errorCount++;
          console.error("[API] Error: " + error);
    
          if (error.response.status == 401 && error.response.headers['www-authenticate']) { // refresh token, then try again
            await oauth.providerRefreshToken(request);
          }
          else if (error.response.status == 401 && !error.response.headers['www-authenticate']) { // no access, redirect to auth
            console.error("[API] Not authorized in Canvas for use of this API endpoint.");
            console.error(JSON.stringify(error));
            return(error);
          }
          else {
            console.error(error);
            return(error);  
          }
        }
      }

      
    // Compile new object from all pages.
    // TODO: Include errorCount here in some way for GUI.
    for (const page in apiData) {
        for (const record in page) {
              returnedApiData.push(record);
        }
    }

    console.log("Returning data from API...");
    console.log(returnedApiData);

    return returnedApiData;   
}

async function getCourseDetails(courseId) {
    console.log("Course details for " + courseId);


    return;
}

module.exports = {
    getCourseGroups,
    getCourseDetails
}