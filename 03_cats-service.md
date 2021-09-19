# Cats Service

샘플 예제를 만들어 보는 거에요.

## MongoDB

그냥 알아서 연결하면 돼요. 뭐, 어렵지 않으니까요. 그리고, `mongoose` 를 쓸거에요.

## validation

`class-validator` 라는 걸 쓰게 될텐데, JSR303(맞나? 구현체는 hibernate-validator) 과 거의 유사하네요.  
[https://github.com/typestack/class-validator](https://github.com/typestack/class-validator) 에서 예제랑
기본 tutorial 볼 수 있어요.  
~~스크립트 언어의 간결함이란...~~ 자바의 그것보다 더 깔끔해보여요.

아참. 그리고!

```ts
// main.ts

import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  app.useGlobalPipes(new ValidationPipe()) // class-validation 작동!

  // ...
}
```  

`app.useGlobalPipes(new ValidationPipe())` 이걸 등록 해줘야 해요.

## signup

회원 가입하는 거에요.

### controller

```ts
export class CatsController {
  // ...

  @Post()
  async signUp(@Body() body: CatRequestDto) {
    console.log(body);
    return 'signup';
  }

// ...
}
```

`@Body()` Decorator 로 Reqeust Body 를 읽을 수 있어요. 그래서 `CatRequestDto` 에 serialize 하는 거죠.

```http request
POST {{host}}/cats
Content-Type: application/json

{
"name": "road-cat",
"password": "-----"
}
```

이렇게 날리면 어떻게 되냐면 "email" 없다고 오류 나요.

```json
{
  "success": false,
  "timestamp": "2021-08-28T13:55:42.572Z",
  "statusCode": 400,
  "message": [
    "email should not be empty",
    "email must be an email"
  ],
  "error": "Bad Request"
}
```

얼마나 편해요. 좋네요.

### Service

서비스 시작전에

```ts
@Module({
  imports: [
    MongooseModule.forFeature([{
      name: Cat.name,
      schema: CatSchema
    }])
  ],
  controllers: [CatsController],
  providers: [CatsService],
  exports: [CatsService]
})
export class CatsModule {
}
```

`imports` 속성에 Schema 를 연결 해주고요.

```ts
@Injectable()
export class CatsService {
  constructor(@InjectModel(Cat.name) private readonly catModel: Model<Cat>) {
  }

  async signUp(body: CatRequestDto) {
    const { email, name, password } = body
    const isExists = await this.catModel.exists({ email })

    if (isExists) {
      throw new BadRequestException('이미 야옹이가 가입되어 있어요.')
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    return this.catModel.create({
      email,
      name,
      password: hashedPassword
    })
  }
}
```

이렇게 서비스를 만들어 보았어요.  
비밀번호는 bcrypt 를 썼어요.

```shell
npm i bcrypt
npm i -D @types/bcrypt
```

로 라이브러리 의존성 처리 해주고요.

이렇게 했을 때, 결과적으로 불필요한 `password` 속성이 노출 되는데, 이걸 위해서 Schema 의 `virtual` 기능을 사용해요.

```ts
export class Cat extends Docuemnt {
  // ...

  readonly readOnlyData: {
    id: string,
    email: string,
    name: string
  }
}

export const CatSchema = SchemaFactory.createForClass(Cat)

CatSchema.virtual('readOnlyData').get(function() {
  return {
    id: this.id,
    email: this.email,
    name: this.name
  }
})
```

`CatSchema.virtual()` 을 추가하고,

```ts
import { CatRequestDto } from './cats.request.dto'

export class CatService {

  async signUp(dto: CatRequestDto) {
    // ...

    const cat = await this.catModel.create({
      email,
      name,
      password: hashedPassword
    })

    return cat.readOnlyData
  }

}
```

이렇게 return 을 `readOnlyData` 로 바꿔줘요.

요청을 날리면,

```json
{
  "success": true,
  "data": {
    "id": "612a4f00e520c3968c879e51",
    "email": "rc2@ca.ts",
    "name": "road-cat"
  }
}
```

이런 아름다운 결과가 나와요.

## API (swagger)

swagger 로 API 문서화를 하는 거에요.

```shell
npm i @nestjs/swagger swagger-ui-express
```

해준 다음에

```ts
// main.ts
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  // ...

  const config = new DocumentBuilder()
  .setTitle('Cats Service')
  .setDescription('kitten meow')
  .setVersion('0.0.1')
  .build()

  const document: OpenAPIObject = SwaggerModule.createDocument(app, config)
  SwaggerModule.setup('api-docs', app, document)

  // ...
}
```

이렇게 히면 `/api-docs` URL 로 API 문서를 확인 할 수 있어요.

### Repository 패턴과 Layer 분리

DataSource 에 접근 할 때, Vendor 간의 차이라던지 접근 형식등의 이유로 특정한 코드가 존재하게 되는데요.(예를들면 SQL 같은)
그런 것들이 서비스의 비즈니스 로직과 혼재되는 것들 방지하게 되고 프래임웍의 DI(Dependency Injection)등을 통해서 사용할 수 있도록 DataSource 접근
레이어를 Repository 패턴으로 구성하고 분리하여 관리하게 돼요.

```ts
// cats.repository.ts
import { HttpException, HttpStatus, Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Cat } from './cats.schema'
import { Model } from 'mongoose'

@Injectable()
export class CatsRepository {
  constructor(@InjectModel(Cat.name) private readonly catModel: Model<Cat>) {
  }

  async existsByEmail(email: string): Promise<boolean> {
    try {
      return await this.catModel.exists({ email })
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }
}
```

그리고 귀찮은 모듈 등록.

```ts
@Module({
  imports: [
    MongooseModule.forFeature([{
      name: Cat.name,
      schema: CatSchema
    }])
  ],
  controllers: [CatsController],
  providers: [CatsService, CatsRepository],
  exports: [CatsService]
})
export class CatsModule {
}
```

`providers` 속성에 `CatsRepository` 를 추가했어요.  
당연히 서비스에서 DI 될 때, mongodb 에 직접 연결하는 건 없어지겠죠. 생성자에 `CatsRepository` 로 바꿔줘요.

```ts
@Injectable()
export class CatsService {
  constructor(private readonly repository: CatsRepository) {
  }

  // ...
}
```

> async 함수에서 리턴하면서 await 은 불필요하다고 해요.
> 다음 아래 코드와 같은 거죠. 어차피 `Promise<?>` 이니까 굳이 리턴하면서 await 이라고 표기하는게
> 중복 명시겠네요.

```
async create(cat: CatRequestDto): Promise<Cat> {
  return await this.catModel.create(cat) // await 불필요 함
}
```

### Authentication

인증은 JWT 로 하네요.

```shell
npm install --save @nestjs/passport passport @nestjs/jwt passport-jwt
npm install --save-dev @types/passport-jwt
```

관련된 의존성 패키지를 땡겨주시고.

모듈을 하나 만들어요.
![](.images/3b0be27e.png)

서비스도 하나 만들고요.
![](.images/de7df22a.png)

가장먼저 만들게, JWT 전략인데요.  
요청을 받았을 때 어떻게 Token 을 처리하게 되는지를 정하는 건가 봐요.
```ts
// jwt.strategy.ts

import { Injectable } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: 'hi, hello',
      ignoreExpiration: false
    })
  }
}
```

그리고 귀찮은 모듈 정의하고.
```ts
//auth.module.ts

import { forwardRef, Module } from '@nestjs/common'
import { AuthService } from './auth.service'
import { JwtStrategy } from './jwt/jwt.guard'
import { PassportModule } from '@nestjs/passport'
import { CatsModule } from '../cats/cats.module'
import { JwtModule } from '@nestjs/jwt'

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: 'hi! hello',
      signOptions: { expiresIn: '1y' }
    }),
    forwardRef(() => CatsModule)
  ],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService]
})
export class AuthModule {
}
```

여기서 중요한게 `forwardRef(...)` 인데요, 이건 `AuthService` 와 `CatsService` 간에 서로가 서로를 참조하는 순환참조를 방어해주는 방식이라고
해요. ~~스프링에도 순환참조 방어할 수 있는 장치가 있는지 모르겠네...~~

```ts
// auth.service.ts

import { Injectable, UnauthorizedException } from '@nestjs/common'
import * as bcrypt from 'bcrypt'
import { CatsRepository } from '../cats/cats.repository'
import { LoginRequestDto } from './dto/login.request.dto'
import { JwtService } from '@nestjs/jwt'

@Injectable()
export class AuthService {
  constructor(
    private readonly repository: CatsRepository,
    private jwtService: JwtService
  ) {
  }

  async login({ email, password }: LoginRequestDto) {
    const cat = await this.repository.findByEmail(email)

    if (!cat || !(await bcrypt.compare(password, cat.password))) {
      throw new UnauthorizedException('이메일과 비번을 확인하세요.')
    }

    return {
      token: this.jwtService.sign({
        email,
        subject: cat.id
      })
    }
  }
}
```
JWT 는 설명 안할게요. 그냥 찾아보면 뻔해요. return 값은 Token 구성중에 Payload 만 넘겨주는 거에요.
나머지는 기본 정의된 알고리즘등이 알아서 적용 되고요.

cats.module.ts 파일에도 `forwardRef(() => AuthService)` 로 순환참조를 방어하고요.

```ts
// cats.controller.ts
export class CatsController {
  constructor(
    private readonly catsService: CatsService,
    private readonly authService: AuthService
  ) {
  }
  
  // ...
  
  @Post('login')
  logIn(@Body() params: LoginRequestDto) {
    return this.authService.login(params)
  }
  
  // ...
}
```
`private readonly authService: AuthService` DI 해주고요. 로그인을 실행해요.

```http request
POST {{host}}/cats/login
Content-Type: application/json

{
  "email": "rc2@ca.ts",
  "password": "-----"
}
```
이렇게 실행하면,
![](.images/f1ffec8d.png)

결과가 나오고.
https://jwt.io/ 에서 토큰을 디버깅 하면
![](.images/1fcc6c1a.png)

이렇게 된답니다!


### Passport 인증 전략과 Custom Decorator
컨트롤러의 End-point 에 JWT 인증을 연결 해요.
```ts
// cats.controller.ts
export class CatsController {
  // ...

  @ApiOperation({ summary: '고양이 한 놈 가져오기' })
  @UseGuards(JwtAuthGuard)
  @Get()
  getCurrentCat(@CurrentUser() cat) {
    return cat.readOnlyData
  }

  // ...
}
```
`@UseGuards(JwtAuthGuard)` 를 걸어주는 건데요. Guard 가 뭔지 싶으면 Life-Cycle 을 다시한번 확인해 봐요.  
여기서 `@CurrentUser` 라는 Custom Decorator 를 썼는데요. 별거  아녜요.
```ts
// user.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common'

export const CurrentUser = createParamDecorator(
  (data: unknown, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest()
    return request.user
  }
)
```
`createPramDecorator(...)` 를 정의해서 쓰면 되는 거네요.

이제는 인증이 요청되는 부분의 코드인데요.  
```ts
// jwt.strategy.ts
export class JwtStrategy extends PassportStrategy(Strategy) {
  // ...

  async validate(payload: Payload) {
    const cat = await this.repository.findCatByIdWithoutPassword(payload.subject)

    if (!cat) {
      throw new UnauthorizedException()
    }

    return cat
  }
}
```
이렇게 인증을 확인해요. JWT 토큰 검증은 내부적으로 알아서 처리 되더라고요.
> ### 여기서 잠깐!  
> 제가 삽질한 부분이 있어서요. `.env` 환경 설정이 적용되질 않아서 애 먹었는데요.
> 강의에선 설명을 대충 넘어가서 몰랐거든요. `auth.module.ts` 파일에서 `@Module(...)` decorator 중에
> `ConfigModule.forRoot()` 이걸 import 속성에 추가 해줘야만 해요.  
> app.module.ts 에서 적용되면 전체적으로 모두 적용되는 줄 알았는데, 아니더라고요.  
> ~~은근히 스프링이 편한 것 같은 건, 저만의 느낌일까요??~~

암튼 이렇게 하고,
```http request
POST {{host}}/cats/login
Content-Type: application/json

{
  "email": "rc2@ca.ts",
  "password": "-----"
}
```
이렇게 로그인해서
```
POST http://localhost:8000/cats/login

HTTP/1.1 201 Created
X-Powered-By: Express
Content-Type: application/json; charset=utf-8
Content-Length: 240
ETag: W/"f0-+Hgj3pDNG3xbR9r6my9HhmwIHf8"
Date: Sun, 19 Sep 2021 14:26:50 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InJjMkBjYS50cyIsInN1YmplY3QiOiI2MTJhNGYwMGU1MjBjMzk2OGM4NzllNTEiLCJpYXQiOjE2MzIwNjE2MTAsImV4cCI6MTY2MzYxOTIxMH0.MFDL4yLXCURoALXhCe-SMiKGD0qHEj-PyQD2vlehkF0"
  }
}
```
나온 결과 토큰을 넣어서 요청을 해야만 `401 Unauthorized` 를 맞지 않아요.
```http request
GET {{host}}/cats
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InJjMkBjYS50cyIsInN1YmplY3QiOiI2MTJhNGYwMGU1MjBjMzk2OGM4NzllNTEiLCJpYXQiOjE2MzIwNjE2MTAsImV4cCI6MTY2MzYxOTIxMH0.MFDL4yLXCURoALXhCe-SMiKGD0qHEj-PyQD2vlehkF0
```

이러면 정상적으로
```
GET http://localhost:8000/cats

HTTP/1.1 200 OK
X-Powered-By: Express
Content-Type: application/json; charset=utf-8
Content-Length: 95
ETag: W/"5f-KH366SZ+Y1jVWapFPbMFddH0/Js"
Date: Sun, 19 Sep 2021 14:27:19 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{
  "success": true,
  "data": {
    "id": "612a4f00e520c3968c879e51",
    "email": "rc2@ca.ts",
    "name": "road-cat"
  }
}

Response code: 200 (OK); Time: 6908ms; Content length: 95 bytes
```
이런 응답을 받을 수 있답니다.
