import { Body, Controller, Get, Post, UseFilters, UseInterceptors } from '@nestjs/common'
import { HttpExceptionFilter } from 'src/common/exceptions/http-exception.filter'
import { SuccessInterceptor } from 'src/common/interceptors/success.interceptor'
import { CatsService } from './cats.service'
import { CatRequestDto } from './dto/cats.request.dto'

@Controller('cats')
@UseInterceptors(SuccessInterceptor)
@UseFilters(HttpExceptionFilter)
export class CatsController {
  constructor(private readonly catsService: CatsService) {
  }

  @Get()
  getCurrentCat() {
    return 'current cat'
  }

  @Post()
  async signUp(@Body() body: CatRequestDto) {
    const cat = this.catsService.signUp(body)
    console.log(cat)
    return cat
  }

  @Post('login')
  logIn() {
    return 'login'
  }

  @Post('logout')
  logOut() {
    return 'logout'
  }

  @Post('upload/cats')
  uploadCatImg() {
    return 'uploadImg'
  }
}
