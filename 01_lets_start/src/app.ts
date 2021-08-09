import {default as express, Express, Request, Response} from 'express'

const app: Express = express()

const data = [1, 2, 3, 4]

app.get('/', (req: Request, res: Response) => {
  res.send(data)
})

app.listen(8000, () => {
  console.info('server listening ... ')
})
