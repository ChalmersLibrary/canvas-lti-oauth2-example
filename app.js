'use strict';

const pkg = require('./package.json');
const bodyParser = require('body-parser');
const express = require('express');
const session = require('express-session');
const fileStore = require('session-file-store')(session);
const helmet = require('helmet');
const cors = require('cors');

const auth = require('./src/auth/oauth2');
const lti = require('./src/lti/canvas');
const canvasApi = require('./src/api/canvas');

const port = process.env.PORT || 3000;
const cookieMaxAge = 3600000 * 72; // 72h
const fileStoreOptions = { ttl: 3600 * 12, retries: 3 };

const sessionOptions = { 
    store: new fileStore(fileStoreOptions),
    name: "LTI_TEST_SID",
    secret: "keyboard cat dog mouse",
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: { maxAge: cookieMaxAge  }
};

const app = express();

app.disable('X-Powered-By');

app.set('json spaces', 2);

app.use("/assets",
    express.static(__dirname + '/public/assets')
);
app.use(bodyParser.urlencoded({
    extended: false
}));
app.use(helmet({
    frameguard: false
}));
app.use(cors());

// Content Security Policy
app.use(function (req, res, next) {
    res.setHeader(
      'Content-Security-Policy', 
      "default-src 'self'; script-src 'self'; style-src 'self'; font-src 'self'; img-src 'self'; frame-src 'self'" 
      + process.env.CSP_FRAME_SRC_ALLOW ? " " + process.env.CSP_FRAME_SRC_ALLOW : "";
    );
    
    next();
});

if (process.env.NODE_ENV === "production") {
    app.set('trust proxy', 1);
    sessionOptions.cookie.secure = 'true';
    sessionOptions.cookie.sameSite = 'none'; 
    sessionOptions.cookie.httpOnly = false;
}

app.use(session(sessionOptions));

app.post('/lti', lti.handleLaunch('/'));

auth.createApplication(app, process.env.AUTH_REDIRECT_CALLBACK);

app.get('/', async (req, res) => {
    if (req.session.views) {
        req.session.views++;
    }
    else {
        req.session.views = 1;
    }

    console.log(req.session);
    console.log("Checking access token...");

    const token = await auth.checkToken(req, res);
    console.log(token);

    if (token.success === false) {
        console.log("Redirect...");

        return res.redirect("/auth");
    }
    else {
        console.log("Success, send JSON response to client!");

        await canvasApi.getCourseGroups(req.session.lti.custom_canvas_course_id, req).then((courseGroups) => {
            return res.send({
                status: 'up',
                id: req.session.id,
                version: pkg.version,
                groups: courseGroups,
                session: req.session
            });    
        }).catch((error) => {
            console.error(error);

            return res.error(error);
        });
    }
});

app.listen(port, () => console.log(`Application listening on port ${port}.`));

process.on('uncaughtException', (err) => {
    console.error("There was an uncaught error", err);
    process.exit(1); //mandatory (as per the Node docs)
});
