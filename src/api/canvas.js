'use strict';

const LinkHeader = require('http-link-header');
const NodeCache = require('node-cache');
const axios = require('axios');
const oauth = require('../auth/oauth2');

const API_PER_PAGE = 25;

async function getCourseGroups(courseId, request) {
    let thisApiPath = "https://chalmers.instructure.com/api/v1" + "/courses/" + courseId + "/groups?per_page=" + API_PER_PAGE;
    let apiData = new Array();
    let returnedApiData = new Array();
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

            apiData.push(response.data);

            if (response.headers["X-Request-Cost"]) {
                console.log("Request cost: " + response.headers["X-Request-Cost"]);
            }

            if (response.headers["link"]) {
                let link = LinkHeader.parse(response.headers["link"]);
        
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

    /* console.log("apiData:" + JSON.stringify(apiData));
    console.log("apiData.typeof: " + typeof(apiData)); */

    console.log(typeof(apiData));

    // Compile new object from all pages.
    // TODO: Include errorCount here in some way for GUI.
    apiData.forEach((page) => {
        page.forEach((record) => {
            returnedApiData.push({
                id: record.id, 
                name: record.name, 
                group_category_id: 
                record.group_category_id, 
                created_at: record.created_at, 
                members_count: record.members_count
            });
            // returnedApiData.push(record);
        });
    });

    return new Promise((resolve) => {
        resolve(returnedApiData);
    })
};

async function getCourseDetails(courseId) {
    console.log("Course details for " + courseId);


    return;
}

module.exports = {
    getCourseGroups,
    getCourseDetails
}