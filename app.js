if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}




const express = require('express');
const mongoose = require('mongoose');
const app = express();
const path = require('path');
const campground = require('./Models/campground');
const methodOverride = require('method-override');
const ejsMate = require('ejs-mate');
const AsyncWrapper = require('./utilities/AsyncWrapper');
const ExpressError = require('./utilities/ExpressError');
const reviewRoutes = require('./routes/reviews.js')
// const Joi = require('joi');
const { campgroundSchema, reviewSchema, userSchema } = require('./Schemas/schemas.js');
const Review = require('./Models/review');
const session = require('express-session');
const campgroundRoutes = require('./routes/campgrounds')
const userRoutes = require('./routes/users')
const flash = require('connect-flash');
const User = require('./Models/user');
const passport = require('passport');
const LocalStrategy = require('passport-local');
const mongoSanitize = require('express-mongo-sanitize');
const MongoStore = require('connect-mongo');
// const dbUrl = 'mongodb://127.0.0.1:27017/yelpcamp';

const dbUrl = process.env.DB_URL || 'mongodb://000000000:27017/yelpcamp';
// const helmet = require('helmet');



// mongoose.connect('mongodb://127.0.0.1:27017/yelpcamp', { useNewUrlParser: true, useCreateIndex: true, useUnifiedTopology: true })
//     .then(() => {
//         console.log("CONNECTION OPEN!!!")
//     })
//     .catch(err => {
//         console.log("OH NO ERROR!!!!")
//         console.log(err)
//     });

mongoose.connect(dbUrl, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    // Omit any SSL-related options here
});

const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", () => {
    console.log("Database connected");
});

const store = MongoStore.create({
    mongoUrl: dbUrl,
    touchAfter: 24 * 60 * 60,
    crypto: {
        secret: 'thisshouldbeabettersecret!'
    }
});

store.on("error", function (e) {
    console.log("SESSION STORE ERROR", e)

})

// app.use(session({
//     secret: 'foo',
//     store: MongoStore.create(options)
// }));


const sessionConfig = {
    store: store,
    name: "session",
    secret: 'thisshouldbsdfadsaeabettersecret',
    resave: false,
    saveUninitialized: true,
    httpOnly: true,
    //secure: true, //over https only 
    cookie: {
        expires: Date.now() + 1000 * 60 * 60 * 24 * 7,//if this was not present a user can be logged in forever (Not good!!)
        maxAge: 1000 * 60 * 60 * 24 * 7
    }
    // store:
};

// app.use(session) should come before app.use(passport.session)
app.use(session(sessionConfig));
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());
app.use(mongoSanitize());
// app.use(helmet());


// const scriptSrcUrls = [
//     "https://stackpath.bootstrapcdn.com/",
//     "https://api.tiles.mapbox.com/",
//     "https://api.mapbox.com/",
//     "https://kit.fontawesome.com/",
//     "https://cdnjs.cloudflare.com/",
//     "https://cdn.jsdelivr.net",
// ];
// const styleSrcUrls = [
//     "https://kit-free.fontawesome.com/",
//     "https://stackpath.bootstrapcdn.com/",
//     "https://api.mapbox.com/",
//     "https://api.tiles.mapbox.com/",
//     "https://fonts.googleapis.com/",
//     "https://use.fontawesome.com/",
// ];
// const connectSrcUrls = [
//     "https://api.mapbox.com/",
//     "https://a.tiles.mapbox.com/",
//     "https://b.tiles.mapbox.com/",
//     "https://events.mapbox.com/",
// ];
// const fontSrcUrls = [];
// app.use(
//     helmet.contentSecurityPolicy({
//         directives: {
//             defaultSrc: [],
//             connectSrc: ["'self'", ...connectSrcUrls],
//             scriptSrc: ["'unsafe-inline'", "'self'", ...scriptSrcUrls],
//             styleSrc: ["'self'", "'unsafe-inline'", ...styleSrcUrls],
//             workerSrc: ["'self'", "blob:"],
//             objectSrc: [],
//             imgSrc: [
//                 "'self'",
//                 "blob:",
//                 "data:",
//                 "https://res.cloudinary.com/douqbebwk/", //SHOULD MATCH YOUR CLOUDINARY ACCOUNT! 
//                 "https://images.unsplash.com/",
//             ],
//             fontSrc: ["'self'", ...fontSrcUrls],
//         },
//     })
// );



//all of the following methds are added by the plugin 
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());


app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// to expect forms and postman requests
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

//for methodoverride
app.use(methodOverride('_method'));


app.use((req, res, next) => {
    res.locals.currentUser = req.user;// you can use res.locals.user it is up to you
    res.locals.success = req.flash('success');//same here you can use whatever name you want for flash
    res.locals.error = req.flash('error');
    next();
})

//routes
app.use('/campgrounds', campgroundRoutes)
app.use('/campgrounds/:id/reviews', reviewRoutes)
app.use('/', userRoutes)
// app.use('/register', userRoutes)

app.engine('ejs', ejsMate);

const validateCampground = (req, res, next) => {
    // Using joi to define  schema for this route 
    // const campgroundSchema = Joi.object({
    //     campground: Joi.object({
    //         title: Joi.string().required(),
    //         price: Joi.number().required().min(0),
    //         image: Joi.string().required(),
    //         description: Joi.string().required()
    //     }).required()
    // })
    const { error } = campgroundSchema.validate(req.body);
    if (error) {
        const msg = error.details.map(el => el.message).join(',');
        throw new ExpressError(msg, 400)
    }
    else {
        next();
    }
}


//Registering fake user 
// app.get('/fakeuser', async (req, res) => {
//     const user = new User({ email: 'colt@steele.com', username: 'colt' });
//     const newUser = await User.register(user, 'chicken');//chicken is th password here 
//     res.send(newUser);
// });


//registeration: /register GET to form --- /register POST to create a new user 

app.get('/', (req, res) => { res.render('home') });
// app.get('/makeCampground', async (req, res) => {
//     const camp = new campground({
//         title: 'My backyard',
//         description: 'cheap camping!'
//     });
//     await camp.save();
//     res.send(camp);
// });

app.all('*', (req, res, next) => {
    next(new ExpressError('Page not found', 404));
})

app.use((err, req, res, next) => {
    const { statusCode = 500, message = 'There is an Error' } = err;
    if (!err.message) err.message = 'There is an Error';
    res.status(statusCode).render('error.ejs', { err });
});

app.listen('3000', () => {
    console.log('Serving on Port 3000');
});




