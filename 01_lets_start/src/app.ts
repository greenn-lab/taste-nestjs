import {default as express, Express, NextFunction, Request, Response} from 'express';

import catsRoute from './cats/cats.route'

const app: Express = express()


//* logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(req.rawHeaders[1]);
  console.log('this is logging middleware');
  next();
});

//* json middleware
app.use(express.json());

app.use(catsRoute);

//* 404 middleware
app.use((req, res, next) => {
  console.log('this is error middleware');
  res.send({error: '404 not found error'});
});
