# 시작하기

## Express

### 설정

[package.json](./01_lets_start/package.json) 확인

### 테스트용 데이터 모킹

[app.model.ts](./01_lets_start/src/app.model.ts) 확인

### Middle-ware

여러 라우터 중간에 개입돼서, Gateway 역할을 수행.  
(스프링의 Interceptor 라고 보면 되겠네요.)

```ts
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log('this is som middleware');
  next();
})
```

`next()` 해당 구문을 실행 후, 라우터로 이동을 하도록 함.

### Error Response

```ts
app.get('/cats', (req: Request, res: Response) => {
  try {
    throw new Error('Occurred Error!')
  } catch (e) {
    res.status(500).send({
      success: false,
      error: e.message
    })
  }
})
```

### Dynamic Routing

```ts
app.get('/cats/:id', (req: express.Request, res: express.Response) => {
  const params = req.params

  res.status(200).send({
    success: true,
    data: Cat.find(cat => cat.id === params.id)
  })
})
```

## 디렉토리 구조

### Router 분리

```ts 
// cats.route.ts
import {Router} from 'express'

const router = Router()

router.get('/cats', (req, res) => {
  // ... implements
})
```

라우터를 분리해서 생성하고

```ts
// app.ts
import catsRoute from './cats/cats.route'

// omitted ...

app.use(catsRoute)
```

`app.ts` 에서 모두 취합하는 형태로.

## Singleton, Service Pattern

### class 로 instance 를 생성한 singleton

```ts
// app.ts
class Server {
  public app: express.Application

  constructor() {
    const app: express.Application = express()
    this.app = app
  }

  // omitted...

  public listen() {
    this.setMiddleware()
    this.app.listen(8000, () => {
      console.log('server is on...')
    })
  }
}

function init() {
  const server = new Server()
  server.listen()
}

init()
```

### service

```ts
// cats.route.ts
import {
  createCat,
  deleteCat,
  readAllcat,
  readCat,
  updateCat,
  updatePartialCat,
} from './cats.service'

const router = Router()

router.get('/cats', readAllcat)
router.get('/cats/:id', readCat)
router.post('/cats', createCat)
router.put('/cats/:id', updateCat)
router.patch('/cats/:id', updatePartialCat)
router.delete('/cats/:id', deleteCat)
```

`route` 에서 로직을 `cats.service.ts` 로 분리
