# NestJS 개요 및 객체지향 디자인 패턴

> 기본적으로 ESLint, Prettier 로 코드 linting, formatting 해요.

## Dependencies
- `@nestjs/common`
- `@nestjs/core`
- `@nestjs/platform-express` 이렇게 3개는 NestJS 자체 기본
- `reflect-metadata` Decorator 를 사용하기 위한 것
- `rimrif` 리눅스의 rm 명령어 사용~~하는 건데, 왜 쓰는거지~~
- `rxjs` Reactive 하는 건데, 나중에 쓰임

## @Controller
> [https://docs.nestjs.com/controllers](https://docs.nestjs.com/controllers)

### Routing
```typescript
@Controller("cats")
export class CatsController {
  @Get()
  findAll: string {
    return 'get all cat api'
  }
}

```
Typescript 의 Decorator 는 함수 형태라서 의무적으로 괄호를 넣어줘야 하는게 은근 귀찮네요. (Spring 에 너무 젖어 있는 듯 한건가...)

```http request
GET http://localhost:8000/cats

HTTP/1.1 200 OK
X-Powered-By: Express
Content-Type: application/json; charset=utf-8
Content-Length: 50
ETag: W/"32-jy/JP/kBxsq/8DHY66M8kNT4MG0"
Date: Sun, 15 Aug 2021 21:32:12 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{
  "success": true,
  "data": {
    "cats": "get all cat api"
  }
}
```
응답 ok!

## Providers
> https://docs.nestjs.com/providers

DI(Dependency Injection) 으로 추상화된 서비스를 호출 하는 걸 말해요.  
이렇게 되면서 부터 [SOLID](https://en.wikipedia.org/wiki/SOLID) 이런것들 얘기가 슬슬 나오죠.  

```typescript
//cats.service.ts
import { Injectable } from '@nestjs/common';
import { Cat } from './interfaces/cat.interface';

@Injectable()
export class CatsService {
  private readonly cats: Cat[] = [];

  create(cat: Cat) {
    this.cats.push(cat);
  }

  findAll(): Cat[] {
    return this.cats;
  }
}
```
`@Injectable()` 이게 의존 가능한 컴포넌트를 구성해주고,
```typescript
//cats.controller.ts
import { Controller, Get, Post, Body } from '@nestjs/common';
import { CreateCatDto } from './dto/create-cat.dto';
import { CatsService } from './cats.service';
import { Cat } from './interfaces/cat.interface';

@Controller('cats')
export class CatsController {
  constructor(private catsService: CatsService) {}

  @Post()
  async create(@Body() createCatDto: CreateCatDto) {
    this.catsService.create(createCatDto);
  }

  @Get()
  async findAll(): Promise<Cat[]> {
    return this.catsService.findAll();
  }
}
```
이렇게 생성자에서 DI 돼서 쓸 수 있게 되는 거죠.
```typescript
constructor(private catsService: CatsService) {}
```

이렇게 가능하게 해줄려면, Provider 를 등록해주는게 필요한데.
```typescript
//app.module.ts
import { Module } from '@nestjs/common';
import { CatsController } from './cats/cats.controller';
import { CatsService } from './cats/cats.service';

@Module({
  controllers: [CatsController],
  providers: [CatsService]
})
export class AppModule {}
```

이렇게요.  
이게 은근 귀찮을 것 같아요. 경로를 설정해서 모든 컴포넌트를 스캔해서 자동 등록하고 하면 될 것 같은데 말이죠, 스프링의 @ComponentScan 같은 거요.

기본적인 디렉토리 구조는 다음과 같아요.
```
src
├─ cats
│  ├─ dto
│  │  └─ create-cat.dto.ts
│  ├─ interfaces
│  │  └─ cat.interface.ts
│  ├─ cats.controller.ts
│  └─ cats.service.ts
├─ app.modules.ts
└─ main.ts
```

## Middleware
> https://docs.nestjs.com/middleware

중간 처리라고 해야 할까요? AOP 같기도 하고.  
로깅하는 미들웨어를 하나 만들어 보면 이해가 더 쉽겠네요.

```typescript
import {NestMiddleware} from "@nestjs/common";
import {NextFunction} from "express";

export class LoggerMiddleware implements NestMiddleware {
  use(req: Request, res: Response, nest: NextFunction) {
    console.log(req.ip)
    next()
  }
}
```
이렇게 요청 IP 를 로깅하게 하고,

```typescript
import {CatsService} from "./cats.service";
import {CatsController} from "./cats.controller";
import {AppService} from "./app.service";
import {MiddlewareConsumer, NestModule} from "@nestjs/common";
import {LoggerMiddleware} from "./logger.middleware";

@Module({
  import: [CatsService],
  controllers: [CatsController],
  providers: [AppService]
})
export class AppModule implements NestModule {
  constructor(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('cats') // url pattern. '*' is all of url
  }
}
```
이렇게 해주면 미들웨어를 consume 하도록 설정할 수 있대요.
Nest 에서 제공해주는 추상화된 `Logger` 가 있어서 이걸 이용하는게 더 보기 좋은 로거를 만들어 주네요.
```typescript
export class LoggerMiddleware implements NestMiddleware {
  private logger = new Logger('HTTP')
  
  use(req: Request, res: Response, nest: NextFunction) {
    this.logger.log(req.ip)
    next()
  }
}
```
그리고 위 상태는 요청 상태에서만 로깅이 되는데, 응답 내용이 처리된 이후에 실행하고자 하면,
```typescript
export class LoggerMiddleware implements NestMiddleware {
  private logger = new Logger('HTTP')
  
  use(req: Request, res: Response, nest: NextFunction) {
    res.on('finish', () => {
      this.logger.log(`${req.ip} ${req.method} ${res.statusCode}`, req.originalUrl)
    })

    next()
  }
}
```
이렇게 응답 이후 처리 내용을 `.on('finish', () => {})` 이런 이벤트 등록을 해서 후처리 할 수 있군요.
