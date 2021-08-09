import * as express from 'express';
import {Cat} from './app.model';

const app: express.Express = express();

app.use((req, res, next) => {
  console.log(req.rawHeaders[1]);
  console.log('this is logging middleware');
  next();
});

app.get('/cats/som', (req, res, next: express.NextFunction) => {
  console.log('this is som middleware');
  next();
});

app.get('/', (req: express.Request, res: express.Response) => {
  res.send({cats: Cat});
});

app.get('/cats/:id', (req: express.Request, res: express.Response) => {
  const params = req.params;

  res.status(200).send({
    success: true,
    data: Cat.find(cat => cat.id === params.id)
  })
});

app.get('/cats/blue', (req, res, next: express.NextFunction) => {
  res.send({blue: Cat[0]});
});

app.get('/cats/som', (req, res) => {
  res.send({som: Cat[1]});
});

app.use((req, res, next) => {
  console.log('this is error middleware');
  res.send({error: '404 not found error'});
});

app.listen(8000, () => {
  console.log('server is on...');
});
