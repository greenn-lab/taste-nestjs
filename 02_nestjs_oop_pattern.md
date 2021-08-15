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
  providers: [CatsService],
})
export class AppModule {}
```

이렇게요.  
이게 은근 귀찮을 것 같아요. 경로를 설정해서 모든 컴포넌트를 스캔해서 자동 등록하고 하면 될 것 같은데 말이죠, 스프링의 @ComponentScan 같은 거요.

