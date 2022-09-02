# canvas-lti-oauth2-example
Simple LTI application example with OAuth2 for user access to API.

Uses LTI 1.0 for integration as an app with Canvas, which requires LTI keys.
Uses OAuth2 to request access as the logged in user and get API access, which requires a Developer Key for the app. There should also be Redirect URIs configured, like http://localhost:3000/callback.

One Canvas API call is listing groups in the course where the launch is made.

Saves OAuth2 tokens and LTI data to session, this is not adviseable in production, it's just for demo. Sessions are written to disk using session-file-store.

Configuration is done with dotenv (.env), there is an example file. In Azure, it's called Application Settings under Configure.

This is just a bare example, something to start off from. Things can certainly be done better and/or in other ways.
