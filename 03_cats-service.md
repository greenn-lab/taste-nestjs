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
